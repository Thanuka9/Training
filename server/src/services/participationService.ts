import type { Prisma } from "@prisma/client";
import type { DeliveryMode, WorkflowStatus } from "../types/domain.js";
import type { Request } from "express";
import { prisma } from "../config/prisma.js";
import { forbidden, notFound, validationError } from "../utils/appError.js";
import { parsePagination, paginatedResult } from "../utils/pagination.js";
import { writeAuditLog } from "../utils/audit.js";
import { assertTransition, assertUserCanEdit, datesAreValid } from "../utils/workflow.js";
import { AppError } from "../utils/appError.js";

export const participationInclude = {
  trainingProgram: {
    include: {
      trainingType: true,
      institution: true,
    },
  },
  participationRole: true,
  completionStatus: true,
  user: { select: { id: true, bankId: true, fullName: true, role: true, status: true } },
  approvedBy: { select: { id: true, bankId: true, fullName: true } },
} satisfies Prisma.TrainingParticipationInclude;

function parseDate(value: string, field: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw validationError(`${field} is not a valid date`);
  }
  return date;
}

async function assertLookups(input: {
  trainingProgramId: string;
  participationRoleId: string;
  completionStatusId: string;
  deliveryMode: string;
  requireActiveProgram?: boolean;
}) {
  const [program, role, completion, settings] = await Promise.all([
    prisma.trainingProgram.findUnique({ where: { id: input.trainingProgramId } }),
    prisma.participationRole.findUnique({ where: { id: input.participationRoleId } }),
    prisma.completionStatus.findUnique({ where: { id: input.completionStatusId } }),
    prisma.appSetting.findUnique({ where: { id: "default" } }),
  ]);

  if (!program || (input.requireActiveProgram && !program.active)) {
    throw validationError("Select a valid training program");
  }
  if (!role || !role.active) throw validationError("Select a valid participation role");
  if (!completion || !completion.active) throw validationError("Select a valid completion status");
  if (input.deliveryMode === "HYBRID" && settings && !settings.allowHybridDelivery) {
    throw validationError("Hybrid delivery is currently disabled");
  }

  return { program, role, completion };
}

/** Soft duplicate check: same officer + same programme + same From/To dates.
 * Officers may attend many different programmes in the same year; that is allowed.
 * Only an exact programme+date rematch prompts confirmDuplicate. */
async function findDuplicate(params: {
  userId: string;
  trainingProgramId: string;
  fromDate: Date;
  toDate: Date;
  excludeId?: string;
}) {
  return prisma.trainingParticipation.findFirst({
    where: {
      userId: params.userId,
      trainingProgramId: params.trainingProgramId,
      fromDate: params.fromDate,
      toDate: params.toDate,
      ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
    },
  });
}

export function serializeParticipation(
  record: Prisma.TrainingParticipationGetPayload<{ include: typeof participationInclude }>,
) {
  return {
    id: record.id,
    deliveryMode: record.deliveryMode,
    fromDate: record.fromDate,
    toDate: record.toDate,
    remarks: record.remarks,
    workflowStatus: record.workflowStatus,
    adminComment: record.adminComment,
    submittedAt: record.submittedAt,
    approvedAt: record.approvedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    officer: record.user,
    approvedBy: record.approvedBy,
    participationRole: record.participationRole,
    completionStatus: record.completionStatus,
    trainingProgram: {
      id: record.trainingProgram.id,
      name: record.trainingProgram.name,
      locationScope: record.trainingProgram.locationScope,
      venue: record.trainingProgram.venue,
      description: record.trainingProgram.description,
      active: record.trainingProgram.active,
      trainingType: record.trainingProgram.trainingType,
      institution: record.trainingProgram.institution,
    },
  };
}

