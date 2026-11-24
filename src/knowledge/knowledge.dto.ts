import { Transform } from 'class-transformer';
import {
  ApiProperty,
  ApiPropertyOptional,
  IntersectionType,
  PartialType,
} from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateBy,
} from 'class-validator';
import { VersionDto } from '../common/version.dto';
import { PaginationDto } from '../common/pagination.dto';
export enum EntryKind {
  EVENT = 'EVENT',
  LANDMARK = 'LANDMARK',
  HERITAGE = 'HERITAGE',
  ECONOMY = 'ECONOMY',
  FACILITY = 'FACILITY',
}
export function NotFutureYear() {
  return ValidateBy({
    name: 'notFutureYear',
    validator: {
      validate: (value: number) => value <= new Date().getUTCFullYear(),
      defaultMessage: () => 'year cannot be in the future',
    },
  });
}
export class PopulationDto {
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) @NotFutureYear() year: number;
  @ApiProperty({ minimum: 0, maximum: 2147483647 })
  @IsInt()
  @Min(0)
  @Max(2147483647)
  population: number;
  @ApiProperty()
  @IsString()
  @Matches(/\S/)
  @MaxLength(500)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  source: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;
}
export class UpdatePopulationDto extends IntersectionType(
  PartialType(PopulationDto, { skipNullProperties: false }),
  VersionDto,
) {}
export class EntryDto {
  @ApiProperty({ enum: EntryKind }) @IsEnum(EntryKind) kind: EntryKind;
  @ApiProperty() @IsString() @Matches(/\S/) @MaxLength(200) title: string;
  @ApiProperty()
  @IsString()
  @Matches(/\S/)
  @MaxLength(10000)
  description: string;
  @ApiProperty()
  @IsString()
  @Matches(/\S/)
  @MaxLength(500)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  source: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  category?: string;
  @ApiPropertyOptional({ description: 'Negative years represent BCE' })
  @IsOptional()
  @IsInt()
  @Min(-10000)
  @NotFutureYear()
  year?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}
export class UpdateEntryDto extends IntersectionType(
  PartialType(EntryDto, { skipNullProperties: false }),
  VersionDto,
) {}
export class EntryQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: EntryKind })
  @IsOptional()
  @IsEnum(EntryKind)
  kind?: EntryKind;
}
