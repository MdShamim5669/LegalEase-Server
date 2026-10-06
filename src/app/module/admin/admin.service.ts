import status from "http-status";
import prisma from "../../lib/prisma";
import { AppError } from "../../errorHelpers/AppError";

export const getAllAdmins = async (query: { page?: number | string; limit?: number | string }) => {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 10), 1), 100);
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.admin.findMany({
      where: { isDeleted: false },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, email: true, role: true, status: true, createdAt: true },
        },
      },
    }),
    prisma.admin.count({ where: { isDeleted: false } }),
  ]);

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    data,
  };
};

export const getAdminById = async (id: string) => {
  const admin = await prisma.admin.findFirst({
    where: { id, isDeleted: false },
    include: {
      user: {
        select: { id: true, email: true, role: true, status: true, createdAt: true },
      },
    },
  });

  if (!admin) {
    throw new AppError(status.NOT_FOUND, "Admin not found", "ADMIN_NOT_FOUND");
  }

  return admin;
};

export const updateAdmin = async (
  id: string,
  payload: { name?: string; contactNumber?: string; profilePhoto?: string }
) => {
  const admin = await prisma.admin.findFirst({
    where: { id, isDeleted: false },
  });

  if (!admin) {
    throw new AppError(status.NOT_FOUND, "Admin not found", "ADMIN_NOT_FOUND");
  }

  return await prisma.admin.update({
    where: { id },
    data: payload,
  });
};

export const deleteAdmin = async (id: string) => {
  const admin = await prisma.admin.findFirst({
    where: { id, isDeleted: false },
  });

  if (!admin) {
    throw new AppError(status.NOT_FOUND, "Admin not found", "ADMIN_NOT_FOUND");
  }

  return await prisma.$transaction(async (tx) => {
    const deletedAdmin = await tx.admin.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    await tx.user.update({
      where: { id: admin.userId },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    return deletedAdmin;
  });
};

export const AdminService = {
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
};

export default AdminService;