export async function getUserDashboard(userId: string) {
  const [all, local, foreign, physical, online, hybrid] = await Promise.all([
    prisma.trainingParticipation.findMany({
      where: { userId },
      include: { completionStatus: true, participationRole: true, trainingProgram: { select: { locationScope: true } } },
    }),
    prisma.trainingParticipation.count({
      where: { userId, trainingProgram: { locationScope: "LOCAL" } },
    }),
    prisma.trainingParticipation.count({
      where: { userId, trainingProgram: { locationScope: "FOREIGN" } },
    }),
    prisma.trainingParticipation.count({
      where: { userId, deliveryMode: "PHYSICAL" },
    }),
    prisma.trainingParticipation.count({
      where: { userId, deliveryMode: "ONLINE" },
    }),
    prisma.trainingParticipation.count({
      where: { userId, deliveryMode: "HYBRID" },
    }),
  ]);

  const recent = await prisma.trainingParticipation.findMany({
    where: { userId },
    include: participationInclude,
    orderBy: { updatedAt: "desc" },
    take: 8,
  });

  const countBy = (keyFn: (item: (typeof all)[number]) => string) => {
    const map = new Map<string, number>();
    for (const item of all) {
      if (item.workflowStatus === "DRAFT") continue;
      const key = keyFn(item);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([name, count]) => ({ name, count }));
  };

  const attended = all.filter((item) => item.workflowStatus !== "DRAFT");

  return {
    kpis: {
      total: all.length,
      draft: all.filter((item) => item.workflowStatus === "DRAFT").length,
      pendingReview: all.filter((item) => item.workflowStatus === "SUBMITTED").length,
      approved: all.filter((item) => item.workflowStatus === "APPROVED").length,
      completed: all.filter((item) => item.completionStatus.name === "Completed").length,
      local,
      foreign,
      physical,
      online,
      hybrid,
      attended: attended.length,
    },
    distributions: {
      locationScope: countBy((item) => item.trainingProgram.locationScope),
      deliveryMode: countBy((item) => item.deliveryMode),
      completionStatus: countBy((item) => item.completionStatus.name),
      participationRole: countBy((item) => item.participationRole.name),
    },
    recent: recent.map(serializeParticipation),
  };
}

