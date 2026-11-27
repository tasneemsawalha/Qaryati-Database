import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GeocodingQuery } from './geocoding.dto';
import { GeocodingService } from './geocoding.service';

@ApiTags('Geocoding')
@Controller('geocoding')
export class GeocodingController {
  constructor(private readonly service: GeocodingService) {}

  @Get()
  search(@Query() query: GeocodingQuery) {
    return this.service.search(query.name);
  }
}
