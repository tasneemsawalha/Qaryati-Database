import { fail } from 'k6';

// Explicit opt-in: the URL alone cannot prove the server uses a disposable DB.
export function benchmarkBase() {
  if (__ENV.BENCHMARK_ONLY !== 'true' || !__ENV.BASE_URL) {
    fail(
      'Set BENCHMARK_ONLY=true and BASE_URL explicitly for a disposable benchmark instance.',
    );
  }
  return __ENV.BASE_URL.replace(/\/$/, '');
}
