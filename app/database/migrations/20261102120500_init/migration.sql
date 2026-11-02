-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "CloudReading" (
    "id" TEXT NOT NULL,
    "requestedDateTime" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "updateTimestamp" TIMESTAMP(3) NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "clampedToLatest" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CloudReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CloudArea" (
    "id" TEXT NOT NULL,
    "readingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "forecast" TEXT NOT NULL,
    "coverage" DOUBLE PRECISION NOT NULL,
    "kind" TEXT NOT NULL,

    CONSTRAINT "CloudArea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CloudReading_requestedDateTime_key" ON "CloudReading"("requestedDateTime");

-- CreateIndex
CREATE UNIQUE INDEX "CloudArea_readingId_name_key" ON "CloudArea"("readingId", "name");

-- AddForeignKey
ALTER TABLE "CloudArea" ADD CONSTRAINT "CloudArea_readingId_fkey" FOREIGN KEY ("readingId") REFERENCES "CloudReading"("id") ON DELETE CASCADE ON UPDATE CASCADE;
