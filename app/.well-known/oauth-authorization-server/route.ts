import { oauthOrigin, MCP_SCOPE } from "@/lib/mcp-oauth";
export const dynamic = "force-dynamic";
export function GET() {
  const origin = oauthOrigin();
  return Response.json({
    issuer: origin,
    authorization_endpoint: `${origin}/api/oauth/authorize`,
    token_endpoint: `${origin}/api/oauth/token`,
    revocation_endpoint: `${origin}/api/oauth/revoke`,
    response_types_supported: ["code"], grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none"], revocation_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"], scopes_supported: [MCP_SCOPE],
    client_id_metadata_document_supported: true, authorization_response_iss_parameter_supported: true,
  });
}
