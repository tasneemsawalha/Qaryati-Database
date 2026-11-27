import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/common/setup';
describe('HTTP validation and authorization (database mocked)', () => {
  let app: INestApplication;
  const prisma = {
    $transaction: jest.fn((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    ),
    session: { findUnique: jest.fn() },
    village: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
  };
  beforeAll(async () => {
    process.env.DATABASE_URL = 'postgresql://unused/unused';
    process.env.API_RATE_LIMIT = '1000';
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = module.createNestApplication({ bodyParser: false });
    app.useLogger(false);
    setupApp(app);
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  it('serves paginated public reads', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/villages')
      .expect(200);
    expect(res.body.meta.total).toBe(0);
  });
  it('rejects anonymous write and includes correlation ID', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/villages')
      .send({})
      .expect(401);
    expect(res.body.error.requestId).toEqual(res.headers['x-request-id']);
  });
  it('rejects invalid page limits', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/villages?limit=1000')
      .expect(400);
  });
  it('rejects out-of-range IDs and pages before reaching PostgreSQL', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/villages/2147483648')
      .expect(400);
    await request(app.getHttpServer()).get('/api/v1/villages/-1').expect(400);
    await request(app.getHttpServer())
      .get('/api/v1/villages?page=2147483647')
      .expect(400);
  });
  it('rejects READER write', async () => {
    prisma.session.findUnique.mockResolvedValue({
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() + 60000),
      user: { id: 1, email: 'r@example.org', role: 'READER' },
    });
    await request(app.getHttpServer())
      .post('/api/v1/villages')
      .set('Authorization', `Bearer ${'a'.repeat(64)}`)
      .send({ arabicName: 'test', governorate: 'test' })
      .expect(403);
  });
  it('rejects expired tokens', async () => {
    prisma.session.findUnique.mockResolvedValue({
      expiresAt: new Date(0),
      user: { id: 1, role: 'ADMIN' },
    });
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${'a'.repeat(64)}`)
      .expect(401);
  });
  it('rejects mass assignment and missing versions for editors', async () => {
    prisma.session.findUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() + 60000),
      user: { id: 1, role: 'EDITOR' },
    });
    await request(app.getHttpServer())
      .post('/api/v1/villages')
      .set('Authorization', `Bearer ${'a'.repeat(64)}`)
      .send({ arabicName: 'test', governorate: 'test', status: 'VERIFIED' })
      .expect(400);
    await request(app.getHttpServer())
      .patch('/api/v1/villages/1')
      .set('Authorization', `Bearer ${'a'.repeat(64)}`)
      .send({ englishName: 'new' })
      .expect(400);
  });
  it('rejects malformed JSON consistently', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{')
      .expect(400);
    expect(res.body.error.code).toBe('HTTP_400');
  });
  it('keeps the full API path in unknown-route errors without query parameters', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/route-that-does-not-exist?name=test')
      .expect(404);
    expect(res.body.error).toMatchObject({
      status: 404,
      code: 'HTTP_404',
      path: '/api/v1/route-that-does-not-exist',
      requestId: res.headers['x-request-id'],
    });
  });
});
