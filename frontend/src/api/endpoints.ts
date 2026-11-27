import { api } from './client';
import type {
  AuditLog,
  EntryKind,
  GeocodingResult,
  KnowledgeEntry,
  Page,
  PopulationRecord,
  Role,
  User,
  Village,
} from './types';

export interface VillageQuery {
  page?: number;
  limit?: number;
  search?: string;
  governorate?: string;
  localCouncil?: string;
  sortBy?: 'arabicName' | 'englishName' | 'createdAt';
  order?: 'asc' | 'desc';
}

export const auth = {
  login: (email: string, password: string) =>
    api<{ accessToken: string; expiresAt: string; user: User }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),
  register: (email: string, password: string) =>
    api<User>('/auth/register', { method: 'POST', body: { email, password } }),
  me: () => api<User>('/auth/me'),
  logout: () => api<unknown>('/auth/logout', { method: 'POST' }),
  setRole: (id: number, role: Role) =>
    api<User>(`/auth/users/${id}/role`, { method: 'PATCH', body: { role } }),
};

export const villages = {
  list: (q: VillageQuery) => api<Page<Village>>('/villages', { query: { ...q } }),
  get: (id: number) => api<Village>(`/villages/${id}`),
  create: (body: unknown) => api<Village>('/villages', { method: 'POST', body }),
  update: (id: number, body: unknown) =>
    api<Village>(`/villages/${id}`, { method: 'PATCH', body }),
  remove: (id: number, version: number) =>
    api<unknown>(`/villages/${id}`, { method: 'DELETE', query: { version } }),
  verify: (id: number, version: number) =>
    api<Village>(`/villages/${id}/verify`, { method: 'POST', body: { version } }),
  audit: (id: number, page = 1) =>
    api<Page<AuditLog>>(`/villages/${id}/audit`, { query: { page, limit: 20 } }),
  stats: () =>
    api<{ governorate: string; count: number }[]>('/villages/stats/by-governorate'),
};

type Kind = 'population' | 'entries';
const base = (villageId: number, kind: Kind) => `/villages/${villageId}/${kind}`;

export const population = {
  list: (villageId: number, page = 1) =>
    api<Page<PopulationRecord>>(base(villageId, 'population'), {
      query: { page, limit: 50 },
    }),
  create: (villageId: number, body: unknown) =>
    api<PopulationRecord>(base(villageId, 'population'), { method: 'POST', body }),
  update: (villageId: number, id: number, body: unknown) =>
    api<PopulationRecord>(`${base(villageId, 'population')}/${id}`, {
      method: 'PATCH',
      body,
    }),
  remove: (villageId: number, id: number, version: number) =>
    api<unknown>(`${base(villageId, 'population')}/${id}`, {
      method: 'DELETE',
      query: { version },
    }),
  verify: (villageId: number, id: number, version: number) =>
    api<PopulationRecord>(`${base(villageId, 'population')}/${id}/verify`, {
      method: 'POST',
      body: { version },
    }),
};

export const entries = {
  list: (villageId: number, kind?: EntryKind, page = 1) =>
    api<Page<KnowledgeEntry>>(base(villageId, 'entries'), {
      query: { page, limit: 50, kind },
    }),
  create: (villageId: number, body: unknown) =>
    api<KnowledgeEntry>(base(villageId, 'entries'), { method: 'POST', body }),
  update: (villageId: number, id: number, body: unknown) =>
    api<KnowledgeEntry>(`${base(villageId, 'entries')}/${id}`, {
      method: 'PATCH',
      body,
    }),
  remove: (villageId: number, id: number, version: number) =>
    api<unknown>(`${base(villageId, 'entries')}/${id}`, {
      method: 'DELETE',
      query: { version },
    }),
  verify: (villageId: number, id: number, version: number) =>
    api<KnowledgeEntry>(`${base(villageId, 'entries')}/${id}/verify`, {
      method: 'POST',
      body: { version },
    }),
};

export const geocoding = {
  search: (name: string) => api<GeocodingResult>('/geocoding', { query: { name } }),
};
