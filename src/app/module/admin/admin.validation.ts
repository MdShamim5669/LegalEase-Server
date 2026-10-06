import { z } from "zod";

const updateAdminSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "Admin ID is required" }),
  }),
  body: z.object({
    name: z.string().min(2).optional(),
    contactNumber: z.string().optional(),
    profilePhoto: z.string().url().optional(),
  }),
});

export const AdminValidation = {
  updateAdminSchema,
};

export default AdminValidation;
