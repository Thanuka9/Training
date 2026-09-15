import ExcelJS from "exceljs";
import { prisma } from "../config/prisma.js";
import { buildAdminParticipationWhere, participationInclude } from "./participationService.js";
import { completionRate } from "../utils/workflow.js";

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export async function getTrainingRegister(query: Record<string, unknown>) {
  const where = buildAdminParticipationWhere(query);
  const records = await prisma.trainingParticipation.findMany({
    where,
    include: participationInclude,
    orderBy: [{ user: { fullName: "asc" } }, { fromDate: "asc" }],
  });

  return records.map((record, index) => ({
    no: index + 1,
    officerName: record.user.fullName,
    bankId: record.user.bankId,
    trainingProgram: record.trainingProgram.name,
    locationScope: record.trainingProgram.locationScope,
    deliveryMode: record.deliveryMode,
    trainingType: record.trainingProgram.trainingType.name,
    participatingAs: record.participationRole.name,
    fromDate: isoDate(record.fromDate),
    toDate: isoDate(record.toDate),
    institution: record.trainingProgram.institution.name,
    venue: record.trainingProgram.venue,
    completionStatus: record.completionStatus.name,
    workflowStatus: record.workflowStatus,
  }));
}

export async function getOfficerSummary(query: Record<string, unknown>) {
  const where = buildAdminParticipationWhere(query);
  const [records, roles] = await Promise.all([
    prisma.trainingParticipation.findMany({
      where: { ...where, workflowStatus: { not: "DRAFT" } },
      include: {
        user: { select: { fullName: true, bankId: true } },
        participationRole: true,
        trainingProgram: { select: { locationScope: true } },
      },
    }),
    prisma.participationRole.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);

  const deliveryModes = ["PHYSICAL", "ONLINE", "HYBRID"] as const;
  const locations = ["LOCAL", "FOREIGN"] as const;
  const columns = roles.flatMap((role) =>
    locations.flatMap((location) =>
      deliveryModes.map((mode) => ({
        key: `${role.name}|${location}|${mode}`,
        label: `${role.name} - ${location === "LOCAL" ? "Local" : "Foreign"} - ${mode.charAt(0)}${mode.slice(1).toLowerCase()}`,
      })),
    ),
  );

  const officers = new Map<
    string,
    { officer: string; bankId: string; counts: Record<string, number>; total: number }
  >();

  for (const record of records) {
    const current = officers.get(record.userId) ?? {
      officer: record.user.fullName,
      bankId: record.user.bankId,
      counts: Object.fromEntries(columns.map((column) => [column.key, 0])),
      total: 0,
    };
    const key = `${record.participationRole.name}|${record.trainingProgram.locationScope}|${record.deliveryMode}`;
    current.counts[key] = (current.counts[key] ?? 0) + 1;
    current.total += 1;
    officers.set(record.userId, current);
  }

  return {
    columns,
    rows: [...officers.values()].sort((a, b) => a.officer.localeCompare(b.officer)),
  };
}

export async function getProgramSummary(query: Record<string, unknown>) {
  const where = buildAdminParticipationWhere(query);
  const records = await prisma.trainingParticipation.findMany({
    where: { ...where, workflowStatus: { not: "DRAFT" } },
    include: {
      completionStatus: true,
      trainingProgram: { include: { trainingType: true, institution: true } },
    },
  });

  const map = new Map<
    string,
    {
      program: string;
      locationScope: string;
      type: string;
      institution: string;
      participants: number;
      completed: number;
      notCompleted: number;
    }
  >();

  for (const record of records) {
    const current = map.get(record.trainingProgramId) ?? {
      program: record.trainingProgram.name,
      locationScope: record.trainingProgram.locationScope,
      type: record.trainingProgram.trainingType.name,
      institution: record.trainingProgram.institution.name,
      participants: 0,
      completed: 0,
      notCompleted: 0,
    };
    current.participants += 1;
    if (record.completionStatus.name === "Completed") current.completed += 1;
    if (record.completionStatus.name === "Not Completed") current.notCompleted += 1;
    map.set(record.trainingProgramId, current);
  }

  return [...map.values()].map((item) => ({
    ...item,
    completionRate: completionRate(item.completed, item.notCompleted),
  }));
}

export async function getInstitutionSummary(query: Record<string, unknown>) {
  const programs = await prisma.trainingProgram.findMany({
    include: {
      institution: true,
      participations: {
        where: { ...buildAdminParticipationWhere(query), workflowStatus: { not: "DRAFT" } },
        include: { completionStatus: true },
      },
    },
  });

  const map = new Map<
    string,
    { institution: string; programs: number; participations: number; completed: number }
  >();

  for (const program of programs) {
    const current = map.get(program.institutionId) ?? {
      institution: program.institution.name,
      programs: 0,
      participations: 0,
      completed: 0,
    };
    current.programs += 1;
    current.participations += program.participations.length;
    current.completed += program.participations.filter((item) => item.completionStatus.name === "Completed").length;
    map.set(program.institutionId, current);
  }

  return [...map.values()].sort((a, b) => a.institution.localeCompare(b.institution));
}

export async function buildRegisterWorkbook(query: Record<string, unknown>) {
  const rows = await getTrainingRegister(query);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Training Management Portal";
  const sheet = workbook.addWorksheet("Training Register");
  sheet.columns = [
    { header: "No.", key: "no", width: 8 },
    { header: "Name of the Officer", key: "officerName", width: 28 },
    { header: "Bank ID", key: "bankId", width: 14 },
    { header: "Name of the Training Program", key: "trainingProgram", width: 40 },
    { header: "Local / Foreign", key: "locationScope", width: 16 },
    { header: "Physical / Online", key: "deliveryMode", width: 18 },
    { header: "Type of Training", key: "trainingType", width: 22 },
    { header: "Participating the Training as", key: "participatingAs", width: 26 },
    { header: "From", key: "fromDate", width: 14 },
    { header: "To", key: "toDate", width: 14 },
    { header: "Institution", key: "institution", width: 24 },
    { header: "Venue", key: "venue", width: 24 },
    { header: "Status of Completion", key: "completionStatus", width: 20 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.addRows(rows);
  return workbook;
}

export { toCsv } from "../utils/csv.js";
