import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { requestPath } from './request-path';
@Catch()
export class ErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger('Errors');
  catch(error: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const code = (error as { code?: string })?.code;
    const parseStatus =
      error instanceof SyntaxError &&
      (error as { status?: number }).status === 400
        ? 400
        : (error as { type?: string })?.type === 'entity.too.large'
          ? 413
          : undefined;
    const status =
      parseStatus ??
      (error instanceof HttpException
        ? error.getStatus()
        : code === 'P2002' || code === 'P2003' || code === 'P2034'
          ? 409
          : code === 'P2025'
            ? 404
            : 500);
    const response =
      error instanceof HttpException ? error.getResponse() : null;
    const message =
      typeof response === 'string'
        ? response
        : response && typeof response === 'object' && 'message' in response
          ? response.message
          : status === 400
            ? 'Malformed JSON body'
            : status === 413
              ? 'Request body too large'
              : status === 409
                ? 'Conflicting or referenced data'
                : status === 404
                  ? 'Resource not found'
                  : 'Internal server error';
    if (status >= 500)
      this.logger.error(
        JSON.stringify({
          requestId: res.getHeader('x-request-id'),
          status,
          errorType: error instanceof Error ? error.name : 'Unknown',
        }),
      );
    res.status(status).json({
      error: {
        status,
        code: `HTTP_${status}`,
        message,
        requestId: res.getHeader('x-request-id'),
        path: requestPath(req),
        timestamp: new Date().toISOString(),
      },
    });
  }
}
