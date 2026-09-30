import { prisma } from "../config/prisma.js";
import { notFound, validationError } from "../utils/appError.js";
import { toPublicUser } from "../utils/serialize.js";
import { getUserDashboard } from "./participationService.js";
import { trainingStatsByUser } from "./adminUserService.js";

function yearRange(query: Record<string, unknown>) {
  const fromYear = Number(query.fromYear) || 2022;
  const toYear = Number(query.toYear) || new Date().getUTCFullYear();
  if (fromYear > toYear) throw validationError("fromYear cannot be after toYear");
  return { fromYear, toYear };
}

function participationFilters(query: Record<string, unknown>) {
  const { fromYear, toYear } = yearRange(query);
  const programFilter: Record<string, unknown> = {};
  if (query.locationScope) programFilter.locationScope = String(query.locationScope);
  if (query.trainingTypeId) programFilter.trainingTypeId = String(query.trainingTypeId);

  return {
    fromYear,
    toYear,
    where: {
      workflowStatus: { not: "DRAFT" as const },
      ...(query.deliveryMode ? { deliveryMode: String(query.deliveryMode) as "PHYSICAL" | "ONLINE" | "HYBRID" } : {}),
      ...(Object.keys(programFilter).length ? { trainingProgram: programFilter } : {}),
      fromDate: {
        gte: new Date(`${fromYear}-01-01T00:00:00.000Z`),
        lte: new Date(`${toYear}-12-31T00:00:00.000Z`),
      },
    },
  };
}

async function buildPersonalTrainingDashboard(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound("User");

  const dashboard = await getUserDashboard(userId);
  const records = await prisma.trainingParticipation.findMany({
    where: { userId, workflowStatus: { not: "DRAFT" } },
    include: { trainingProgram: { select: { locationScope: true } } },
  });

  const yearMap = new Map<number, { year: number; total: number; local: number; foreign: number }>();
  for (const record of records) {
    const year = record.fromDate.getUTCFullYear();
    const current = yearMap.get(year) ?? { year, total: 0, local: 0, foreign: 0 };
    current.total += 1;
    if (record.trainingProgram.locationScope === "LOCAL") current.local += 1;
    if (record.trainingProgram.locationScope === "FOREIGN") current.foreign += 1;
    yearMap.set(year, current);
  }

  return {
    user: toPublicUser(user),
    ...dashboard,
    yearly: [...yearMap.values()].sort((a, b) => a.year - b.year),
  };
}

/** Officer-only dashboard used by admin compare and user list links. */
export async function getAdminOfficerDashboard(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { jobPosition: true },
  });
  if (!user) throw notFound("User");
  if (user.role !== "USER") throw validationError("Officer dashboards are only available for USER accounts");
  const dashboard = await buildPersonalTrainingDashboard(userId);
  return {
    ...dashboard,
    user: toPublicUser(user),
  };
}

export async function getOfficerRankings(query: Record<string, unknown>) {
  const { where, fromYear, toYear } = participationFilters(query);
  const sortBy = String(query.sortBy ?? "total");
  const allowed = new Set(["total", "local", "foreign", "physical", "online", "hybrid", "completed"]);
  if (!allowed.has(sortBy)) throw validationError("Invalid sortBy");

  const officers = await prisma.user.findMany({
    where: { role: "USER" },
    select: { id: true, fullName: true, bankId: true, status: true },
    orderBy: { fullName: "asc" },
  });

  const records = await prisma.trainingParticipation.findMany({
    where: { ...where, user: { role: "USER" } },
    include: {
      completionStatus: true,
      trainingProgram: { select: { locationScope: true } },
    },
  });

  const rows = officers.map((officer) => {
    const mine = records.filter((record) => record.userId === officer.id);
    return {
      id: officer.id,
      officer: officer.fullName,
      bankId: officer.bankId,
      status: officer.status,
      total: mine.length,
      local: mine.filter((r) => r.trainingProgram.locationScope === "LOCAL").length,
      foreign: mine.filter((r) => r.trainingProgram.locationScope === "FOREIGN").length,
      physical: mine.filter((r) => r.deliveryMode === "PHYSICAL").length,
      online: mine.filter((r) => r.deliveryMode === "ONLINE").length,
      hybrid: mine.filter((r) => r.deliveryMode === "HYBRID").length,
      completed: mine.filter((r) => r.completionStatus.name === "Completed").length,
    };
  });

  rows.sort((a, b) => {
    const diff = (b[sortBy as keyof typeof b] as number) - (a[sortBy as keyof typeof a] as number);
    if (diff !== 0) return diff;
    return a.officer.localeCompare(b.officer);
  });

  return {
    fromYear,
    toYear,
    sortBy,
    rows,
  };
}

