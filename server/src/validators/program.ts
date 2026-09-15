import { z } from "zod";

const programFields = {
  name: z.string().trim().min(1).max(300),
  locationScope: z.enum(["LOCAL", "FOREIGN"]),
  trainingTypeId: z.string().uuid(),
  institutionId: z.string().uuid().optional(),
  institutionName: z.string().trim().min(1).max(200).optional(),
  venue: z.string().trim().min(1).max(300),
  description: z.string().trim().max(4000).optional().nullable(),
  active: z.boolean().optional(),
};

export const trainingProgramSchema = z.object(programFields).refine(
  (value) => Boolean(value.institutionId || value.institutionName),
  {
    message: "Select an existing institution or enter a new institution name",
    path: ["institutionId"],
  },
);

export const updateTrainingProgramSchema = z.object({
  name: programFields.name.optional(),
  locationScope: programFields.locationScope.optional(),
  trainingTypeId: programFields.trainingTypeId.optional(),
  institutionId: programFields.institutionId,
  institutionName: programFields.institutionName,
  venue: programFields.venue.optional(),
  description: programFields.description,
  active: programFields.active,
});
