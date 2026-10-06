import status from "http-status";
import prisma from "../../lib/prisma";
import { AppError } from "../../errorHelpers/AppError";

export const createSchedules = async (
  slots: Array<{ startDateTime: string | Date; endDateTime: string | Date }>
) => {
  if (!slots || slots.length === 0) {
    throw new AppError(status.BAD_REQUEST, "At least one slot must be provided", "EMPTY_SLOTS");
  }

  const created: any[] = [];
  for (const slot of slots) {
    const start = new Date(slot.startDateTime);
    const end = new Date(slot.endDateTime);

    if (start >= end) {
      throw new AppError(status.BAD_REQUEST, "Slot start time must precede end time", "INVALID_SLOT_TIME");
    }

    const record = await prisma.schedule.upsert({
      where: {
        startDateTime_endDateTime: {
          startDateTime: start,
          endDateTime: end,
        },
      },
      update: { isDeleted: false },
      create: {
        startDateTime: start,
        endDateTime: end,
      },
    });
    created.push(record);
  }

  return created;
};

export const getAllSchedules = async (query: {
  page?: number | string;
  limit?: number | string;
  startDate?: string;
}) => {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 10), 1), 100);
  const skip = (page - 1) * limit;

  const where: any = { isDeleted: false };
  if (query.startDate) {
    where.startDateTime = { gte: new Date(query.startDate) };
  }

  const [data, total] = await Promise.all([
    prisma.schedule.findMany({
      where,
      skip,
      take: limit,
      orderBy: { startDateTime: "asc" },
    }),
    prisma.schedule.count({ where }),
  ]);

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    data,
  };
};

export const getScheduleById = async (id: string) => {
  const schedule = await prisma.schedule.findFirst({
    where: { id, isDeleted: false },
  });

  if (!schedule) {
    throw new AppError(status.NOT_FOUND, "Schedule slot not found", "SCHEDULE_NOT_FOUND");
  }

  return schedule;
};

export const updateSchedule = async (
  id: string,
  payload: { startDateTime?: string | Date; endDateTime?: string | Date }
) => {
  const schedule = await prisma.schedule.findFirst({
    where: { id, isDeleted: false },
  });

  if (!schedule) {
    throw new AppError(status.NOT_FOUND, "Schedule slot not found", "SCHEDULE_NOT_FOUND");
  }

  return await prisma.schedule.update({
    where: { id },
    data: {
      ...(payload.startDateTime && { startDateTime: new Date(payload.startDateTime) }),
      ...(payload.endDateTime && { endDateTime: new Date(payload.endDateTime) }),
    },
  });
};

export const deleteSchedule = async (id: string) => {
  const bookedMapping = await prisma.lawyerSchedule.findFirst({
    where: { scheduleId: id, isBooked: true },
  });

  if (bookedMapping) {
    throw new AppError(
      status.CONFLICT,
      "Cannot delete schedule slot currently assigned to a booked consultation",
      "SLOT_IN_USE"
    );
  }

  return await prisma.schedule.update({
    where: { id },
    data: { isDeleted: true },
  });
};

export const ScheduleService = {
  createSchedules,
  getAllSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
};

export default ScheduleService;