export async function listUserParticipations(userId: string, query: Record<string, unknown>) {
  const { skip, take, page, pageSize, search, sortDirection } = parsePagination(query);
  const where: Prisma.TrainingParticipationWhereInput = {
    userId,
    ...(query.workflowStatus ? { workflowStatus: query.workflowStatus as WorkflowStatus } : {}),
    ...(search
      ? {
          trainingProgram: {
            OR: [{ name: { contains: search } }, { institution: { name: { contains: search } } }],
          },
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.trainingParticipation.findMany({
      where,
      include: participationInclude,
      skip,
      take,
      orderBy: { updatedAt: sortDirection },
    }),
    prisma.trainingParticipation.count({ where }),
  ]);

  return paginatedResult(items.map(serializeParticipation), total, page, pageSize);
}

export async function getUserParticipation(userId: string, id: string) {
  const record = await prisma.trainingParticipation.findUnique({
    where: { id },
    include: participationInclude,
  });
  if (!record || record.userId !== userId) throw notFound("Training record");
  return serializeParticipation(record);
}

export async function createUserParticipation(
  userId: string,
  input: {
    trainingProgramId: string;
    deliveryMode: DeliveryMode;
    participationRoleId: string;
    fromDate: string;
    toDate: string;
    completionStatusId: string;
    remarks?: string | null;
    confirmDuplicate?: boolean;
  },
  req: Request,
) {
  const fromDate = parseDate(input.fromDate, "From date");
  const toDate = parseDate(input.toDate, "To date");
  if (!datesAreValid(fromDate, toDate)) {
    throw validationError("To date must be on or after from date");
  }

  await assertLookups({ ...input, requireActiveProgram: true });

  const duplicate = await findDuplicate({
    userId,
    trainingProgramId: input.trainingProgramId,
    fromDate,
    toDate,
  });
  if (duplicate && !input.confirmDuplicate) {
    throw new AppError(
      409,
      "DUPLICATE_PARTICIPATION",
      "A record already exists for this program and date range. Confirm to save anyway.",
      { existingId: duplicate.id },
    );
  }

  const created = await prisma.trainingParticipation.create({
    data: {
      userId,
      trainingProgramId: input.trainingProgramId,
      deliveryMode: input.deliveryMode,
      participationRoleId: input.participationRoleId,
      fromDate,
      toDate,
      completionStatusId: input.completionStatusId,
      remarks: input.remarks ?? null,
      workflowStatus: "DRAFT",
    },
    include: participationInclude,
  });

  await writeAuditLog({
    actorUserId: userId,
    action: "PARTICIPATION_CREATED",
    entityType: "TrainingParticipation",
    entityId: created.id,
    after: serializeParticipation(created),
    req,
  });

  return serializeParticipation(created);
}

export async function updateUserParticipation(
  userId: string,
  id: string,
  input: {
    trainingProgramId?: string;
    deliveryMode?: DeliveryMode;
    participationRoleId?: string;
    fromDate?: string;
    toDate?: string;
    completionStatusId?: string;
    remarks?: string | null;
    confirmDuplicate?: boolean;
  },
  req: Request,
) {
  const existing = await prisma.trainingParticipation.findUnique({
    where: { id },
    include: participationInclude,
  });
  if (!existing || existing.userId !== userId) throw notFound("Training record");
  assertUserCanEdit(existing.workflowStatus);

  const trainingProgramId = input.trainingProgramId ?? existing.trainingProgramId;
  const deliveryMode = (input.deliveryMode ?? existing.deliveryMode) as DeliveryMode;
  const participationRoleId = input.participationRoleId ?? existing.participationRoleId;
  const completionStatusId = input.completionStatusId ?? existing.completionStatusId;
  const fromDate = input.fromDate ? parseDate(input.fromDate, "From date") : existing.fromDate;
  const toDate = input.toDate ? parseDate(input.toDate, "To date") : existing.toDate;

  if (!datesAreValid(fromDate, toDate)) {
    throw validationError("To date must be on or after from date");
  }

  await assertLookups({
    trainingProgramId,
    deliveryMode,
    participationRoleId,
    completionStatusId,
    requireActiveProgram: true,
  });

  const duplicate = await findDuplicate({
    userId,
    trainingProgramId,
    fromDate,
    toDate,
    excludeId: id,
  });
  if (duplicate && !input.confirmDuplicate) {
    throw new AppError(
      409,
      "DUPLICATE_PARTICIPATION",
      "A record already exists for this program and date range. Confirm to save anyway.",
      { existingId: duplicate.id },
    );
  }

  const updated = await prisma.trainingParticipation.update({
    where: { id },
    data: {
      trainingProgramId,
      deliveryMode,
      participationRoleId,
      completionStatusId,
      fromDate,
      toDate,
      remarks: input.remarks === undefined ? existing.remarks : input.remarks,
    },
    include: participationInclude,
  });

  await writeAuditLog({
    actorUserId: userId,
    action: "PARTICIPATION_UPDATED",
    entityType: "TrainingParticipation",
    entityId: id,
    before: serializeParticipation(existing),
    after: serializeParticipation(updated),
    req,
  });

  return serializeParticipation(updated);
}

export async function submitUserParticipation(userId: string, id: string, req: Request) {
  const existing = await prisma.trainingParticipation.findUnique({
    where: { id },
    include: participationInclude,
  });
  if (!existing || existing.userId !== userId) throw notFound("Training record");
  assertUserCanEdit(existing.workflowStatus);
  assertTransition(existing.workflowStatus, "SUBMITTED");

  const updated = await prisma.trainingParticipation.update({
    where: { id },
    data: {
      workflowStatus: "SUBMITTED",
      submittedAt: new Date(),
      adminComment: existing.workflowStatus === "RETURNED" ? existing.adminComment : null,
    },
    include: participationInclude,
  });

  await writeAuditLog({
    actorUserId: userId,
    action: "PARTICIPATION_SUBMITTED",
    entityType: "TrainingParticipation",
    entityId: id,
    before: serializeParticipation(existing),
    after: serializeParticipation(updated),
    req,
  });

  return serializeParticipation(updated);
}

export function buildAdminParticipationWhere(query: Record<string, unknown>) {
  const search = typeof query.search === "string" ? query.search.trim() : "";
  const where: Prisma.TrainingParticipationWhereInput = {
    ...(query.workflowStatus ? { workflowStatus: query.workflowStatus as WorkflowStatus } : {}),
    ...(query.deliveryMode ? { deliveryMode: query.deliveryMode as DeliveryMode } : {}),
    ...(query.participationRoleId ? { participationRoleId: String(query.participationRoleId) } : {}),
    ...(query.completionStatusId ? { completionStatusId: String(query.completionStatusId) } : {}),
    ...(query.trainingProgramId ? { trainingProgramId: String(query.trainingProgramId) } : {}),
    ...(query.userId ? { userId: String(query.userId) } : {}),
    ...(query.bankId ? { user: { bankId: { contains: String(query.bankId) } } } : {}),
    ...(query.officer ? { user: { fullName: { contains: String(query.officer) } } } : {}),
    ...(query.locationScope
      ? { trainingProgram: { locationScope: query.locationScope as "LOCAL" | "FOREIGN" } }
      : {}),
    ...(query.trainingTypeId
      ? { trainingProgram: { trainingTypeId: String(query.trainingTypeId) } }
      : {}),
    ...(query.institutionId ? { trainingProgram: { institutionId: String(query.institutionId) } } : {}),
    ...(query.from || query.to
      ? {
          fromDate: {
            ...(query.from ? { gte: parseDate(String(query.from), "From") } : {}),
            ...(query.to ? { lte: parseDate(String(query.to), "To") } : {}),
          },
        }
      : {}),
    ...(query.year
      ? {
          fromDate: {
            gte: new Date(`${query.year}-01-01T00:00:00.000Z`),
            lte: new Date(`${query.year}-12-31T00:00:00.000Z`),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { user: { fullName: { contains: search } } },
            { user: { bankId: { contains: search } } },
            { trainingProgram: { name: { contains: search } } },
            { trainingProgram: { venue: { contains: search } } },
            { trainingProgram: { institution: { name: { contains: search } } } },
          ],
        }
      : {}),
  };

  return where;
}

export async function listAdminParticipations(query: Record<string, unknown>) {
  const { skip, take, page, pageSize, sortDirection } = parsePagination(query);
  const where = buildAdminParticipationWhere(query);
  const [items, total] = await prisma.$transaction([
    prisma.trainingParticipation.findMany({
      where,
      include: participationInclude,
      skip,
      take,
      orderBy: { updatedAt: sortDirection },
    }),
    prisma.trainingParticipation.count({ where }),
  ]);
  return paginatedResult(items.map(serializeParticipation), total, page, pageSize);
}

export async function getAdminParticipation(id: string) {
  const record = await prisma.trainingParticipation.findUnique({
    where: { id },
    include: participationInclude,
  });
  if (!record) throw notFound("Training record");

  const audit = await prisma.auditLog.findMany({
    where: { entityType: "TrainingParticipation", entityId: id },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { fullName: true, bankId: true } } },
  });

  return {
    record: serializeParticipation(record),
    audit: audit.map((item) => ({
      id: item.id,
      action: item.action,
      createdAt: item.createdAt,
      actor: item.actor,
      before: item.beforeJson ? JSON.parse(item.beforeJson) : null,
      after: item.afterJson ? JSON.parse(item.afterJson) : null,
    })),
  };
}

