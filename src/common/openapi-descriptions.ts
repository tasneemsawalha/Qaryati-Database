// Documentation-only metadata. Runtime validation remains in the DTOs and services.
export function describeEndpoint(method: string, path: string) {
  const route = path.replace('/api/v1', '');
  const fixed: Record<string, [string, string, string]> = {
    'post /auth/register': [
      'Register a reader account',
      'Creates a READER. Email is trimmed and lowercased. Supplying role is rejected.',
      'Public',
    ],
    'post /auth/login': [
      'Sign in and obtain a bearer token',
      'Returns an opaque accessToken and expiresAt. Use Authorization: Bearer <accessToken>. Invalid credentials return 401. Default session lifetime is 3600 seconds, configurable by SESSION_TTL_SECONDS.',
      'Public',
    ],
    'post /auth/logout': [
      'Revoke the current session',
      'Revokes only the submitted token. Subsequent protected requests with that token return 401.',
      'READER, EDITOR, VERIFIER, ADMIN',
    ],
    'get /auth/me': [
      'Read the signed-in account',
      'Returns id, email and role; never returns password hashes or session secrets.',
      'READER, EDITOR, VERIFIER, ADMIN',
    ],
    'patch /auth/users/{id}/role': [
      'Change an account role',
      'Revokes all sessions of the affected account and records the change in the audit log. Administrators cannot change their own role.',
      'ADMIN',
    ],
    'get /health': [
      'Check application liveness',
      'Returns status ok without querying the database.',
      'Public',
    ],
    'get /health/ready': [
      'Check database readiness',
      'Returns status ready when the database responds; otherwise returns 503.',
      'Public',
    ],
    'get /geocoding': [
      'Find suggested geographic locations',
      'Requires name (2–100 characters, with non-whitespace endpoints). Suggestions are not saved automatically. Responses include provider attribution and cached. Successful results are cached for 24 hours in this process, with a maximum of 500 entries. Concurrent identical requests are combined. External timeouts and transient failures get one retry. Outgoing provider attempts are separated by at least one second. Provider 429 is not retried and activates a cooldown based on Retry-After. Malformed provider responses are rejected without retrying. Unavailable/busy providers return 503.',
      'Public',
    ],
    'get /villages/stats/by-governorate': [
      'Count villages by governorate',
      'Returns an unpaginated array of governorate/count pairs, ordered by count descending.',
      'Public',
    ],
  };
  const special = fixed[`${method} ${route}`];
  if (special)
    return {
      summary: special[0],
      description: `${special[1]} Access: ${special[2]}.`,
    };
  const resource = path.includes('/population')
    ? 'population record'
    : path.includes('/entries')
      ? 'knowledge entry'
      : 'village';
  if (route.endsWith('/audit'))
    return {
      summary: 'Read village change history',
      description:
        'Access: VERIFIER, ADMIN. Paginated audit records, newest id first. Includes actorId, before/after snapshots and createdAt. Remains readable after village deletion.',
    };
  if (route.endsWith('/verify'))
    return {
      summary: `Verify a ${resource}`,
      description:
        'Access: VERIFIER, ADMIN. Supply the current version in the JSON body. Marks VERIFIED, records verifier/time and increments version atomically with audit. Returns 201; stale versions return 409.',
    };
  if (method === 'get') {
    if (route.endsWith('/{id}'))
      return {
        summary: 'Read one village',
        description:
          'Public. Returns the village and its aliases, including DRAFT records. Missing id returns 404.',
      };
    const filters =
      resource === 'village'
        ? 'Search matches Arabic/English names and aliases. Governorate/localCouncil filters are case-insensitive exact matches. sortBy: arabicName (default), englishName, createdAt; order: asc (default), desc. Ties use id ascending.'
        : resource === 'population record'
          ? 'Ordered by year descending, then id ascending. Different sources for one year may coexist.'
          : 'Optional kind filter. When kind is EVENT, entries are ordered by year ascending, then id ascending. Other results are ordered by id ascending.';
    return {
      summary:
        resource === 'knowledge entry'
          ? 'List knowledge entries'
          : `List ${resource}s`,
      description: `Public; includes DRAFT records. page defaults to 1 (maximum 1000000); limit defaults to 10 (maximum 100). ${filters} Out-of-range pages return an empty data array. Unknown query fields are rejected.`,
    };
  }
  const rules =
    resource === 'village'
      ? 'Arabic name and governorate are required on creation. Historical overview/name origin require their corresponding sources. Coordinates must be supplied or cleared as a pair. PATCH aliases replaces the entire list; omit to preserve, [] to clear.'
      : resource === 'population record'
        ? 'Requires integer year (1 through current UTC year), nonnegative integer population and a nonblank source (maximum 500 characters). Duplicate village/year/source returns 409; different sources are allowed.'
        : 'Requires kind, nonblank title, description and source. EVENT requires a year; future years are rejected. Coordinates must be a pair.';
  if (method === 'delete')
    return {
      summary: `Delete a ${resource}`,
      description: `Access: ADMIN. Supply current version in the query string. Returns 200 with deleted: true. ${resource === 'village' ? 'Also removes child population records, entries and aliases; audit history is retained.' : 'The record must belong to the village in the URL.'} Stale versions return 409.`,
    };
  return {
    summary: `${method === 'post' ? 'Create' : 'Update'} a ${resource}`,
    description: `Access: EDITOR, ADMIN. ${rules} ${method === 'post' ? 'Creates a DRAFT at version 1; returns 201.' : 'Supply current version in the body; omit unchanged fields. Successful edits reset verification to DRAFT and increment version; returns 200. Stale versions return 409.'} Data changes and audit records commit in one transaction.`,
  };
}
