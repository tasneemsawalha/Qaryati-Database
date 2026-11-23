import { audit } from '../prisma/audit';
import { snapshot } from '../prisma/json';
import { PaginationDto } from '../common/pagination.dto';
import { BadRequestException } from '@nestjs/common';
import { assertVersion, draft, validateVillage } from '../common/domain';

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

import { CreateVillageDto } from './dto/create-village.dto';
import { UpdateVillageDto } from './dto/update-village.dto';
import { ListVillagesQueryDto } from './dto/list-villages-query.dto';

@Injectable()
export class VillagesService {
  constructor(private readonly prisma: PrismaService) {}

  // Get villages with search, filters, sorting and pagination
  async findAll(query: ListVillagesQueryDto) {
    const where: Prisma.VillageWhereInput = {};

    const search = query.search?.trim();
    const governorate = query.governorate?.trim();
    const localCouncil = query.localCouncil?.trim();

    if (search) return this.search(query, search);

    if (governorate) {
      where.governorate = {
        equals: governorate,
        mode: 'insensitive',
      };
    }

    if (localCouncil) {
      where.localCouncil = {
        equals: localCouncil,
        mode: 'insensitive',
      };
    }

    const [data, total] = await this.prisma.$transaction(
      [
        this.prisma.village.findMany({
          where,
          include: { aliases: true },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
          orderBy: [{ [query.sortBy]: query.order }, { id: 'asc' }],
        }),

        this.prisma.village.count({ where }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );

    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  // UNION exposes each substring predicate to its GIN index. The legacy OR/EXISTS
  // plan scanned nearly every village for selective name searches (see report).
  private async search(query: ListVillagesQueryDto, search: string) {
    const pattern = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
    const candidates = Prisma.sql`
      SELECT id FROM "Village" WHERE "arabicName" ILIKE ${pattern}
      UNION SELECT id FROM "Village" WHERE "englishName" ILIKE ${pattern}
      UNION SELECT "villageId" AS id FROM "VillageName" WHERE value ILIKE ${pattern}
    `;
    const governorate = query.governorate?.trim();
    const council = query.localCouncil?.trim();
    const where = Prisma.sql`WHERE id IN (${candidates})
      ${governorate ? Prisma.sql`AND lower(governorate) = lower(${governorate})` : Prisma.empty}
      ${council ? Prisma.sql`AND lower("localCouncil") = lower(${council})` : Prisma.empty}`;
    const column =
      query.sortBy === 'englishName'
        ? Prisma.sql`"englishName"`
        : query.sortBy === 'createdAt'
          ? Prisma.sql`"createdAt"`
          : Prisma.sql`"arabicName"`;
    const direction =
      query.order === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`;
    return this.prisma.$transaction(
      async (tx) => {
        const ids = await tx.$queryRaw<{ id: number }[]>(Prisma.sql`
        SELECT id FROM "Village" ${where}
        ORDER BY ${column} ${direction}, id ASC
        LIMIT ${query.limit} OFFSET ${(query.page - 1) * query.limit}
      `);
        const [count] = await tx.$queryRaw<{ total: number }[]>(
          Prisma.sql`SELECT count(*)::int AS total FROM "Village" ${where}`,
        );
        const rows = ids.length
          ? await tx.village.findMany({
              where: { id: { in: ids.map((row) => row.id) } },
              include: { aliases: true },
            })
          : [];
        const byId = new Map(rows.map((row) => [row.id, row]));
        return {
          data: ids.map((row) => byId.get(row.id)!),
          meta: {
            page: query.page,
            limit: query.limit,
            total: count.total,
            totalPages: Math.ceil(count.total / query.limit),
          },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  // Get one village
  async findOne(id: number) {
    const village = await this.prisma.village.findUnique({
      where: { id },
      include: { aliases: true },
    });

    if (!village) {
      throw new NotFoundException('Village not found');
    }

    return village;
  }

  async create(dto: CreateVillageDto, actorId: number) {
    validateVillage(dto as unknown as Record<string, unknown>);
    const { aliases, nearbyPlaces, ...fields } = dto;
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.village.create({
        data: {
          ...fields,
          ...(nearbyPlaces != null
            ? { nearbyPlaces: snapshot(nearbyPlaces) }
            : {}),
          ...(aliases ? { aliases: { create: aliases } } : {}),
        },
        include: { aliases: true },
      });
      await audit(
        tx,
        actorId,
        'CREATE',
        'Village',
        result.id,
        result.id,
        undefined,
        result,
      );
      return result;
    });
  }
  async update(id: number, dto: UpdateVillageDto, actorId: number) {
    const { version, aliases, nearbyPlaces, ...fields } = dto;
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.village.findUnique({
        where: { id },
        include: { aliases: true },
      });
      assertVersion(before, version);
      validateVillage({ ...before, ...fields });
      const changed = await tx.village.updateMany({
        where: { id, version },
        data: {
          ...fields,
          ...draft,
          version: { increment: 1 },
          ...(nearbyPlaces !== undefined
            ? {
                nearbyPlaces:
                  nearbyPlaces === null
                    ? Prisma.DbNull
                    : snapshot(nearbyPlaces),
              }
            : {}),
        },
      });
      if (!changed.count)
        throw new ConflictException('Resource changed; reload before retrying');
      if (aliases !== undefined) {
        if (aliases === null)
          throw new BadRequestException('aliases must be an array');
        await tx.villageName.deleteMany({ where: { villageId: id } });
        if (aliases.length)
          await tx.villageName.createMany({
            data: aliases.map((alias) => ({ ...alias, villageId: id })),
          });
      }
      const result = await tx.village.findUniqueOrThrow({
        where: { id },
        include: { aliases: true },
      });
      await audit(tx, actorId, 'UPDATE', 'Village', id, id, before, result);
      return result;
    });
  }
  async remove(id: number, version: number, actorId: number) {
    return this.prisma.$transaction(
      async (tx) => {
        const before = await tx.village.findUnique({
          where: { id },
          include: { aliases: true, populationRecords: true, entries: true },
        });
        assertVersion(before, version);
        const removed = await tx.village.deleteMany({ where: { id, version } });
        if (!removed.count) throw new ConflictException('Resource changed');
        await audit(tx, actorId, 'DELETE', 'Village', id, id, before);
        return { deleted: true };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
  async verify(id: number, version: number, actorId: number) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.village.findUnique({ where: { id } });
      assertVersion(before, version);
      const changed = await tx.village.updateMany({
        where: { id, version },
        data: {
          status: 'VERIFIED',
          verifiedBy: actorId,
          verifiedAt: new Date(),
          version: { increment: 1 },
        },
      });
      if (!changed.count) throw new ConflictException('Resource changed');
      const result = await tx.village.findUniqueOrThrow({ where: { id } });
      await audit(tx, actorId, 'VERIFY', 'Village', id, id, before, result);
      return result;
    });
  }
  async history(id: number, query: PaginationDto) {
    const where = { villageId: id };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
  // Raw SQL example
  countByGovernorate() {
    return this.prisma.$queryRaw<{ governorate: string; count: number }[]>`
      SELECT "governorate", COUNT(*)::int AS "count"
      FROM "Village"
      GROUP BY "governorate"
      ORDER BY "count" DESC
    `;
  }
}
