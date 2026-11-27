import { GeocodingService, OpenMeteoProvider } from './geocoding.service';
describe('provider isolation and resilience', () => {
  afterEach(() => jest.restoreAllMocks());
  it.each(['Open-Meteo / GeoNames', 'Alternative test provider'])(
    'preserves provider attribution for fresh and cached results: %s',
    async (attribution) => {
      const provider = {
        attribution,
        search: jest
          .fn()
          .mockResolvedValue([{ name: 'Test', latitude: 32, longitude: 35 }]),
      };
      const service = new GeocodingService(provider);
      const fresh = await service.search('Test');
      const cached = await service.search('TEST');
      expect(fresh.meta).toMatchObject({ attribution, cached: false });
      expect(cached.meta).toMatchObject({ attribution, cached: true });
      expect(cached.data).toEqual(fresh.data);
      expect(provider.search).toHaveBeenCalledTimes(1);
    },
  );
  it('declares the actual Open-Meteo source', () => {
    expect(new OpenMeteoProvider().attribution).toBe('Open-Meteo / GeoNames');
  });
  it('uses cache and combines concurrent identical requests', async () => {
    const provider = {
      attribution: 'Test provider',
      search: jest
        .fn()
        .mockResolvedValue([{ name: 'Test', latitude: 32, longitude: 35 }]),
    };
    const service = new GeocodingService(provider);
    await Promise.all([service.search('Test'), service.search('Test')]);
    expect((await service.search('TEST')).meta.cached).toBe(true);
    expect(provider.search).toHaveBeenCalledTimes(1);
  });
  it('limits different uncached requests', async () => {
    const service = new GeocodingService({
      attribution: 'Test provider',
      search: jest.fn().mockResolvedValue([]),
    });
    await service.search('one');
    await expect(service.search('two')).rejects.toThrow('busy');
  });
  it('retries transient network failure once', async () => {
    const fetcher = jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [] })));
    expect(await new OpenMeteoProvider().search('test')).toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('does not retry provider rate limits', async () => {
    const fetcher = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('', { status: 429 }));
    await expect(new OpenMeteoProvider().search('test')).rejects.toThrow(
      'rate limit',
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('maps repeated timeout to unavailable', async () => {
    const fetcher = jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new DOMException('timed out', 'TimeoutError'));
    await expect(new OpenMeteoProvider().search('test')).rejects.toThrow(
      'timed out',
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('rejects invalid provider coordinates', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [{ name: 'bad', latitude: 999, longitude: 0 }],
        }),
      ),
    );
    await expect(new OpenMeteoProvider().search('test')).rejects.toThrow(
      'coordinates',
    );
  });
  it('respects Retry-After after a 429 response', async () => {
  const fetcher = jest
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(
      new Response('', {
        status: 429,
        headers: { 'Retry-After': '60' },
      }),
    );

  const provider = new OpenMeteoProvider();

  await expect(provider.search('Nablus')).rejects.toThrow(
    'rate limit',
  );

  await expect(provider.search('Jenin')).rejects.toThrow(
    'rate limit',
  );

  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('retries a temporary server failure once', async () => {
  const fetcher = jest
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(
      new Response('', { status: 503 }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ results: [] })),
    );

  const provider = new OpenMeteoProvider();

  expect(await provider.search('Nablus')).toEqual([]);
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it('does not retry permanent client errors', async () => {
  const fetcher = jest
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(
      new Response('', { status: 400 }),
    );

  await expect(
    new OpenMeteoProvider().search('Nablus'),
  ).rejects.toThrow('unavailable');

  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('spaces outgoing provider attempts by at least one second', async () => {
  const starts: number[] = [];

  jest.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    starts.push(Date.now());

    if (starts.length === 1) {
      return new Response('', { status: 503 });
    }

    return new Response(JSON.stringify({ results: [] }));
  });

  await new OpenMeteoProvider().search('Nablus');

  expect(starts).toHaveLength(2);
  expect(starts[1] - starts[0]).toBeGreaterThanOrEqual(1000);
});
it('rejects malformed JSON without retrying', async () => {
  const fetcher = jest
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response('invalid JSON'));

  await expect(
    new OpenMeteoProvider().search('Nablus'),
  ).rejects.toThrow('Invalid provider JSON response');

  expect(fetcher).toHaveBeenCalledTimes(1);
});

it.each([null, [], { results: 'invalid' }, { results: null }])(
  'rejects invalid response structure: %j',
  async (payload) => {
    const fetcher = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify(payload)),
      );

    await expect(
      new OpenMeteoProvider().search('Nablus'),
    ).rejects.toThrow('Invalid provider response');

    expect(fetcher).toHaveBeenCalledTimes(1);
  },
);

