import { z } from "zod";

const pickSlotsSchema = z.object({
  body: z.object({
    scheduleIds: z
      .array(z.string({ required_error: "Schedule ID must be a string" }))
      .min(1, "At least one schedule ID is required"),
  }),
});

const removeSlotSchema = z.object({
  params: z.object({
    scheduleId: z.string({ required_error: "Schedule ID is required" }),
  }),
});

export const LawyerScheduleValidation = {
  pickSlotsSchema,
  removeSlotSchema,
};

export default LawyerScheduleValidation;
