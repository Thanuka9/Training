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
    where: {
      ...where,
      ...(query.workflowStatus ? {} : { workflowStatus: { not: "DRAFT" } }),
    },
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
    {
      officer: string;
      bankId: string;
      counts: Record<string, number>;
      total: number;
      neverAttended: boolean;
    }
  >();

  const allOfficers = await prisma.user.findMany({
    where: { role: "USER" },
    select: { id: true, fullName: true, bankId: true },
    orderBy: { fullName: "asc" },
  });

  for (const officer of allOfficers) {
    officers.set(officer.id, {
      officer: officer.fullName,
      bankId: officer.bankId,
      counts: Object.fromEntries(columns.map((column) => [column.key, 0])),
      total: 0,
      neverAttended: true,
    });
  }

  for (const record of records) {
    const current = officers.get(record.userId) ?? {
      officer: record.user.fullName,
      bankId: record.user.bankId,
      counts: Object.fromEntries(columns.map((column) => [column.key, 0])),
      total: 0,
      neverAttended: true,
    };
    const key = `${record.participationRole.name}|${record.trainingProgram.locationScope}|${record.deliveryMode}`;
    current.counts[key] = (current.counts[key] ?? 0) + 1;
    current.total += 1;
    current.neverAttended = current.total === 0;
    officers.set(record.userId, current);
  }

  const rows = [...officers.values()].sort((a, b) => a.officer.localeCompare(b.officer));
  return {
    columns,
    rows,
    neverAttended: rows.filter((row) => row.neverAttended).length,
    withTraining: rows.filter((row) => !row.neverAttended).length,
  };
}

