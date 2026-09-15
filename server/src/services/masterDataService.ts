import { Prisma } from "@prisma/client";
import { JsonUniqueError } from "../db/jsonStore.js";
import { prisma } from "../config/prisma.js";
import { conflict, notFound, validationError } from "../utils/appError.js";
import { parsePagination, paginatedResult } from "../utils/pagination.js";
import { writeAuditLog } from "../utils/audit.js";
import type { Request } from "express";

function handleUnique(error: unknown, message: string): never {
  if (
    error instanceof JsonUniqueError ||
    (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
  ) {
    throw conflict(message);
  }
  throw error;
}

export async function listTrainingTypes(query: Record<string, unknown>) {
  const { skip, take, page, pageSize, search, sortDirection } = parsePagination(query);
  const where = {
    ...(search ? { name: { contains: search } } : {}),
    ...(query.active === "true" ? { active: true } : {}),
    ...(query.active === "false" ? { active: false } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.trainingType.findMany({
      where,
      skip,
      take,
      orderBy: [{ sortOrder: "asc" }, { name: sortDirection }],
    }),
    prisma.trainingType.count({ where }),
  ]);
  return paginatedResult(items, total, page, pageSize);
}

export async function createTrainingType(
  data: { name: string; sortOrder?: number; active?: boolean },
  actorUserId: string,
  req: Request,
) {
  try {
    const created = await prisma.trainingType.create({
      data: {
        name: data.name,
        sortOrder: data.sortOrder ?? 0,
        active: data.active ?? true,
      },
    });
    await writeAuditLog({
      actorUserId,
      action: "TRAINING_TYPE_CREATED",
      entityType: "TrainingType",
      entityId: created.id,
      after: created,
      req,
    });
    return created;
  } catch (error) {
    handleUnique(error, "A training type with this name already exists");
  }
}

export async function updateTrainingType(
  id: string,
  data: { name?: string; sortOrder?: number; active?: boolean },
  actorUserId: string,
  req: Request,
) {
  const existing = await prisma.trainingType.findUnique({ where: { id } });
  if (!existing) throw notFound("Training type");
  try {
    const updated = await prisma.trainingType.update({ where: { id }, data });
    await writeAuditLog({
      actorUserId,
      action: "TRAINING_TYPE_UPDATED",
      entityType: "TrainingType",
      entityId: id,
      before: existing,
      after: updated,
      req,
    });
    return updated;
  } catch (error) {
    handleUnique(error, "A training type with this name already exists");
  }
}

export async function archiveTrainingType(id: string, actorUserId: string, req: Request) {
  return updateTrainingType(id, { active: false }, actorUserId, req);
}

export async function listInstitutions(query: Record<string, unknown>) {
  const { skip, take, page, pageSize, search, sortDirection } = parsePagination(query);
  const where = {
    ...(search ? { name: { contains: search } } : {}),
    ...(query.active === "true" ? { active: true } : {}),
    ...(query.active === "false" ? { active: false } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.institution.findMany({
      where,
      skip,
      take,
      orderBy: { name: sortDirection },
    }),
    prisma.institution.count({ where }),
  ]);
  return paginatedResult(items, total, page, pageSize);
}

export async function createInstitution(
  data: { name: string; active?: boolean },
  actorUserId: string,
  req: Request,
) {
  try {
    const created = await prisma.institution.create({
      data: { name: data.name, active: data.active ?? true },
    });
    await writeAuditLog({
      actorUserId,
      action: "INSTITUTION_CREATED",
      entityType: "Institution",
      entityId: created.id,
      after: created,
      req,
    });
    return created;
  } catch (error) {
    handleUnique(error, "An institution with this name already exists");
  }
}

export async function updateInstitution(
  id: string,
  data: { name?: string; active?: boolean },
  actorUserId: string,
  req: Request,
) {
  const existing = await prisma.institution.findUnique({ where: { id } });
  if (!existing) throw notFound("Institution");
  try {
    const updated = await prisma.institution.update({ where: { id }, data });
    await writeAuditLog({
      actorUserId,
      action: "INSTITUTION_UPDATED",
      entityType: "Institution",
      entityId: id,
      before: existing,
      after: updated,
      req,
    });
    return updated;
  } catch (error) {
    handleUnique(error, "An institution with this name already exists");
  }
}

export async function listParticipationRoles(query: Record<string, unknown>) {
  const { skip, take, page, pageSize, search, sortDirection } = parsePagination(query);
  const where = {
    ...(search ? { name: { contains: search } } : {}),
    ...(query.active === "true" ? { active: true } : {}),
    ...(query.active === "false" ? { active: false } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.participationRole.findMany({
      where,
      skip,
      take,
      orderBy: [{ sortOrder: "asc" }, { name: sortDirection }],
    }),
    prisma.participationRole.count({ where }),
  ]);
  return paginatedResult(items, total, page, pageSize);
}

export async function createParticipationRole(
  data: { name: string; sortOrder?: number; active?: boolean },
  actorUserId: string,
  req: Request,
) {
  try {
    const created = await prisma.participationRole.create({
      data: {
        name: data.name,
        sortOrder: data.sortOrder ?? 0,
        active: data.active ?? true,
      },
    });
    await writeAuditLog({
      actorUserId,
      action: "PARTICIPATION_ROLE_CREATED",
      entityType: "ParticipationRole",
      entityId: created.id,
      after: created,
      req,
    });
    return created;
  } catch (error) {
    handleUnique(error, "A participation role with this name already exists");
  }
}

export async function updateParticipationRole(
  id: string,
  data: { name?: string; sortOrder?: number; active?: boolean },
  actorUserId: string,
  req: Request,
) {
  const existing = await prisma.participationRole.findUnique({ where: { id } });
  if (!existing) throw notFound("Participation role");
  try {
    const updated = await prisma.participationRole.update({ where: { id }, data });
    await writeAuditLog({
      actorUserId,
      action: "PARTICIPATION_ROLE_UPDATED",
      entityType: "ParticipationRole",
      entityId: id,
      before: existing,
      after: updated,
      req,
    });
    return updated;
  } catch (error) {
    handleUnique(error, "A participation role with this name already exists");
  }
}

export async function listCompletionStatuses(query: Record<string, unknown>) {
  const { skip, take, page, pageSize, search, sortDirection } = parsePagination(query);
  const where = {
    ...(search ? { name: { contains: search } } : {}),
    ...(query.active === "true" ? { active: true } : {}),
    ...(query.active === "false" ? { active: false } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.completionStatus.findMany({
      where,
      skip,
      take,
      orderBy: [{ sortOrder: "asc" }, { name: sortDirection }],
    }),
    prisma.completionStatus.count({ where }),
  ]);
  return paginatedResult(items, total, page, pageSize);
}

export async function createCompletionStatus(
  data: { name: string; sortOrder?: number; active?: boolean; isFinal?: boolean },
  actorUserId: string,
  req: Request,
) {
  try {
    const created = await prisma.completionStatus.create({
      data: {
        name: data.name,
        sortOrder: data.sortOrder ?? 0,
        active: data.active ?? true,
        isFinal: data.isFinal ?? data.name.toLowerCase() === "completed",
      },
    });
    await writeAuditLog({
      actorUserId,
      action: "COMPLETION_STATUS_CREATED",
      entityType: "CompletionStatus",
      entityId: created.id,
      after: created,
      req,
    });
    return created;
  } catch (error) {
    handleUnique(error, "A completion status with this name already exists");
  }
}

export async function updateCompletionStatus(
  id: string,
  data: { name?: string; sortOrder?: number; active?: boolean; isFinal?: boolean },
  actorUserId: string,
  req: Request,
) {
  const existing = await prisma.completionStatus.findUnique({ where: { id } });
  if (!existing) throw notFound("Completion status");
  try {
    const updated = await prisma.completionStatus.update({ where: { id }, data });
    await writeAuditLog({
      actorUserId,
      action: "COMPLETION_STATUS_UPDATED",
      entityType: "CompletionStatus",
      entityId: id,
      before: existing,
      after: updated,
      req,
    });
    return updated;
  } catch (error) {
    handleUnique(error, "A completion status with this name already exists");
  }
}

export async function getActiveLookups() {
  const [trainingTypes, institutions, participationRoles, completionStatuses, settings] =
    await Promise.all([
      prisma.trainingType.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
      prisma.institution.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
      prisma.participationRole.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
      prisma.completionStatus.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
      prisma.appSetting.findUnique({ where: { id: "default" } }),
    ]);

  return {
    trainingTypes,
    institutions,
    participationRoles,
    completionStatuses,
    allowHybridDelivery: settings?.allowHybridDelivery ?? true,
  };
}

export function assertMasterName(name: string) {
  if (!name.trim()) throw validationError("Name is required");
}
