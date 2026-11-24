import { PositiveIdPipe } from '../common/positive-id.pipe';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles, type Actor } from '../auth/auth.guard';
import { VersionDto } from '../common/version.dto';
import { PaginationDto } from '../common/pagination.dto';
import {
  PopulationDto,
  UpdatePopulationDto,
  EntryDto,
  UpdateEntryDto,
  EntryQueryDto,
} from './knowledge.dto';
import { KnowledgeService } from './knowledge.service';
@ApiTags('Village knowledge')
@ApiBearerAuth()
@Controller('villages/:villageId')
export class KnowledgeController {
  constructor(private readonly knowledge: KnowledgeService) {}

  @Get('population')
  list_population(
    @Param('villageId', PositiveIdPipe) villageId: number,
    @Query() query: PaginationDto,
  ) {
    return this.knowledge.list(villageId, 'population', query);
  }
  @Roles('EDITOR', 'ADMIN')
  @Post('population')
  create_population(
    @Param('villageId', PositiveIdPipe) villageId: number,
    @Body() dto: PopulationDto,
    @Req() req: { actor: Actor },
  ) {
    return this.knowledge.create(villageId, 'population', dto, req.actor.id);
  }
  @Roles('EDITOR', 'ADMIN')
  @Patch('population/:id')
  update_population(
    @Param('villageId', PositiveIdPipe) villageId: number,
    @Param('id', PositiveIdPipe) id: number,
    @Body() dto: UpdatePopulationDto,
    @Req() req: { actor: Actor },
  ) {
    return this.knowledge.update(
      villageId,
      id,
      'population',
      dto,
      req.actor.id,
    );
  }
  @Roles('ADMIN')
  @Delete('population/:id')
  delete_population(
    @Param('villageId', PositiveIdPipe) villageId: number,
    @Param('id', PositiveIdPipe) id: number,
    @Query() query: VersionDto,
    @Req() req: { actor: Actor },
  ) {
    return this.knowledge.remove(
      villageId,
      id,
      'population',
      query.version,
      req.actor.id,
    );
  }
  @Roles('VERIFIER', 'ADMIN')
  @Post('population/:id/verify')
  verify_population(
    @Param('villageId', PositiveIdPipe) villageId: number,
    @Param('id', PositiveIdPipe) id: number,
    @Body() dto: VersionDto,
    @Req() req: { actor: Actor },
  ) {
    return this.knowledge.verify(
      villageId,
      id,
      'population',
      dto.version,
      req.actor.id,
    );
  }

  @Get('entries')
  list_entries(
    @Param('villageId', PositiveIdPipe) villageId: number,
    @Query() query: EntryQueryDto,
  ) {
    return this.knowledge.list(villageId, 'entries', query);
  }
  @Roles('EDITOR', 'ADMIN')
  @Post('entries')
  create_entries(
    @Param('villageId', PositiveIdPipe) villageId: number,
    @Body() dto: EntryDto,
    @Req() req: { actor: Actor },
  ) {
    return this.knowledge.create(villageId, 'entries', dto, req.actor.id);
  }
  @Roles('EDITOR', 'ADMIN')
  @Patch('entries/:id')
  update_entries(
    @Param('villageId', PositiveIdPipe) villageId: number,
    @Param('id', PositiveIdPipe) id: number,
    @Body() dto: UpdateEntryDto,
    @Req() req: { actor: Actor },
  ) {
    return this.knowledge.update(villageId, id, 'entries', dto, req.actor.id);
  }
  @Roles('ADMIN')
  @Delete('entries/:id')
  delete_entries(
    @Param('villageId', PositiveIdPipe) villageId: number,
    @Param('id', PositiveIdPipe) id: number,
    @Query() query: VersionDto,
    @Req() req: { actor: Actor },
  ) {
    return this.knowledge.remove(
      villageId,
      id,
      'entries',
      query.version,
      req.actor.id,
    );
  }
  @Roles('VERIFIER', 'ADMIN')
  @Post('entries/:id/verify')
  verify_entries(
    @Param('villageId', PositiveIdPipe) villageId: number,
    @Param('id', PositiveIdPipe) id: number,
    @Body() dto: VersionDto,
    @Req() req: { actor: Actor },
  ) {
    return this.knowledge.verify(
      villageId,
      id,
      'entries',
      dto.version,
      req.actor.id,
    );
  }
}