export async function getOfficerActivity(query: Record<string, unknown>) {
  const where = buildAdminParticipationWhere(query);
  const [officers, records] = await Promise.all([
    prisma.user.findMany({
      where: { role: "USER" },
      select: { id: true, fullName: true, bankId: true, status: true, lastLoginAt: true, createdAt: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.trainingParticipation.findMany({
      where: { ...where, workflowStatus: { not: "DRAFT" }, user: { role: "USER" } },
      include: {
        completionStatus: true,
        trainingProgram: { select: { locationScope: true } },
      },
    }),
  ]);

  const rows = officers.map((officer) => {
    const mine = records.filter((record) => record.userId === officer.id);
    const last = mine.reduce<Date | null>((latest, record) => {
      if (!latest || record.fromDate > latest) return record.fromDate;
      return latest;
    }, null);
    return {
      officer: officer.fullName,
      bankId: officer.bankId,
      status: officer.status,
      attended: mine.length,
      completed: mine.filter((record) => record.completionStatus.name === "Completed").length,
      local: mine.filter((record) => record.trainingProgram.locationScope === "LOCAL").length,
      foreign: mine.filter((record) => record.trainingProgram.locationScope === "FOREIGN").length,
      physical: mine.filter((record) => record.deliveryMode === "PHYSICAL").length,
      online: mine.filter((record) => record.deliveryMode === "ONLINE").length,
      hybrid: mine.filter((record) => record.deliveryMode === "HYBRID").length,
      lastTrainingDate: last ? isoDate(last) : "",
      neverAttended: mine.length === 0 ? "Yes" : "No",
    };
  });

  return {
    totals: {
      officers: rows.length,
      withTraining: rows.filter((row) => row.attended > 0).length,
      neverAttended: rows.filter((row) => row.attended === 0).length,
    },
    rows,
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

type SheetColumn = { header: string; key: string; width?: number };

export type ExportPayload = {
  filename: string;
  sheet: string;
  columns: SheetColumn[];
  rows: Record<string, unknown>[];
};

function columnsFromRows(rows: Record<string, unknown>[], headers?: Record<string, string>): SheetColumn[] {
  const keys = rows[0] ? Object.keys(rows[0]) : Object.keys(headers ?? {});
  return keys.map((key) => ({
    header: headers?.[key] ?? key,
    key,
    width: Math.min(40, Math.max(14, (headers?.[key] ?? key).length + 4)),
  }));
}

export function buildWorkbook(sheetName: string, columns: SheetColumn[], rows: Record<string, unknown>[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Training Management Portal";
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width ?? 18,
  }));
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B365D" } };
  sheet.addRows(rows);
  return workbook;
}

function flattenOfficerSummary(data: Awaited<ReturnType<typeof getOfficerSummary>>) {
  return data.rows.map((row) => ({
    officer: row.officer,
    bankId: row.bankId,
    neverAttended: row.neverAttended ? "Yes" : "No",
    ...Object.fromEntries(data.columns.map((column) => [column.label, row.counts[column.key] ?? 0])),
    total: row.total,
  }));
}

const registerColumns: SheetColumn[] = [
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
  { header: "Workflow Status", key: "workflowStatus", width: 18 },
];

export async function getExportPayload(report: string, query: Record<string, unknown>): Promise<ExportPayload> {
  switch (report) {
    case "training-register":
    case "records": {
      const rows = await getTrainingRegister(query);
      return { filename: "training-register", sheet: "Training Register", columns: registerColumns, rows };
    }
    case "officer-summary": {
      const data = await getOfficerSummary(query);
      const rows = flattenOfficerSummary(data);
      return {
        filename: "officer-summary",
        sheet: "Officer Summary",
        columns: columnsFromRows(rows, { officer: "Name of the Officer", bankId: "Bank ID", neverAttended: "Never Attended", total: "Total" }),
        rows,
      };
    }
    case "officer-activity": {
      const data = await getOfficerActivity(query);
      return {
        filename: "officer-activity",
        sheet: "Officer Activity",
        columns: columnsFromRows(data.rows, {
          officer: "Name of the Officer",
          bankId: "Bank ID",
          status: "Account Status",
          attended: "Trainings Attended",
          completed: "Completed",
          local: "Local",
          foreign: "Foreign",
          physical: "Physical",
          online: "Online",
          hybrid: "Hybrid",
          lastTrainingDate: "Last Training Date",
          neverAttended: "Never Attended",
        }),
        rows: data.rows,
      };
    }
    case "program-summary": {
      const rows = await getProgramSummary(query);
      return {
        filename: "program-summary",
        sheet: "Programme Summary",
        columns: columnsFromRows(rows, {
          program: "Programme",
          locationScope: "Local / Foreign",
          type: "Type of Training",
          institution: "Institution",
          participants: "Participants",
          completed: "Completed",
          notCompleted: "Not Completed",
          completionRate: "Completion Rate",
        }),
        rows,
      };
    }
    case "institution-summary": {
      const rows = await getInstitutionSummary(query);
      return {
        filename: "institution-summary",
        sheet: "Institution Summary",
        columns: columnsFromRows(rows, {
          institution: "Institution",
          programs: "Programs",
          participations: "Participations",
          completed: "Completed",
        }),
        rows,
      };
    }
    case "users": {
      const { listUsersForExport } = await import("./adminUserService.js");
      const rows = await listUsersForExport(query);
      return {
        filename: "users",
        sheet: "Users",
        columns: columnsFromRows(rows, {
          bankId: "Bank ID",
          fullName: "Full Name",
          role: "Role",
          status: "Status",
          attended: "Trainings Attended",
          completed: "Completed",
          local: "Local",
          foreign: "Foreign",
          physical: "Physical",
          online: "Online",
          lastTrainingDate: "Last Training Date",
          neverAttended: "Never Attended",
          registered: "Registered",
          lastLoginAt: "Last Login",
        }),
        rows,
      };
    }
    default:
      throw new Error(`Unknown report: ${report}`);
  }
}

export async function buildRegisterWorkbook(query: Record<string, unknown>) {
  const payload = await getExportPayload("training-register", query);
  return buildWorkbook(payload.sheet, payload.columns, payload.rows);
}

export { toCsv } from "../utils/csv.js";
