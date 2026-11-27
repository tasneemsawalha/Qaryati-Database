// Unit and HTTP contract tests mock the database, but AppModule still validates
// configuration at import time. Provide a harmless default so `npm test` works on
// a fresh clone without a .env file. Real values (CI, integration tests) win.
process.env.DATABASE_URL ??=
  'postgresql://unit:unit@localhost:5432/qaryati_unit_test';
