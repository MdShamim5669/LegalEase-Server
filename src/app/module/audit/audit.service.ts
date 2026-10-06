import prisma from "../../lib/prisma";
import { ICreateAuditLog, IAuditLogQueryFilters } from "./audit.interface";
import { QueryBuilder } from "../../utils/QueryBuilder";

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
  const queryBuilder = new QueryBuilder(prisma.auditLog, query);
  return await queryBuilder
    .search(["action", "entity", "reason"])
    .filter()
    .sort({ field: "createdAt", order: "desc" })
    .paginate()
    .execute();
};

export const AuditService = {
  logAction,
  getAuditLogs,
};

export default AuditService;
