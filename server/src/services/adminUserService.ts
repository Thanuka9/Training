import type { Prisma } from "@prisma/client";
import type { Role, UserStatus } from "../types/domain.js";
import type { Request } from "express";
import { prisma } from "../config/prisma.js";
import { conflict, notFound, validationError } from "../utils/appError.js";
import { parsePagination, paginatedResult } from "../utils/pagination.js";
import { hashPassword } from "../utils/password.js";
import { toPublicUser } from "../utils/serialize.js";
import { writeAuditLog } from "../utils/audit.js";

async function countActiveAdmins() {
  return prisma.user.count({ where: { role: "ADMIN", status: "ACTIVE" } });
}

async function protectLastAdmin(targetId: string, nextRole?: Role, nextStatus?: UserStatus) {
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw notFound("User");
  if (target.role !== "ADMIN" || target.status !== "ACTIVE") return target;

  const becomingNonAdmin = nextRole === "USER";
  const becomingInactive = nextStatus && nextStatus !== "ACTIVE";
  if (!becomingNonAdmin && !becomingInactive) return target;

  if ((await countActiveAdmins()) <= 1) {
    throw validationError("The last active administrator cannot be disabled or demoted");
  }
  return target;
}

export async function listUsers(query: Record<string, unknown>) {
  const { skip, take, page, pageSize, search, sortDirection } = parsePagination(query);
  const where: Prisma.UserWhereInput = {
    ...(query.role ? { role: query.role as Role } : {}),
    ...(query.status ? { status: query.status as UserStatus } : {}),
    ...(search
      ? {
          OR: [{ fullName: { contains: search } }, { bankId: { contains: search } }],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: sortDirection },
      include: { _count: { select: { participations: true } } },
    }),
    prisma.user.count({ where }),
  ]);

  return paginatedResult(
    items.map((item) => ({
      ...toPublicUser(item),
      trainingCount: item._count.participations,
    })),
    total,
    page,
    pageSize,
  );
}

export async function getUser(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { _count: { select: { participations: true } } },
  });
  if (!user) throw notFound("User");
  return { ...toPublicUser(user), trainingCount: user._count.participations };
}

export async function createAdminUser(
  input: {
    fullName: string;
    bankId: string;
    password: string;
    role?: Role;
    status?: UserStatus;
  },
  actorUserId: string,
  req: Request,
) {
  const existing = await prisma.user.findUnique({ where: { bankId: input.bankId } });
  if (existing) throw conflict("A user with this Bank ID already exists");

  const created = await prisma.user.create({
    data: {
      fullName: input.fullName,
      bankId: input.bankId,
      passwordHash: await hashPassword(input.password),
      role: input.role ?? "USER",
      status: input.status ?? "ACTIVE",
    },
  });

  await writeAuditLog({
    actorUserId,
    action: "USER_CREATED",
    entityType: "User",
    entityId: created.id,
    after: toPublicUser(created),
    req,
  });

  return toPublicUser(created);
}

export async function updateAdminUser(
  id: string,
  input: { fullName?: string; role?: Role; password?: string },
  actorUserId: string,
  req: Request,
) {
  const existing = await protectLastAdmin(id, input.role);
  const updated = await prisma.user.update({
    where: { id },
    data: {
      fullName: input.fullName ?? existing.fullName,
      role: input.role ?? existing.role,
      ...(input.password ? { passwordHash: await hashPassword(input.password) } : {}),
    },
  });

  await writeAuditLog({
    actorUserId,
    action: input.role === "ADMIN" && existing.role !== "ADMIN" ? "USER_PROMOTED" : "USER_UPDATED",
    entityType: "User",
    entityId: id,
    before: toPublicUser(existing),
    after: toPublicUser(updated),
    req,
  });

  return toPublicUser(updated);
}

export async function setUserStatus(
  id: string,
  status: UserStatus,
  action: string,
  actorUserId: string,
  req: Request,
) {
  const existing = await protectLastAdmin(id, undefined, status);
  const updated = await prisma.user.update({
    where: { id },
    data: { status },
  });

  await writeAuditLog({
    actorUserId,
    action,
    entityType: "User",
    entityId: id,
    before: toPublicUser(existing),
    after: toPublicUser(updated),
    req,
  });

  return toPublicUser(updated);
}
