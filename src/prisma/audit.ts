import type { Prisma } from '../generated/prisma/client';
import { snapshot } from './json';

// Use the caller's transaction so data changes and audit records commit together.
export async function audit(
  tx: Prisma.TransactionClient,
  actorId: number,
  action: string,
  entity: string,
  entityId: number,
  villageId: number,
  before?: unknown,
  after?: unknown,
) {
  await tx.auditLog.create({
    data: {
      actorId,
      action,
      entity,
      entityId,
      villageId,
      ...(before == null ? {} : { before: snapshot(before) }),
      ...(after == null ? {} : { after: snapshot(after) }),
    },
  });
}
