import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, Min, Max } from 'class-validator';
export class VersionDto {
  @ApiProperty({
    minimum: 1,
    description: 'Current resource version; stale writes return 409',
  })
  @Transform(({ value }) =>
    typeof value === 'string' && /^[0-9]+$/.test(value) ? Number(value) : value,
  )
  @IsInt()
  @Min(1)
  @Max(2147483647)
  version: number;
}
