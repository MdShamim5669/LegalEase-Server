import { z } from "zod";

const createLawyerSchema = z.object({
  body: z.object({
    name: z.string({ required_error: "Name is required" }).min(2),
    email: z.string({ required_error: "Email is required" }).email(),
    contactNumber: z.string({ required_error: "Contact number is required" }),
    gender: z.enum(["MALE", "FEMALE", "OTHER"], { required_error: "Gender is required" }),
    barCouncilNo: z.string({ required_error: "Bar Council Number is required" }).min(3),
    consultationFee: z.number({ required_error: "Consultation fee is required" }).int().positive(),
    experience: z.number().int().nonnegative().optional(),
    chamberAddress: z.string().optional(),
    practiceAreaIds: z.array(z.string()).optional(),
  }),
});

const createAdminSchema = z.object({
  body: z.object({
    name: z.string({ required_error: "Name is required" }).min(2),
    email: z.string({ required_error: "Email is required" }).email(),
    contactNumber: z.string().optional(),
  }),
});

const updateStatusSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "User ID is required" }),
  }),
  body: z.object({
    status: z.enum(["ACTIVE", "BLOCKED"], { required_error: "Status must be ACTIVE or BLOCKED" }),
  }),
});

export const UserValidation = {
  createLawyerSchema,
  createAdminSchema,
  updateStatusSchema,
};

export default UserValidation;
