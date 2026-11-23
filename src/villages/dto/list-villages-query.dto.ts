import { PaginationDto } from '../../common/pagination.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { IsOptional, MaxLength, IsString, IsIn } from 'class-validator';

export class ListVillagesQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  governorate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  localCouncil?: string;

  @ApiPropertyOptional({
    enum: ['arabicName', 'englishName', 'createdAt'],
  })
  @IsOptional()
  @IsIn(['arabicName', 'englishName', 'createdAt'])
  sortBy: 'arabicName' | 'englishName' | 'createdAt' = 'arabicName';

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'asc';
}
