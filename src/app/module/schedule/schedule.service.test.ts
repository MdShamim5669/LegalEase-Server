import { describe, it, expect, vi, beforeEach } from "vitest";
import status from "http-status";
import {
  createSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
} from "./schedule.service";
import prisma from "../../lib/prisma";

vi.mock("../../lib/prisma", () => ({
  default: {
    schedule: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    lawyerSchedule: {
      findFirst: vi.fn(),
    },
  },
}));

describe("Schedule Service Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createSchedules", () => {
    it("throws 400 if slots array is empty", async () => {
      await expect(createSchedules([])).rejects.toMatchObject({
        statusCode: status.BAD_REQUEST,
        code: "EMPTY_SLOTS",
      });
    });

    it("throws 400 if start time is not before end time", async () => {
      const invalidSlot = [
        {
          startDateTime: "2026-10-10T11:00:00Z",
          endDateTime: "2026-10-10T10:00:00Z",
        },
      ];

      await expect(createSchedules(invalidSlot)).rejects.toMatchObject({
        statusCode: status.BAD_REQUEST,
        code: "INVALID_SLOT_TIME",
      });
    });

    it("upserts valid schedule slots", async () => {
      const validSlots = [
        {
          startDateTime: "2026-10-10T10:00:00Z",
          endDateTime: "2026-10-10T10:30:00Z",
        },
      ];

      const mockRecord = {
        id: "sch_1",
        startDateTime: new Date("2026-10-10T10:00:00Z"),
        endDateTime: new Date("2026-10-10T10:30:00Z"),
        isDeleted: false,
      };

      vi.mocked(prisma.schedule.upsert).mockResolvedValue(mockRecord as any);

      const result = await createSchedules(validSlots);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockRecord);
    });
  });

  describe("getScheduleById", () => {
    it("throws 404 if slot does not exist", async () => {
      vi.mocked(prisma.schedule.findFirst).mockResolvedValue(null);

      await expect(getScheduleById("sch_missing")).rejects.toMatchObject({
        statusCode: status.NOT_FOUND,
        code: "SCHEDULE_NOT_FOUND",
      });
    });

    it("returns slot if found", async () => {
      const mockSlot = { id: "sch_1", isDeleted: false };
      vi.mocked(prisma.schedule.findFirst).mockResolvedValue(mockSlot as any);

      const res = await getScheduleById("sch_1");
      expect(res).toEqual(mockSlot);
    });
  });

  describe("updateSchedule", () => {
    it("throws 404 if slot does not exist", async () => {
      vi.mocked(prisma.schedule.findFirst).mockResolvedValue(null);

      await expect(
        updateSchedule("sch_missing", { startDateTime: "2026-10-10T12:00:00Z" })
      ).rejects.toMatchObject({
        statusCode: status.NOT_FOUND,
        code: "SCHEDULE_NOT_FOUND",
      });
    });

    it("updates slot dateTimes successfully", async () => {
      vi.mocked(prisma.schedule.findFirst).mockResolvedValue({ id: "sch_1", isDeleted: false } as any);
      const updatedSlot = { id: "sch_1", startDateTime: new Date("2026-10-10T12:00:00Z") };
      vi.mocked(prisma.schedule.update).mockResolvedValue(updatedSlot as any);

      const res = await updateSchedule("sch_1", { startDateTime: "2026-10-10T12:00:00Z" });
      expect(res).toEqual(updatedSlot);
    });
  });

  describe("deleteSchedule", () => {
    it("throws 409 if schedule slot is currently booked", async () => {
      vi.mocked(prisma.lawyerSchedule.findFirst).mockResolvedValue({
        id: "ls_1",
        isBooked: true,
      } as any);

      await expect(deleteSchedule("sch_1")).rejects.toMatchObject({
        statusCode: status.CONFLICT,
        code: "SLOT_IN_USE",
      });
    });

    it("soft-deletes schedule slot if not booked", async () => {
      vi.mocked(prisma.lawyerSchedule.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.schedule.update).mockResolvedValue({ id: "sch_1", isDeleted: true } as any);

      const res = await deleteSchedule("sch_1");
      expect(res).toEqual({ id: "sch_1", isDeleted: true });
    });
  });
});
