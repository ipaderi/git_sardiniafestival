import { prisma } from "@/lib/prisma";
import { CHATGPT_CLIENT_ID, oauthError, readSmallBody, secretHash } from "@/lib/mcp-oauth";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/x-www-form-urlencoded")) return oauthError("invalid_request");
  const body = await readSmallBody(request);
  if (body === null) return oauthError("invalid_request");
  const params = new URLSearchParams(body);
  if (params.getAll("token").length !== 1 || params.getAll("client_id").length !== 1) return oauthError("invalid_request");
  if (params.get("client_id") !== CHATGPT_CLIENT_ID) return oauthError("invalid_client", 401);
  const token = params.get("token") ?? "";
  if (/^[A-Za-z0-9_-]{43}$/.test(token)) {
    const found = await prisma.mcpToken.findUnique({ where: { hash: secretHash(token) }, select: { grantId: true } });
    if (found) await prisma.mcpGrant.updateMany({ where: { id: found.grantId, clientId: CHATGPT_CLIENT_ID, revokedAt: null }, data: { revokedAt: new Date() } });
  }
  return new Response(null, { status: 200, headers: { "Cache-Control": "no-store" } });
}
