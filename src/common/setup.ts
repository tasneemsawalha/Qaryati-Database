import {
  BadRequestException,
  INestApplication,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { json } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { ErrorFilter } from './error.filter';
import { requestPath } from './request-path';
import { validationMessages } from './validation-errors';
export function setupApp(app: INestApplication) {
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException(validationMessages(errors)),
    }),
  );
  app.useGlobalFilters(new ErrorFilter());
  app.enableCors({
    origin: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  const buckets = new Map<string, { count: number; reset: number }>();
  const logger = new Logger('HTTP');
  app.use((req: Request, res: Response, next: NextFunction) => {
    const started = Date.now();
    const requestId = randomUUID();
    res.setHeader('x-request-id', requestId);
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('x-frame-options', 'DENY');
    res.setHeader('cache-control', 'no-store');
    res.on('finish', () =>
      logger.log(
        JSON.stringify({
          requestId,
          method: req.method,
          path: requestPath(req),
          status: res.statusCode,
          durationMs: Date.now() - started,
        }),
      ),
    );
    const auth = /^\/api\/v1\/auth\/(login|register)\/?$/.test(req.path);
    const key = `${req.ip}:${auth ? 'auth' : 'api'}`;
    const now = Date.now();
    if (buckets.size >= 10000)
      for (const [k, v] of buckets) if (v.reset <= now) buckets.delete(k);
    let bucket = buckets.get(key);
    if (!bucket || bucket.reset <= now) {
      if (!bucket && buckets.size >= 10000)
        return res.status(429).json({
          error: {
            status: 429,
            code: 'HTTP_429',
            message: 'Rate limiter capacity reached',
            requestId,
            path: requestPath(req),
            timestamp: new Date().toISOString(),
          },
        });
      bucket = { count: 0, reset: now + 60000 };
      buckets.set(key, bucket);
    }
    const limit = Number(
      auth
        ? process.env.AUTH_RATE_LIMIT || 10
        : process.env.API_RATE_LIMIT || 120,
    );
    if (++bucket.count > limit) {
      res.setHeader('retry-after', Math.ceil((bucket.reset - now) / 1000));
      return res.status(429).json({
        error: {
          status: 429,
          code: 'HTTP_429',
          message: 'Rate limit exceeded',
          requestId,
          path: requestPath(req),
          timestamp: new Date().toISOString(),
        },
      });
    }
    next();
  });
  app.use(json({ limit: '128kb' }));
  app.enableShutdownHooks();
}
