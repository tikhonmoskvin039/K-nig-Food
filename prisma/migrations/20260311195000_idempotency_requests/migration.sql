-- CreateTable
CREATE TABLE "idempotency_requests" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseBody" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idempotency_requests_expiresAt_idx" ON "idempotency_requests"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_requests_key_endpoint_key" ON "idempotency_requests"("key", "endpoint");
