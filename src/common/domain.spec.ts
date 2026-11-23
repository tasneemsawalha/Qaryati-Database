import { assertVersion, validateVillage } from './domain';
import { validateConfig } from './config';
describe('domain consistency', () => {
  const village = { arabicName: 'test', governorate: 'test' };
  it('rejects stale edits', () =>
    expect(() => assertVersion({ version: 2 }, 1)).toThrow('Resource changed'));
  it('distinguishes a missing record', () =>
    expect(() => assertVersion(null, 1)).toThrow('Resource not found'));
  it('accepts matching version', () =>
    expect(() => assertVersion({ version: 2 }, 2)).not.toThrow());
  it('rejects incomplete coordinates', () =>
    expect(() => validateVillage({ ...village, latitude: 32 })).toThrow(
      'both',
    ));
  it('requires historical provenance', () =>
    expect(() =>
      validateVillage({ ...village, historicalOverview: 'history' }),
    ).toThrow('source'));
  it('requires naming provenance', () =>
    expect(() => validateVillage({ ...village, nameOrigin: 'origin' })).toThrow(
      'source',
    ));
  it('allows incomplete optional facts', () =>
    expect(() => validateVillage(village)).not.toThrow());
  it('accepts zero-valued coordinates', () =>
    expect(() =>
      validateVillage({ ...village, latitude: 0, longitude: 0 }),
    ).not.toThrow());
  it('rejects invalid runtime configuration', () =>
    expect(() =>
      validateConfig({
        DATABASE_URL: 'postgresql://local/db',
        SESSION_TTL_SECONDS: 'NaN',
      }),
    ).toThrow('SESSION_TTL'));
});
