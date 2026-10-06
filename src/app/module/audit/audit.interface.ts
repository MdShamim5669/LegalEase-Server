import { Role } from "../../../generated/prisma/enums.js";

export interface ICreateAuditLog {
  actorId: string;
  actorRole: Role;
  action: string;
  entity: string;
  entityId: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface IAuditLogQueryFilters {
  page?: number | string;
  limit?: number | string;
  action?: string;
  entity?: string;
  actorId?: string;
}
