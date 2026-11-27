-- CreateEnum
CREATE TYPE "Role" AS ENUM ('READER', 'EDITOR', 'VERIFIER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'VERIFIED');

-- CreateEnum
CREATE TYPE "EntryKind" AS ENUM ('EVENT', 'LANDMARK', 'HERITAGE', 'ECONOMY', 'FACILITY');

-- AlterTable
ALTER TABLE "Village" ADD COLUMN     "elevationMeters" DOUBLE PRECISION,
ADD COLUMN     "historicalOverview" TEXT,
ADD COLUMN     "historySource" TEXT,
ADD COLUMN     "landAreaKm2" DOUBLE PRECISION,
ADD COLUMN     "locationDescription" TEXT,
ADD COLUMN     "nearbyPlaces" JSONB,
ADD COLUMN     "status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedBy" INTEGER,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'READER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "tokenHash" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateTable
CREATE TABLE "PopulationRecord" (
    "id" SERIAL NOT NULL,
    "villageId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "population" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "verifiedBy" INTEGER,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PopulationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeEntry" (
    "id" SERIAL NOT NULL,
    "villageId" INTEGER NOT NULL,
    "kind" "EntryKind" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "category" TEXT,
    "year" INTEGER,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "verifiedBy" INTEGER,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "actorId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "villageId" INTEGER,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "PopulationRecord_villageId_year_idx" ON "PopulationRecord"("villageId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "PopulationRecord_villageId_year_source_key" ON "PopulationRecord"("villageId", "year", "source");

-- CreateIndex
CREATE INDEX "KnowledgeEntry_villageId_kind_id_idx" ON "KnowledgeEntry"("villageId", "kind", "id");

-- CreateIndex
CREATE INDEX "AuditLog_villageId_id_idx" ON "AuditLog"("villageId", "id");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopulationRecord" ADD CONSTRAINT "PopulationRecord_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeEntry" ADD CONSTRAINT "KnowledgeEntry_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Defense in depth for new tables; API also returns actionable validation errors.
ALTER TABLE "PopulationRecord" ADD CONSTRAINT population_nonnegative CHECK (population >= 0);
ALTER TABLE "PopulationRecord" ADD CONSTRAINT population_year_positive CHECK (year > 0);
ALTER TABLE "PopulationRecord" ADD CONSTRAINT population_source_nonempty CHECK (length(trim(source)) > 0);
ALTER TABLE "KnowledgeEntry" ADD CONSTRAINT entry_source_nonempty CHECK (length(trim(source)) > 0);
ALTER TABLE "KnowledgeEntry" ADD CONSTRAINT event_year_required CHECK (kind <> 'EVENT' OR year IS NOT NULL);
ALTER TABLE "KnowledgeEntry" ADD CONSTRAINT entry_coordinates_paired CHECK ((latitude IS NULL) = (longitude IS NULL));
ALTER TABLE "KnowledgeEntry" ADD CONSTRAINT entry_coordinates_range CHECK (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180);
