import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PopulationDto, UpdatePopulationDto } from './knowledge.dto';
import { UpdateVillageDto } from '../villages/dto/update-village.dto';
describe('population validation', () => {
  const base = { year: 2020, population: 0, source: 'Census reference' };
  it.each([-1, 1.5, 2147483648])(
    'rejects invalid population %s',
    async (value) =>
      expect(
        (
          await validate(
            plainToInstance(PopulationDto, { ...base, population: value }),
          )
        ).length,
      ).toBeGreaterThan(0),
  );
  it('accepts zero population', async () =>
    expect(await validate(plainToInstance(PopulationDto, base))).toHaveLength(
      0,
    ));
  it('rejects future dates dynamically', async () =>
    expect(
      (
        await validate(
          plainToInstance(PopulationDto, {
            ...base,
            year: new Date().getUTCFullYear() + 1,
          }),
        )
      ).length,
    ).toBeGreaterThan(0));
  it('rejects missing provenance', async () =>
    expect(
      (
        await validate(
          plainToInstance(PopulationDto, { ...base, source: '  ' }),
        )
      ).length,
    ).toBeGreaterThan(0));
  it('rejects explicit null required fields on update', async () =>
    expect(
      (
        await validate(
          plainToInstance(UpdatePopulationDto, {
            version: 1,
            population: null,
          }),
        )
      ).length,
    ).toBeGreaterThan(0));
  it('requires a version on village update', async () =>
    expect(
      (
        await validate(
          plainToInstance(UpdateVillageDto, { englishName: 'new' }),
        )
      ).length,
    ).toBeGreaterThan(0));
  it('rejects null village identity', async () =>
    expect(
      (
        await validate(
          plainToInstance(UpdateVillageDto, { version: 1, arabicName: null }),
        )
      ).length,
    ).toBeGreaterThan(0));
});
