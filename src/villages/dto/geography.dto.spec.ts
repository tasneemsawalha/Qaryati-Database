import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateVillageDto } from './create-village.dto';

describe('Village Geography Validation', () => {
  const village = {
    arabicName: 'سبسطية',
    governorate: 'نابلس',
  };

  it('accepts valid geographic information', () => {
    const dto = plainToInstance(CreateVillageDto, {
      ...village,
      latitude: 32.22,
      longitude: 35.26,
      locationDescription: 'Near Nablus',
      elevationMeters: 450,
      landAreaKm2: 12,
    });

    expect(validateSync(dto)).toHaveLength(0);
  });

  it('rejects invalid coordinates', () => {
    const dto = plainToInstance(CreateVillageDto, {
      ...village,
      latitude: 100,
      longitude: 200,
    });

    const errors = validateSync(dto);
    expect(errors.map(e => e.property)).toContain('latitude');
    expect(errors.map(e => e.property)).toContain('longitude');
  });

  it('rejects negative distance to nearby places', () => {
    const dto = plainToInstance(CreateVillageDto, {
      ...village,
      nearbyPlaces: [{
        name: 'Nablus',
        relationship: 'NEARBY',
        distanceKm: -5,
      }],
    });

    const errors = validateSync(dto);
    expect(JSON.stringify(errors)).toContain('distanceKm');
  });
});
