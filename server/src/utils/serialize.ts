import type { User } from "@prisma/client";

export function toPublicUser(user: User) {
  return {
    id: user.id,
    bankId: user.bankId,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
