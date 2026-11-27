import { validateConfig } from './config';

// Section 8: configuration is validated at startup so a misconfigured
// container fails fast instead of running with hidden defaults.
const valid = { DATABASE_URL: 'postgresql://u:p@db:5432/qaryati' };

describe('environment configuration', () => {
  it('applies documented defaults for optional settings', () => {
    const env = validateConfig({ ...valid });
    expect(env).toMatchObject({
      PORT: '3000',
      SESSION_TTL_SECONDS: '3600',
      API_RATE_LIMIT: '120',
      AUTH_RATE_LIMIT: '10',
      GEOCODING_TIMEOUT_MS: '2500',
    });
  });

  it.each([undefined, '', 'mysql://u:p@db/qaryati', 'not-a-url'])(
    'rejects a non-PostgreSQL DATABASE_URL (%p)',
    (DATABASE_URL) => {
      expect(() => validateConfig({ DATABASE_URL })).toThrow(
        'DATABASE_URL must be a PostgreSQL URL',
      );
    },
  );

  it('accepts both postgres:// and postgresql:// schemes', () => {
    expect(() =>
      validateConfig({ DATABASE_URL: 'postgres://u:p@db/qaryati' }),
    ).not.toThrow();
  });

  it.each([
    ['PORT', '0'],
    ['PORT', '70000'],
    ['SESSION_TTL_SECONDS', '86401'],
    ['SESSION_TTL_SECONDS', '1.5'],
    ['API_RATE_LIMIT', '-1'],
    ['GEOCODING_TIMEOUT_MS', '20000'],
    ['AUTH_RATE_LIMIT', 'abc'],
  ])('rejects invalid %s=%s', (key, value) => {
    expect(() => validateConfig({ ...valid, [key]: value })).toThrow(
      `Invalid ${key}`,
    );
  });

  it('keeps explicit valid values', () => {
    const env = validateConfig({
      ...valid,
      PORT: '8080',
      SESSION_TTL_SECONDS: '900',
    });
    expect(env.PORT).toBe('8080');
    expect(env.SESSION_TTL_SECONDS).toBe('900');
  });
});
