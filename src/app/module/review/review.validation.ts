import { z } from "zod";

const createReviewSchema = z.object({
  body: z.object({
    consultationId: z.string({ error: "Consultation ID is required" }),
    rating: z
      .number({ error: "Rating is required" })
      .int()
      .min(1, "Rating must be at least 1")
      .max(5, "Rating cannot exceed 5"),
    comment: z.string().max(1000, "Comment cannot exceed 1000 characters").optional(),
  }),
});

const updateVisibilitySchema = z.object({
  params: z.object({
    id: z.string({ error: "Review ID is required" }),
  }),
  body: z.object({
    isHidden: z.boolean({ error: "isHidden boolean flag is required" }),
  }),
});

const getReviewsSchema = z.object({
  query: z
    .object({
      page: z.string().optional(),
      limit: z.string().optional(),
      lawyerId: z.string().optional(),
      isHidden: z.string().optional(),
    })
    .optional(),
});

export const ReviewValidation = {
  createReviewSchema,
  updateVisibilitySchema,
  getReviewsSchema,
};

export default ReviewValidation;
