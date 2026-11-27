import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard';

// Section 7: who may create, edit, verify or remove village information.
const TOKEN = 'a'.repeat(64);

function guardFor(
  meta: { roles?: string[]; public?: boolean },
  session: unknown,
) {
  const reflector = {
    getAllAndOverride: jest.fn((key: string) =>
      key === 'roles' ? meta.roles : meta.public,
    ),
  } as unknown as Reflector;
  const prisma = {
    session: { findUnique: jest.fn().mockResolvedValue(session) },
  };
  return new AuthGuard(prisma as never, reflector);
}

function context(method: string, authorization?: string) {
  const req: Record<string, unknown> = {
    method,
    headers: authorization ? { authorization } : {},
  };
  return {
    req,
    ctx: {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => req }),
    } as never,
  };
}

const sessionWith = (role: string, expiresInMs = 60_000) => ({
  tokenHash: 'hash',
  expiresAt: new Date(Date.now() + expiresInMs),
  user: { id: 5, role, email: 'member@example.test' },
});

describe('role-based write permissions', () => {
  it('lets anyone read public village data', async () => {
    const { ctx } = context('GET');
    await expect(guardFor({}, null).canActivate(ctx)).resolves.toBe(true);
  });

  it('requires a bearer token for protected operations', async () => {
    const { ctx } = context('POST');
    await expect(
      guardFor({ roles: ['EDITOR', 'ADMIN'] }, null).canActivate(ctx),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects expired sessions', async () => {
    const { ctx } = context('POST', `Bearer ${TOKEN}`);
    await expect(
      guardFor({ roles: ['EDITOR'] }, sessionWith('EDITOR', -1000)).canActivate(
        ctx,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it.each([
    ['READER', ['EDITOR', 'ADMIN'], false],
    ['EDITOR', ['EDITOR', 'ADMIN'], true],
    ['VERIFIER', ['EDITOR', 'ADMIN'], false],
    ['EDITOR', ['VERIFIER', 'ADMIN'], false],
    ['VERIFIER', ['VERIFIER', 'ADMIN'], true],
    ['EDITOR', ['ADMIN'], false],
    ['ADMIN', ['ADMIN'], true],
  ])('%s against %j -> allowed=%s', async (role, roles, allowed) => {
    const { ctx, req } = context('POST', `Bearer ${TOKEN}`);
    const result = guardFor({ roles }, sessionWith(role)).canActivate(ctx);
    if (allowed) {
      await expect(result).resolves.toBe(true);
      expect(req.actor).toEqual({
        id: 5,
        role,
        email: 'member@example.test',
      });
    } else await expect(result).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('denies writes that have no explicit role policy', async () => {
    const { ctx } = context('PATCH', `Bearer ${TOKEN}`);
    await expect(
      guardFor({}, sessionWith('ADMIN')).canActivate(ctx),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
