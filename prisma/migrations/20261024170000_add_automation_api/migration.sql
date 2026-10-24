-- CreateTable
CREATE TABLE "AutomationApiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "scopes" TEXT NOT NULL DEFAULT '["blog:read","blog:draft:create","blog:draft:update"]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "rateLimit" INTEGER NOT NULL DEFAULT 60,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationIdempotencyKey" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "requestHash" TEXT,
    "responseCode" INTEGER NOT NULL,
    "responseBody" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationIdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AutomationApiKey_keyHash_key" ON "AutomationApiKey"("keyHash");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationIdempotencyKey_apiKeyId_key_key" ON "AutomationIdempotencyKey"("apiKeyId", "key");

-- CreateIndex
CREATE INDEX "AutomationIdempotencyKey_expiresAt_idx" ON "AutomationIdempotencyKey"("expiresAt");

-- AddForeignKey
ALTER TABLE "AutomationIdempotencyKey" ADD CONSTRAINT "AutomationIdempotencyKey_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "AutomationApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
