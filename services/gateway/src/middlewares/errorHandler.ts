import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  public statusCode: number;
  public details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || 'Internal Server Error';

  const responseBody = {
    success: false,
    error: {
      message,
      statusCode,
      correlationId: req.correlationId,
      ...(err instanceof AppError && err.details ? { details: err.details } : {}),
      ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
    },
  };

  if (process.env.NODE_ENV !== 'test') {
    console.error(JSON.stringify({
      level: 'error',
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId,
      error: message,
      stack: err.stack,
    }));
  }

  res.status(statusCode).json(responseBody);
};
