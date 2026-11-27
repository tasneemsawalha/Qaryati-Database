import { AppController } from './app.controller';
describe('health', () => {
  it('reports liveness without querying the database', () =>
    expect(new AppController({} as never).alive()).toEqual({ status: 'ok' }));
  it('reports failed readiness as unavailable', async () => {
    const controller = new AppController({
      $queryRaw: jest.fn().mockRejectedValue(new Error('offline')),
    } as never);
    await expect(controller.ready()).rejects.toThrow('Database unavailable');
  });
});
