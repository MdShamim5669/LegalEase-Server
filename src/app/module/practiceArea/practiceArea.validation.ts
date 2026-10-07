import { z } from "zod";

const createPracticeAreaSchema = z.object({
  body: z.object({
    title: z.string({ error: "Title is required" }).min(2, "Title must be at least 2 characters"),
    icon: z.string().url().optional(),
  }),
});

const updatePracticeAreaSchema = z.object({
  params: z.object({
    id: z.string({ error: "Practice area ID is required" }),
  }),
  body: z.object({
    title: z.string().min(2).optional(),
    icon: z.string().url().optional(),
  }),
});

export const PracticeAreaValidation = {
  createPracticeAreaSchema,
  updatePracticeAreaSchema,
};

export default PracticeAreaValidation;
