import { z } from "zod";
import { normalizeBankId } from "../utils/bankId.js";

const bankIdField = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .transform((value) => normalizeBankId(value));

export const adminCreateUserSchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  bankId: bankIdField,
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