export async function adminUpdateParticipation(
  id: string,
  input: {
    deliveryMode?: DeliveryMode;
    participationRoleId?: string;
    fromDate?: string;
    toDate?: string;
    completionStatusId?: string;
    remarks?: string | null;
  },
  actorUserId: string,
  req: Request,
) {
  const existing = await prisma.trainingParticipation.findUnique({
    where: { id },
    include: participationInclude,
  });
  if (!existing) throw notFound("Training record");

  const fromDate = input.fromDate ? parseDate(input.fromDate, "From date") : existing.fromDate;
  const toDate = input.toDate ? parseDate(input.toDate, "To date") : existing.toDate;
  if (!datesAreValid(fromDate, toDate)) {
    throw validationError("To date must be on or after from date");
  }

  await assertLookups({
    trainingProgramId: existing.trainingProgramId,
    deliveryMode: input.deliveryMode ?? existing.deliveryMode,
    participationRoleId: input.participationRoleId ?? existing.participationRoleId,
    completionStatusId: input.completionStatusId ?? existing.completionStatusId,
  });

  const updated = await prisma.trainingParticipation.update({
    where: { id },
    data: {
      deliveryMode: input.deliveryMode ?? existing.deliveryMode,
      participationRoleId: input.participationRoleId ?? existing.participationRoleId,
      completionStatusId: input.completionStatusId ?? existing.completionStatusId,
      fromDate,
      toDate,
      remarks: input.remarks === undefined ? existing.remarks : input.remarks,
    },
    include: participationInclude,
  });

  await writeAuditLog({
    actorUserId,
    action: "PARTICIPATION_UPDATED",
    entityType: "TrainingParticipation",
    entityId: id,
    before: serializeParticipation(existing),
    after: serializeParticipation(updated),
    req,
  });

  return serializeParticipation(updated);
}

