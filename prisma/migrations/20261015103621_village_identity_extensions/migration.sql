-- CreateEnum
CREATE TYPE "VillageNameType" AS ENUM ('ALTERNATIVE', 'TRANSLITERATION', 'FORMER', 'HISTORICAL');

-- AlterTable
ALTER TABLE "Village" ADD COLUMN     "localCouncil" TEXT,
ADD COLUMN     "municipalityRelationship" TEXT,
ADD COLUMN     "nameOriginSource" TEXT;

-- CreateTable
CREATE TABLE "VillageName" (
    "id" SERIAL NOT NULL,
    "villageId" INTEGER NOT NULL,
    "value" TEXT NOT NULL,
    "type" "VillageNameType" NOT NULL,
    "source" TEXT,

    CONSTRAINT "VillageName_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VillageName_villageId_idx" ON "VillageName"("villageId");

-- CreateIndex
CREATE UNIQUE INDEX "VillageName_villageId_value_type_key" ON "VillageName"("villageId", "value", "type");

-- CreateIndex
CREATE INDEX "Village_governorate_idx" ON "Village"("governorate");

-- CreateIndex
CREATE INDEX "Village_arabicName_idx" ON "Village"("arabicName");

-- CreateIndex
CREATE INDEX "Village_englishName_idx" ON "Village"("englishName");

-- AddForeignKey
ALTER TABLE "VillageName" ADD CONSTRAINT "VillageName_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE CASCADE ON UPDATE CASCADE;
