import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const CHATGPT_CLIENT_ID = "https://chatgpt.com/oauth/client.json";
export const CHATGPT_REDIRECT_URI = "https://chatgpt.com/connector_platform_oauth_redirect";
export const MCP_SCOPE = "events:write";
export async function readSmallBody(message: Request | Response, limit = 16384): Promise<string | null> {
  const declared = Number(message.headers.get("content-length") ?? 0);
  if (declared > limit || !message.body) return null;
  const reader = message.body.getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString("utf8");
  } catch { return null; }
}
// Never follow a URL supplied by a client. Fetch only OpenAI's pinned document.
export async function verifyChatGptClientMetadata(): Promise<boolean> {
  try {
    const response = await fetch(CHATGPT_CLIENT_ID, { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(5000), headers: { Accept: "application/json" } });
    if (!response.ok || Number(response.headers.get("content-length") ?? 0) > 16384) return false;
    const text = await readSmallBody(response);
    if (text === null) return false;
    const metadata: unknown = JSON.parse(text);
    if (!metadata || typeof metadata !== "object") return false;
    const doc = metadata as Record<string, unknown>;
    return doc.client_id === CHATGPT_CLIENT_ID && Array.isArray(doc.redirect_uris) && doc.redirect_uris.includes(CHATGPT_REDIRECT_URI) && Array.isArray(doc.token_endpoint_auth_methods_supported) && doc.token_endpoint_auth_methods_supported.includes("none") && Array.isArray(doc.grant_types) && doc.grant_types.includes("authorization_code");
  } catch { return false; }
}
export function oauthOrigin(): string {
  const value = process.env.NEXT_PUBLIC_SITE_URL;
  if (!value) throw new Error("NEXT_PUBLIC_SITE_URL is required for MCP OAuth");
  const url = new URL(value);
  if (url.pathname !== "/" || url.search || url.hash || (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) throw new Error("NEXT_PUBLIC_SITE_URL must be an HTTPS origin");
  return url.origin;
}
export const mcpResource = () => `${oauthOrigin()}/api/mcp`;
export const randomSecret = () => randomBytes(32).toString("base64url");
export const secretHash = (value: string) => createHash("sha256").update(value).digest("hex");
export const pkceHash = (value: string) => createHash("sha256").update(value).digest("base64url");
const key = () => { const secret = process.env.AUTH_SECRET; if (!secret || Buffer.byteLength(secret) < 32) throw new Error("AUTH_SECRET must contain at least 32 bytes"); return secret; };
export function sealConsent(value: object): string {
  const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${payload}.${createHmac("sha256", key()).update(payload).digest("base64url")}`;
}
export function openConsent(value: string): unknown {
  const [payload, mac, extra] = value.split(".");
  if (!payload || !mac || extra || value.length > 12000) return null;
  const expected = createHmac("sha256", key()).update(payload).digest();
  const actual = Buffer.from(mac, "base64url");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try { return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); } catch { return null; }
}
export function tokenMatches(a: string, b: string): boolean {
  const first = Buffer.from(a); const second = Buffer.from(b);
  return first.length === second.length && timingSafeEqual(first, second);
}
export function oauthError(error: string, status = 400): Response {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store", Pragma: "no-cache" } });
}
export async function validateMcpAccessToken(request: Request): Promise<{ id: string } | null> {
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/i.exec(request.headers.get("authorization") ?? "");
  if (!match) return null;
  const token = await prisma.mcpToken.findUnique({ where: { hash: secretHash(match[1]) }, include: { grant: { include: { user: true } } } });
  if (!token || token.type !== "access" || token.usedAt || token.expiresAt <= new Date() || token.grant.revokedAt || token.grant.clientId !== CHATGPT_CLIENT_ID || token.grant.resource !== mcpResource() || token.grant.scope !== MCP_SCOPE) return null;
  const user = token.grant.user;
  if (!user.isActive || (user.role !== "ADMIN" && !user.emailVerified) || user.sessionVersion !== token.grant.sessionVersion) return null;
  return { id: user.id };
}
