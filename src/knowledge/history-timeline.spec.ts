import { KnowledgeService } from './knowledge.service';
import { PrismaService } from '../prisma/prisma.service';
import { EntryKind } from './knowledge.dto';

describe('Historical Timeline', () => {
  let service: KnowledgeService;

  const prisma = {
    village: {
      findUnique: jest.fn(),
    },
    knowledgeEntry: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    prisma.village.findUnique.mockResolvedValue({ id: 1 });
    prisma.knowledgeEntry.findMany.mockResolvedValue([]);
    prisma.knowledgeEntry.count.mockResolvedValue(0);
    prisma.$transaction.mockResolvedValue([[], 0]);

    service = new KnowledgeService(
      prisma as unknown as PrismaService,
    );
  });

  it('requests historical events in chronological order', async () => {
    await service.list(1, 'entries', {
      page: 1,
      limit: 10,
      kind: EntryKind.EVENT,
    });

    expect(prisma.knowledgeEntry.findMany)
      .toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            villageId: 1,
            kind: EntryKind.EVENT,
          },
          orderBy: [
            { year: 'asc' },
            { id: 'asc' },
          ],
        }),
      );
  });

  it('preserves the default ordering for landmarks', async () => {
    await service.list(1, 'entries', {
      page: 1,
      limit: 10,
      kind: EntryKind.LANDMARK,
    });

    expect(prisma.knowledgeEntry.findMany)
      .toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ id: 'asc' }],
        }),
      );
  });
});