import { PositiveIdPipe } from '../common/positive-id.pipe';
import { PaginationDto } from '../common/pagination.dto';
import { Roles, type Actor } from '../auth/auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { VersionDto } from '../common/version.dto';

import {
  Body,
  Req,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { VillagesService } from './villages.service';
import { CreateVillageDto } from './dto/create-village.dto';
import { UpdateVillageDto } from './dto/update-village.dto';
import { ListVillagesQueryDto } from './dto/list-villages-query.dto';

@ApiBearerAuth()
@ApiTags('Villages')
@Controller('villages')
export class VillagesController {
  constructor(private readonly villagesService: VillagesService) {}

  @Get()
  @ApiOperation({
    summary: 'List, search and filter villages',
  })
  findAll(@Query() query: ListVillagesQueryDto) {
    return this.villagesService.findAll(query);
  }

  @Get('stats/by-governorate')
  @ApiOperation({
    summary: 'Count villages by governorate',
  })
  countByGovernorate() {
    return this.villagesService.countByGovernorate();
  }

  @Get(':id')
  findOne(@Param('id', PositiveIdPipe) id: number) {
    return this.villagesService.findOne(id);
  }

  @Roles('EDITOR', 'ADMIN')
  @Post()
  create(@Body() dto: CreateVillageDto, @Req() req: { actor: Actor }) {
    return this.villagesService.create(dto, req.actor.id);
  }

  @Roles('EDITOR', 'ADMIN')
  @Patch(':id')
  update(
    @Param('id', PositiveIdPipe) id: number,
    @Body() dto: UpdateVillageDto,
    @Req() req: { actor: Actor },
  ) {
    return this.villagesService.update(id, dto, req.actor.id);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(
    @Param('id', PositiveIdPipe) id: number,
    @Query() query: VersionDto,
    @Req() req: { actor: Actor },
  ) {
    return this.villagesService.remove(id, query.version, req.actor.id);
  }

  @Roles('VERIFIER', 'ADMIN')
  @Post(':id/verify')
  verify(
    @Param('id', PositiveIdPipe) id: number,
    @Body() dto: VersionDto,
    @Req() req: { actor: Actor },
  ) {
    return this.villagesService.verify(id, dto.version, req.actor.id);
  }
  @Roles('VERIFIER', 'ADMIN')
  @Get(':id/audit')
  audit(
    @Param('id', PositiveIdPipe) id: number,
    @Query() query: PaginationDto,
  ) {
    return this.villagesService.history(id, query);
  }
}
