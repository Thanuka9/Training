import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { PrismaClient } from "@prisma/client";

type WorkbookMasterData = {
  trainingTypes: string[];
  institutions: string[];
  participationRoles: string[];
  completionStatuses: Array<{ name: string; isFinal: boolean }>;
  trainingPrograms: Array<{
    name: string;
    locationScope: "LOCAL" | "FOREIGN";
    trainingType: string;
    institution: string;
    venue: string;
  }>;
};

function loadWorkbookMasterData(): WorkbookMasterData {
  const path = fileURLToPath(new URL("../data/workbookMasterData.json", import.meta.url));
  return JSON.parse(readFileSync(path, "utf8")) as WorkbookMasterData;
}

/**
 * Upserts all Type / Institution / Role / Completion / Training Program values
 * extracted from the official 2025 register templates.
 */
export async function syncWorkbookMasterData(prisma: PrismaClient, createdById: string) {
  const data = loadWorkbookMasterData();
  const typeIds = new Map<string, string>();
  const institutionIds = new Map<string, string>();

  let typesCreated = 0;
  let institutionsCreated = 0;
  let rolesCreated = 0;
  let programsCreated = 0;

  for (const [index, name] of data.trainingTypes.entries()) {
    const existing = await prisma.trainingType.findUnique({ where: { name } });
    if (existing) {
      typeIds.set(name, existing.id);
      if (!existing.active) {
        await prisma.trainingType.update({ where: { id: existing.id }, data: { active: true } });
      }
      continue;
    }
    const created = await prisma.trainingType.create({
      data: { name, active: true, sortOrder: index + 1 },
    });
    typeIds.set(name, created.id);
    typesCreated += 1;
  }

  for (const name of data.institutions) {
    const existing = await prisma.institution.findUnique({ where: { name } });
    if (existing) {
      institutionIds.set(name, existing.id);
      if (!existing.active) {
        await prisma.institution.update({ where: { id: existing.id }, data: { active: true } });
      }
      continue;
    }
    const created = await prisma.institution.create({ data: { name, active: true } });
    institutionIds.set(name, created.id);
    institutionsCreated += 1;
  }

  for (const [index, name] of data.participationRoles.entries()) {
    const existing = await prisma.participationRole.findUnique({ where: { name } });
    if (existing) {
      if (!existing.active) {
        await prisma.participationRole.update({ where: { id: existing.id }, data: { active: true } });
      }
      continue;
    }
    await prisma.participationRole.create({ data: { name, active: true, sortOrder: index + 1 } });
    rolesCreated += 1;
  }

  for (const [index, item] of data.completionStatuses.entries()) {
    const existing = await prisma.completionStatus.findUnique({ where: { name: item.name } });
    if (existing) {
      if (!existing.active) {
        await prisma.completionStatus.update({
          where: { id: existing.id },
          data: { active: true, isFinal: item.isFinal },
        });
      }
      continue;
    }
    await prisma.completionStatus.create({
      data: { name: item.name, active: true, isFinal: item.isFinal, sortOrder: index + 1 },
    });
  }

  for (const program of data.trainingPrograms) {
    const trainingTypeId =
      typeIds.get(program.trainingType) ??
      (
        await prisma.trainingType.upsert({
          where: { name: program.trainingType },
          update: { active: true },
          create: { name: program.trainingType, active: true, sortOrder: 500 },
        })
      ).id;
    typeIds.set(program.trainingType, trainingTypeId);

    const institutionId =
      institutionIds.get(program.institution) ??
      (
        await prisma.institution.upsert({
          where: { name: program.institution },
          update: { active: true },
          create: { name: program.institution, active: true },
        })
      ).id;
    institutionIds.set(program.institution, institutionId);

    const existing = await prisma.trainingProgram.findFirst({
      where: {
        name: program.name,
        locationScope: program.locationScope,
        trainingTypeId,
        institutionId,
        venue: program.venue,
      },
    });
    if (existing) {
      if (!existing.active) {
        await prisma.trainingProgram.update({ where: { id: existing.id }, data: { active: true } });
      }
      continue;
    }

    await prisma.trainingProgram.create({
      data: {
        name: program.name,
        locationScope: program.locationScope,
        trainingTypeId,
        institutionId,
        venue: program.venue,
        description: "From official training register template",
        active: true,
        createdById,
      },
    });
    programsCreated += 1;
  }

  return {
    trainingTypes: data.trainingTypes.length,
    institutions: data.institutions.length,
    participationRoles: data.participationRoles.length,
    trainingPrograms: data.trainingPrograms.length,
    created: { typesCreated, institutionsCreated, rolesCreated, programsCreated },
  };
}
