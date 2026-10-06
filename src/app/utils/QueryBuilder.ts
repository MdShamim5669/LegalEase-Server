export interface IPaginationOptions {
  page?: number | string;
  limit?: number | string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface IQueryOptions {
  searchTerm?: string;
  search?: string;
  page?: number | string;
  limit?: number | string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  fields?: string;
  [key: string]: unknown;
}

export interface IMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface IQueryResult<T> {
  meta: IMeta;
  data: T[];
}

export class QueryBuilder<TDelegate, TModel = unknown> {
  private delegate: TDelegate;
  private query: Record<string, unknown>;
  private whereConditions: Record<string, unknown> = {};
  private orderByConditions: Record<string, unknown> = {};
  private paginationParams: { skip: number; take: number; page: number; limit: number } = {
    skip: 0,
    take: 10,
    page: 1,
    limit: 10,
  };
  private selectFields?: Record<string, boolean>;
  private includeRelations?: Record<string, unknown>;

  constructor(delegate: TDelegate, query: Record<string, any> = {}) {
    this.delegate = delegate;
    this.query = { ...query };
  }

  /**
   * Search across multiple textual fields using case-insensitive contains.
   */
  search(searchableFields: string[]): this {
    const searchTerm = (this.query.searchTerm || this.query.search) as string | undefined;
    if (searchTerm && typeof searchTerm === "string" && searchableFields.length > 0) {
      const orConditions = searchableFields.map((field) => ({
        [field]: { contains: searchTerm, mode: "insensitive" },
      }));

      if (this.whereConditions.OR && Array.isArray(this.whereConditions.OR)) {
        this.whereConditions.OR = [...this.whereConditions.OR, ...orConditions];
      } else {
        this.whereConditions.OR = orConditions;
      }
    }
    return this;
  }

  /**
   * Filter query attributes excluding standard control keys.
   */
  filter(excludeFields: string[] = []): this {
    const defaultExcludes = [
      "searchTerm",
      "search",
      "page",
      "limit",
      "sortBy",
      "sortOrder",
      "fields",
    ];
    const allExcludes = new Set([...defaultExcludes, ...excludeFields]);

    const filterObject: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(this.query)) {
      if (!allExcludes.has(key) && value !== undefined && value !== null && value !== "") {
        if (value === "true") {
          filterObject[key] = true;
        } else if (value === "false") {
          filterObject[key] = false;
        } else {
          filterObject[key] = value;
        }
      }
    }

    this.whereConditions = {
      ...this.whereConditions,
      ...filterObject,
    };
    return this;
  }

  /**
   * Explicitly append arbitrary where constraints (e.g. isDeleted: false, relational scopes).
   */
  where(customConditions: Record<string, unknown>): this {
    this.whereConditions = {
      ...this.whereConditions,
      ...customConditions,
    };
    return this;
  }

  /**
   * Configure dynamic sorting by field name and direction.
   */
  sort(defaultSort: { field: string; order: "asc" | "desc" } = { field: "createdAt", order: "desc" }): this {
    const sortBy = (this.query.sortBy as string) || defaultSort.field;
    const sortOrderRaw = ((this.query.sortOrder as string) || defaultSort.order).toLowerCase();
    const sortOrder = sortOrderRaw === "asc" ? "asc" : "desc";

    this.orderByConditions = { [sortBy]: sortOrder };
    return this;
  }

  /**
   * Calculate skip, take, page, and limit bounds (max 100 items per page).
   */
  paginate(): this {
    const page = Math.max(Number(this.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(this.query.limit || 10), 1), 100);
    const skip = (page - 1) * limit;

    this.paginationParams = { page, limit, skip, take: limit };
    return this;
  }

  /**
   * Select specific projection fields.
   */
  select(fields?: Record<string, boolean>): this {
    if (fields) {
      this.selectFields = fields;
    } else if (this.query.fields && typeof this.query.fields === "string") {
      const selected: Record<string, boolean> = {};
      this.query.fields.split(",").forEach((field: string) => {
        const trimmed = field.trim();
        if (trimmed) selected[trimmed] = true;
      });
      if (Object.keys(selected).length > 0) {
        this.selectFields = selected;
      }
    }
    return this;
  }

  /**
   * Include related Prisma models.
   */
  include(relations: Record<string, unknown>): this {
    this.includeRelations = relations;
    return this;
  }

  /**
   * Execute findMany and count queries in parallel and format standardized metadata envelope.
   */
  async execute(): Promise<IQueryResult<TModel>> {
    const anyDelegate = this.delegate as any;

    const queryOptions: Record<string, unknown> = {
      where: this.whereConditions,
      orderBy: this.orderByConditions,
      skip: this.paginationParams.skip,
      take: this.paginationParams.take,
    };

    if (this.selectFields) {
      queryOptions.select = this.selectFields;
    } else if (this.includeRelations) {
      queryOptions.include = this.includeRelations;
    }

    const [data, total] = await Promise.all([
      anyDelegate.findMany(queryOptions),
      anyDelegate.count({ where: this.whereConditions }),
    ]);

    const { page, limit } = this.paginationParams;
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
      data,
    };
  }

  getWhere(): Record<string, unknown> {
    return this.whereConditions;
  }

  getOrderBy(): Record<string, unknown> {
    return this.orderByConditions;
  }

  getPagination() {
    return this.paginationParams;
  }
}

export default QueryBuilder;
