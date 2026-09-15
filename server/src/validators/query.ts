import { z } from "zod";

export const dashboardFilterSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  officer: z.string().optional(),
  bankId: z.string().optional(),
  trainingProgramId: z.string().uuid().optional(),
  locationScope: z.enum(["LOCAL", "FOREIGN"]).optional(),
  deliveryMode: z.enum(["PHYSICAL", "ONLINE", "HYBRID"]).optional(),
  trainingTypeId: z.string().uuid().optional(),
  institutionId: z.string().uuid().optional(),
  participationRoleId: z.string().uuid().optional(),
  completionStatusId: z.string().uuid().optional(),
  workflowStatus: z.enum(["DRAFT", "SUBMITTED", "RETURNED", "APPROVED", "REJECTED"]).optional(),
  includeDrafts: z.enum(["true", "false"]).optional(),
});

export const settingsSchema = z.object({
  allowHybridDelivery: z.boolean(),
});
