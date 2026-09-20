import type { Request, Response } from "express";
import { registerSchema, loginSchema, changePasswordSchema } from "../validators/auth.js";
import * as authService from "../services/authService.js";
import { sendSuccess, sendCreated } from "../utils/apiResponse.js";
import { setAuthCookie, clearAuthCookie } from "../utils/cookies.js";
import { requireAuth } from "../middleware/auth.js";

export async function register(req: Request, res: Response) {
  const input = registerSchema.parse(req.body);
  const result = await authService.registerUser(input, req);
  return sendCreated(res, {
    user: result.user,
    message: result.message,
    claimedImported: result.claimedImported,
  });
}

export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);
  const { token, user } = await authService.loginUser(input, req);
  setAuthCookie(res, token);
  return sendSuccess(res, { user });
}

export async function logout(_req: Request, res: Response) {
  clearAuthCookie(res);
  return sendSuccess(res, { message: "Signed out" });
}

export async function me(req: Request, res: Response) {
  const current = requireAuth(req);
  const user = await authService.getMe(current.id);
  return sendSuccess(res, { user });
}

export async function changePassword(req: Request, res: Response) {
  const current = requireAuth(req);
  const input = changePasswordSchema.parse(req.body);
  await authService.changePassword(current.id, input, req);
  return sendSuccess(res, { message: "Password updated" });
}
