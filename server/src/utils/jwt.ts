import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { Role, UserStatus } from "../types/domain.js";

export type AuthTokenPayload = {
  sub: string;
  role: Role;
  status: UserStatus;
};

export function signAuthToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "8h" });
}

export function verifyAuthToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
}
