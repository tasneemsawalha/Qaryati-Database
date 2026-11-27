-- CreateTable
CREATE TABLE "Village" (
    "id" SERIAL NOT NULL,
    "arabicName" TEXT NOT NULL,
    "englishName" TEXT,
    "nameOrigin" TEXT,
    "governorate" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Village_pkey" PRIMARY KEY ("id")
);
