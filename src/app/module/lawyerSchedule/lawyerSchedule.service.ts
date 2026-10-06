import status from "http-status";
import prisma from "../../lib/prisma";
import { AppError } from "../../errorHelpers/AppError";

export const pickSlots = async (lawyerUserId: string, scheduleIds: string[]) => {
  const lawyer = await prisma.lawyer.findFirst({
    where: { userId: lawyerUserId, isDeleted: false },
  });

  if (!lawyer) {
    throw new AppError(status.NOT_FOUND, "Lawyer profile not found", "LAWYER_NOT_FOUND");
  }

  const assigned: any[] = [];
  for (const scheduleId of scheduleIds) {
    const slot = await prisma.schedule.findFirst({
      where: { id: scheduleId, isDeleted: false },
    });
    if (!slot) continue;

    const entry = await prisma.lawyerSchedule.upsert({
      where: {
        lawyerId_scheduleId: {
          lawyerId: lawyer.id,
          scheduleId,
        },
      },
      update: {},
      create: {
        lawyerId: lawyer.id,
        scheduleId,
        isBooked: false,
      },
      include: { schedule: true },
    });
    assigned.push(entry);
  }

  return assigned;
};

export const getMySlots = async (lawyerUserId: string) => {
  const lawyer = await prisma.lawyer.findFirst({
    where: { userId: lawyerUserId, isDeleted: false },
  });

  if (!lawyer) {
    throw new AppError(status.NOT_FOUND, "Lawyer profile not found", "LAWYER_NOT_FOUND");
  }

  return await prisma.lawyerSchedule.findMany({
    where: { lawyerId: lawyer.id },
    include: { schedule: true },
    orderBy: { schedule: { startDateTime: "asc" } },
  });
};

export const removeSlot = async (lawyerUserId: string, scheduleId: string) => {
  const lawyer = await prisma.lawyer.findFirst({
    where: { userId: lawyerUserId, isDeleted: false },
  });

  if (!lawyer) {
    throw new AppError(status.NOT_FOUND, "Lawyer profile not found", "LAWYER_NOT_FOUND");
  }

  const slot = await prisma.lawyerSchedule.findUnique({
    where: {
      lawyerId_scheduleId: {
        lawyerId: lawyer.id,
        scheduleId,
      },
    },
  });

  if (!slot) {
    throw new AppError(status.NOT_FOUND, "Slot not assigned to lawyer", "SLOT_NOT_FOUND");
  }

  if (slot.isBooked) {
    throw new AppError(
      status.CONFLICT,
      "Cannot remove a slot that is already booked for consultation",
      "SLOT_ALREADY_BOOKED"
    );
  }

  return await prisma.lawyerSchedule.delete({
    where: {
      lawyerId_scheduleId: {
        lawyerId: lawyer.id,
        scheduleId,
      },
    },
  });
};

export const LawyerScheduleService = {
  pickSlots,
  getMySlots,
  removeSlot,
};

export default LawyerScheduleService;
