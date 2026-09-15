import type { Request, Response } from "express";
import { requireActiveUser } from "../middleware/auth.js";
import { sendSuccess, sendCreated } from "../utils/apiResponse.js";
import * as participationService from "../services/participationService.js";
import * as programService from "../services/trainingProgramService.js";
import * as masterDataService from "../services/masterDataService.js";
import { createParticipationSchema, updateParticipationSchema } from "../validators/participation.js";

export async function dashboard(req: Request, res: Response) {
  const user = requireActiveUser(req);
  return sendSuccess(res, await participationService.getUserDashboard(user.id));
}

export async function listMine(req: Request, res: Response) {
  const user = requireActiveUser(req);
  return sendSuccess(res, await participationService.listUserParticipations(user.id, req.query));
}

export async function getMine(req: Request, res: Response) {
  const user = requireActiveUser(req);
  return sendSuccess(res, await participationService.getUserParticipation(user.id, req.params.id));
}

export async function createMine(req: Request, res: Response) {
  const user = requireActiveUser(req);
  const input = createParticipationSchema.parse(req.body);
  const created = await participationService.createUserParticipation(user.id, input, req);
  return sendCreated(res, created);
}

export async function updateMine(req: Request, res: Response) {
  const user = requireActiveUser(req);
  const input = updateParticipationSchema.parse(req.body);
  return sendSuccess(res, await participationService.updateUserParticipation(user.id, req.params.id, input, req));
}

export async function submitMine(req: Request, res: Response) {
  const user = requireActiveUser(req);
  return sendSuccess(res, await participationService.submitUserParticipation(user.id, req.params.id, req));
}

export async function listPrograms(req: Request, res: Response) {
  requireActiveUser(req);
  return sendSuccess(res, await programService.listPrograms(req.query, true));
}

export async function getProgram(req: Request, res: Response) {
  requireActiveUser(req);
  return sendSuccess(res, await programService.getProgram(req.params.id));
}

export async function lookups(req: Request, res: Response) {
  requireActiveUser(req);
  return sendSuccess(res, await masterDataService.getActiveLookups());
}