export async function approveParticipation(id: string, actorUserId: string, req: Request) {
  const existing = await prisma.trainingParticipation.findUnique({
    where: { id },
    include: participationInclude,
  });
  if (!existing) throw notFound("Training record");
  assertTransition(existing.workflowStatus, "APPROVED");

  const updated = await prisma.trainingParticipation.update({
    where: { id },
    data: {
      workflowStatus: "APPROVED",
      approvedAt: new Date(),
      approvedById: actorUserId,
    },
    include: participationInclude,
  });

  await writeAuditLog({
    actorUserId,
    action: "PARTICIPATION_APPROVED",
    entityType: "TrainingParticipation",
    entityId: id,
    before: serializeParticipation(existing),
    after: serializeParticipation(updated),
    req,
  });

  return serializeParticipation(updated);
}

export async function returnParticipation(
  id: string,
  comment: string,
  actorUserId: string,
  req: Request,
) {
  const existing = await prisma.trainingParticipation.findUnique({
    where: { id },
    include: participationInclude,
  });
  if (!existing) throw notFound("Training record");
  assertTransition(existing.workflowStatus, "RETURNED");
  if (!comment.trim()) throw validationError("A return note is required");

  const updated = await prisma.trainingParticipation.update({
    where: { id },
    data: {
      workflowStatus: "RETURNED",
      adminComment: comment.trim(),
      approvedAt: null,
      approvedById: null,
    },
    include: participationInclude,
  });

  await writeAuditLog({
    actorUserId,
    action: "PARTICIPATION_RETURNED",
    entityType: "TrainingParticipation",
    entityId: id,
    before: serializeParticipation(existing),
    after: serializeParticipation(updated),
    req,
  });

  return serializeParticipation(updated);
}

export async function rejectParticipation(
  id: string,
  comment: string,
  actorUserId: string,
  req: Request,
) {
  const existing = await prisma.trainingParticipation.findUnique({
    where: { id },
    include: participationInclude,
  });
  if (!existing) throw notFound("Training record");
  assertTransition(existing.workflowStatus, "REJECTED");
  if (!comment.trim()) throw validationError("A rejection reason is required");

  const updated = await prisma.trainingParticipation.update({
    where: { id },
    data: {
      workflowStatus: "REJECTED",
      adminComment: comment.trim(),
    },
    include: participationInclude,
  });

  await writeAuditLog({
    actorUserId,
    action: "PARTICIPATION_REJECTED",
    entityType: "TrainingParticipation",
    entityId: id,
    before: serializeParticipation(existing),
    after: serializeParticipation(updated),
    req,
  });

  return serializeParticipation(updated);
}

export function assertNotCrossUser(recordUserId: string, currentUserId: string) {
  if (recordUserId !== currentUserId) throw forbidden();
}
