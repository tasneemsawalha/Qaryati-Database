import type { SchemaObject } from '@nestjs/swagger';

// Keep documentation constraints aligned with DTO validators; no runtime behavior changes.
export function documentRequestConstraints(schemas: Record<string, unknown>) {
  const constraints: Record<string, Record<string, Partial<SchemaObject>>> = {
    CredentialsDto: {
      email: { format: 'email', maxLength: 254 },
      password: { minLength: 12, maxLength: 128, writeOnly: true },
    },
    VillageAliasDto: {
      value: { maxLength: 200, pattern: '\\S' },
      source: { maxLength: 2000 },
    },
    NearbyPlaceDto: {
      name: { maxLength: 200, pattern: '\\S' },
      distanceKm: { minimum: 0 },
    },
    CreateVillageDto: {
      arabicName: {
        example: 'Synthetic village',
        maxLength: 200,
        pattern: '\\S',
      },
      governorate: {
        example: 'Test governorate',
        maxLength: 200,
        pattern: '\\S',
      },
      englishName: { maxLength: 200 },
      locationDescription: { maxLength: 2000 },
      historySource: { maxLength: 2000 },
      historicalOverview: { maxLength: 20000 },
      nameOrigin: { maxLength: 2000 },
      nameOriginSource: { maxLength: 2000 },
      localCouncil: { maxLength: 2000 },
      municipalityRelationship: { maxLength: 2000 },
      elevationMeters: { minimum: -500, maximum: 9000 },
      landAreaKm2: { minimum: 0 },
      nearbyPlaces: { maxItems: 30 },
      aliases: { maxItems: 20 },
    },
    PopulationDto: {
      year: {
        type: 'integer',
        minimum: 1,
        description: 'Reference year; cannot exceed the current UTC year.',
      },
      population: { type: 'integer' },
      source: {
        maxLength: 500,
        pattern: '\\S',
        description: 'Required source; trimmed before storage.',
      },
      notes: { maxLength: 4000 },
    },
    EntryDto: {
      title: { maxLength: 200, pattern: '\\S' },
      description: { maxLength: 10000, pattern: '\\S' },
      source: { maxLength: 500, pattern: '\\S' },
      category: { maxLength: 200 },
      year: {
        type: 'integer',
        minimum: -10000,
        description:
          'Required for EVENT. Negative years represent BCE. Cannot exceed current UTC year.',
      },
      latitude: { minimum: -90, maximum: 90 },
      longitude: { minimum: -180, maximum: 180 },
    },
  };
  for (const [name, fields] of Object.entries(constraints)) {
    const targets = [
      name,
      ...({
        CreateVillageDto: ['UpdateVillageDto'],
        PopulationDto: ['UpdatePopulationDto'],
        EntryDto: ['UpdateEntryDto'],
      }[name] ?? []),
    ];
    for (const target of targets) {
      const schema = schemas[target] as SchemaObject | undefined;
      if (!schema?.properties) continue;
      schema.additionalProperties = false;
      for (const [field, details] of Object.entries(fields)) {
        if (schema.properties[field])
          Object.assign(schema.properties[field], details);
      }
    }
  }
  for (const schema of Object.values(schemas) as SchemaObject[]) {
    if (schema.properties?.version)
      Object.assign(schema.properties.version, {
        type: 'integer',
        minimum: 1,
        maximum: 2147483647,
      });
  }
}
