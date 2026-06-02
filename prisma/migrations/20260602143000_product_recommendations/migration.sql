ALTER TABLE "products"
ADD COLUMN "recommendedProductIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
