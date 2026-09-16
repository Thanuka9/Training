import type { Request } from "express";
import { prisma } from "../config/prisma.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { signAuthToken } from "../utils/jwt.js";
import { toPublicUser } from "../utils/serialize.js";
import { writeAuditLog } from "../utils/audit.js";
import { AppError, conflict, forbidden, unauthorized, validationError } from "../utils/appError.js";
import type { loginSchema, registerSchema, changePasswordSchema } from "../validators/auth.js";
import type { z } from "zod";
import type { Role, UserStatus } from "../types/domain.js";
import { normalizeBankId } from "../utils/bankId.js";

export async function registerUser(input: z.infer<typeof registerSchema>, req: Request) {
  const bankId = normalizeBankId(input.bankId);
  const existing = await prisma.user.findUnique({ where: { bankId } });
  if (existing) {
    throw conflict("A user with this Bank ID already exists");
  }

  const user = await prisma.user.create({
    data: {
      fullName: input.fullName,
      bankId,
      passwordHash: await hashPassword(input.password),
      role: "USER",
      status: "PENDING",
    },
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "USER_REGISTERED",
    entityType: "User",
    entityId: user.id,
    after: toPublicUser(user),
    req,
  });

  return toPublicUser(user);
}

export async function loginUser(input: z.infer<typeof loginSchema>, req: Request) {
  const bankId = normalizeBankId(input.bankId);
  const user = await prisma.user.findUnique({ where: { bankId } });
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw unauthorized("Invalid Bank ID or password");
  }

  if (user.status === "PENDING") {
    throw new AppError(
      403,
      "ACCOUNT_PENDING",
      "Your registration is pending administrator approval",
    );
  }

  if (user.status === "DISABLED") {
    throw forbidden("Your account has been disabled. Contact an administrator.");
  }

  if (user.status === "REJECTED") {
    throw forbidden("Your registration was not approved. Contact an administrator.");
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = signAuthToken({
    sub: updated.id,
    role: updated.role as Role,
    status: updated.status as UserStatus,
  });

  return { token, user: toPublicUser(updated) };
}

export async function changePassword(
  userId: string,
  input: z.infer<typeof changePasswordSchema>,
  req: Request,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw unauthorized();
  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw validationError("Current password is incorrect");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(input.newPassword) },
  });

  await writeAuditLog({
    actorUserId: userId,
    action: "PASSWORD_CHANGED",
    entityType: "User",
    entityId: userId,
    req,
  });
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw unauthorized();
  return toPublicUser(user);
}
