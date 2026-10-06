import { describe, it, expect, vi } from "vitest";
import { QueryBuilder } from "./QueryBuilder";

describe("QueryBuilder Utility (src/app/utils/QueryBuilder.ts)", () => {
  it("builds case-insensitive search OR conditions correctly", () => {
    const mockDelegate = { findMany: vi.fn(), count: vi.fn() };
    const qb = new QueryBuilder(mockDelegate, { searchTerm: "counsel" });

    qb.search(["name", "bio", "title"]);

    expect(qb.getWhere()).toEqual({
      OR: [
        { name: { contains: "counsel", mode: "insensitive" } },
        { bio: { contains: "counsel", mode: "insensitive" } },
        { title: { contains: "counsel", mode: "insensitive" } },
      ],
    });
  });

  it("filters out control keys and converts string booleans", () => {
    const mockDelegate = { findMany: vi.fn(), count: vi.fn() };
    const qb = new QueryBuilder(mockDelegate, {
      searchTerm: "ignored",
      page: "2",
      limit: "25",
      sortBy: "rating",
      sortOrder: "desc",
      isActive: "true",
      isHidden: "false",
      role: "LAWYER",
    });

    qb.filter();

    expect(qb.getWhere()).toEqual({
      isActive: true,
      isHidden: false,
      role: "LAWYER",
    });
  });

  it("applies custom where conditions", () => {
    const mockDelegate = { findMany: vi.fn(), count: vi.fn() };
    const qb = new QueryBuilder(mockDelegate, {});

    qb.where({ isDeleted: false, status: "ACTIVE" });

    expect(qb.getWhere()).toEqual({
      isDeleted: false,
      status: "ACTIVE",
    });
  });

  it("applies sorting and pagination defaults and bounds", () => {
    const mockDelegate = { findMany: vi.fn(), count: vi.fn() };
    const qb = new QueryBuilder(mockDelegate, {
      page: "3",
      limit: "15",
      sortBy: "amount",
      sortOrder: "asc",
    });

    qb.sort().paginate();

    expect(qb.getOrderBy()).toEqual({ amount: "asc" });
    expect(qb.getPagination()).toEqual({
      page: 3,
      limit: 15,
      skip: 30,
      take: 15,
    });
  });

  it("executes findMany and count in parallel and computes totalPages", async () => {
    const mockData = [{ id: "1" }, { id: "2" }];
    const mockDelegate = {
      findMany: vi.fn().mockResolvedValue(mockData),
      count: vi.fn().mockResolvedValue(45),
    };

    const qb = new QueryBuilder(mockDelegate, { page: "2", limit: "10" });
    const result = await qb.where({ isDeleted: false }).sort().paginate().execute();

    expect(mockDelegate.findMany).toHaveBeenCalledWith({
      where: { isDeleted: false },
      orderBy: { createdAt: "desc" },
      skip: 10,
      take: 10,
    });
    expect(mockDelegate.count).toHaveBeenCalledWith({
      where: { isDeleted: false },
    });

    expect(result).toEqual({
      meta: {
        page: 2,
        limit: 10,
        total: 45,
        totalPages: 5,
      },
      data: mockData,
    });
  });

  it("supports fields projection and relations inclusion", async () => {
    const mockDelegate = {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    };

    const qb = new QueryBuilder(mockDelegate, { fields: "id, name, email" });
    await qb
      .select()
      .include({ client: true })
      .paginate()
      .execute();

    expect(mockDelegate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: { id: true, name: true, email: true },
      })
    );
  });

  it("clamps negative/excessive pagination values within safety bounds", () => {
    const mockDelegate = { findMany: vi.fn(), count: vi.fn() };
    const qb = new QueryBuilder(mockDelegate, { page: "-5", limit: "999" });

    qb.paginate();

    expect(qb.getPagination()).toEqual({
      page: 1,
      limit: 100,
      skip: 0,
      take: 100,
    });
  });

  it("respects custom excludeFields in filter and supports search query alias", () => {
    const mockDelegate = { findMany: vi.fn(), count: vi.fn() };
    const qb = new QueryBuilder(mockDelegate, {
      search: "solicitor",
      minFee: "1000",
      customToExclude: "val",
      status: "ACTIVE",
    });

    qb.search(["bio"]).filter(["customToExclude", "minFee"]);

    expect(qb.getWhere()).toEqual({
      OR: [{ bio: { contains: "solicitor", mode: "insensitive" } }],
      status: "ACTIVE",
    });
  });
});

