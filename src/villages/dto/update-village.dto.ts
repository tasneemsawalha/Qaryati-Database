import { IntersectionType, PartialType } from '@nestjs/swagger';
import { CreateVillageDto } from './create-village.dto';
import { VersionDto } from '../../common/version.dto';
export class UpdateVillageDto extends IntersectionType(
  PartialType(CreateVillageDto, { skipNullProperties: false }),
  VersionDto,
) {}
