import { prisma } from "@/lib/prisma";
import { CHATGPT_CLIENT_ID, CHATGPT_REDIRECT_URI, MCP_SCOPE, mcpResource, oauthError, pkceHash, randomSecret, readSmallBody, secretHash, tokenMatches } from "@/lib/mcp-oauth";
export const dynamic = "force-dynamic";
const accessLifetime = 60 * 60;
const refreshLifetime = 30 * 24 * 60 * 60;
const validSecret = (value: string) => /^[A-Za-z0-9_-]{43}$/.test(value);
export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/x-www-form-urlencoded")) return oauthError("invalid_request");
  const body = await readSmallBody(request);
  if (body === null) return oauthError("invalid_request");
  const params = new URLSearchParams(body);
  for (const name of ["grant_type", "client_id", "resource", "code", "redirect_uri", "code_verifier", "refresh_token", "scope"]) if (params.getAll(name).length > 1) return oauthError("invalid_request");
  if (params.get("client_id") !== CHATGPT_CLIENT_ID) return oauthError("invalid_client", 401);
  if (params.get("resource") !== mcpResource()) return oauthError("invalid_target");
  if (params.has("scope") && params.get("scope") !== MCP_SCOPE) return oauthError("invalid_scope");
  const type = params.get("grant_type");
  if (type !== "authorization_code" && type !== "refresh_token") return oauthError("unsupported_grant_type");
  const raw = params.get(type === "authorization_code" ? "code" : "refresh_token") ?? "";
  if (!validSecret(raw)) return oauthError("invalid_grant");
  const verifier = params.get("code_verifier") ?? "";
  if (type === "authorization_code" && (params.get("redirect_uri") !== CHATGPT_REDIRECT_URI || !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier))) return oauthError("invalid_grant");
  const now = new Date();
  const accessToken = randomSecret(); const refreshToken = randomSecret();
  const result = await prisma.$transaction(async (tx) => {
    if (type === "authorization_code") {
      const record = await tx.mcpAuthorizationCode.findUnique({ where: { hash: secretHash(raw) }, include: { grant: { include: { user: true } } } });
      if (!record || record.consumedAt || record.expiresAt <= now || record.redirectUri !== CHATGPT_REDIRECT_URI || !tokenMatches(record.challenge, pkceHash(verifier))) return false;
      const { grant } = record; const { user } = grant;
      if (grant.revokedAt || grant.clientId !== CHATGPT_CLIENT_ID || grant.resource !== mcpResource() || grant.scope !== MCP_SCOPE || !user.isActive || (user.role !== "ADMIN" && !user.emailVerified) || user.sessionVersion !== grant.sessionVersion) return false;
      const consumed = await tx.mcpAuthorizationCode.updateMany({ where: { hash: record.hash, consumedAt: null, expiresAt: { gt: now } }, data: { consumedAt: now } });
      if (consumed.count !== 1) return false;
      await tx.mcpToken.createMany({ data: [{ hash: secretHash(accessToken), grantId: grant.id, type: "access", expiresAt: new Date(now.getTime() + accessLifetime * 1000) }, { hash: secretHash(refreshToken), grantId: grant.id, type: "refresh", expiresAt: new Date(now.getTime() + refreshLifetime * 1000) }] });
      return true;
    }
    const record = await tx.mcpToken.findUnique({ where: { hash: secretHash(raw) }, include: { grant: { include: { user: true } } } });
    if (!record || record.type !== "refresh" || record.expiresAt <= now) return false;
    const { grant } = record; const { user } = grant;
    if (grant.revokedAt || grant.clientId !== CHATGPT_CLIENT_ID || grant.resource !== mcpResource() || grant.scope !== MCP_SCOPE || !user.isActive || (user.role !== "ADMIN" && !user.emailVerified) || user.sessionVersion !== grant.sessionVersion) return false;
    // A reused refresh token indicates replay. Revoke the entire family.
    if (record.usedAt) {
      await tx.mcpGrant.updateMany({ where: { id: grant.id, revokedAt: null }, data: { revokedAt: now } });
      return false;
    }
    const consumed = await tx.mcpToken.updateMany({ where: { hash: record.hash, type: "refresh", usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } });
    if (consumed.count !== 1) {
      await tx.mcpGrant.updateMany({ where: { id: grant.id, revokedAt: null }, data: { revokedAt: now } });
      return false;
    }
    await tx.mcpToken.createMany({ data: [{ hash: secretHash(accessToken), grantId: grant.id, type: "access", expiresAt: new Date(now.getTime() + accessLifetime * 1000) }, { hash: secretHash(refreshToken), grantId: grant.id, type: "refresh", expiresAt: new Date(now.getTime() + refreshLifetime * 1000) }] });
    return true;
  });
  if (!result) return oauthError("invalid_grant");
  return Response.json({ access_token: accessToken, token_type: "Bearer", expires_in: accessLifetime, refresh_token: refreshToken, scope: MCP_SCOPE }, { headers: { "Cache-Control": "no-store", Pragma: "no-cache" } });
}
