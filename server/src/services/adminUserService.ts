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

export type OfficerTrainingStats = {
  trainingCount: number;
  attended: number;
  drafts: number;
  completed: number;
  local: number;
  foreign: number;
  physical: number;
  online: number;
  hybrid: number;
  lastTrainingDate: string | null;
  neverAttended: boolean;
};

function emptyStats(): OfficerTrainingStats {
  return {
    trainingCount: 0,
    attended: 0,
    drafts: 0,
    completed: 0,
    local: 0,
    foreign: 0,
    physical: 0,
    online: 0,
    hybrid: 0,
    lastTrainingDate: null,
    neverAttended: true,
  };
}

export async function trainingStatsByUser(userIds?: string[]) {
  const map = new Map<string, OfficerTrainingStats>();
  if (userIds && userIds.length === 0) return map;

  const records = await prisma.trainingParticipation.findMany({
    where: userIds ? { userId: { in: userIds } } : {},
    include: {
      completionStatus: true,
      trainingProgram: { select: { locationScope: true } },
    },
  });

  for (const record of records) {
    const current = map.get(record.userId) ?? emptyStats();
    current.trainingCount += 1;
    if (record.workflowStatus === "DRAFT") {
      current.drafts += 1;
    } else {
      current.attended += 1;
      current.neverAttended = false;
      if (record.completionStatus.name === "Completed") current.completed += 1;
      if (record.trainingProgram.locationScope === "LOCAL") current.local += 1;
      if (record.trainingProgram.locationScope === "FOREIGN") current.foreign += 1;
      if (record.deliveryMode === "PHYSICAL") current.physical += 1;
      if (record.deliveryMode === "ONLINE") current.online += 1;
      if (record.deliveryMode === "HYBRID") current.hybrid += 1;
      const from = record.fromDate.toISOString().slice(0, 10);
      if (!current.lastTrainingDate || from > current.lastTrainingDate) current.lastTrainingDate = from;
    }
    map.set(record.userId, current);
  }

  return map;
}

function withStats<T extends { id: string }>(user: T, stats: Map<string, OfficerTrainingStats>) {
  const current = stats.get(user.id) ?? emptyStats();
  return { ...user, ...current, trainingCount: current.attended };
}

async function loadUsersWithStats(query: Record<string, unknown>) {
  const { search, sortDirection } = parsePagination(query);
  const where: Prisma.UserWhereInput = {
    ...(query.role ? { role: query.role as Role } : {}),
    ...(query.status ? { status: query.status as UserStatus } : {}),
    ...(search
      ? {
          OR: [{ fullName: { contains: search } }, { bankId: { contains: search } }],
        }
      : {}),
  };

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: sortDirection },
  });
  const stats = await trainingStatsByUser(users.map((item) => item.id));
  let items = users.map((item) => withStats(toPublicUser(item), stats));

  if (query.neverAttended === "true" || query.neverAttended === true) {
    items = items.filter((item) => item.neverAttended && item.role === "USER");
  } else if (query.neverAttended === "false" || query.neverAttended === false) {
    items = items.filter((item) => !item.neverAttended);
  }

  return items;
}

export async function listUsers(query: Record<string, unknown>) {
  const { skip, take, page, pageSize } = parsePagination(query);
  const items = await loadUsersWithStats(query);
  return paginatedResult(items.slice(skip, skip + take), items.length, page, pageSize);
}

export async function listUsersForExport(query: Record<string, unknown>) {
  const items = await loadUsersWithStats(query);
  return items.map((item) => ({
    bankId: item.bankId,
    fullName: item.fullName,
    role: item.role,
    status: item.status,
    attended: item.attended,
    completed: item.completed,
    local: item.local,
    foreign: item.foreign,
    physical: item.physical,
    online: item.online,
    lastTrainingDate: item.lastTrainingDate ?? "",
    neverAttended: item.neverAttended ? "Yes" : "No",
    registered: item.createdAt ? new Date(item.createdAt).toISOString() : "",
    lastLoginAt: item.lastLoginAt ? new Date(item.lastLoginAt).toISOString() : "",
  }));
}

export async function getUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw notFound("User");
  const stats = await trainingStatsByUser([id]);
  return withStats(toPublicUser(user), stats);
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
