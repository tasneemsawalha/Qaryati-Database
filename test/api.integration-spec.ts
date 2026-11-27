import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/common/setup';
describe('real PostgreSQL lifecycle (use a dedicated test database)', () => {
  let app: INestApplication,
    db: PrismaService,
    token: string,
    villageId: number,
    userId: number;
  const email = `integration-${Date.now()}@example.invalid`;
  const password = 'Integration-test-password-123';
  beforeAll(async () => {
    if (
      !process.env.TEST_DATABASE_URL ||
      !/test/i.test(new URL(process.env.TEST_DATABASE_URL).pathname)
    )
      throw new Error(
        'TEST_DATABASE_URL must point to a dedicated database with test in its name; migrate it first',
      );
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.API_RATE_LIMIT = '10000';
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication({ bodyParser: false });
    app.useLogger(false);
    setupApp(app);
    await app.init();
    db = app.get(PrismaService);
  });
  afterAll(async () => {
    if (db && userId) {
      await db.auditLog.deleteMany({ where: { actorId: userId } });
      if (villageId) await db.village.deleteMany({ where: { id: villageId } });
      await db.user.deleteMany({ where: { id: userId } });
    }
    if (app) await app.close();
  });
  it('registers, authorizes, rolls back conflicts, verifies, audits and revokes sessions', async () => {
    const http = () => request(app.getHttpServer());
    const registered = await http()
      .post('/api/v1/auth/register')
      .send({ email, password })
      .expect(201);
    userId = registered.body.id;
    expect(registered.body.role).toBe('READER');
    await db.user.update({ where: { id: userId }, data: { role: 'ADMIN' } }); // Test fixture only, not a production role path.
    const login = await http()
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    token = login.body.accessToken;
    const bearer = { Authorization: `Bearer ${token}` };
    const village = await http()
      .post('/api/v1/villages')
      .set(bearer)
      .send({
        arabicName: 'قرية اختبار',
        governorate: 'اختبار',
        aliases: [{ value: 'Test', type: 'ALTERNATIVE' }],
      })
      .expect(201);
    villageId = village.body.id;
    const aliasSearch = await http()
      .get('/api/v1/villages?search=Test&sortBy=englishName&order=desc')
      .expect(200);
    expect(
      aliasSearch.body.data.some((v: { id: number }) => v.id === villageId),
    ).toBe(true);
    const filtered = await http()
      .get('/api/v1/villages?search=Test&governorate=NoSuchGovernorate')
      .expect(200);
    expect(filtered.body.meta.total).toBe(0);
    const literal = await http().get('/api/v1/villages?search=%25').expect(200);
    expect(literal.body.meta.total).toBe(0);
    const escaped = await http()
      .get('/api/v1/villages?search=' + encodeURIComponent("' OR 1=1 --"))
      .expect(200);
    expect(escaped.body.meta.total).toBe(0);

    const verified = await http()
      .post(`/api/v1/villages/${villageId}/verify`)
      .set(bearer)
      .send({ version: 1 })
      .expect(201);
    expect(verified.body.status).toBe('VERIFIED');
    await http()
      .patch(`/api/v1/villages/${villageId}`)
      .set(bearer)
      .send({ version: 1, englishName: 'stale' })
      .expect(409);
    await http()
      .patch(`/api/v1/villages/${villageId}`)
      .set(bearer)
      .send({
        version: 2,
        aliases: [
          { value: 'duplicate', type: 'ALTERNATIVE' },
          { value: 'duplicate', type: 'ALTERNATIVE' },
        ],
      })
      .expect(409);
    const still = await db.village.findUniqueOrThrow({
      where: { id: villageId },
      include: { aliases: true },
    });
    expect(still.version).toBe(2);
    expect(still.aliases[0].value).toBe('Test');
    const updates = await Promise.all(
      ['A', 'B'].map((englishName) =>
        http()
          .patch(`/api/v1/villages/${villageId}`)
          .set(bearer)
          .send({ version: 2, englishName }),
      ),
    );
    expect(updates.map((r) => r.status).sort()).toEqual([200, 409]);
    const population = {
      year: 2020,
      population: 1000,
      source: 'Synthetic test source',
    };
    await http()
      .post(`/api/v1/villages/${villageId}/population`)
      .set(bearer)
      .send(population)
      .expect(201);
    await http()
      .post(`/api/v1/villages/${villageId}/population`)
      .set(bearer)
      .send(population)
      .expect(409);
    await http()
      .post(`/api/v1/villages/${villageId}/population`)
      .set(bearer)
      .send({
        ...population,
        population: 1100,
        source: 'Other synthetic source',
      })
      .expect(201);
    const history = await http()
      .get(`/api/v1/villages/${villageId}/population`)
      .expect(200);
    expect(history.body.meta.total).toBe(2);
    const entry = await http()
      .post(`/api/v1/villages/${villageId}/entries`)
      .set(bearer)
      .send({
        kind: 'EVENT',
        title: 'Test',
        description: 'Synthetic',
        source: 'Fixture',
        year: 1900,
      })
      .expect(201);
    await http()
      .patch(`/api/v1/villages/2147483647/entries/${entry.body.id}`)
      .set(bearer)
      .send({ version: 1, title: 'wrong village' })
      .expect(404);
    const audit = await http()
      .get(`/api/v1/villages/${villageId}/audit`)
      .set(bearer)
      .expect(200);
    expect(
      audit.body.data.some((a: { action: string }) => a.action === 'VERIFY'),
    ).toBe(true);
    await http()
      .delete(`/api/v1/villages/${villageId}?version=3`)
      .set(bearer)
      .expect(200);
    expect(await db.populationRecord.count({ where: { villageId } })).toBe(0);
    expect(await db.auditLog.count({ where: { villageId } })).toBeGreaterThan(
      0,
    );
    await http().post('/api/v1/auth/logout').set(bearer).expect(200);
    await http().get('/api/v1/auth/me').set(bearer).expect(401);
  });
});
