import { PositiveIdPipe } from '../common/positive-id.pipe';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CredentialsDto, RoleDto } from './auth.dto';
import { Public, Roles, type Actor } from './auth.guard';
@ApiTags('Authentication')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Register a READER account; roles cannot be self-assigned',
  })
  register(@Body() dto: CredentialsDto) {
    return this.auth.register(dto);
  }
  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: CredentialsDto) {
    return this.auth.login(dto);
  }
  @Roles('READER', 'EDITOR', 'VERIFIER', 'ADMIN')
  @Get('me')
  me(@Req() req: { actor: Actor }) {
    return req.actor;
  }
  @Roles('READER', 'EDITOR', 'VERIFIER', 'ADMIN')
  @Post('logout')
  @HttpCode(200)
  logout(@Req() req: { tokenHash: string }) {
    return this.auth.logout(req.tokenHash);
  }
  @Roles('ADMIN')
  @Patch('users/:id/role')
  role(
    @Param('id', PositiveIdPipe) id: number,
    @Body() dto: RoleDto,
    @Req() req: { actor: Actor },
  ) {
    return this.auth.setRole(id, dto, req.actor);
  }
}
