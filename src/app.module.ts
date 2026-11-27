import { AuthModule } from './auth/auth.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { GeocodingModule } from './geocoding/geocoding.module';
import { validateConfig } from './common/config';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { VillagesModule } from './villages/villages.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateConfig,
    }),
    PrismaModule,
    VillagesModule,
    AuthModule,
    KnowledgeModule,
    GeocodingModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
