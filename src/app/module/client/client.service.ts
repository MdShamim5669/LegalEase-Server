import status from "http-status";
import prisma from "../../lib/prisma";
import { AppError } from "../../errorHelpers/AppError";

export const getMyProfile = async (userId: string) => {
  const client = await prisma.client.findFirst({
    where: { userId, isDeleted: false },
    include: {
      user: {
        select: { id: true, email: true, role: true, status: true, emailVerified: true },
      },
    },
  });

  if (!client) {
    throw new AppError(status.NOT_FOUND, "Client profile not found", "CLIENT_NOT_FOUND");
  }

  return client;
};

export const updateMyProfile = async (
  userId: string,
  payload: {
    name?: string;
    contactNumber?: string;
    profilePhoto?: string;
    address?: string;
  }
) => {
  const client = await prisma.client.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!client) {
    throw new AppError(status.NOT_FOUND, "Client profile not found", "CLIENT_NOT_FOUND");
  }

  return await prisma.$transaction(async (tx) => {
    if (payload.name) {
      await tx.user.update({
        where: { id: userId },
        data: { name: payload.name },
      });
    }

    return await tx.client.update({
      where: { id: client.id },
      data: payload,
    });
  });
};

export const deleteMyProfile = async (userId: string) => {
  const client = await prisma.client.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!client) {
    throw new AppError(status.NOT_FOUND, "Client profile not found", "CLIENT_NOT_FOUND");
  }

  return await prisma.$transaction(async (tx) => {
    const deletedClient = await tx.client.update({
      where: { id: client.id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    await tx.user.update({
      where: { id: userId },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    return deletedClient;
  });
};

export const ClientService = {
  getMyProfile,
  updateMyProfile,
  deleteMyProfile,
};

export default ClientService;
