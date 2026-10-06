# Standard Module Templates

## 1. Route Template (`<name>.route.ts`)

```ts
import express from "express";
import { Role } from "@prisma/client";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { ModuleController } from "./<name>.controller";
import { ModuleValidation } from "./<name>.validation";

const router = express.Router();

router.post(
  "/",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(ModuleValidation.createSchema),
  ModuleController.create
);

router.get(
  "/",
  checkAuth(Role.CLIENT, Role.LAWYER, Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(ModuleValidation.querySchema),
  ModuleController.getAll
);

router.get("/:id", ModuleController.getById); // Example public route

export const ModuleRoutes = router;
```

## 2. Validation Schema Template (`<name>.validation.ts`)

```ts
import { z } from "zod";

const createSchema = z.object({
  body: z.object({
    title: z.string({ required_error: "Title is required" }).min(2).max(100),
    description: z.string().optional(),
  }),
});

const querySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    searchTerm: z.string().optional(),
  }),
});

export const ModuleValidation = {
  createSchema,
  querySchema,
};
```

## 3. Controller Template (`<name>.controller.ts`)

```ts
import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { ModuleService } from "./<name>.service";

const create = catchAsync(async (req: Request, res: Response) => {
  const result = await ModuleService.create(req.user!, req.body);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Resource created successfully",
    data: result,
  });
});

const getAll = catchAsync(async (req: Request, res: Response) => {
  const result = await ModuleService.getAll(req.query);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Resources retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getById = catchAsync(async (req: Request, res: Response) => {
  const result = await ModuleService.getById(req.params.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Resource retrieved successfully",
    data: result,
  });
});

export const ModuleController = {
  create,
  getAll,
  getById,
};
```

## 4. Service Template (`<name>.service.ts`)

```ts
import status from "http-status";
import prisma from "../../lib/prisma";
import { AppError } from "../../errorHelpers/AppError";
import { IAuthUser } from "../../interfaces/auth.interface";

const create = async (user: IAuthUser, payload: any) => {
  return await prisma.resource.create({
    data: {
      ...payload,
      createdById: user.userId,
    },
  });
};

const getAll = async (query: any) => {
  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.resource.findMany({
      where: { isDeleted: false },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.resource.count({ where: { isDeleted: false } }),
  ]);

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    data,
  };
};

const getById = async (id: string) => {
  const record = await prisma.resource.findUnique({
    where: { id, isDeleted: false },
  });
  if (!record) {
    throw new AppError(status.NOT_FOUND, "Resource not found", "RESOURCE_NOT_FOUND");
  }
  return record;
};

export const ModuleService = {
  create,
  getAll,
  getById,
};
```
