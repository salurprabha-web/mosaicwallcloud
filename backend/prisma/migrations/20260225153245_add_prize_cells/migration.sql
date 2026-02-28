-- CreateTable
CREATE TABLE "PrizeCell" (
    "id" SERIAL NOT NULL,
    "gridX" INTEGER NOT NULL,
    "gridY" INTEGER NOT NULL,

    CONSTRAINT "PrizeCell_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrizeCell_gridX_gridY_key" ON "PrizeCell"("gridX", "gridY");
