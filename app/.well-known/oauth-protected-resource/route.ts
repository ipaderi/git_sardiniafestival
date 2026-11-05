import { oauthOrigin, mcpResource, MCP_SCOPE } from "@/lib/mcp-oauth";
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json({ resource: mcpResource(), authorization_servers: [oauthOrigin()], scopes_supported: [MCP_SCOPE], bearer_methods_supported: ["header"] });
}
