import type { Prisma } from "@prisma/client";
import type { LocationScope } from "../types/domain.js";
import type { Request } from "express";
import { prisma } from "../config/prisma.js";
import { notFound, validationError } from "../utils/appError.js";
import { parsePagination, paginatedResult } from "../utils/pagination.js";
import { writeAuditLog } from "../utils/audit.js";
import { createInstitution } from "./masterDataService.js";

const programInclude = {
  trainingType: true,
  institution: true,
  createdBy: { select: { id: true, fullName: true, bankId: true } },
  _count: { select: { participations: true } },
} satisfies Prisma.TrainingProgramInclude;

function materialFields(program: {
  name: string;
  locationScope: string;
  trainingTypeId: string;
  institutionId: string;
  venue: string;
}) {
  return {
    name: program.name,
    locationScope: program.locationScope,
    trainingTypeId: program.trainingTypeId,
    institutionId: program.institutionId,
    venue: program.venue,
  };
}

export async function hasLockedParticipations(trainingProgramId: string) {
  const count = await prisma.trainingParticipation.count({
    where: {
      trainingProgramId,
      workflowStatus: { in: ["SUBMITTED", "RETURNED", "APPROVED", "REJECTED"] },
    },
  });
  return count > 0;
}

async function resolveInstitutionId(
  actorUserId: string,
  req: Request,
  institutionId?: string,
  institutionName?: string,
) {
  if (institutionId) {
    const existing = await prisma.institution.findUnique({ where: { id: institutionId } });
    if (!existing) throw validationError("Selected institution was not found");
    return existing.id;
  }
  if (institutionName) {
    const existing = await prisma.institution.findFirst({
      where: { name: institutionName },
    });
    if (existing) return existing.id;
    const created = await createInstitution({ name: institutionName, active: true }, actorUserId, req);
    return created!.id;
  }
  throw validationError("Institution is required");
}

export async function listPrograms(query: Record<string, unknown>, activeOnly = false) {
  const { skip, take, page, pageSize, search } = parsePagination(query);
  const where: Prisma.TrainingProgramWhereInput = {
    ...(activeOnly || query.active === "true" ? { active: true } : {}),
    ...(query.active === "false" ? { active: false } : {}),
    ...(query.locationScope ? { locationScope: query.locationScope as LocationScope } : {}),
    ...(query.trainingTypeId ? { trainingTypeId: String(query.trainingTypeId) } : {}),
    ...(query.institutionId ? { institutionId: String(query.institutionId) } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { venue: { contains: search } },
            { institution: { name: { contains: search } } },
            { trainingType: { name: { contains: search } } },
            { description: { contains: search } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.trainingProgram.findMany({
      where,
      include: programInclude,
      skip,
      take,
      orderBy: { name: "asc" },
    }),
    prisma.trainingProgram.count({ where }),
  ]);

  return paginatedResult(items, total, page, pageSize);
}

export async function getProgram(id: string) {
  const program = await prisma.trainingProgram.findUnique({
    where: { id },
    include: programInclude,
  });
  if (!program) throw notFound("Training program");
  return program;
}

export async function createProgram(
  data: {
    name: string;
    locationScope: LocationScope;
    trainingTypeId: string;
    institutionId?: string;
    institutionName?: string;
    venue: string;
    description?: string | null;
    active?: boolean;
  },
  actorUserId: string,
  req: Request,
) {
  const type = await prisma.trainingType.findUnique({ where: { id: data.trainingTypeId } });
  if (!type || !type.active) throw validationError("Select a valid training type");

  const institutionId = await resolveInstitutionId(
    actorUserId,
    req,
    data.institutionId,
    data.institutionName,
  );

  const created = await prisma.trainingProgram.create({
    data: {
      name: data.name,
      locationScope: data.locationScope,
      trainingTypeId: data.trainingTypeId,
      institutionId,
      venue: data.venue,
      description: data.description ?? null,
      active: data.active ?? true,
      createdById: actorUserId,
    },
    include: programInclude,
  });

  await writeAuditLog({
    actorUserId,
    action: "TRAINING_PROGRAM_CREATED",
    entityType: "TrainingProgram",
    entityId: created.id,
    after: created,
    req,
  });

  return created;
}

export async function updateProgram(
  id: string,
  data: {
    name?: string;
    locationScope?: LocationScope;
    trainingTypeId?: string;
    institutionId?: string;
    institutionName?: string;
    venue?: string;
    description?: string | null;
    active?: boolean;
  },
  actorUserId: string,
  req: Request,
) {
  const existing = await getProgram(id);
  const nextInstitutionId = data.institutionId || data.institutionName
    ? await resolveInstitutionId(actorUserId, req, data.institutionId, data.institutionName)
    : existing.institutionId;

  const next = {
    name: data.name ?? existing.name,
    locationScope: data.locationScope ?? existing.locationScope,
    trainingTypeId: data.trainingTypeId ?? existing.trainingTypeId,
    institutionId: nextInstitutionId,
    venue: data.venue ?? existing.venue,
  };

  const materialChanged =
    JSON.stringify(materialFields(existing)) !== JSON.stringify(materialFields(next));

  if (materialChanged && (await hasLockedParticipations(id))) {
    throw validationError(
      "This program already has submitted or approved participation records. Create a new program instead of changing its core details.",
    );
  }

  const updated = await prisma.trainingProgram.update({
    where: { id },
    data: {
      ...next,
      description: data.description === undefined ? existing.description : data.description,
      active: data.active ?? existing.active,
    },
    include: programInclude,
  });

  await writeAuditLog({
    actorUserId,
    action: data.active === false ? "TRAINING_PROGRAM_ARCHIVED" : "TRAINING_PROGRAM_UPDATED",
    entityType: "TrainingProgram",
    entityId: id,
    before: existing,
    after: updated,
    req,
  });

  return updated;
}

export async function archiveProgram(id: string, actorUserId: string, req: Request) {
  return updateProgram(id, { active: false }, actorUserId, req);
}

export async function reactivateProgram(id: string, actorUserId: string, req: Request) {
  return updateProgram(id, { active: true }, actorUserId, req);
}
