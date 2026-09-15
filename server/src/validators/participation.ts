import { z } from "zod";

const participationFields = {
  trainingProgramId: z.string().uuid(),
  deliveryMode: z.enum(["PHYSICAL", "ONLINE", "HYBRID"]),
  participationRoleId: z.string().uuid(),
  fromDate: z.string().min(1),
  toDate: z.string().min(1),
  completionStatusId: z.string().uuid(),
  remarks: z.string().trim().max(2000).optional().nullable(),
  confirmDuplicate: z.boolean().optional(),
};

export const createParticipationSchema = z.object(participationFields);

export const updateParticipationSchema = z.object({
  ...participationFields,
  trainingProgramId: z.string().uuid().optional(),
});

export const adminCommentSchema = z.object({
  comment: z.string().trim().min(1).max(2000),
});

export const adminUpdateParticipationSchema = z.object({
  deliveryMode: z.enum(["PHYSICAL", "ONLINE", "HYBRID"]).optional(),
  participationRoleId: z.string().uuid().optional(),
  fromDate: z.string().min(1).optional(),
  toDate: z.string().min(1).optional(),
  completionStatusId: z.string().uuid().optional(),
  remarks: z.string().trim().max(2000).optional().nullable(),
});
