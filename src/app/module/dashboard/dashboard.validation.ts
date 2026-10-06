import { z } from "zod";

const getDashboardSchema = z.object({
  query: z.object({}).passthrough().optional(),
});

export const DashboardValidation = {
  getDashboardSchema,
};

export default DashboardValidation;