export async function getYearlyTraining(query: Record<string, unknown>) {
  const { where, fromYear, toYear } = participationFilters(query);
  const records = await prisma.trainingParticipation.findMany({
    where,
    include: { trainingProgram: { select: { locationScope: true } } },
  });

  const years = Array.from({ length: toYear - fromYear + 1 }, (_, index) => {
    const year = fromYear + index;
    return {
      year,
      label: String(year),
      total: 0,
      local: 0,
      foreign: 0,
    };
  });
  const byYear = new Map(years.map((item) => [item.year, item]));

  for (const record of records) {
    const year = record.fromDate.getUTCFullYear();
    const bucket = byYear.get(year);
    if (!bucket) continue;
    bucket.total += 1;
    if (record.trainingProgram.locationScope === "LOCAL") bucket.local += 1;
    if (record.trainingProgram.locationScope === "FOREIGN") bucket.foreign += 1;
  }

  return {
    fromYear,
    toYear,
    locationScope: query.locationScope ? String(query.locationScope) : null,
    deliveryMode: query.deliveryMode ? String(query.deliveryMode) : null,
    years: [...byYear.values()],
  };
}

/** Trainings and attendance by job position for the admin dashboard chart. */
export async function getTrainingsByPosition(query: Record<string, unknown>) {
  const year = Number(query.year) || new Date().getUTCFullYear();
  const from = new Date(Date.UTC(year, 0, 1));
  const to = new Date(Date.UTC(year + 1, 0, 1));

  const [positions, officers, participations] = await Promise.all([
    prisma.jobPosition.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.user.findMany({
      where: { role: "USER", status: "ACTIVE" },
      select: { id: true, jobPositionId: true },
    }),
    prisma.trainingParticipation.findMany({
      where: {
        workflowStatus: { not: "DRAFT" },
        fromDate: { gte: from, lt: to },
        user: { role: "USER", status: "ACTIVE" },
      },
      select: { userId: true },
    }),
  ]);

  const trainingCountByUser = new Map<string, number>();
  for (const row of participations) {
    trainingCountByUser.set(row.userId, (trainingCountByUser.get(row.userId) ?? 0) + 1);
  }

  const rows = positions.map((position) => {
    const inPosition = officers.filter((officer) => officer.jobPositionId === position.id);
    let trainings = 0;
    let withTraining = 0;
    for (const officer of inPosition) {
      const count = trainingCountByUser.get(officer.id) ?? 0;
      trainings += count;
      if (count > 0) withTraining += 1;
    }
    return {
      id: position.id,
      label: position.name,
      trainings,
      withTraining,
      withoutTraining: Math.max(inPosition.length - withTraining, 0),
      officers: inPosition.length,
    };
  });

  const unassigned = officers.filter((officer) => !officer.jobPositionId);
  if (unassigned.length) {
    let trainings = 0;
    let withTraining = 0;
    for (const officer of unassigned) {
      const count = trainingCountByUser.get(officer.id) ?? 0;
      trainings += count;
      if (count > 0) withTraining += 1;
    }
    rows.push({
      id: "unassigned",
      label: "No position set",
      trainings,
      withTraining,
      withoutTraining: Math.max(unassigned.length - withTraining, 0),
      officers: unassigned.length,
    });
  }

  return { year, rows };
}

export async function compareOfficers(userIdA: string, userIdB: string) {
  if (!userIdA || !userIdB) throw validationError("Select two officers to compare");
  if (userIdA === userIdB) throw validationError("Choose two different officers");

  const [left, right] = await Promise.all([
    getAdminOfficerDashboard(userIdA),
    getAdminOfficerDashboard(userIdB),
  ]);

  const years = new Set<number>([...left.yearly.map((y) => y.year), ...right.yearly.map((y) => y.year)]);
  if (years.size === 0) {
    const current = new Date().getUTCFullYear();
    for (let year = current - 4; year <= current; year += 1) years.add(year);
  }
  const sortedYears = [...years].sort((a, b) => a - b);

  const yearlyCompare = sortedYears.map((year) => {
    const a = left.yearly.find((item) => item.year === year);
    const b = right.yearly.find((item) => item.year === year);
    return {
      year,
      label: String(year),
      aTotal: a?.total ?? 0,
      bTotal: b?.total ?? 0,
      aLocal: a?.local ?? 0,
      bLocal: b?.local ?? 0,
      aForeign: a?.foreign ?? 0,
      bForeign: b?.foreign ?? 0,
    };
  });

  const metricKeys = ["attended", "completed", "local", "foreign", "physical", "online", "hybrid", "approved", "pendingReview"] as const;
  const comparisonTable = metricKeys.map((key) => ({
    metric: key,
    label:
      key === "attended"
        ? "Trainings attended"
        : key === "pendingReview"
          ? "Pending review"
          : key.charAt(0).toUpperCase() + key.slice(1),
    a: left.kpis[key],
    b: right.kpis[key],
    diff: left.kpis[key] - right.kpis[key],
  }));

  return {
    a: left,
    b: right,
    comparisonTable,
    yearlyCompare,
  };
}

export async function listOfficersForSelect() {
  const users = await prisma.user.findMany({
    where: { role: "USER" },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, bankId: true, status: true },
  });
  const stats = await trainingStatsByUser(users.map((item) => item.id));
  return users.map((user) => ({
    id: user.id,
    fullName: user.fullName,
    bankId: user.bankId,
    status: user.status,
    attended: stats.get(user.id)?.attended ?? 0,
  }));
}
