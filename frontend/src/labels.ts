import type { EntryKind, NameType, Role } from './api/types';

export const ROLE_LABEL: Record<Role, string> = {
  READER: 'قارئ',
  EDITOR: 'محرر',
  VERIFIER: 'مدقق',
  ADMIN: 'مسؤول',
};

export const KIND_LABEL: Record<EntryKind, string> = {
  EVENT: 'أحداث تاريخية',
  LANDMARK: 'معالم',
  HERITAGE: 'تراث وثقافة',
  ECONOMY: 'زراعة واقتصاد',
  FACILITY: 'مرافق عامة',
};

export const KIND_SINGULAR: Record<EntryKind, string> = {
  EVENT: 'حدث',
  LANDMARK: 'معلم',
  HERITAGE: 'عنصر تراثي',
  ECONOMY: 'نشاط اقتصادي',
  FACILITY: 'مرفق',
};

export const NAME_TYPE_LABEL: Record<NameType, string> = {
  ALTERNATIVE: 'اسم بديل',
  TRANSLITERATION: 'تهجئة لاتينية',
  FORMER: 'اسم سابق',
  HISTORICAL: 'اسم تاريخي',
};

export const RELATION_LABEL = {
  NEARBY: 'قريبة',
  BORDERS: 'مجاورة (حدود)',
  PART_OF: 'تتبع لـ',
} as const;

export const ACTION_LABEL: Record<string, string> = {
  CREATE: 'إنشاء',
  UPDATE: 'تعديل',
  VERIFY: 'توثيق',
  DELETE: 'حذف',
  ROLE_CHANGE: 'تغيير صلاحية',
};

export const ENTITY_LABEL: Record<string, string> = {
  Village: 'القرية',
  PopulationRecord: 'سجل سكان',
  KnowledgeEntry: 'مدخل معرفي',
  User: 'مستخدم',
};

export const GOVERNORATES = [
  'القدس',
  'رام الله والبيرة',
  'نابلس',
  'الخليل',
  'بيت لحم',
  'جنين',
  'طولكرم',
  'قلقيلية',
  'سلفيت',
  'طوباس',
  'أريحا والأغوار',
  'غزة',
  'شمال غزة',
  'دير البلح',
  'خانيونس',
  'رفح',
];

export const fmtNumber = (n: number) => n.toLocaleString('ar-EG');
export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
