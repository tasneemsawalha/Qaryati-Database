import { MaxLength, Matches } from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Type } from 'class-transformer';

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  ValidateNested,
  ArrayMaxSize,
  Min,
  Max,
} from 'class-validator';

export enum VillageNameType {
  ALTERNATIVE = 'ALTERNATIVE',
  TRANSLITERATION = 'TRANSLITERATION',
  FORMER = 'FORMER',
  HISTORICAL = 'HISTORICAL',
}

export class VillageAliasDto {
  @ApiProperty({ example: 'Sabastiya' })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(200)
  value: string;

  @ApiProperty({ enum: VillageNameType })
  @IsEnum(VillageNameType)
  type: VillageNameType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  source?: string;
}

export class NearbyPlaceDto {
  @ApiProperty() @IsString() @Matches(/\S/) @MaxLength(200) name: string;
  @ApiProperty({ enum: ['NEARBY', 'BORDERS', 'PART_OF'] })
  @IsEnum({ NEARBY: 'NEARBY', BORDERS: 'BORDERS', PART_OF: 'PART_OF' })
  relationship: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) distanceKm?: number;
}
export class CreateVillageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  locationDescription?: string;
  @ApiPropertyOptional({ type: [NearbyPlaceDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => NearbyPlaceDto)
  nearbyPlaces?: NearbyPlaceDto[];
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-500)
  @Max(9000)
  elevationMeters?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) landAreaKm2?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  historicalOverview?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  historySource?: string;

  @ApiProperty({ example: 'سبسطية' })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(200)
  arabicName: string;

  @ApiPropertyOptional({ example: 'Sebastia' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  englishName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  nameOrigin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  nameOriginSource?: string;

  @ApiProperty({ example: 'نابلس' })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(200)
  governorate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  localCouncil?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  municipalityRelationship?: string;

  @ApiPropertyOptional({
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({
    type: [VillageAliasDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => VillageAliasDto)
  aliases?: VillageAliasDto[];
}
