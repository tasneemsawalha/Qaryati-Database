import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class GeocodingQuery {
  @ApiProperty()
  @IsString()
  @Length(2, 100)
  @Matches(/\S.*\S/)
  name: string;
}
