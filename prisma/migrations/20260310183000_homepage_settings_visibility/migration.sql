CREATE TABLE "homepage_settings" (
    "id" TEXT NOT NULL,
    "recentProductsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "weeklyOffersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homepage_settings_pkey" PRIMARY KEY ("id")
);
