import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { assertVersion, draft, validateVillage } from './domain';
import { audit } from '../prisma/audit';

// Section 7: provenance, conflict handling and auditable modifications.
describe('data quality and provenance rules', () => {
  describe('conflicting edits (optimistic versioning)', () => {
    it('accepts the expected version', () => {
      expect(() => assertVersion({ version: 3 }, 3)).not.toThrow();
    });
    it('rejects a stale version instead of silently overwriting', () => {
      expect(() => assertVersion({ version: 4 }, 3)).toThrow(ConflictException);
    });
    it('reports a missing record as not found', () => {
      expect(() => assertVersion(null, 1)).toThrow(NotFoundException);
    });
  });

  describe('source requirements', () => {
    const base = { arabicName: 'قرية', governorate: 'نابلس' };
    it('requires a source for a historical overview', () => {
      expect(() =>
        validateVillage({ ...base, historicalOverview: 'Old village' }),
      ).toThrow(BadRequestException);
      expect(() =>
        validateVillage({
          ...base,
          historicalOverview: 'x',
          historySource: ' ',
        }),
      ).toThrow('Historical overview requires a source');
    });
    it('requires a source for a documented name origin', () => {
      expect(() =>
        validateVillage({ ...base, nameOrigin: 'From a spring' }),
      ).toThrow('Name origin requires a source');
    });
    it('accepts sourced information', () => {
      expect(() =>
        validateVillage({
          ...base,
          historicalOverview: 'Old village',
          historySource: 'Village survey, 1945',
          nameOrigin: 'From a spring',
          nameOriginSource: 'Municipal archive',
        }),
      ).not.toThrow();
    });
    it('rejects incomplete coordinates instead of storing half a location', () => {
      expect(() => validateVillage({ ...base, latitude: 32.2 })).toThrow(
        'Provide both latitude and longitude',
      );
    });
  });

  it('returns edited data to DRAFT so it must be verified again', () => {
    expect(draft).toEqual({
      status: 'DRAFT',
      verifiedBy: null,
      verifiedAt: null,
    });
  });

  describe('audit trail', () => {
    it('records who changed what, with before and after snapshots', async () => {
      const tx = { auditLog: { create: jest.fn() } };
      const before = { id: 2, version: 1, updatedAt: new Date(0) };
      await audit(tx as never, 9, 'UPDATE', 'PopulationRecord', 2, 4, before, {
        ...before,
        version: 2,
      });
      expect(tx.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: 9,
          action: 'UPDATE',
          entity: 'PopulationRecord',
          entityId: 2,
          villageId: 4,
          before: { id: 2, version: 1, updatedAt: '1970-01-01T00:00:00.000Z' },
          after: { id: 2, version: 2, updatedAt: '1970-01-01T00:00:00.000Z' },
        },
      });
    });
    it('omits empty snapshots (create has no before, delete has no after)', async () => {
      const tx = { auditLog: { create: jest.fn() } };
      await audit(tx as never, 1, 'DELETE', 'Village', 3, 3, { id: 3 });
      const data = tx.auditLog.create.mock.calls[0][0].data;
      expect(data.before).toEqual({ id: 3 });
      expect(data).not.toHaveProperty('after');
    });
  });
});
