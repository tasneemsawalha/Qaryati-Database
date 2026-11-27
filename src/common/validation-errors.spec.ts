import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateVillageDto } from '../villages/dto/create-village.dto';
import { UpdateVillageDto } from '../villages/dto/update-village.dto';
import { validationMessages } from './validation-errors';

describe('Validation messages through real DTOs', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      new BadRequestException(validationMessages(errors)),
  });
  const create = (body: object) =>
    pipe.transform(body, { type: 'body', metatype: CreateVillageDto });
  async function messages(body: object) {
    try {
      await create(body);
      throw new Error('Expected rejection');
    } catch (error) {
      if (!(error instanceof BadRequestException)) throw error;
      return (error.getResponse() as { message: string[] }).message;
    }
  }
  it('reports missing fields clearly', async () => {
    expect(await messages({ governorate: 'Test' })).toEqual([
      'arabicName is required',
    ]);
  });
  it('distinguishes whitespace and wrong types', async () => {
    expect(await messages({ arabicName: '   ', governorate: 42 })).toEqual([
      'arabicName must not be empty or contain only spaces',
      'governorate must be a string',
    ]);
  });
  it('identifies nested fields and blocks extra fields', async () => {
    const result = await messages({
      arabicName: 'Test',
      governorate: 'Test',
      status: 'VERIFIED',
      aliases: [{ value: 'Test', type: 'INVALID' }],
    });
    expect(result).toContain('status is not allowed');
    expect(result).toContain(
      'aliases.0.type must be one of the following values: ALTERNATIVE, TRANSLITERATION, FORMER, HISTORICAL',
    );
    expect(result).toHaveLength(2);
  });
  it('enforces the 200 character name boundary', async () => {
    await expect(
      create({ arabicName: 'a'.repeat(200), governorate: 'Test' }),
    ).resolves.toBeInstanceOf(CreateVillageDto);
    expect(
      await messages({ arabicName: 'a'.repeat(201), governorate: 'Test' }),
    ).toEqual(['arabicName must be shorter than or equal to 200 characters']);
  });
  it('preserves partial updates and zero', async () => {
    const result = await pipe.transform(
      { version: 1, landAreaKm2: 0 },
      { type: 'body', metatype: UpdateVillageDto },
    );
    expect(result.landAreaKm2).toBe(0);
    expect(result.arabicName).toBeUndefined();
  });
});
