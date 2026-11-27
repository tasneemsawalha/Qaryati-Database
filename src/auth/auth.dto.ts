import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';
export class CredentialsDto {
  @ApiProperty()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email: string;
  @ApiProperty({ minLength: 12, maxLength: 128 })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password: string;
}
export enum UserRole {
  READER = 'READER',
  EDITOR = 'EDITOR',
  VERIFIER = 'VERIFIER',
  ADMIN = 'ADMIN',
}
export class RoleDto {
  @ApiProperty({ enum: UserRole }) @IsEnum(UserRole) role: UserRole;
}
