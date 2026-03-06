-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "catalogVisible" BOOLEAN NOT NULL DEFAULT true,
    "portionWeight" INTEGER NOT NULL,
    "portionUnit" TEXT NOT NULL,
    "productCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "featureImageUrl" TEXT NOT NULL,
    "productImageGallery" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isNewArrival" BOOLEAN NOT NULL DEFAULT false,
    "newArrivalOrder" INTEGER NOT NULL DEFAULT 0,
    "shortDescription" TEXT NOT NULL,
    "longDescription" TEXT NOT NULL,
    "regularPrice" TEXT NOT NULL,
    "salePrice" TEXT NOT NULL DEFAULT '',
    "currency" TEXT NOT NULL DEFAULT 'RUR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_catalogVisible_idx" ON "products"("catalogVisible");

-- CreateIndex
CREATE INDEX "products_enabled_idx" ON "products"("enabled");

-- CreateIndex
CREATE INDEX "products_isNewArrival_newArrivalOrder_idx" ON "products"("isNewArrival", "newArrivalOrder");
