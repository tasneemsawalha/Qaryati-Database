import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EntryDto, EntryKind } from './knowledge.dto';

describe('Agriculture and Local Economy', () => {
  const base = {
    kind: EntryKind.ECONOMY,
    description: 'Sample economic information',
    source: 'Test economic reference',
  };

  it.each([
    ['Olive Oil', 'Agricultural Product'],
    ['Wheat', 'Crop'],
    ['Pottery', 'Traditional Craft'],
    ['Soap Production', 'Industry'],
    ['Local Trade', 'Local Economy'],
  ])('accepts %s as %s', async (title, category) => {
    const dto = plainToInstance(EntryDto, {
      ...base,
      title,
      category,
    });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects an empty economic title', async () => {
    const dto = plainToInstance(EntryDto, {
      ...base,
      title: '',
    });

    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'title')).toBe(true);
  });

  it('rejects a missing economic source', async () => {
    const dto = plainToInstance(EntryDto, {
      ...base,
      title: 'Olive Oil',
      source: '',
    });

    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'source')).toBe(true);
  });
});