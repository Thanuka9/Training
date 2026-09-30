import type { User } from "@prisma/client";
import { isSuperAdminBankId } from "./superAdmin.js";

type UserWithPosition = User & {
  jobPositionId?: string | null;
  jobPosition?: { id: string; name: string } | null;
};

export function toPublicUser(user: UserWithPosition) {
  return {
    id: user.id,
    bankId: user.bankId,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    jobPositionId: user.jobPositionId ?? user.jobPosition?.id ?? null,
    jobPosition: user.jobPosition
      ? { id: user.jobPosition.id, name: user.jobPosition.name }
      : null,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    isSuperAdmin: user.role === "ADMIN" && isSuperAdminBankId(user.bankId),
  };
}
