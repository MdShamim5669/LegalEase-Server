import prisma from "../../lib/prisma";
import { ICreateAuditLog, IAuditLogQueryFilters } from "./audit.interface";

export const logAction = async (payload: ICreateAuditLog) => {
  return await prisma.auditLog.create({
    data: {
      actorId: payload.actorId,
      actorRole: payload.actorRole,
      action: payload.action,
      entity: payload.entity,
      entityId: payload.entityId,
      reason: payload.reason,
      metadata: payload.metadata ? JSON.parse(JSON.stringify(payload.metadata)) : undefined,
    },
  });
};

export const getAuditLogs = async (query: IAuditLogQueryFilters) => {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 10), 1), 100);
  const skip = (page - 1) * limit;

  const where: any = {};
  if (query.action) where.action = query.action;
  if (query.entity) where.entity = query.entity;
  if (query.actorId) where.actorId = query.actorId;

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    data,
  };
};

export const AuditService = {
  logAction,
  getAuditLogs,
};

export default AuditService;
