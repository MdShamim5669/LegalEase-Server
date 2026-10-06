import { z } from "zod";

const getAuditLogsSchema = z.object({
  query: z
    .object({
      page: z.string().optional(),
      limit: z.string().optional(),
      action: z.string().optional(),
      entity: z.string().optional(),
      actorId: z.string().optional(),
    })
    .optional(),
});

export const AuditValidation = {
  getAuditLogsSchema,
};

export default AuditValidation;
