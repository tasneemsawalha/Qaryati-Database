import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EntryDto, EntryKind } from './knowledge.dto';

describe('History, Heritage and Landmarks', () => {
  const base = {
    title: 'Historical village site',
    description: 'Documented village history',
    source: 'Historical archive',
  };

  it.each([
    EntryKind.EVENT,
    EntryKind.LANDMARK,
    EntryKind.HERITAGE,
  ])('accepts valid %s entries', async (kind) => {
    const dto = plainToInstance(EntryDto, {
      ...base,
      kind,
      year: 1900,
    });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects missing historical sources', async () => {
    const dto = plainToInstance(EntryDto, {
      ...base,
      kind: EntryKind.EVENT,
      year: 1900,
      source: '',
    });

    expect((await validate(dto)).length)
      .toBeGreaterThan(0);
  });

  it('rejects future historical years', async () => {
    const dto = plainToInstance(EntryDto, {
      ...base,
      kind: EntryKind.EVENT,
      year: new Date().getUTCFullYear() + 1,
    });

    expect((await validate(dto)).length)
      .toBeGreaterThan(0);
  });

  it('rejects invalid landmark latitude', async () => {
    const dto = plainToInstance(EntryDto, {
      ...base,
      kind: EntryKind.LANDMARK,
      latitude: 100,
      longitude: 35,
    });

    expect((await validate(dto)).length)
      .toBeGreaterThan(0);
  });
});