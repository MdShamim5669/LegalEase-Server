import { z } from "zod";

const updateLawyerSchema = z.object({
  params: z.object({
    id: z.string({ error: "Lawyer ID is required" }),
  }),
  body: z.object({
    name: z.string().min(2).optional(),
    contactNumber: z.string().optional(),
    profilePhoto: z.string().url().optional(),
    chamberAddress: z.string().optional(),
    consultationFee: z.number().int().positive().optional(),
    experience: z.number().int().nonnegative().optional(),
    languages: z.array(z.string()).optional(),
    bio: z.string().optional(),
    practiceAreaIds: z.array(z.string()).optional(),
  }),
});

const verifyLawyerSchema = z.object({
  params: z.object({
    id: z.string({ error: "Lawyer ID is required" }),
  }),
  body: z.object({
    isVerified: z.boolean({ error: "isVerified status is required" }),
    verificationNote: z.string().optional(),
  }),
});

export const LawyerValidation = {
  updateLawyerSchema,
  verifyLawyerSchema,
};

export default LawyerValidation;
