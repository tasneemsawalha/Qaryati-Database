import { VillagesService } from './villages.service';
describe('village transactions', () => {
  function fixture(count = 1) {
    const before = {
      id: 1,
      version: 2,
      arabicName: 'test',
      governorate: 'test',
    };
    const tx = {
      village: {
        findUnique: jest.fn().mockResolvedValue(before),
        updateMany: jest.fn().mockResolvedValue({ count }),
        findUniqueOrThrow: jest
          .fn()
          .mockResolvedValue({ ...before, version: 3 }),
      },
      auditLog: { create: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn((fn: (db: unknown) => unknown) => fn(tx)),
    };
    return { tx, service: new VillagesService(prisma as never) };
  }
  it('atomically resets verification and writes audit', async () => {
    const { tx, service } = fixture();
    await service.update(1, { version: 2, englishName: 'updated' }, 7);
    expect(tx.village.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1, version: 2 },
        data: expect.objectContaining({
          status: 'DRAFT',
          verifiedAt: null,
          verifiedBy: null,
          version: { increment: 1 },
        }),
      }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: 7,
        action: 'UPDATE',
        entityId: 1,
      }),
    });
  });
  it('does not overwrite a concurrently modified row', async () => {
    const { tx, service } = fixture(0);
    await expect(
      service.update(1, { version: 2, englishName: 'updated' }, 7),
    ).rejects.toThrow('Resource changed');
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
});
