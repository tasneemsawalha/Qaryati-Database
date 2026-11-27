import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EntryDto, EntryKind } from './knowledge.dto';

describe('Public Facilities', () => {
  const base = {
    kind: EntryKind.FACILITY,
    description: 'Sample public facility',
    source: 'Test community reference',
  };

  it.each([
    ['Village School', 'School'],
    ['Health Clinic', 'Clinic'],
    ['Public Library', 'Library'],
    ['Community Center', 'Community Center'],
    ['Public Park', 'Park'],
    ['Football Field', 'Sports Facility'],
  ])('accepts %s as %s', async (title, category) => {
    const dto = plainToInstance(EntryDto, {
      ...base,
      title,
      category,
    });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts valid facility coordinates', async () => {
    const dto = plainToInstance(EntryDto, {
      ...base,
      title: 'Village School',
      latitude: 32.22,
      longitude: 35.26,
    });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects invalid facility longitude', async () => {
    const dto = plainToInstance(EntryDto, {
      ...base,
      title: 'Village School',
      latitude: 32.22,
      longitude: 200,
    });

    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'longitude'))
      .toBe(true);
  });

  it('rejects a facility without a title', async () => {
    const dto = plainToInstance(EntryDto, base);

    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'title'))
      .toBe(true);
  });

  it('rejects a facility without a source', async () => {
    const dto = plainToInstance(EntryDto, {
      ...base,
      title: 'Village School',
      source: '',
    });

    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'source'))
      .toBe(true);
  });
});
