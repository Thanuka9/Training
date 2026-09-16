import { z } from "zod";
import { normalizeBankId } from "../utils/bankId.js";

const bankIdField = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .transform((value) => normalizeBankId(value));

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2).max(150),
    bankId: bankIdField,
    password: z.string().min(8).max(200),
    confirmPassword: z.string().min(8).max(200),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  bankId: bankIdField,
  password: z.string().min(1),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(200),
    confirmPassword: z.string().min(8).max(200),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
