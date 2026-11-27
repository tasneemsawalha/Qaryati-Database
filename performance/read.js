import { benchmarkBase } from './config.js';
import http from 'k6/http';
import { check, sleep, fail } from 'k6';
export const options = {
  vus: Number(__ENV.VUS || 20),
  duration: __ENV.DURATION || '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
    http_req_duration: ['p(95)<500'],
  },
  summaryTrendStats: ['avg', 'p(95)', 'min', 'max'],
};
export function setup() {
  const base = benchmarkBase();
  const ready = http.get(`${base}/health/ready`);
  if (ready.status !== 200) fail('Benchmark API is not ready.');
  const probe = http.get(
    `${base}/villages?search=${encodeURIComponent(__ENV.SEARCH || 'Synthetic')}&page=1&limit=20`,
  );
  if (probe.status !== 200 || probe.json().meta.total < 1)
    fail(
      'Expected synthetic search data is missing; seed the benchmark database first.',
    );
}
export default function () {
  const base = benchmarkBase();
  const r = http.get(
    `${base}/villages?search=${encodeURIComponent(__ENV.SEARCH || 'Synthetic')}&page=1&limit=20`,
    { tags: { operation: 'village_search' } },
  );
  check(r, { 'read succeeds': (r) => r.status === 200 });
  sleep(0.1);
}
