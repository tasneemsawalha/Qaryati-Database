// Expected application responses; generic proxy/transport failures are not enumerated.
export function endpointErrors(
  method: string,
  path: string,
  isPublic: boolean,
): number[] {
  const errors = new Set<number>([429, 500]);
  const health = path.endsWith('/health') || path.endsWith('/health/ready');
  if (
    !health &&
    !path.includes('/stats/') &&
    !path.endsWith('/auth/me') &&
    !path.endsWith('/auth/logout')
  )
    errors.add(400);
  if (!isPublic || path.endsWith('/auth/login')) errors.add(401);
  if (!isPublic && !path.endsWith('/auth/me') && !path.endsWith('/auth/logout'))
    errors.add(403);
  if (path.includes('{') && !path.endsWith('/audit')) errors.add(404);
  if (
    ['post', 'patch', 'delete'].includes(method) &&
    !path.endsWith('/login') &&
    !path.endsWith('/logout')
  )
    errors.add(409);
  if (['post', 'patch'].includes(method)) errors.add(413);
  if (path.endsWith('/geocoding') || path.endsWith('/health/ready'))
    errors.add(503);
  return [...errors].sort((a, b) => a - b);
}

export function errorExample(code: number, path: string): string | string[] {
  const messages: Record<number, string | string[]> = {
    400: ['Invalid request field; see validation details'],
    401: path.endsWith('/login')
      ? 'Invalid credentials'
      : 'Invalid or expired session',
    403: 'Insufficient role',
    404:
      path.includes('/population') || path.includes('/entries')
        ? 'Resource not found'
        : path.includes('/auth/')
          ? 'User not found'
          : 'Village not found',
    409: path.endsWith('/register')
      ? 'Email is already registered'
      : 'Conflicting or referenced data',
    413: 'Request body too large',
    429: 'Rate limit exceeded',
    500: 'Internal server error',
    503: path.endsWith('/health/ready')
      ? 'Database unavailable'
      : 'Geocoding timed out or failed',
  };
  return messages[code];
}
