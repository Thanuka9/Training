import { z } from "zod";

export const namedMasterSchema = z.object({
  name: z.string().trim().min(1).max(150),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const institutionSchema = z.object({
  name: z.string().trim().min(1).max(200),
  active: z.boolean().optional(),
});

export const completionStatusSchema = z.object({
  name: z.string().trim().min(1).max(150),
  active: z.boolean().optional(),
  isFinal: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});
