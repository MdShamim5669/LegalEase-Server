import { z } from "zod";

const createScheduleSchema = z.object({
  body: z.object({
    slots: z
      .array(
        z.object({
          startDateTime: z.string({ error: "Start time is required" }),
          endDateTime: z.string({ error: "End time is required" }),
        })
      )
      .min(1, "At least one slot must be provided"),
  }),
});

const updateScheduleSchema = z.object({
  params: z.object({
    id: z.string({ error: "Schedule ID is required" }),
  }),
  body: z.object({
    startDateTime: z.string().optional(),
    endDateTime: z.string().optional(),
  }),
});

export const ScheduleValidation = {
  createScheduleSchema,
  updateScheduleSchema,
};

export default ScheduleValidation;
