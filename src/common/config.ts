export function validateConfig(env: Record<string, unknown>) {
  if (
    typeof env.DATABASE_URL !== 'string' ||
    !/^postgres(ql)?:\/\//.test(env.DATABASE_URL)
  )
    throw new Error('DATABASE_URL must be a PostgreSQL URL');
  for (const [key, fallback, max] of [
    ['PORT', 3000, 65535],
    ['SESSION_TTL_SECONDS', 3600, 86400],
    ['API_RATE_LIMIT', 120, 1000000],
    ['AUTH_RATE_LIMIT', 10, 1000000],
    ['GEOCODING_TIMEOUT_MS', 2500, 10000],
  ] as const) {
    const value = Number(env[key] ?? fallback);
    if (!Number.isInteger(value) || value < 1 || value > max)
      throw new Error(`Invalid ${key}`);
    env[key] = String(value);
  }
  return env;
}
