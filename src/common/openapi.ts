import { endpointErrors, errorExample } from './openapi-responses';
import { documentRequestConstraints } from './openapi-schemas';
import { describeEndpoint } from './openapi-descriptions';
import type { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger';
export function createDocumentation(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Qaryati API')
    .setDescription(
      'Palestinian village knowledge. Public reads include DRAFT records. Register as READER; administrators assign write roles. Updates, verification and deletion require current record version; creation does not. API v1 is independent of record version. Sign in at POST /api/v1/auth/login, copy accessToken into Authorize (token only). Expired/revoked sessions require a new login. Passwords are 12–128 characters. Unknown body/query fields are rejected. Examples are synthetic.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, config);
  const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
  const str: SchemaObject = { type: 'string' },
    num: SchemaObject = { type: 'integer' },
    date: SchemaObject = { type: 'string', format: 'date-time' };
  const object = (
    properties: Record<string, SchemaObject>,
    required?: string[],
  ): SchemaObject => ({
    type: 'object',
    properties,
    ...(required ? { required } : {}),
  });
  const review = {
    id: num,
    version: num,
    status: { type: 'string', enum: ['DRAFT', 'VERIFIED'] } as SchemaObject,
    verifiedBy: { ...num, nullable: true },
    verifiedAt: { ...date, nullable: true },
    createdAt: date,
    updatedAt: date,
  };
  const pagination = object(
    { page: num, limit: num, total: num, totalPages: num },
    ['page', 'limit', 'total', 'totalPages'],
  );
  const list = (name: string): SchemaObject => ({
    type: 'object',
    required: ['data', 'meta'],
    properties: { data: { type: 'array', items: ref(name) }, meta: pagination },
  });
  const schemas = doc.components!.schemas!;
  documentRequestConstraints(schemas);
  const responseFields = (name: string): SchemaObject => {
    const input = schemas[name] as SchemaObject;
    const properties = Object.fromEntries(
      Object.entries(input.properties || {}).map(([key, value]) => [
        key,
        input.required?.includes(key) ? value : { ...value, nullable: true },
      ]),
    );
    return { type: 'object', properties, required: input.required };
  };
  const villageFields = responseFields('CreateVillageDto');
  villageFields.properties!.aliases = {
    type: 'array',
    items: ref('VillageAliasResponse'),
  };
  Object.assign(schemas, {
    VillageAliasResponse: {
      allOf: [
        responseFields('VillageAliasDto'),
        object({ id: num, villageId: num }, ['id', 'villageId']),
      ],
    },
    ReviewFields: object(review, [
      'id',
      'version',
      'status',
      'createdAt',
      'updatedAt',
    ]),
    VillageResponse: {
      allOf: [villageFields, ref('ReviewFields')],
    },
    PopulationResponse: {
      allOf: [
        responseFields('PopulationDto'),
        ref('ReviewFields'),
        object({ villageId: num }),
      ],
    },
    EntryResponse: {
      allOf: [
        responseFields('EntryDto'),
        ref('ReviewFields'),
        object({ villageId: num }),
      ],
    },
    UserResponse: object(
      {
        id: num,
        email: str,
        role: {
          type: 'string',
          enum: ['READER', 'EDITOR', 'VERIFIER', 'ADMIN'],
        },
      },
      ['id', 'email', 'role'],
    ),
    LoginResponse: {
      type: 'object',
      properties: {
        accessToken: str,
        tokenType: { type: 'string', enum: ['Bearer'] },
        expiresAt: date,
        user: ref('UserResponse'),
      },
      required: ['accessToken', 'tokenType', 'expiresAt', 'user'],
    },
    AuditResponse: object({
      id: num,
      actorId: num,
      action: str,
      entity: str,
      entityId: num,
      villageId: { ...num, nullable: true },
      before: { type: 'object', nullable: true, additionalProperties: true },
      after: { type: 'object', nullable: true, additionalProperties: true },
      createdAt: date,
    }),
    ErrorResponse: {
      type: 'object',
      required: ['error'],
      properties: {
        error: object(
          {
            status: num,
            code: str,
            message: { oneOf: [str, { type: 'array', items: str }] },
            requestId: str,
            path: {
              ...str,
              description:
                'Original request path including /api/v1, without query parameters. Framework error messages may still contain the submitted URL.',
            },
            timestamp: date,
          },
          ['status', 'code', 'message', 'requestId', 'path', 'timestamp'],
        ),
      },
    },
  });
  for (const [path, item] of Object.entries(doc.paths))
    for (const method of ['get', 'post', 'patch', 'delete'] as const) {
      const op = item[method];
      if (!op) continue;
      const publicRoute =
        (method === 'get' &&
          !path.includes('/audit') &&
          !path.endsWith('/auth/me')) ||
        path.endsWith('/auth/register') ||
        path.endsWith('/auth/login');
      op.security = publicRoute ? [] : [{ bearer: [] }];
      for (const parameter of op.parameters ?? []) {
        if ('$ref' in parameter) continue;
        const schema = parameter.schema as SchemaObject;
        if (!schema) continue;
        if (parameter.in === 'path')
          Object.assign(schema, {
            type: 'integer',
            minimum: 1,
            maximum: 2147483647,
          });
        if (['page', 'limit', 'version'].includes(parameter.name))
          schema.type = 'integer';
        if (parameter.name === 'version')
          Object.assign(schema, { maximum: 2147483647 });
        if (path.endsWith('/geocoding') && parameter.name === 'name')
          Object.assign(schema, {
            minLength: 2,
            maxLength: 100,
            pattern: '\\S.*\\S',
          });
        if (['search', 'governorate', 'localCouncil'].includes(parameter.name))
          schema.maxLength = 200;
      }
      let schema: SchemaObject | { $ref: string };
      const resource = path.includes('/population')
        ? 'PopulationResponse'
        : path.includes('/entries')
          ? 'EntryResponse'
          : 'VillageResponse';
      if (method === 'delete')
        schema = object({ deleted: { type: 'boolean', example: true } }, [
          'deleted',
        ]);
      else if (path.endsWith('/auth/login')) schema = ref('LoginResponse');
      else if (path.endsWith('/auth/logout'))
        schema = object({ loggedOut: { type: 'boolean', example: true } }, [
          'loggedOut',
        ]);
      else if (path.includes('/auth/')) schema = ref('UserResponse');
      else if (path.includes('/health'))
        schema = object(
          {
            status: {
              type: 'string',
              enum: [path.endsWith('/ready') ? 'ready' : 'ok'],
              example: path.endsWith('/ready') ? 'ready' : 'ok',
            },
          },
          ['status'],
        );
      else if (path.includes('/geocoding'))
        schema = {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: object({
                name: str,
                latitude: { type: 'number' },
                longitude: { type: 'number' },
                country: str,
                governorate: str,
              }),
            },
            meta: object({
              cached: { type: 'boolean' },
              attribution: str,
              notice: str,
            }),
          },
        };
      else if (path.includes('/stats/'))
        schema = {
          type: 'array',
          items: object({ governorate: str, count: num }),
        };
      else if (path.endsWith('/audit')) schema = list('AuditResponse');
      else if (
        method === 'get' &&
        (path.endsWith('/villages') ||
          path.endsWith('/population') ||
          path.endsWith('/entries'))
      )
        schema = list(resource);
      else schema = ref(resource);
      const status =
        method === 'post' &&
        !path.endsWith('/login') &&
        !path.endsWith('/logout')
          ? '201'
          : '200';
      op.responses = {
        [status]: {
          description: 'Successful response',
          content: { 'application/json': { schema } },
        },
      };
      for (const code of endpointErrors(method, path, publicRoute))
        op.responses[String(code)] = {
          description: (
            {
              400: 'Validation or domain error',
              401: 'Missing/expired session',
              403: 'Role denied',
              404: 'Resource not found',
              409: 'Conflict; reload and reconcile',
              413: 'Request too large',
              429: 'Rate limited',
              500: 'Internal error',
              503: 'Dependency unavailable',
            } as Record<number, string>
          )[code],
          content: {
            'application/json': {
              schema: ref('ErrorResponse'),
              example: {
                error: {
                  status: code,
                  code: `HTTP_${code}`,
                  message: errorExample(code, path),
                  requestId: '00000000-0000-4000-8000-000000000001',
                  path: path.replace(/\{[^}]+\}/g, '1'),
                  timestamp: '2026-10-27T00:00:00.000Z',
                },
              },
            },
          },
        };
      if (path.endsWith('/auth/login')) {
        const response400 = op.responses[
          '400'
        ] as import('@nestjs/swagger').ResponseObject;
        response400.content!['application/json'].example.error.message = [
          'password is required',
        ];
      }
      Object.assign(op, describeEndpoint(method, path));
    }
  return doc;
}
