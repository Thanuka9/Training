import { z } from "zod";

export const adminCreateUserSchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  bankId: z.string().trim().min(1).max(50),
  password: z.string().min(8).max(200),
  role: z.enum(["USER", "ADMIN"]).default("USER"),
  status: z.enum(["PENDING", "ACTIVE", "DISABLED", "REJECTED"]).default("ACTIVE"),
});

export const adminUpdateUserSchema = z.object({
  fullName: z.string().trim().min(2).max(150).optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  password: z.string().min(8).max(200).optional(),
});

export const rejectUserSchema = z.object({
  reason: z.string().trim().min(1).max(500).optional(),
});
