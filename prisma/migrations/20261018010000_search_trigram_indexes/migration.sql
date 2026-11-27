-- Measured search optimization. Requires PostgreSQL pg_trgm (included in postgres:17).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS village_arabic_trgm ON "Village" USING gin ("arabicName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS village_english_trgm ON "Village" USING gin ("englishName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS alias_value_trgm ON "VillageName" USING gin ("value" gin_trgm_ops);
ANALYZE "Village";
ANALYZE "VillageName";
