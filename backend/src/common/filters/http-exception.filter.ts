import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

// Fallback codes for exceptions that don't carry one of our own codes
const CODE_BY_STATUS: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  429: 'TOO_MANY_REQUESTS',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Something went wrong.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = CODE_BY_STATUS[status] ?? 'ERROR';
      const body = exception.getResponse();

      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, any>;
        // class-validator returns { message: string[] }
        if (Array.isArray(b.message)) {
          code = 'VALIDATION_ERROR';
          message = b.message.join('; ');
        } else {
          message = b.message ?? message;
          // Our own codes are UPPER_SNAKE_CASE; Nest's defaults ("Bad Request") are not
          if (typeof b.error === 'string' && /^[A-Z_]+$/.test(b.error)) {
            code = b.error;
          }
        }
      }
    } else {
      // Unexpected error: log the stack so it can be debugged from the server logs
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(status).json({ statusCode: status, error: code, message });
  }
}