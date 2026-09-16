import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { completionRate } from "../utils/workflow.js";
import { buildAdminParticipationWhere } from "./participationService.js";

function submittedWhere(base: Prisma.TrainingParticipationWhereInput): Prisma.TrainingParticipationWhereInput {
  return {
    ...base,
    workflowStatus: base.workflowStatus ?? { not: "DRAFT" },
  };
}

export async function getDashboardSummary(query: Record<string, unknown>) {
  const base = buildAdminParticipationWhere(query);
  const submitted = submittedWhere(base);

  const [
    activeUsers,
    pendingRegistrations,
    totalPrograms,
    totalRecordsIncludingDrafts,
    submittedRecords,
    pendingReviews,
    approvedRecords,
    completed,
    notCompleted,
    local,
    foreign,
    physical,
    online,
    hybrid,
    totalOfficers,
  ] = await Promise.all([
    prisma.user.count({ where: { status: "ACTIVE", role: "USER" } }),
    prisma.user.count({ where: { status: "PENDING" } }),
    prisma.trainingProgram.count({ where: { active: true } }),
    prisma.trainingParticipation.count({ where: base }),
    prisma.trainingParticipation.count({ where: submitted }),
    prisma.trainingParticipation.count({
      where: { ...base, workflowStatus: "SUBMITTED" },
    }),
    prisma.trainingParticipation.count({
      where: { ...base, workflowStatus: "APPROVED" },
    }),
    prisma.trainingParticipation.count({
      where: { ...submitted, completionStatus: { name: "Completed" } },
    }),
    prisma.trainingParticipation.count({
      where: { ...submitted, completionStatus: { name: "Not Completed" } },
    }),
    prisma.trainingParticipation.count({
      where: { ...submitted, trainingProgram: { locationScope: "LOCAL" } },
    }),
    prisma.trainingParticipation.count({
      where: { ...submitted, trainingProgram: { locationScope: "FOREIGN" } },
    }),
    prisma.trainingParticipation.count({
      where: { ...submitted, deliveryMode: "PHYSICAL" },
    }),
    prisma.trainingParticipation.count({
      where: { ...submitted, deliveryMode: "ONLINE" },
    }),
    prisma.trainingParticipation.count({
      where: { ...submitted, deliveryMode: "HYBRID" },
    }),
    prisma.user.count({ where: { role: "USER" } }),
  ]);

  const pendingRecords = await prisma.trainingParticipation.findMany({
    where: { ...base, workflowStatus: "SUBMITTED" },
    include: {
      user: { select: { fullName: true, bankId: true } },
      trainingProgram: { select: { name: true } },
    },
    orderBy: { submittedAt: "desc" },
    take: 8,
  });

  const attendedOfficers = await prisma.trainingParticipation.findMany({
    where: { ...submitted, user: { role: "USER" } },
    select: { userId: true },
  });
  const countByOfficer = new Map<string, number>();
  for (const item of attendedOfficers) {
    countByOfficer.set(item.userId, (countByOfficer.get(item.userId) ?? 0) + 1);
  }
  const attendedIds = [...countByOfficer.keys()];
  const neverAttendedOfficers = await prisma.user.findMany({
    where: attendedIds.length ? { role: "USER", id: { notIn: attendedIds } } : { role: "USER" },
    select: { id: true, fullName: true, bankId: true, status: true },
    orderBy: { fullName: "asc" },
    take: 20,
  });

  let zero = 0;
  let one = 0;
  let two = 0;
  let threePlus = 0;
  const allOfficers = await prisma.user.findMany({ where: { role: "USER" }, select: { id: true } });
  for (const officer of allOfficers) {
    const count = countByOfficer.get(officer.id) ?? 0;
    if (count === 0) zero += 1;
    else if (count === 1) one += 1;
    else if (count === 2) two += 1;
    else threePlus += 1;
  }

  return {
    kpis: {
      activeUsers,
      pendingRegistrations,
      totalPrograms,
      totalRecordsIncludingDrafts,
      totalSubmittedRecords: submittedRecords,
      pendingReviews,
      approvedRecords,
      completedTrainings: completed,
      completionRate: completionRate(completed, notCompleted),
      localTrainings: local,
      foreignTrainings: foreign,
      physicalTrainings: physical,
      onlineTrainings: online,
      hybridTrainings: hybrid,
      totalOfficers,
      officersWithTraining: attendedIds.length,
      officersNeverAttended: Math.max(totalOfficers - attendedIds.length, 0),
    },
    attendanceBuckets: [
      { name: "0 trainings", count: zero },
      { name: "1 training", count: one },
      { name: "2 trainings", count: two },
      { name: "3+ trainings", count: threePlus },
    ],
    pendingReviewsList: pendingRecords.map((item) => ({
      id: item.id,
      officer: item.user.fullName,
      bankId: item.user.bankId,
      program: item.trainingProgram.name,
      submittedAt: item.submittedAt,
    })),
    neverAttendedOfficers,
    completionRateDefinition: "Completed / (Completed + Not Completed)",
  };
}

export async function getMonthlyParticipation(query: Record<string, unknown>) {
  const year = Number(query.year) || new Date().getUTCFullYear();
  const submitted = submittedWhere(buildAdminParticipationWhere({ ...query, year: String(year) }));
  const records = await prisma.trainingParticipation.findMany({
    where: submitted,
    select: { fromDate: true },
  });

  const months = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    label: new Date(Date.UTC(year, index, 1)).toLocaleString("en-US", { month: "short" }),
    count: 0,
  }));

  for (const record of records) {
    months[record.fromDate.getUTCMonth()].count += 1;
  }

  return { year, months };
}

export async function getDistributions(query: Record<string, unknown>) {
  const submitted = submittedWhere(buildAdminParticipationWhere(query));
  const records = await prisma.trainingParticipation.findMany({
    where: submitted,
    include: {
      participationRole: true,
      completionStatus: true,
      trainingProgram: { include: { trainingType: true } },
    },
  });

  const countBy = (keyFn: (item: (typeof records)[number]) => string) => {
    const map = new Map<string, number>();
    for (const item of records) {
      const key = keyFn(item);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([name, count]) => ({ name, count }));
  };

  return {
    locationScope: countBy((item) => item.trainingProgram.locationScope),
    deliveryMode: countBy((item) => item.deliveryMode),
    participationRole: countBy((item) => item.participationRole.name),
    completionStatus: countBy((item) => item.completionStatus.name),
    trainingType: countBy((item) => item.trainingProgram.trainingType.name),
  };
}

export async function getTopInstitutions(query: Record<string, unknown>) {
  const submitted = submittedWhere(buildAdminParticipationWhere(query));
  const records = await prisma.trainingParticipation.findMany({
    where: submitted,
    include: { trainingProgram: { include: { institution: true } } },
  });
  const map = new Map<string, { name: string; count: number }>();
  for (const item of records) {
    const id = item.trainingProgram.institution.id;
    const current = map.get(id) ?? { name: item.trainingProgram.institution.name, count: 0 };
    current.count += 1;
    map.set(id, current);
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 10);
}

export async function getTopOfficers(query: Record<string, unknown>) {
  const submitted = submittedWhere(buildAdminParticipationWhere(query));
  const records = await prisma.trainingParticipation.findMany({
    where: submitted,
    include: { user: { select: { fullName: true, bankId: true } } },
  });
  const map = new Map<string, { name: string; bankId: string; count: number }>();
  for (const item of records) {
    const current = map.get(item.userId) ?? {
      name: item.user.fullName,
      bankId: item.user.bankId,
      count: 0,
    };
    current.count += 1;
    map.set(item.userId, current);
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 10);
}
