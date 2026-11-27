import { BadRequestException } from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { PrismaService } from '../prisma/prisma.service';
import { EntryKind } from './knowledge.dto';

describe('History and Heritage Business Rules', () => {
  const prisma = {
    $transaction: jest.fn(),
  };

  const service = new KnowledgeService(
    prisma as unknown as PrismaService,
  );

  const base = {
    title: 'Historical site',
    description: 'Village historical information',
    source: 'Historical archive',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockResolvedValue({ id: 1 });
  });

  it('rejects historical events without a year', async () => {
    await expect(
      service.create(1, 'entries', {
        ...base,
        kind: EntryKind.EVENT,
      }, 1),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects incomplete landmark coordinates', async () => {
    await expect(
      service.create(1, 'entries', {
        ...base,
        kind: EntryKind.LANDMARK,
        latitude: 32,
      }, 1),
    ).rejects.toThrow('Provide both coordinates');
  });

  it.each([
    EntryKind.LANDMARK,
    EntryKind.HERITAGE,
  ])('allows %s without a historical year', async (kind) => {
    await expect(
      service.create(1, 'entries', {
        ...base,
        kind,
      }, 1),
    ).resolves.toEqual({ id: 1 });
  });
});