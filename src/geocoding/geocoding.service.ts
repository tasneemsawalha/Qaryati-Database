import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
export interface Place {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  governorate?: string;
}
export interface GeocodingProvider {
  readonly attribution: string;
  search(name: string): Promise<Place[]>;
}
export const GEOCODING_PROVIDER = 'GEOCODING_PROVIDER';
@Injectable()
export class OpenMeteoProvider implements GeocodingProvider {
  readonly attribution = 'Open-Meteo / GeoNames';
  private blockedUntil = 0;
private nextRequestAt = 0;

private async waitForRequestSlot(): Promise<void> {
  while (true) {
    const now = Date.now();

    if (now < this.blockedUntil) {
      throw new ServiceUnavailableException(
        'Geocoding provider rate limit reached; retry later',
      );
    }

    const delay = this.nextRequestAt - now;

    if (delay <= 0) {
      this.nextRequestAt = now + 1000;
      return;
    }

    await new Promise<void>((resolve) =>
      setTimeout(resolve, delay),
    );
  }
}

private applyRetryAfter(value: string | null): void {
  const now = Date.now();
  let delay = 1000;

  if (value && /^\d+$/.test(value.trim())) {
    delay = Number(value) * 1000;
  } else if (value) {
    const date = Date.parse(value);

    if (Number.isFinite(date)) {
      delay = Math.max(0, date - now);
    }
  }

  this.blockedUntil = Math.max(
    this.blockedUntil,
    now + Math.max(1000, delay),
  );
}
  async search(name: string): Promise<Place[]> {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.search = new URLSearchParams({
      name,
      count: '10',
      language: 'en',
      format: 'json',
    }).toString();
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await this.waitForRequestSlot();
        const response = await fetch(url, {
          signal: AbortSignal.timeout(
            Number(process.env.GEOCODING_TIMEOUT_MS || 2500),
          ),
        });
        if (response.status === 429) {
         this.applyRetryAfter(
          response.headers.get('Retry-After'),
         );

         throw new ServiceUnavailableException(
          'Geocoding provider rate limit reached',
         );
        }
        if (response.status >= 500 && attempt === 0) {
          await new Promise((r) => setTimeout(r, 100));
          continue;
        }
        if (!response.ok)
          throw new ServiceUnavailableException(
            'Geocoding provider unavailable',
          );
        let data: {
         results?: Array<{
         name: string;
         latitude: number;
         longitude: number;
         country?: string;
         admin1?: string;
         }>;
        };

        try {
         data = await response.json();
        } catch (error) {
          if (
  error instanceof SyntaxError ||
  (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'SyntaxError'
  )
) {
           throw new ServiceUnavailableException(
            'Invalid provider JSON response',
           );
          }

           throw error;
         }
        if (
  !data ||
  typeof data !== 'object' ||
  Array.isArray(data)
)
          throw new ServiceUnavailableException('Invalid provider response');
        if (data.results !== undefined && !Array.isArray(data.results))
          throw new ServiceUnavailableException('Invalid provider response');
        return (data.results || []).map((p) => {
          if (
            !p ||
            typeof p !== 'object' ||
            typeof p.name !== 'string' ||
            p.name.trim().length === 0 ||
            !Number.isFinite(p.latitude) ||
            Math.abs(p.latitude) > 90 ||
            !Number.isFinite(p.longitude) ||
            Math.abs(p.longitude) > 180
          )
            throw new ServiceUnavailableException(
              'Invalid provider coordinates',
            );
          return {
            name: p.name,
            latitude: p.latitude,
            longitude: p.longitude,
            country: typeof p.country === 'string' ? p.country : undefined,
            governorate: typeof p.admin1 === 'string' ? p.admin1 : undefined,
          };
        });
      } catch (error) {
        if (error instanceof ServiceUnavailableException) throw error;
        if (attempt === 1)
          throw new ServiceUnavailableException(
            'Geocoding timed out or failed',
          );
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    throw new ServiceUnavailableException('Geocoding unavailable');
  }
}
@Injectable()
export class GeocodingService {
  private readonly cache = new Map<
    string,
    { expires: number; places: Place[] }
  >();
  private readonly pending = new Map<string, Promise<Place[]>>();
  private nextRequest = 0;
  constructor(
    @Inject(GEOCODING_PROVIDER) private readonly provider: GeocodingProvider,
  ) {}
  async search(name: string) {
    const key = name.trim().toLowerCase();
    const cached = this.cache.get(key);
    if (cached) {
  if (cached.expires > Date.now()) {
    return this.result(cached.places, true);
  }

  this.cache.delete(key);
}
    const existing = this.pending.get(key);
    if (existing) return this.result(await existing, false);
    if (Date.now() < this.nextRequest)
      throw new ServiceUnavailableException('Geocoding busy; retry later');
    this.nextRequest = Date.now() + 1000;
    const promise = this.provider.search(name.trim());
    this.pending.set(key, promise);
    try {
      const places = await promise;
      if (this.cache.size >= 500)
        this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(key, { places, expires: Date.now() + 86400000 });
      return this.result(places, false);
    } finally {
      this.pending.delete(key);
    }
  }
  private result(places: Place[], cached: boolean) {
    return {
      data: places,
      meta: {
        cached,
        attribution: this.provider.attribution,
        notice:
          'Suggestions only; verify the locality and cite the source before saving.',
      },
    };
  }
}
