CREATE TABLE "McpGrant" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "consentNonceHash" TEXT NOT NULL,
  "sessionVersion" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "McpGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "McpGrant_userId_revokedAt_idx" ON "McpGrant"("userId", "revokedAt");
CREATE UNIQUE INDEX "McpGrant_consentNonceHash_key" ON "McpGrant"("consentNonceHash");
CREATE TABLE "McpAuthorizationCode" (
  "hash" TEXT NOT NULL PRIMARY KEY,
  "grantId" TEXT NOT NULL,
  "challenge" TEXT NOT NULL,
  "redirectUri" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  CONSTRAINT "McpAuthorizationCode_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "McpGrant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "McpAuthorizationCode_grantId_idx" ON "McpAuthorizationCode"("grantId");
CREATE INDEX "McpAuthorizationCode_expiresAt_idx" ON "McpAuthorizationCode"("expiresAt");
CREATE TABLE "McpToken" (
  "hash" TEXT NOT NULL PRIMARY KEY,
  "grantId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "McpToken_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "McpGrant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "McpToken_type_check" CHECK ("type" IN ('access', 'refresh'))
);
CREATE INDEX "McpToken_grantId_idx" ON "McpToken"("grantId");
CREATE INDEX "McpToken_expiresAt_idx" ON "McpToken"("expiresAt");
