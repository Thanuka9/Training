import type { NextFunction, Request, Response } from "express";
import type { Role, UserStatus } from "../types/domain.js";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { verifyAuthToken } from "../utils/jwt.js";
import { unauthorized, forbidden } from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isSuperAdminBankId } from "../utils/superAdmin.js";

export type AuthenticatedUser = {
  id: string;
  bankId: string;
  fullName: string;
  role: Role;
  status: UserStatus;
};

declare global {
  namespace Express {
    interface Request {
      currentUser?: AuthenticatedUser;
    }
  }
}

export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = req.cookies?.[env.COOKIE_NAME] as string | undefined;
  if (!token) {
    throw unauthorized();
  }

  try {
    const payload = verifyAuthToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        bankId: true,
        fullName: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw unauthorized("Session is no longer valid");
    }

    req.currentUser = {
      ...user,
      role: user.role as Role,
      status: user.status as UserStatus,
    };
    next();
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      throw error;
    }
    throw unauthorized("Session is no longer valid");
  }
});

export function requireAuth(req: Request): AuthenticatedUser {
  if (!req.currentUser) {
    throw unauthorized();
  }
  return req.currentUser;
}

export function requireActiveUser(req: Request): AuthenticatedUser {
  const user = requireAuth(req);
  if (user.status !== "ACTIVE") {
    throw forbidden("Your account is not active");
  }
  return user;
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = requireAuth(req);
    if (!roles.includes(user.role)) {
      next(forbidden());
      return;
    }
    if (user.status !== "ACTIVE") {
      next(forbidden("Your account is not active"));
      return;
    }
    next();
  };
}

/** Only the env/hardcoded super admin Bank ID may manage admin accounts. */
export function requireSuperAdmin(req: Request, _res: Response, next: NextFunction) {
  const user = requireAuth(req);
  if (user.role !== "ADMIN" || user.status !== "ACTIVE" || !isSuperAdminBankId(user.bankId)) {
    next(forbidden("Only the super administrator can manage admin accounts"));
    return;
  }
  next();
}
