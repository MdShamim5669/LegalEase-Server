import status from "http-status";
import prisma from "../../lib/prisma";
import { AppError } from "../../errorHelpers/AppError";

export const getAllPracticeAreas = async () => {
  return await prisma.practiceArea.findMany({
    where: { isDeleted: false },
    orderBy: { title: "asc" },
  });
};

export const createPracticeArea = async (payload: { title: string; icon?: string }) => {
  const existing = await prisma.practiceArea.findFirst({
    where: { title: payload.title, isDeleted: false },
  });
  if (existing) {
    throw new AppError(status.CONFLICT, "Practice area already exists", "DUPLICATE_PRACTICE_AREA");
  }

  return await prisma.practiceArea.create({
    data: {
      title: payload.title,
      icon: payload.icon,
    },
  });
};

export const updatePracticeArea = async (
  id: string,
  payload: { title?: string; icon?: string }
) => {
  const record = await prisma.practiceArea.findFirst({
    where: { id, isDeleted: false },
  });
  if (!record) {
    throw new AppError(status.NOT_FOUND, "Practice area not found", "PRACTICE_AREA_NOT_FOUND");
  }

  return await prisma.practiceArea.update({
    where: { id },
    data: payload,
  });
};

export const deletePracticeArea = async (id: string) => {
  const record = await prisma.practiceArea.findFirst({
    where: { id, isDeleted: false },
  });
  if (!record) {
    throw new AppError(status.NOT_FOUND, "Practice area not found", "PRACTICE_AREA_NOT_FOUND");
  }

  return await prisma.practiceArea.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });
};

export const PracticeAreaService = {
  getAllPracticeAreas,
  createPracticeArea,
  updatePracticeArea,
  deletePracticeArea,
};

export default PracticeAreaService;
