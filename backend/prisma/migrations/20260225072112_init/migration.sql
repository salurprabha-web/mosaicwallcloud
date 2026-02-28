-- CreateTable
CREATE TABLE "Config" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "gridWidth" INTEGER NOT NULL DEFAULT 20,
    "gridHeight" INTEGER NOT NULL DEFAULT 20,
    "bgImageUrl" TEXT,
    "bgOpacity" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "animationSpeed" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "entryAnimation" TEXT NOT NULL DEFAULT 'fade',
    "moderationOn" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tile" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "gridX" INTEGER NOT NULL,
    "gridY" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "uploader" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tile_pkey" PRIMARY KEY ("id")
);
