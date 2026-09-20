import type { Request } from "express";
import { prisma } from "../config/prisma.js";
import { writeAuditLog } from "../utils/audit.js";
import { normalizeBankId } from "../utils/bankId.js";
import { validationError } from "../utils/appError.js";
import { parseCsv, normalizeHeader } from "../utils/csvParse.js";
import { unusablePasswordHash } from "./authService.js";
import type { DeliveryMode, LocationScope } from "../types/domain.js";

export type HistoricalImportResult = {
  rowsTotal: number;
  rowsImported: number;
  rowsSkipped: number;
  usersCreated: number;
  usersUpdated: number;
  programsCreated: number;
  masterCreated: { trainingTypes: number; institutions: number; roles: number; completions: number };
  errors: Array<{ row: number; message: string }>;
};

type ParsedRow = {
  rowNumber: number;
  bankId: string;
  fullName: string;
  programName: string;
  locationScope: LocationScope;
  deliveryMode: DeliveryMode;
  trainingTypeName: string;
  roleName: string;
  fromDate: Date;
  toDate: Date;
  institutionName: string;
  venue: string;
  completionName: string;
};

function cleanCell(value: string | undefined) {
  return (value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

function mapLocationScope(raw: string): LocationScope | null {
  const value = raw.toLowerCase();
  if (value === "local") return "LOCAL";
  if (value === "foreign") return "FOREIGN";
  return null;
}

function mapDeliveryMode(raw: string): DeliveryMode | null {
  const value = raw.toLowerCase();
  if (value === "physical") return "PHYSICAL";
  if (value === "online") return "ONLINE";
  if (value === "hybrid") return "HYBRID";
  return null;
}

function normalizeCompletionName(raw: string) {
  const value = cleanCell(raw);
  if (!value) return "Completed";
  const lower = value.toLowerCase();
  if (lower === "competed" || lower === "complete" || lower === "completed") return "Completed";
  if (lower === "not completed" || lower === "incomplete") return "Not Completed";
  if (lower === "cancelled" || lower === "canceled") return "Cancelled";
  if (lower === "planned") return "Planned";
  if (lower === "ongoing") return "Ongoing";
  return value;
}

/** Parse dates from workbook styles: M/D/YYYY, D/M/YYYY, DD.MM.YYYY, YYYY-MM-DD. */
export function parseFlexibleDate(raw: string): Date | null {
  const value = cleanCell(raw);
  if (!value) return null;

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
  if (iso) {
    const d = new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const dotted = /^(\d{1,2})\.(\d{1,2})\.(\d{4}|\d{5})$/.exec(value);
  if (dotted) {
    let year = Number(dotted[3]);
    if (year > 9999) year = Math.floor(year / 10); // fix typos like 20225
    const d = new Date(Date.UTC(year, Number(dotted[2]) - 1, Number(dotted[1])));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const slashed = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/.exec(value);
  if (slashed) {
    let year = Number(slashed[3]);
    if (year < 100) year += 2000;
    const a = Number(slashed[1]);
    const b = Number(slashed[2]);
    // Prefer D/M/Y (Sri Lanka / EU register style). Only use M/D/Y when first part must be month (second > 12).
    let day: number;
    let month: number;
    if (a > 12) {
      day = a;
      month = b;
    } else if (b > 12) {
      month = a;
      day = b;
    } else {
      day = a;
      month = b;
    }
    const d = new Date(Date.UTC(year, month - 1, day));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

function findColumn(headers: string[], aliases: string[]) {
  const normalized = headers.map((h) => normalizeHeader(h ?? ""));
  for (const alias of aliases) {
    const exact = normalized.findIndex((h) => h === alias);
    if (exact >= 0) return exact;
  }
  for (const alias of aliases) {
    if (alias.length < 5) continue; // avoid short aliases like "name" matching other columns
    const partial = normalized.findIndex((h) => h.includes(alias));
    if (partial >= 0) return partial;
  }
  return -1;
}

function buildColumnMap(headerRow: string[], subHeaderRow?: string[]) {
  const headers = headerRow.map((h) => cleanCell(h));
  const bankIdx = findColumn(headers, ["bank no", "bank id", "bank number"]);
  const nameIdx = findColumn(headers, ["name of the officer", "officer name", "name"]);
  const programIdx = findColumn(headers, ["name of the training program", "training program"]);
  const scopeIdx = findColumn(headers, ["local / foreign", "local/foreign"]);
  const modeIdx = findColumn(headers, ["physical / online", "physical/online"]);
  const typeIdx = findColumn(headers, ["type of training"]);
  const roleIdx = findColumn(headers, ["participating the training as", "participating as"]);
  const institutionIdx = findColumn(headers, ["institution"]);
  const venueIdx = findColumn(headers, ["venue"]);
  const statusIdx = findColumn(headers, ["status of completion", "completion"]);

  let fromIdx = -1;
  let toIdx = -1;
  const durationIdx = findColumn(headers, ["duration"]);
  if (subHeaderRow) {
    const sub = subHeaderRow.map((h) => normalizeHeader(cleanCell(h)));
    fromIdx = sub.findIndex((h) => h === "from");
    toIdx = sub.findIndex((h) => h === "to");
  }
  if (fromIdx < 0 && durationIdx >= 0) {
    fromIdx = durationIdx;
    toIdx = durationIdx + 1;
  }

  if (bankIdx < 0 || programIdx < 0 || fromIdx < 0 || toIdx < 0) {
    throw validationError(
      "CSV must include Bank No, Name of the Training Program, and Duration From/To columns (see template)",
    );
  }

  return {
    bankIdx,
    nameIdx,
    programIdx,
    scopeIdx,
    modeIdx,
    typeIdx,
    roleIdx,
    fromIdx,
    toIdx,
    institutionIdx,
    venueIdx,
    statusIdx,
  };
}

export function parseHistoricalCsv(csvText: string): { rows: ParsedRow[]; errors: HistoricalImportResult["errors"] } {
  const table = parseCsv(csvText);
  if (table.length < 2) throw validationError("CSV is empty");

  const header = table[0];
  const maybeSub = table[1];
  const hasDurationSub =
    maybeSub &&
    maybeSub.some((cell) => {
      const h = normalizeHeader(cleanCell(cell));
      return h === "from" || h === "to";
    });
  const cols = buildColumnMap(header, hasDurationSub ? maybeSub : undefined);
  const dataStart = hasDurationSub ? 2 : 1;

  const rows: ParsedRow[] = [];
  const errors: HistoricalImportResult["errors"] = [];

  for (let i = dataStart; i < table.length; i += 1) {
    const raw = table[i];
    const rowNumber = i + 1;
    if (!raw.some((c) => cleanCell(c))) continue;

    const bankRaw = cleanCell(raw[cols.bankIdx]);
    if (!bankRaw) {
      errors.push({ row: rowNumber, message: "Bank No is required — row skipped" });
      continue;
    }

    const programName = cleanCell(raw[cols.programIdx]);
    if (!programName) {
      errors.push({ row: rowNumber, message: "Training program name is required — row skipped" });
      continue;
    }

    const scopeRaw = cols.scopeIdx >= 0 ? cleanCell(raw[cols.scopeIdx]) : "Local";
    const modeRaw = cols.modeIdx >= 0 ? cleanCell(raw[cols.modeIdx]) : "Physical";
    const locationScope = mapLocationScope(scopeRaw || "Local");
    const deliveryMode = mapDeliveryMode(modeRaw || "Physical");
    if (!locationScope) {
      errors.push({ row: rowNumber, message: `Invalid Local/Foreign: ${scopeRaw}` });
      continue;
    }
    if (!deliveryMode) {
      errors.push({ row: rowNumber, message: `Invalid Physical/Online: ${modeRaw}` });
      continue;
    }

    const fromDate = parseFlexibleDate(raw[cols.fromIdx] ?? "");
    const toDate = parseFlexibleDate(raw[cols.toIdx] ?? "");
    if (!fromDate || !toDate) {
      errors.push({ row: rowNumber, message: "Invalid Duration From/To date" });
      continue;
    }
    if (toDate.getTime() < fromDate.getTime()) {
      errors.push({ row: rowNumber, message: "Duration To is before From" });
      continue;
    }

    rows.push({
      rowNumber,
      bankId: normalizeBankId(bankRaw),
      fullName: cols.nameIdx >= 0 ? cleanCell(raw[cols.nameIdx]) : "",
      programName,
      locationScope,
      deliveryMode,
      trainingTypeName: cols.typeIdx >= 0 ? cleanCell(raw[cols.typeIdx]) || "General Training" : "General Training",
      roleName: cols.roleIdx >= 0 ? cleanCell(raw[cols.roleIdx]) || "Participant" : "Participant",
      fromDate,
      toDate,
      institutionName:
        cols.institutionIdx >= 0 ? cleanCell(raw[cols.institutionIdx]) || "Not Applicable" : "Not Applicable",
      venue: cols.venueIdx >= 0 ? cleanCell(raw[cols.venueIdx]) || "—" : "—",
      completionName: normalizeCompletionName(cols.statusIdx >= 0 ? raw[cols.statusIdx] : ""),
    });
  }

  return { rows, errors };
}

export async function importHistoricalCsv(
  csvText: string,
  actor: { id: string; bankId: string },
  req: Request,
): Promise<HistoricalImportResult> {
  const { rows, errors } = parseHistoricalCsv(csvText);

  const result: HistoricalImportResult = {
    rowsTotal: rows.length + errors.length,
    rowsImported: 0,
    rowsSkipped: errors.length,
    usersCreated: 0,
    usersUpdated: 0,
    programsCreated: 0,
    masterCreated: { trainingTypes: 0, institutions: 0, roles: 0, completions: 0 },
    errors: [...errors],
  };

  const typeCache = new Map<string, string>();
  const institutionCache = new Map<string, string>();
  const roleCache = new Map<string, string>();
  const completionCache = new Map<string, string>();
  const programCache = new Map<string, string>();
  const userCache = new Map<string, { id: string; created: boolean }>();

  async function resolveType(name: string) {
    if (typeCache.has(name)) return typeCache.get(name)!;
    const existing = await prisma.trainingType.findUnique({ where: { name } });
    if (existing) {
      typeCache.set(name, existing.id);
      if (!existing.active) await prisma.trainingType.update({ where: { id: existing.id }, data: { active: true } });
      return existing.id;
    }
    const created = await prisma.trainingType.create({ data: { name, active: true, sortOrder: 100 } });
    typeCache.set(name, created.id);
    result.masterCreated.trainingTypes += 1;
    return created.id;
  }

  async function resolveInstitution(name: string) {
    if (institutionCache.has(name)) return institutionCache.get(name)!;
    const existing = await prisma.institution.findUnique({ where: { name } });
    if (existing) {
      institutionCache.set(name, existing.id);
      if (!existing.active) await prisma.institution.update({ where: { id: existing.id }, data: { active: true } });
      return existing.id;
    }
    const created = await prisma.institution.create({ data: { name, active: true } });
    institutionCache.set(name, created.id);
    result.masterCreated.institutions += 1;
    return created.id;
  }

  async function resolveRole(name: string) {
    if (roleCache.has(name)) return roleCache.get(name)!;
    const existing = await prisma.participationRole.findUnique({ where: { name } });
    if (existing) {
      roleCache.set(name, existing.id);
      if (!existing.active) await prisma.participationRole.update({ where: { id: existing.id }, data: { active: true } });
      return existing.id;
    }
    const created = await prisma.participationRole.create({ data: { name, active: true, sortOrder: 100 } });
    roleCache.set(name, created.id);
    result.masterCreated.roles += 1;
    return created.id;
  }

  async function resolveCompletion(name: string) {
    if (completionCache.has(name)) return completionCache.get(name)!;
    const existing = await prisma.completionStatus.findUnique({ where: { name } });
    if (existing) {
      completionCache.set(name, existing.id);
      if (!existing.active) await prisma.completionStatus.update({ where: { id: existing.id }, data: { active: true } });
      return existing.id;
    }
    const isFinal = !["Planned", "Ongoing"].includes(name);
    const created = await prisma.completionStatus.create({
      data: { name, active: true, isFinal, sortOrder: 100 },
    });
    completionCache.set(name, created.id);
    result.masterCreated.completions += 1;
    return created.id;
  }

  async function resolveProgram(row: ParsedRow) {
    const key = [row.programName, row.locationScope, row.trainingTypeName, row.institutionName, row.venue]
      .join("|")
      .toLowerCase();
    if (programCache.has(key)) return programCache.get(key)!;

    const trainingTypeId = await resolveType(row.trainingTypeName);
    const institutionId = await resolveInstitution(row.institutionName);

    const existing = await prisma.trainingProgram.findFirst({
      where: {
        name: row.programName,
        locationScope: row.locationScope,
        trainingTypeId,
        institutionId,
        venue: row.venue,
      },
    });
    if (existing) {
      programCache.set(key, existing.id);
      if (!existing.active) {
        await prisma.trainingProgram.update({ where: { id: existing.id }, data: { active: true } });
      }
      return existing.id;
    }

    const created = await prisma.trainingProgram.create({
      data: {
        name: row.programName,
        locationScope: row.locationScope,
        trainingTypeId,
        institutionId,
        venue: row.venue,
        description: "Imported from historical register",
        active: true,
        createdById: actor.id,
      },
    });
    programCache.set(key, created.id);
    result.programsCreated += 1;
    return created.id;
  }

  async function resolveUser(bankId: string, fullName: string) {
    if (userCache.has(bankId)) return userCache.get(bankId)!;

    const existing = await prisma.user.findUnique({ where: { bankId } });
    if (existing) {
      // Fill empty name from CSV when present; never overwrite an active registered name with blank.
      if ((!existing.fullName || !existing.fullName.trim()) && fullName) {
        await prisma.user.update({ where: { id: existing.id }, data: { fullName } });
        result.usersUpdated += 1;
      } else if (existing.status === "IMPORTED" && fullName && existing.fullName !== fullName) {
        await prisma.user.update({ where: { id: existing.id }, data: { fullName } });
        result.usersUpdated += 1;
      }
      userCache.set(bankId, { id: existing.id, created: false });
      return userCache.get(bankId)!;
    }

    const created = await prisma.user.create({
      data: {
        bankId,
        fullName: fullName || "",
        passwordHash: await unusablePasswordHash(),
        role: "USER",
        status: "IMPORTED",
      },
    });
    result.usersCreated += 1;
    userCache.set(bankId, { id: created.id, created: true });
    return userCache.get(bankId)!;
  }

  for (const row of rows) {
    try {
      const user = await resolveUser(row.bankId, row.fullName);
      const programId = await resolveProgram(row);
      const roleId = await resolveRole(row.roleName);
      const completionId = await resolveCompletion(row.completionName);

      const duplicate = await prisma.trainingParticipation.findFirst({
        where: {
          userId: user.id,
          trainingProgramId: programId,
          fromDate: row.fromDate,
          toDate: row.toDate,
        },
      });
      if (duplicate) {
        result.rowsSkipped += 1;
        result.errors.push({ row: row.rowNumber, message: "Duplicate participation — skipped" });
        continue;
      }

      await prisma.trainingParticipation.create({
        data: {
          userId: user.id,
          trainingProgramId: programId,
          deliveryMode: row.deliveryMode,
          participationRoleId: roleId,
          fromDate: row.fromDate,
          toDate: row.toDate,
          completionStatusId: completionId,
          remarks: "Historical import",
          workflowStatus: "APPROVED",
          submittedAt: row.fromDate,
          approvedAt: row.toDate,
          approvedById: actor.id,
        },
      });
      result.rowsImported += 1;
    } catch (error) {
      result.rowsSkipped += 1;
      result.errors.push({
        row: row.rowNumber,
        message: error instanceof Error ? error.message : "Failed to import row",
      });
    }
  }

  await writeAuditLog({
    actorUserId: actor.id,
    action: "HISTORICAL_IMPORT",
    entityType: "Import",
    entityId: "historical-csv",
    after: {
      rowsImported: result.rowsImported,
      rowsSkipped: result.rowsSkipped,
      usersCreated: result.usersCreated,
      programsCreated: result.programsCreated,
    },
    req,
  });

  return result;
}
