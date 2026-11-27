// Loads seed/real-villages.json through the public API, so every record passes the
// same validation, permission checks and audit logging as a normal edit.
// Usage (API must be running, account must be EDITOR or ADMIN):
//   SEED_EMAIL=you@example.com SEED_PASSWORD=... npm run seed:villages
// Optional: API_URL (default http://localhost:3000/api/v1).
// Safe to re-run: a village that already exists (same Arabic name + governorate)
// is skipped, and duplicate population records (same year + source) are ignored.
const fs = require('node:fs');
const path = require('node:path');

const API = (process.env.API_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '');
const data = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'seed', 'real-villages.json'), 'utf8'),
);

async function call(method, url, token, body) {
  const res = await fetch(API + url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function findExisting(village) {
  const { json } = await call(
    'GET',
    `/villages?limit=100&search=${encodeURIComponent(village.arabicName)}`,
  );
  return json?.data?.find(
    (v) => v.arabicName === village.arabicName && v.governorate === village.governorate,
  );
}

async function main() {
  const email = process.env.SEED_EMAIL;
  const password = process.env.SEED_PASSWORD;
  if (!email || !password) throw new Error('Set SEED_EMAIL and SEED_PASSWORD');
  const login = await call('POST', '/auth/login', null, { email, password });
  if (login.status !== 200) throw new Error(`Login failed (${login.status})`);
  const token = login.json.accessToken;
  if (!['EDITOR', 'ADMIN'].includes(login.json.user.role))
    throw new Error('The seeding account must be EDITOR or ADMIN');

  let created = 0, skipped = 0, records = 0;
  for (const item of data.villages) {
    const name = item.village.arabicName;
    if (await findExisting(item.village)) {
      console.log(`skip    ${name} (already exists)`);
      skipped++;
      continue;
    }
    const v = await call('POST', '/villages', token, item.village);
    if (v.status !== 201)
      throw new Error(`Village ${name} rejected (${v.status}): ${JSON.stringify(v.json?.error?.message)}`);
    for (const p of item.population) {
      const r = await call('POST', `/villages/${v.json.id}/population`, token, p);
      if (r.status === 201) records++;
      else if (r.status !== 409)
        throw new Error(`Population ${name} ${p.year} rejected (${r.status}): ${JSON.stringify(r.json?.error?.message)}`);
    }
    for (const e of item.entries) {
      const r = await call('POST', `/villages/${v.json.id}/entries`, token, e);
      if (r.status !== 201)
        throw new Error(`Entry "${e.title}" rejected (${r.status}): ${JSON.stringify(r.json?.error?.message)}`);
      records++;
    }
    console.log(`created ${name} (#${v.json.id})`);
    created++;
  }
  console.log(
    `Done: ${created} villages created, ${skipped} skipped, ${records} population/entry records. ` +
      'Everything is DRAFT until a VERIFIER reviews it.',
  );
}

main().catch((e) => {
  console.error(`Seeding failed: ${e.message}`);
  process.exitCode = 1;
});
