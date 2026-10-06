import { z } from "zod";

const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    contactNumber: z.string().optional(),
    profilePhoto: z.string().url().optional(),
    address: z.string().optional(),
  }),
});

export const ClientValidation = {
  updateProfileSchema,
};

export default ClientValidation;
