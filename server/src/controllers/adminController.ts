import type { Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import { sendSuccess, sendCreated } from "../utils/apiResponse.js";
import * as programService from "../services/trainingProgramService.js";
import * as userService from "../services/adminUserService.js";
import * as participationService from "../services/participationService.js";
import * as dashboardService from "../services/dashboardService.js";
import * as officerAnalytics from "../services/officerAnalyticsService.js";
import * as reportService from "../services/reportService.js";
import * as auditService from "../services/auditService.js";
import * as settingsService from "../services/settingsService.js";
import * as masterData from "../services/masterDataService.js";
import { trainingProgramSchema, updateTrainingProgramSchema } from "../validators/program.js";
import {
  namedMasterSchema,
  institutionSchema,
  completionStatusSchema,
} from "../validators/masterData.js";
import { adminCreateUserSchema, adminUpdateUserSchema } from "../validators/user.js";
import {
  adminCommentSchema,
  adminUpdateParticipationSchema,
} from "../validators/participation.js";
import { settingsSchema } from "../validators/query.js";
import { validationError } from "../utils/appError.js";

export async function lookups(_req: Request, res: Response) {
  return sendSuccess(res, await masterData.getActiveLookups());
}

export async function dashboardSummary(req: Request, res: Response) {
  return sendSuccess(res, await dashboardService.getDashboardSummary(req.query));
}

export async function dashboardMonthly(req: Request, res: Response) {
  return sendSuccess(res, await dashboardService.getMonthlyParticipation(req.query));
}

export async function dashboardDistributions(req: Request, res: Response) {
  return sendSuccess(res, await dashboardService.getDistributions(req.query));
}

export async function dashboardTopInstitutions(req: Request, res: Response) {
  return sendSuccess(res, await dashboardService.getTopInstitutions(req.query));
}

export async function dashboardTopOfficers(req: Request, res: Response) {
  return sendSuccess(res, await dashboardService.getTopOfficers(req.query));
}

export async function dashboardRankings(req: Request, res: Response) {
  return sendSuccess(res, await officerAnalytics.getOfficerRankings(req.query));
}

export async function dashboardYearly(req: Request, res: Response) {
  return sendSuccess(res, await officerAnalytics.getYearlyTraining(req.query));
}

export async function dashboardCompare(req: Request, res: Response) {
  return sendSuccess(
    res,
    await officerAnalytics.compareOfficers(String(req.query.userIdA ?? ""), String(req.query.userIdB ?? "")),
  );
}

export async function listOfficersSelect(_req: Request, res: Response) {
  return sendSuccess(res, await officerAnalytics.listOfficersForSelect());
}

export async function officerDashboard(req: Request, res: Response) {
  return sendSuccess(res, await officerAnalytics.getAdminOfficerDashboard(req.params.id));
}

export async function selfDashboard(req: Request, res: Response) {
  const actor = requireAuth(req);
  return sendSuccess(res, await officerAnalytics.getAdminSelfDashboard(actor.id));
}

export async function listUsers(req: Request, res: Response) {
  return sendSuccess(res, await userService.listUsers(req.query));
}

export async function getUser(req: Request, res: Response) {
  return sendSuccess(res, await userService.getUser(req.params.id));
}

export async function createUser(req: Request, res: Response) {
  const actor = requireAuth(req);
  const input = adminCreateUserSchema.parse(req.body);
  return sendCreated(res, await userService.createAdminUser(input, actor.id, req));
}

export async function updateUser(req: Request, res: Response) {
  const actor = requireAuth(req);
  const input = adminUpdateUserSchema.parse(req.body);
  return sendSuccess(res, await userService.updateAdminUser(req.params.id, input, actor.id, req));
}

export async function approveUser(req: Request, res: Response) {
  const actor = requireAuth(req);
  return sendSuccess(res, await userService.setUserStatus(req.params.id, "ACTIVE", "USER_APPROVED", actor.id, req));
}

export async function rejectUser(req: Request, res: Response) {
  const actor = requireAuth(req);
  return sendSuccess(res, await userService.setUserStatus(req.params.id, "REJECTED", "USER_REJECTED", actor.id, req));
}

export async function disableUser(req: Request, res: Response) {
  const actor = requireAuth(req);
  return sendSuccess(res, await userService.setUserStatus(req.params.id, "DISABLED", "USER_DISABLED", actor.id, req));
}

export async function reactivateUser(req: Request, res: Response) {
  const actor = requireAuth(req);
  return sendSuccess(res, await userService.setUserStatus(req.params.id, "ACTIVE", "USER_REACTIVATED", actor.id, req));
}

export async function listPrograms(req: Request, res: Response) {
  return sendSuccess(res, await programService.listPrograms(req.query));
}

export async function getProgram(req: Request, res: Response) {
  return sendSuccess(res, await programService.getProgram(req.params.id));
}

export async function createProgram(req: Request, res: Response) {
  const actor = requireAuth(req);
  const input = trainingProgramSchema.parse(req.body);
  return sendCreated(res, await programService.createProgram(input, actor.id, req));
}

export async function updateProgram(req: Request, res: Response) {
  const actor = requireAuth(req);
  const input = updateTrainingProgramSchema.parse(req.body);
  return sendSuccess(res, await programService.updateProgram(req.params.id, input, actor.id, req));
}

export async function archiveProgram(req: Request, res: Response) {
  const actor = requireAuth(req);
  return sendSuccess(res, await programService.archiveProgram(req.params.id, actor.id, req));
}

export async function listParticipations(req: Request, res: Response) {
  return sendSuccess(res, await participationService.listAdminParticipations(req.query));
}

export async function getParticipation(req: Request, res: Response) {
  return sendSuccess(res, await participationService.getAdminParticipation(req.params.id));
}

export async function updateParticipation(req: Request, res: Response) {
  const actor = requireAuth(req);
  const input = adminUpdateParticipationSchema.parse(req.body);
  return sendSuccess(res, await participationService.adminUpdateParticipation(req.params.id, input, actor.id, req));
}

export async function approveParticipation(req: Request, res: Response) {
  const actor = requireAuth(req);
  return sendSuccess(res, await participationService.approveParticipation(req.params.id, actor.id, req));
}

export async function returnParticipation(req: Request, res: Response) {
  const actor = requireAuth(req);
  const { comment } = adminCommentSchema.parse(req.body);
  return sendSuccess(res, await participationService.returnParticipation(req.params.id, comment, actor.id, req));
}

export async function rejectParticipation(req: Request, res: Response) {
  const actor = requireAuth(req);
  const { comment } = adminCommentSchema.parse(req.body);
  return sendSuccess(res, await participationService.rejectParticipation(req.params.id, comment, actor.id, req));
}

export async function listTrainingTypes(req: Request, res: Response) {
  return sendSuccess(res, await masterData.listTrainingTypes(req.query));
}
export async function createTrainingType(req: Request, res: Response) {
  const actor = requireAuth(req);
  return sendCreated(res, await masterData.createTrainingType(namedMasterSchema.parse(req.body), actor.id, req));
}
export async function updateTrainingType(req: Request, res: Response) {
  const actor = requireAuth(req);
  return sendSuccess(res, await masterData.updateTrainingType(req.params.id, namedMasterSchema.partial().parse(req.body), actor.id, req));
}

export async function listInstitutions(req: Request, res: Response) {
  return sendSuccess(res, await masterData.listInstitutions(req.query));
}
export async function createInstitution(req: Request, res: Response) {
  const actor = requireAuth(req);
  return sendCreated(res, await masterData.createInstitution(institutionSchema.parse(req.body), actor.id, req));
}
export async function updateInstitution(req: Request, res: Response) {
  const actor = requireAuth(req);
  return sendSuccess(res, await masterData.updateInstitution(req.params.id, institutionSchema.partial().parse(req.body), actor.id, req));
}

export async function listRoles(req: Request, res: Response) {
  return sendSuccess(res, await masterData.listParticipationRoles(req.query));
}
export async function createRole(req: Request, res: Response) {
  const actor = requireAuth(req);
  return sendCreated(res, await masterData.createParticipationRole(namedMasterSchema.parse(req.body), actor.id, req));
}
export async function updateRole(req: Request, res: Response) {
  const actor = requireAuth(req);
  return sendSuccess(res, await masterData.updateParticipationRole(req.params.id, namedMasterSchema.partial().parse(req.body), actor.id, req));
}

export async function listCompletionStatuses(req: Request, res: Response) {
  return sendSuccess(res, await masterData.listCompletionStatuses(req.query));
}
export async function createCompletionStatus(req: Request, res: Response) {
  const actor = requireAuth(req);
  return sendCreated(res, await masterData.createCompletionStatus(completionStatusSchema.parse(req.body), actor.id, req));
}
export async function updateCompletionStatus(req: Request, res: Response) {
  const actor = requireAuth(req);
  return sendSuccess(res, await masterData.updateCompletionStatus(req.params.id, completionStatusSchema.partial().parse(req.body), actor.id, req));
}

export async function trainingRegister(req: Request, res: Response) {
  return sendSuccess(res, await reportService.getTrainingRegister(req.query));
}
export async function officerSummary(req: Request, res: Response) {
  return sendSuccess(res, await reportService.getOfficerSummary(req.query));
}
export async function officerActivity(req: Request, res: Response) {
  return sendSuccess(res, await reportService.getOfficerActivity(req.query));
}
export async function programSummary(req: Request, res: Response) {
  return sendSuccess(res, await reportService.getProgramSummary(req.query));
}
export async function institutionSummary(req: Request, res: Response) {
  return sendSuccess(res, await reportService.getInstitutionSummary(req.query));
}

export async function exportReport(req: Request, res: Response) {
  const match = /^([a-z0-9-]+)\.(xlsx|csv)$/i.exec(String(req.params.file ?? ""));
  const report = (match?.[1] ?? "").toLowerCase();
  const format = (match?.[2] ?? "").toLowerCase();
  const allowed = new Set([
    "training-register",
    "records",
    "officer-summary",
    "officer-activity",
    "program-summary",
    "institution-summary",
    "users",
  ]);
  if (!allowed.has(report) || (format !== "xlsx" && format !== "csv")) {
    throw validationError("Unknown report or format");
  }

  const payload = await reportService.getExportPayload(report, req.query as Record<string, unknown>);
  if (format === "csv") {
    const csvRows = payload.rows.map((row) =>
      Object.fromEntries(payload.columns.map((column) => [column.header, row[column.key]])),
    );
    const csv = reportService.toCsv(
      csvRows,
      payload.columns.map((column) => column.header),
    );
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=${payload.filename}.csv`);
    return res.send(csv);
  }

  const workbook = reportService.buildWorkbook(payload.sheet, payload.columns, payload.rows);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename=${payload.filename}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
}

export async function exportRegisterXlsx(req: Request, res: Response) {
  req.params.file = "training-register.xlsx";
  return exportReport(req, res);
}

export async function exportRegisterCsv(req: Request, res: Response) {
  req.params.file = "training-register.csv";
  return exportReport(req, res);
}

export async function listAudit(req: Request, res: Response) {
  return sendSuccess(res, await auditService.listAuditLogs(req.query));
}

export async function getSettings(_req: Request, res: Response) {
  return sendSuccess(res, await settingsService.getSettings());
}

export async function updateSettings(req: Request, res: Response) {
  const actor = requireAuth(req);
  const input = settingsSchema.parse(req.body);
  return sendSuccess(res, await settingsService.updateSettings(input.allowHybridDelivery, actor.id, req));
}
