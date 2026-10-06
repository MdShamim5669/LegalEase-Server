export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public errorSources?: Array<{ path: string; message: string }>;

  constructor(
    statusCode: number,
    message: string,
    code: string = "APPLICATION_ERROR",
    errorSources?: Array<{ path: string; message: string }>,
    stack = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errorSources = errorSources;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
