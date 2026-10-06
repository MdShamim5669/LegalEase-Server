import { describe, it, expect, vi, beforeEach } from "vitest";
import { logAction, getAuditLogs } from "./audit.service";
import prisma from "../../lib/prisma";
import { Role } from "../../../generated/prisma/enums.js";

vi.mock("../../lib/prisma", () => ({
  default: {
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

describe("Audit Service Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("logAction", () => {
    it("creates an audit log entry in the database", async () => {
      const mockEntry = {
        id: "log_1",
        actorId: "adm_1",
        actorRole: Role.ADMIN,
        action: "LAWYER_VERIFIED",
        entity: "LAWYER",
        entityId: "lawyer_1",
        reason: "Credentials verified",
      };

      vi.mocked(prisma.auditLog.create).mockResolvedValue(mockEntry as any);

      const result = await logAction({
        actorId: "adm_1",
        actorRole: Role.ADMIN,
        action: "LAWYER_VERIFIED",
        entity: "LAWYER",
        entityId: "lawyer_1",
        reason: "Credentials verified",
        metadata: { ip: "127.0.0.1" },
      });

      expect(result).toEqual(mockEntry);
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "LAWYER_VERIFIED",
            entity: "LAWYER",
          }),
        })
      );
    });
  });

  describe("getAuditLogs", () => {
    it("delegates to QueryBuilder and returns paginated logs", async () => {
      const mockLogs = [{ id: "log_1" }, { id: "log_2" }];
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockLogs as any);
      vi.mocked(prisma.auditLog.count).mockResolvedValue(2);

      const result = await getAuditLogs({ page: "1", limit: "10" });
      expect(result.data).toEqual(mockLogs);
      expect(result.meta.total).toBe(2);
    });
  });
});
