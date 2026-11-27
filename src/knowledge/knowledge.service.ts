import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { assertVersion, draft } from '../common/domain';
import { audit } from '../prisma/audit';
import {
  PopulationDto,
  UpdatePopulationDto,
  EntryDto,
  UpdateEntryDto,
  EntryQueryDto,
} from './knowledge.dto';
import { PaginationDto } from '../common/pagination.dto';
type Resource = 'population' | 'entries';
@Injectable()
export class KnowledgeService {
  constructor(private readonly prisma: PrismaService) {}
  private validateEntry(entry: Record<string, unknown>) {
    if ((entry.latitude == null) !== (entry.longitude == null))
      throw new BadRequestException('Provide both coordinates');
    if (entry.kind === 'EVENT' && entry.year == null)
      throw new BadRequestException('Timeline events require a year');
  }
  async list(
    villageId: number,
    type: Resource,
    query: EntryQueryDto | PaginationDto,
  ) {
    if (
      !(await this.prisma.village.findUnique({
        where: { id: villageId },
        select: { id: true },
      }))
    )
      throw new NotFoundException('Village not found');
    const skip = (query.page - 1) * query.limit;
    const take = query.limit;
    const kind = (query as EntryQueryDto).kind;
    const result =
      type === 'population'
        ? await this.prisma.$transaction([
            this.prisma.populationRecord.findMany({
              where: { villageId },
              orderBy: [{ year: 'desc' }, { id: 'asc' }],
              skip,
              take,
            }),
            this.prisma.populationRecord.count({ where: { villageId } }),
          ])
        : await this.prisma.$transaction([
            this.prisma.knowledgeEntry.findMany({
              where: { villageId, ...(kind ? { kind } : {}) },
              orderBy:
               kind === 'EVENT'
                ? [{ year: 'asc' }, { id: 'asc' }]
                : [{ id: 'asc' }],
              skip,
              take,
            }),
            this.prisma.knowledgeEntry.count({
              where: { villageId, ...(kind ? { kind } : {}) },
            }),
          ]);
    return {
      data: result[0],
      meta: {
        page: query.page,
        limit: take,
        total: result[1],
        totalPages: Math.ceil(result[1] / take),
      },
    };
  }
  async create(
    villageId: number,
    type: Resource,
    dto: PopulationDto | EntryDto,
    actorId: number,
  ) {
    if (type === 'entries')
      this.validateEntry(dto as unknown as Record<string, unknown>);
    return this.prisma.$transaction(async (tx) => {
      if (
        !(await tx.village.findUnique({
          where: { id: villageId },
          select: { id: true },
        }))
      )
        throw new NotFoundException('Village not found');
      const result =
        type === 'population'
          ? await tx.populationRecord.create({
              data: { ...(dto as PopulationDto), villageId },
            })
          : await tx.knowledgeEntry.create({
              data: { ...(dto as EntryDto), villageId },
            });
      await audit(
        tx,
        actorId,
        'CREATE',
        type,
        result.id,
        villageId,
        undefined,
        result,
      );
      return result;
    });
  }
  async update(
    villageId: number,
    id: number,
    type: Resource,
    dto: UpdatePopulationDto | UpdateEntryDto,
    actorId: number,
  ) {
    const { version, ...fields } = dto;
    return this.prisma.$transaction(async (tx) => {
      const before =
        type === 'population'
          ? await tx.populationRecord.findFirst({ where: { id, villageId } })
          : await tx.knowledgeEntry.findFirst({ where: { id, villageId } });
      assertVersion(before, version);
      if (type === 'entries') this.validateEntry({ ...before, ...fields });
      const changed =
        type === 'population'
          ? await tx.populationRecord.updateMany({
              where: { id, villageId, version },
              data: {
                ...(fields as Omit<UpdatePopulationDto, 'version'>),
                ...draft,
                version: { increment: 1 },
              },
            })
          : await tx.knowledgeEntry.updateMany({
              where: { id, villageId, version },
              data: {
                ...(fields as Omit<UpdateEntryDto, 'version'>),
                ...draft,
                version: { increment: 1 },
              },
            });
      if (!changed.count)
        throw new ConflictException('Resource changed; reload before retrying');
      const result =
        type === 'population'
          ? await tx.populationRecord.findUniqueOrThrow({ where: { id } })
          : await tx.knowledgeEntry.findUniqueOrThrow({ where: { id } });
      await audit(tx, actorId, 'UPDATE', type, id, villageId, before, result);
      return result;
    });
  }
  async remove(
    villageId: number,
    id: number,
    type: Resource,
    version: number,
    actorId: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const before =
        type === 'population'
          ? await tx.populationRecord.findFirst({ where: { id, villageId } })
          : await tx.knowledgeEntry.findFirst({ where: { id, villageId } });
      assertVersion(before, version);
      const changed =
        type === 'population'
          ? await tx.populationRecord.deleteMany({
              where: { id, villageId, version },
            })
          : await tx.knowledgeEntry.deleteMany({
              where: { id, villageId, version },
            });
      if (!changed.count) throw new ConflictException('Resource changed');
      await audit(tx, actorId, 'DELETE', type, id, villageId, before);
      return { deleted: true };
    });
  }
  async verify(
    villageId: number,
    id: number,
    type: Resource,
    version: number,
    actorId: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const before =
        type === 'population'
          ? await tx.populationRecord.findFirst({ where: { id, villageId } })
          : await tx.knowledgeEntry.findFirst({ where: { id, villageId } });
      assertVersion(before, version);
      const data = {
        status: 'VERIFIED' as const,
        verifiedBy: actorId,
        verifiedAt: new Date(),
        version: { increment: 1 },
      };
      const changed =
        type === 'population'
          ? await tx.populationRecord.updateMany({
              where: { id, villageId, version },
              data,
            })
          : await tx.knowledgeEntry.updateMany({
              where: { id, villageId, version },
              data,
            });
      if (!changed.count) throw new ConflictException('Resource changed');
      const result =
        type === 'population'
          ? await tx.populationRecord.findUniqueOrThrow({ where: { id } })
          : await tx.knowledgeEntry.findUniqueOrThrow({ where: { id } });
      await audit(tx, actorId, 'VERIFY', type, id, villageId, before, result);
      return result;
    });
  }
}
