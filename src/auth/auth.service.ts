import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CredentialsDto, RoleDto } from './auth.dto';
import { hashPassword, verifyPassword, tokenHash } from './password';
import { Actor } from './auth.guard';
@Injectable()
export class AuthService {
  private readonly dummyHash = hashPassword('dummy-password-for-timing-only');
  constructor(private readonly prisma: PrismaService) {}
  async register(dto: CredentialsDto) {
    const passwordHash = await hashPassword(dto.password);
    try {
      return await this.prisma.user.create({
        data: { email: dto.email, passwordHash },
        select: { id: true, email: true, role: true },
      });
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002')
        throw new ConflictException('Email is already registered');
      throw e;
    }
  }
  async login(dto: CredentialsDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    const valid = await verifyPassword(
      dto.password,
      user?.passwordHash ?? (await this.dummyHash),
    );
    if (!user || !valid) throw new UnauthorizedException('Invalid credentials');
    const accessToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(
      Date.now() + Number(process.env.SESSION_TTL_SECONDS || 3600) * 1000,
    );
    await this.prisma.$transaction([
      this.prisma.session.deleteMany({
        where: { userId: user.id, expiresAt: { lt: new Date() } },
      }),
      this.prisma.session.create({
        data: { tokenHash: tokenHash(accessToken), userId: user.id, expiresAt },
      }),
    ]);
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresAt,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }
  async logout(hash: string) {
    await this.prisma.session.deleteMany({ where: { tokenHash: hash } });
    return { loggedOut: true };
  }
  async setRole(id: number, dto: RoleDto, actor: Actor) {
    if (id === actor.id)
      throw new BadRequestException(
        'Administrators cannot change their own role',
      );
    return this.prisma.$transaction(async (tx) => {
      const old = await tx.user.findUnique({
        where: { id },
        select: { id: true, email: true, role: true },
      });
      if (!old) throw new NotFoundException('User not found');
      const result = await tx.user.update({
        where: { id },
        data: dto,
        select: { id: true, email: true, role: true },
      });
      await tx.session.deleteMany({ where: { userId: id } });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: 'ROLE_CHANGE',
          entity: 'User',
          entityId: id,
          before: old,
          after: result,
        },
      });
      return result;
    });
  }
}
