import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class PositiveIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const id = Number(value);
    if (
      !/^[1-9]\d*$/.test(value) ||
      !Number.isSafeInteger(id) ||
      id > 2147483647
    ) {
      throw new BadRequestException(
        'ID must be an integer between 1 and 2147483647',
      );
    }
    return id;
  }
}
