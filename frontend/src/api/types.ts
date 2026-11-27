export type Role = 'READER' | 'EDITOR' | 'VERIFIER' | 'ADMIN';
export type ReviewStatus = 'DRAFT' | 'VERIFIED';
export type EntryKind = 'EVENT' | 'LANDMARK' | 'HERITAGE' | 'ECONOMY' | 'FACILITY';
export type NameType = 'ALTERNATIVE' | 'TRANSLITERATION' | 'FORMER' | 'HISTORICAL';

export interface User {
  id: number;
  email: string;
  role: Role;
}

export interface Page<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface Alias {
  id?: number;
  value: string;
  type: NameType;
  source?: string | null;
}

export interface NearbyPlace {
  name: string;
  relationship: 'NEARBY' | 'BORDERS' | 'PART_OF';
  distanceKm?: number;
}

interface Reviewed {
  id: number;
  version: number;
  status: ReviewStatus;
  verifiedBy: number | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Village extends Reviewed {
  arabicName: string;
  englishName: string | null;
  nameOrigin: string | null;
  nameOriginSource: string | null;
  governorate: string;
  localCouncil: string | null;
  municipalityRelationship: string | null;
  latitude: number | null;
  longitude: number | null;
  locationDescription: string | null;
  nearbyPlaces: NearbyPlace[] | null;
  elevationMeters: number | null;
  landAreaKm2: number | null;
  historicalOverview: string | null;
  historySource: string | null;
  aliases: Alias[];
}

export interface PopulationRecord extends Reviewed {
  villageId: number;
  year: number;
  population: number;
  source: string;
  notes: string | null;
}

export interface KnowledgeEntry extends Reviewed {
  villageId: number;
  kind: EntryKind;
  title: string;
  description: string;
  source: string;
  category: string | null;
  year: number | null;
  latitude: number | null;
  longitude: number | null;
}

export interface AuditLog {
  id: number;
  actorId: number;
  action: string;
  entity: string;
  entityId: number;
  villageId: number | null;
  before: unknown;
  after: unknown;
  createdAt: string;
}

export interface GeocodingResult {
  data: {
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    governorate?: string;
  }[];
  meta: { cached: boolean; attribution: string; notice: string };
}
