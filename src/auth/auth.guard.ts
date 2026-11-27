import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { tokenHash } from './password';
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
export const Public = () => SetMetadata('public', true);
export interface Actor {
  id: number;
  role: string;
  email: string;
}
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}
  async canActivate(context: ExecutionContext) {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>('public', targets))
      return true;
    const req = context.switchToHttp().getRequest();
    const roles = this.reflector.getAllAndOverride<string[]>('roles', targets);
    if (!roles && ['GET', 'HEAD'].includes(req.method)) return true;
    const match = /^Bearer ([a-f0-9]{64})$/.exec(
      req.headers.authorization || '',
    );
    if (!match) throw new UnauthorizedException('A bearer token is required');
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: tokenHash(match[1]) },
      include: { user: true },
    });
    if (!session || session.expiresAt <= new Date())
      throw new UnauthorizedException('Invalid or expired session');
    req.actor = {
      id: session.user.id,
      role: session.user.role,
      email: session.user.email,
    };
    req.tokenHash = session.tokenHash;
    if (roles && !roles.includes(session.user.role))
      throw new ForbiddenException('Insufficient role');
    if (!roles && !['GET', 'HEAD'].includes(req.method))
      throw new ForbiddenException('Write policy must be explicitly defined');
    return true;
  }
}
