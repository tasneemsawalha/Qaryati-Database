import { Module } from '@nestjs/common';
import { GeocodingController } from './geocoding.controller';
import {
  GEOCODING_PROVIDER,
  GeocodingService,
  OpenMeteoProvider,
} from './geocoding.service';

@Module({
  controllers: [GeocodingController],
  providers: [
    GeocodingService,
    { provide: GEOCODING_PROVIDER, useClass: OpenMeteoProvider },
  ],
})
export class GeocodingModule {}
