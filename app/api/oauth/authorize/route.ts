import { getCurrentUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { CHATGPT_CLIENT_ID, CHATGPT_REDIRECT_URI, MCP_SCOPE, mcpResource, oauthError, oauthOrigin, openConsent, randomSecret, readSmallBody, sealConsent, secretHash, verifyChatGptClientMetadata } from "@/lib/mcp-oauth";
import { z } from "zod";
import { cookies } from "next/headers";
import { dictionary } from "@/lib/dictionary";
import { isLocale, localeCookie, negotiateLocale } from "@/lib/i18n";
import it from "@/messages/it/oauth.json";
import en from "@/messages/en/oauth.json";

export const dynamic = "force-dynamic";
const consent = z.object({ userId: z.string(), version: z.number().int(), challenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/), state: z.string().max(1024), expires: z.number().int(), nonce: z.string() });
const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'", "X-Content-Type-Options": "nosniff" };
function redirectResult(errorOrCode: { error: string } | { code: string }, state: string) {
  const url = new URL(CHATGPT_REDIRECT_URI);
  for (const [key, value] of Object.entries(errorOrCode)) url.searchParams.set(key, value);
  if (state) url.searchParams.set("state", state);
  url.searchParams.set("iss", oauthOrigin());
  return new Response(null, { status: 302, headers: { ...headers, Location: url.toString() } });
}
export async function GET(request: Request) {
  const cookieLocale = (await cookies()).get(localeCookie)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : negotiateLocale(request.headers.get("accept-language"));
  const t = dictionary(locale, it, en);
  const params = new URL(request.url).searchParams;
  for (const name of ["client_id", "redirect_uri", "response_type", "scope", "state", "code_challenge", "code_challenge_method", "resource"]) if (params.getAll(name).length !== 1) return oauthError("invalid_request");
  if (params.get("client_id") !== CHATGPT_CLIENT_ID || params.get("redirect_uri") !== CHATGPT_REDIRECT_URI) return oauthError("invalid_client");
  if (!(await verifyChatGptClientMetadata())) return oauthError("temporarily_unavailable", 503);
  const state = params.get("state") ?? "";
  if (state.length > 1024) return oauthError("invalid_request");
  const fail = (error: string) => redirectResult({ error }, state);
  if (params.get("response_type") !== "code") return fail("unsupported_response_type");
  if (params.get("scope") !== MCP_SCOPE) return fail("invalid_scope");
  if (params.get("resource") !== mcpResource()) return fail("invalid_target");
  const challenge = params.get("code_challenge") ?? "";
  if (params.get("code_challenge_method") !== "S256" || !/^[A-Za-z0-9_-]{43}$/.test(challenge)) return fail("invalid_request");
  const user = await getCurrentUser();
  if (!user) {
    const login = new URL(`/${locale}/auth/login`, oauthOrigin());
    login.searchParams.set("callbackUrl", `/api/oauth/authorize?${params.toString()}`);
    return new Response(null, { status: 302, headers: { ...headers, Location: login.toString() } });
  }
  const current = await prisma.user.findUnique({ where: { id: user.id }, select: { sessionVersion: true, emailVerified: true, role: true } });
  if (!current || (current.role !== "ADMIN" && !current.emailVerified)) return oauthError("access_denied", 403);
  const proof = sealConsent({ userId: user.id, version: current.sessionVersion, challenge, state, expires: Date.now() + 10 * 60 * 1000, nonce: randomSecret() });
  const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
  const html = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(t.title)} - SardiniaFestival</title><style>body{font:16px system-ui;background:#f6f7f4;color:#112c3c;display:grid;place-items:center;min-height:100vh;margin:0}main{max-width:32rem;padding:2rem;background:white;border-radius:1rem;box-shadow:0 12px 36px #102c381a}button{padding:.8rem 1rem;border-radius:.5rem;border:1px solid #006b67;background:#006b67;color:white;margin:.4rem;cursor:pointer}button[value=deny]{background:white;color:#17383c}</style></head><body><main><h1>${escapeHtml(t.title)}</h1><p>${escapeHtml(t.description)}</p><p>${escapeHtml(t.revoke)}</p><form method="post" action="/api/oauth/authorize"><input type="hidden" name="proof" value="${proof}"><button name="decision" value="allow">${escapeHtml(t.allow)}</button><button name="decision" value="deny">${escapeHtml(t.deny)}</button></form></main></body></html>`;
  return new Response(html, { headers: { ...headers, "Content-Type": "text/html; charset=utf-8" } });
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== oauthOrigin()) return oauthError("invalid_request", 403);
  const user = await getCurrentUser();
  if (!user) return oauthError("access_denied", 401);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/x-www-form-urlencoded")) return oauthError("invalid_request");
  const body = await readSmallBody(request);
  if (body === null) return oauthError("invalid_request");
  const form = new URLSearchParams(body);
  if (form.getAll("proof").length !== 1 || form.getAll("decision").length !== 1) return oauthError("invalid_request");
  const proof = form.get("proof") ?? "";
  const parsed = consent.safeParse(openConsent(proof));
  if (!parsed.success || parsed.data.expires < Date.now() || parsed.data.userId !== user.id) return oauthError("invalid_request");
  const current = await prisma.user.findUnique({ where: { id: user.id }, select: { sessionVersion: true, isActive: true, emailVerified: true, role: true } });
  if (!current?.isActive || current.sessionVersion !== parsed.data.version || (current.role !== "ADMIN" && !current.emailVerified)) return oauthError("access_denied", 403);
  if (form.get("decision") === "deny") return redirectResult({ error: "access_denied" }, parsed.data.state);
  if (form.get("decision") !== "allow") return oauthError("invalid_request");
  const code = randomSecret();
  try {
    await prisma.mcpGrant.create({ data: { userId: user.id, clientId: CHATGPT_CLIENT_ID, resource: mcpResource(), scope: MCP_SCOPE, consentNonceHash: secretHash(parsed.data.nonce), sessionVersion: current.sessionVersion, codes: { create: { hash: secretHash(code), challenge: parsed.data.challenge, redirectUri: CHATGPT_REDIRECT_URI, expiresAt: new Date(Date.now() + 5 * 60 * 1000) } } } });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return oauthError("invalid_request");
    throw error;
  }
  return redirectResult({ code }, parsed.data.state);
}
