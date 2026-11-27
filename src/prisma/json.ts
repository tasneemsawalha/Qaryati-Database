import type { Prisma } from '../generated/prisma/client';

export const snapshot = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value));
