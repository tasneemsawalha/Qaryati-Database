const assert = require('node:assert/strict');
const doc = require('../docs/openapi.json');
let operations = 0;
for (const [path, item] of Object.entries(doc.paths)) {
  assert(path.startsWith('/api/v1/'), path);
  for (const method of ['get', 'post', 'patch', 'delete']) {
    const op = item[method];
    if (!op) continue;
    operations++;
    assert(
      (op.summary && op.description && op.description.includes('ccess:')) ||
        op?.description?.startsWith('Public'),
      `${method} ${path}: missing description`,
    );
    assert(op.responses['200'] || op.responses['201']);
    for (const [status, response] of Object.entries(op.responses)) {
      if (Number(status) >= 400)
        assert(
          response.content['application/json'].schema.$ref.endsWith(
            'ErrorResponse',
          ),
        );
    }
    assert(Array.isArray(op.security));
  }
}
function checkRefs(value) {
  if (!value || typeof value !== 'object') return;
  if (value.$ref) {
    assert(value.$ref.startsWith('#/'));
    const target = value.$ref
      .slice(2)
      .split('/')
      .reduce((v, key) => v?.[key], doc);
    assert(target, `Unresolved reference ${value.$ref}`);
  }
  Object.values(value).forEach(checkRefs);
}
checkRefs(doc);
const schemas = doc.components.schemas;
assert.equal(schemas.PopulationDto.properties.population.type, 'integer');
assert.equal(schemas.CreateVillageDto.properties.arabicName.maxLength, 200);
assert.equal(schemas.UpdateVillageDto.required.includes('version'), true);
assert.equal(
  schemas.VillageResponse.allOf[0].properties.aliases.items.$ref,
  '#/components/schemas/VillageAliasResponse',
);
assert.equal(doc.paths['/api/v1/auth/login'].post.security.length, 0);
assert.equal(doc.paths['/api/v1/auth/me'].get.security.length, 1);
assert.deepEqual(
  doc.paths['/api/v1/auth/login'].post.responses['400'].content[
    'application/json'
  ].example.error.message,
  ['password is required'],
);
console.log(
  `Validated ${operations} documented operations, local schema references, authentication and updated schema examples.`,
);

const health = doc.paths['/api/v1/health'].get.responses;
assert.deepEqual(Object.keys(health).sort(), ['200', '429', '500']);
assert.equal(
  health['200'].content['application/json'].schema.properties.status.example,
  'ok',
);
assert(doc.paths['/api/v1/health/ready'].get.responses['503']);
assert.equal(
  doc.paths['/api/v1/villages/{villageId}/entries'].get.summary,
  'List knowledge entries',
);
assert(!JSON.stringify(doc).includes('See response description'));
