import { randomBytes } from "node:crypto";
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

/** Unusable password for IMPORTED placeholder accounts until the officer registers. */
export async function unusablePasswordHash() {
  return hashPassword(`imported:${randomBytes(32).toString("hex")}`);
}

export async function registerUser(input: z.infer<typeof registerSchema>, req: Request) {
  const bankId = normalizeBankId(input.bankId);
  const existing = await prisma.user.findUnique({ where: { bankId } });

  if (existing) {
    if (existing.status === "IMPORTED" && existing.role === "USER") {
      const claimed = await prisma.user.update({
        where: { id: existing.id },
        data: {
          fullName: input.fullName.trim(),
          passwordHash: await hashPassword(input.password),
          status: "PENDING",
        },
      });

      await writeAuditLog({
        actorUserId: claimed.id,
        action: "USER_CLAIMED_IMPORTED",
        entityType: "User",
        entityId: claimed.id,
        before: toPublicUser(existing),
        after: toPublicUser(claimed),
        req,
      });

      return {
        user: toPublicUser(claimed),
        message:
          "Registration submitted. Your historical training records are already linked to this Bank ID. An administrator must approve your account before you can log in.",
        claimedImported: true,
      };
    }

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

  return {
    user: toPublicUser(user),
    message: "Registration submitted. An administrator must approve your account before you can log in.",
    claimedImported: false,
  };
}

export async function loginUser(input: z.infer<typeof loginSchema>, req: Request) {
  const bankId = normalizeBankId(input.bankId);
  const user = await prisma.user.findUnique({ where: { bankId } });
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw unauthorized("Invalid Bank ID or password");
  }

  if (user.status === "IMPORTED") {
    throw new AppError(
      403,
      "ACCOUNT_IMPORTED",
      "Historical records exist for this Bank ID. Please register to claim your account.",
    );
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
