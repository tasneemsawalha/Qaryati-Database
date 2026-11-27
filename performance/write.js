import { benchmarkBase } from './config.js';
import http from 'k6/http';
import { check, sleep, fail } from 'k6';
export const options = {
  vus: Number(__ENV.VUS || 5),
  duration: __ENV.DURATION || '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
    http_req_duration: ['p(95)<1000'],
  },
  summaryTrendStats: ['avg', 'p(95)', 'min', 'max'],
};
export function setup() {
  if (!__ENV.TOKEN)
    fail('Provide an ADMIN token for isolated benchmark data and cleanup');
  const base = benchmarkBase();
  const response = http.get(`${base}/auth/me`, {
    headers: { Authorization: `Bearer ${__ENV.TOKEN}` },
  });
  if (response.status !== 200 || response.json().role !== 'ADMIN')
    fail(
      'Token is expired or is not an ADMIN token. Log in again before measuring writes.',
    );
}
export default function () {
  const base = benchmarkBase();
  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${__ENV.TOKEN}`,
    },
  };
  const created = http.post(
    `${base}/villages`,
    JSON.stringify({
      arabicName: `Synthetic ${__VU}-${__ITER}`,
      governorate: 'Benchmark',
    }),
    { ...params, tags: { operation: 'create' } },
  );
  if (!check(created, { 'create succeeds': (r) => r.status === 201 })) {
    sleep(0.2);
    return;
  }
  const village = created.json();
  try {
    const updated = http.patch(
      `${base}/villages/${village.id}`,
      JSON.stringify({
        version: village.version,
        englishName: 'Synthetic updated',
      }),
      { ...params, tags: { operation: 'update' } },
    );
    check(updated, { 'update succeeds': (r) => r.status === 200 });
  } finally {
    const current = http.get(`${base}/villages/${village.id}`);
    if (
      check(current, { 'cleanup lookup succeeds': (r) => r.status === 200 })
    ) {
      const deleted = http.del(
        `${base}/villages/${village.id}?version=${current.json().version}`,
        null,
        { ...params, tags: { operation: 'cleanup' } },
      );
      check(deleted, { 'cleanup succeeds': (r) => r.status === 200 });
    }
  }
  sleep(0.2);
}
