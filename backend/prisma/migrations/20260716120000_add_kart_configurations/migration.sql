-- CreateTable
CREATE TABLE "kart_configurations" (
    "id" TEXT NOT NULL,
    "kartId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "chassis" TEXT,
    "axle" TEXT,
    "rideHeight" TEXT,
    "tyres" TEXT,
    "engine" TEXT,
    "trackWidthFront" INTEGER,
    "trackWidthRear" INTEGER,
    "gearFront" INTEGER,
    "gearRear" INTEGER,
    "airTempC" DOUBLE PRECISION,
    "trackTempC" DOUBLE PRECISION,
    "weatherCondition" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kart_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kart_configurations_kartId_idx" ON "kart_configurations"("kartId");

-- AddForeignKey
ALTER TABLE "kart_configurations" ADD CONSTRAINT "kart_configurations_kartId_fkey" FOREIGN KEY ("kartId") REFERENCES "karts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
