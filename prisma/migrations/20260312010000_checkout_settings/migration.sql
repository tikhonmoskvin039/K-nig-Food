CREATE TABLE "checkout_settings" (
    "id" TEXT NOT NULL,
    "deliveryEnabled" BOOLEAN NOT NULL DEFAULT true,
    "originLabel" TEXT NOT NULL,
    "originQuery" TEXT NOT NULL,
    "originLat" DOUBLE PRECISION NOT NULL,
    "originLng" DOUBLE PRECISION NOT NULL,
    "pickupLabel" TEXT NOT NULL,
    "pickupQuery" TEXT NOT NULL,
    "pickupLat" DOUBLE PRECISION NOT NULL,
    "pickupLng" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checkout_settings_pkey" PRIMARY KEY ("id")
);
