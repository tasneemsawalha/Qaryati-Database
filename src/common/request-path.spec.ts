import { requestPath } from './request-path';

describe('public request path', () => {
  it('retains the API prefix when routing strips it from path', () => {
    expect(
      requestPath({ originalUrl: '/api/v1/missing', path: '/missing' }),
    ).toBe('/api/v1/missing');
  });
  it('excludes query values without decoding the path', () => {
    expect(
      requestPath({
        originalUrl: '/api/v1/missing%3Fname?token=private',
        path: '/missing%3Fname',
      }),
    ).toBe('/api/v1/missing%3Fname');
  });
});
