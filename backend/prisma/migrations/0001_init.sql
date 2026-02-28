-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Mosaic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MosaicAdmin" (
    "userId" TEXT NOT NULL,
    "mosaicId" TEXT NOT NULL,

    PRIMARY KEY ("userId", "mosaicId"),
    CONSTRAINT "MosaicAdmin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MosaicAdmin_mosaicId_fkey" FOREIGN KEY ("mosaicId") REFERENCES "Mosaic" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Config" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mosaicId" TEXT,
    "gridWidth" INTEGER NOT NULL DEFAULT 20,
    "gridHeight" INTEGER NOT NULL DEFAULT 20,
    "gapSize" INTEGER NOT NULL DEFAULT 2,
    "borderRadius" INTEGER NOT NULL DEFAULT 4,
    "bgImageUrl" TEXT,
    "bgOpacity" REAL NOT NULL DEFAULT 0.5,
    "animationSpeed" REAL NOT NULL DEFAULT 1.0,
    "entryAnimation" TEXT NOT NULL DEFAULT 'fade',
    "moderationOn" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Config_mosaicId_fkey" FOREIGN KEY ("mosaicId") REFERENCES "Mosaic" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mosaicId" TEXT,
    "imageUrl" TEXT NOT NULL,
    "gridX" INTEGER NOT NULL,
    "gridY" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "uploader" TEXT,
    "email" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Tile_mosaicId_fkey" FOREIGN KEY ("mosaicId") REFERENCES "Mosaic" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PrizeCell" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mosaicId" TEXT,
    "gridX" INTEGER NOT NULL,
    "gridY" INTEGER NOT NULL,
    CONSTRAINT "PrizeCell_mosaicId_fkey" FOREIGN KEY ("mosaicId") REFERENCES "Mosaic" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PageSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "page" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "body" TEXT,
    "ctaText" TEXT,
    "ctaUrl" TEXT,
    "imageUrl" TEXT,
    "badge" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "author" TEXT NOT NULL DEFAULT 'Admin',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME,
    "metaTitle" TEXT,
    "metaDesc" TEXT,
    "ogImage" TEXT,
    "tags" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Mosaic_slug_key" ON "Mosaic"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PrizeCell_mosaicId_gridX_gridY_key" ON "PrizeCell"("mosaicId", "gridX", "gridY");

-- CreateIndex
CREATE UNIQUE INDEX "PageSection_page_sectionKey_key" ON "PageSection"("page", "sectionKey");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");

