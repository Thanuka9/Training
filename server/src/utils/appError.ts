export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function notFound(entity: string) {
  return new AppError(404, "NOT_FOUND", `${entity} was not found`);
}

export function forbidden(message = "You do not have permission to perform this action") {
  return new AppError(403, "FORBIDDEN", message);
}

export function unauthorized(message = "Authentication is required") {
  return new AppError(401, "UNAUTHORIZED", message);
}

export function conflict(message: string, details?: unknown) {
  return new AppError(409, "CONFLICT", message, details);
}

export function validationError(message: string, details?: unknown) {
  return new AppError(400, "VALIDATION_ERROR", message, details);
}
