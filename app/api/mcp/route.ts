import { randomBytes } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { EventStatus } from "@/generated/prisma/client";
import { eventCategories, slugifyCategory } from "@/lib/event-categories";
import { eventTypes, occurrenceSchema, onlineUrlSchema, validateSchedule } from "@/lib/event-input";
import { prepareSchedule } from "@/lib/event-schedule";
import { validateMcpAccessToken } from "@/lib/mcp-auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noAuth = [{ type: "noauth" }];
const oauth = [{ type: "oauth2", scopes: ["events:write"] }];
const readAnnotations = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };

function textResult(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value) }] };
}

function errorResult(message: string) {
  return { isError: true, content: [{ type: "text" as const, text: message }] };
}

function createServer(request: Request) {
  const server = new McpServer({ name: "sardiniafestival", version: "1.0.0" }, {
    instructions: "Aiuta a proporre eventi in Sardegna. Non inventare dati mancanti; chiariscili con l'utente. Mostra un riepilogo e ottieni conferma prima di inviare. Gli eventi inviati sono in revisione e non sono pubblicati automaticamente. Non chiedere mai password o token in chat. Interpreta gli orari locali in Europe/Rome, rispettando l'ora legale, e invia date ISO 8601 UTC con suffisso Z.",
    maxToolInputElements: 1500,
  });

  server.registerTool("list_event_categories", {
    title: "Categorie eventi",
    description: "Elenca le categorie disponibili per proporre un evento su SardiniaFestival. Usa il valore name restituito nel campo category della proposta.",
    inputSchema: {}, annotations: readAnnotations, _meta: { securitySchemes: noAuth },
  }, async () => textResult({ categories: eventCategories.map(({ name, label }) => ({ name, label, slug: slugifyCategory(name) })) }));

  server.registerTool("search_municipalities", {
    title: "Cerca comune",
    description: "Cerca un comune della Sardegna nell'anagrafica ufficiale del portale. Per un evento fisico usa l'id restituito come comuneId; per un evento itinerante cercalo per ogni sede. Chiedi chiarimenti se ci sono più corrispondenze.",
    inputSchema: { query: z.string().trim().min(2).max(80).describe("Nome, anche parziale, del comune sardo") },
    annotations: readAnnotations, _meta: { securitySchemes: noAuth },
  }, async ({ query }) => {
    const comuni = await prisma.comune.findMany({
      where: { name: { contains: query, mode: "insensitive" } },
      select: { id: true, name: true, provinceName: true, provinceCode: true },
      orderBy: { name: "asc" }, take: 20,
    });
    return textResult({ comuni });
  });

  server.registerTool("submit_event", {
    title: "Invia evento in revisione",
    description: "Invia una proposta di evento in Sardegna all'account collegato per la revisione della redazione. Usa solo dopo aver riepilogato i dati e ottenuto la conferma dell'utente. Non pubblica l'evento. Per sedi fisiche risolvi prima i comuni con search_municipalities. Per il tipo ONLINE serve un URL pubblico, per MULTI_LOCATION almeno due appuntamenti con comune e sede propri. Invia le date ISO 8601 in UTC con suffisso Z, convertendo gli orari locali Europe/Rome; non inventare data, luogo o descrizione.",
    inputSchema: {
      title: z.string().trim().min(4).max(120).describe("Titolo originale dell'evento"),
      titleEn: z.string().trim().max(120).optional().describe("Traduzione inglese, solo se fornita"),
      description: z.string().trim().min(30).max(5000).describe("Descrizione originale dell'evento, almeno 30 caratteri"),
      descriptionEn: z.string().trim().max(5000).optional().describe("Traduzione inglese, solo se fornita"),
      category: z.string().trim().refine((value) => eventCategories.some((category) => category.name === value)).describe("Valore name restituito da list_event_categories"),
      subcategory: z.string().trim().max(80).optional(),
      subcategoryEn: z.string().trim().max(80).optional(),
      eventType: z.enum(eventTypes).describe("SINGLE_DAY, MULTI_DAY, MULTI_LOCATION oppure ONLINE"),
      comuneId: z.string().trim().max(80).optional().describe("Id ottenuto da search_municipalities per SINGLE_DAY e MULTI_DAY"),
      venue: z.string().trim().max(120).optional().describe("Nome della sede per SINGLE_DAY e MULTI_DAY"),
      onlineUrl: onlineUrlSchema.describe("URL http(s) di partecipazione richiesto per ONLINE"),
      dates: z.array(occurrenceSchema).min(1).max(100).describe("Appuntamenti: startsAt e endsAt in ISO 8601 UTC con suffisso Z; per MULTI_LOCATION inserire comuneId e venue in ogni elemento"),
      price: z.string().trim().max(80).optional(),
      priceEn: z.string().trim().max(80).optional(),
      website: z.string().url().max(2048).optional(),
      contactEmail: z.string().email().max(254).optional(),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    _meta: { securitySchemes: oauth },
  }, async (data) => {
    const user = await validateMcpAccessToken(request);
    if (!user) {
      const publicOrigin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
      const metadata = new URL("/.well-known/oauth-protected-resource", publicOrigin).toString();
      return {
        ...errorResult("Per inviare l'evento collega il tuo account SardiniaFestival."),
        _meta: { "mcp/www_authenticate": [`Bearer resource_metadata="${metadata}", error="invalid_token", error_description="Collega il tuo account SardiniaFestival"`] },
      };
    }
    const input = { eventType: data.eventType, dates: data.dates, comuneId: data.comuneId, venue: data.venue, onlineUrl: data.onlineUrl };
    const scheduleError = validateSchedule(input);
    if (scheduleError) return errorResult(scheduleError);
    const schedule = await prepareSchedule(input);
    if (!schedule) return errorResult("Uno o più comuni non sono validi. Cerca nuovamente il comune.");
    const { dates, ...eventSchedule } = schedule;
    const baseSlug = slugify(data.title) || "evento";
    const event = await prisma.event.create({
      data: {
        title: data.title,
        titleEn: data.titleEn || null,
        slug: `${baseSlug}-${randomBytes(6).toString("hex")}`,
        description: data.description,
        descriptionTranslations: data.descriptionEn ? { en: data.descriptionEn } : {},
        category: data.category,
        subcategory: data.subcategory || null,
        subcategoryEn: data.subcategoryEn || null,
        ...eventSchedule,
        ...(data.eventType === "MULTI_LOCATION" ? { address: dates[0].address, latitude: dates[0].latitude, longitude: dates[0].longitude } : {}),
        dates: { create: dates },
        price: data.price || null,
        priceEn: data.priceEn || null,
        website: data.website || null,
        contactEmail: data.contactEmail || null,
        status: EventStatus.PENDING,
        organizerId: user.id,
      },
      select: { id: true, status: true },
    });
    const dashboardUrl = process.env.NEXT_PUBLIC_SITE_URL
      ? new URL("/it/dashboard", process.env.NEXT_PUBLIC_SITE_URL).toString()
      : null;
    return textResult({ reference: event.id, status: event.status, dashboardUrl, message: "Evento inviato alla redazione. È in revisione e non è ancora pubblicato." });
  });
  return server;
}

async function handle(request: Request) {
  const server = createServer(request);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true, maxRequestBodySize: 128 * 1024 });
  await server.connect(transport);
  const response = await transport.handleRequest(request);
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Expose-Headers", "MCP-Session-Id, WWW-Authenticate");
  return response;
}

export const POST = handle;
export const GET = handle;
export const DELETE = handle;

export function OPTIONS() {
  return new Response(null, { status: 204, headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id",
    "Access-Control-Expose-Headers": "MCP-Session-Id, WWW-Authenticate",
  } });
}