it.each([
  null,
  { name: '', latitude: 32, longitude: 35 },
  { name: '   ', latitude: 32, longitude: 35 },
  { name: 'Test', latitude: 32, longitude: 200 },
  { name: 'Test', latitude: '32', longitude: 35 },
])('rejects invalid place data: %j', async (place) => {
  const fetcher = jest
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(
      new Response(JSON.stringify({ results: [place] })),
    );

  await expect(
    new OpenMeteoProvider().search('Nablus'),
  ).rejects.toThrow('Invalid provider coordinates');

  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('accepts a response without search results', async () => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({})),
  );

  expect(
    await new OpenMeteoProvider().search('Nablus'),
  ).toEqual([]);
});

it('maps valid provider data to the application model', async () => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify({
        results: [
          {
            name: 'Nablus',
            latitude: 32.22,
            longitude: 35.26,
            country: 'Palestine',
            admin1: 'Nablus',
          },
        ],
      }),
    ),
  );

  expect(
    await new OpenMeteoProvider().search('Nablus'),
  ).toEqual([
    {
      name: 'Nablus',
      latitude: 32.22,
      longitude: 35.26,
      country: 'Palestine',
      governorate: 'Nablus',
    },
  ]);
});
it('normalizes whitespace and letter case in cache keys', async () => {
  const provider = {
    attribution: 'Test provider',
    search: jest.fn().mockResolvedValue([]),
  };

  const service = new GeocodingService(provider);

  await service.search('  Nablus  ');
  const result = await service.search('NABLUS');

  expect(result.meta.cached).toBe(true);
  expect(provider.search).toHaveBeenCalledWith('Nablus');
  expect(provider.search).toHaveBeenCalledTimes(1);
});

it('refreshes cached results after 24 hours', async () => {
  const start = 1700000000000;
  const clock = jest.spyOn(Date, 'now').mockReturnValue(start);

  const provider = {
    attribution: 'Test provider',
    search: jest.fn().mockResolvedValue([]),
  };

  const service = new GeocodingService(provider);

  await service.search('Nablus');

  clock.mockReturnValue(start + 86400000 - 1);

  expect(
    (await service.search('Nablus')).meta.cached,
  ).toBe(true);

  clock.mockReturnValue(start + 86400000);

  expect(
    (await service.search('Nablus')).meta.cached,
  ).toBe(false);

  expect(provider.search).toHaveBeenCalledTimes(2);
});

it('does not cache failed provider requests', async () => {
  const start = 1700000000000;
  const clock = jest.spyOn(Date, 'now').mockReturnValue(start);

  const provider = {
    attribution: 'Test provider',
    search: jest
      .fn()
      .mockRejectedValueOnce(new Error('Provider failed'))
      .mockResolvedValueOnce([]),
  };

  const service = new GeocodingService(provider);

  await expect(service.search('Nablus')).rejects.toThrow(
    'Provider failed',
  );

  clock.mockReturnValue(start + 1000);

  const result = await service.search('Nablus');

  expect(result.meta.cached).toBe(false);
  expect(provider.search).toHaveBeenCalledTimes(2);
});

it('caches successful empty search results', async () => {
  const provider = {
    attribution: 'Test provider',
    search: jest.fn().mockResolvedValue([]),
  };

  const service = new GeocodingService(provider);

  const first = await service.search('Unknown village');
  const second = await service.search('Unknown village');

  expect(first.data).toEqual([]);
  expect(first.meta.cached).toBe(false);
  expect(second.meta.cached).toBe(true);
  expect(provider.search).toHaveBeenCalledTimes(1);
});

it('evicts the oldest entry when cache exceeds 500 entries', async () => {
  const start = 1700000000000;
  const clock = jest.spyOn(Date, 'now');

  const provider = {
    attribution: 'Test provider',
    search: jest.fn().mockResolvedValue([]),
  };

  const service = new GeocodingService(provider);

  for (let i = 0; i < 501; i++) {
    clock.mockReturnValue(start + i * 1000);
    await service.search(`Village ${i}`);
  }

  expect(
    (await service.search('Village 500')).meta.cached,
  ).toBe(true);

  clock.mockReturnValue(start + 501000);

  expect(
    (await service.search('Village 0')).meta.cached,
  ).toBe(false);

  expect(provider.search).toHaveBeenCalledTimes(502);
});
});
