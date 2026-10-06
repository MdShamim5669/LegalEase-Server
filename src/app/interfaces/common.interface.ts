export interface IGenericResponse<T> {
  httpStatusCode: number;
  success: boolean;
  message: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  data: T;
}

export interface IPaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface IErrorSource {
  path: string;
  message: string;
}

export interface IGenericErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  errorSources: IErrorSource[];
}
