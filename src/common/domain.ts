import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
export function assertVersion(
  record: { version: number } | null,
  expected: number,
) {
  if (!record) throw new NotFoundException('Resource not found');
  if (record.version !== expected)
    throw new ConflictException(
      'Resource changed; reload and reconcile before retrying',
    );
}
export function validateVillage(record: Record<string, unknown>) {
  if (!record.arabicName || !record.governorate)
    throw new BadRequestException('Arabic name and governorate are required');
  if ((record.latitude == null) !== (record.longitude == null))
    throw new BadRequestException('Provide both latitude and longitude');
  if (record.historicalOverview && !String(record.historySource || '').trim())
    throw new BadRequestException('Historical overview requires a source');
  if (record.nameOrigin && !String(record.nameOriginSource || '').trim())
    throw new BadRequestException('Name origin requires a source');
}
export const draft = {
  status: 'DRAFT' as const,
  verifiedBy: null,
  verifiedAt: null,
};
