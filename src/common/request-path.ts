import type { Request } from 'express';

// originalUrl keeps the mounted API prefix; omit query parameters from output.
export function requestPath(
  req: Pick<Request, 'originalUrl' | 'path'>,
): string {
  return (req.originalUrl || req.path).split('?')[0];
}
