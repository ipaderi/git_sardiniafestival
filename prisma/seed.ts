import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { comuniSardegna, slugifyComune } from "../lib/comuni";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to connect to PostgreSQL.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function seedComuni() {
  const batchSize = 30;
  for (let offset = 0; offset < comuniSardegna.length; offset += batchSize) {
    const batch = comuniSardegna.slice(offset, offset + batchSize);
    await prisma.$transaction(
      batch.map((comune) => prisma.comune.upsert({
        where: { istatCode: comune.istatCode },
        update: {
          slug: comune.slug,
          name: comune.name,
          provinceCode: comune.provinceCode,
          provinceName: comune.provinceName,
          latitude: comune.latitude,
          longitude: comune.longitude,
          areaSqKm: comune.areaSqKm,
          isProvinceCapital: comune.isProvinceCapital,
        },
        create: comune,
      })),
      { timeout: 15_000 },
    );
  }

  // Attach older events to their canonical comune when their city name matches.
  const comuneBySlug = new Map((await prisma.comune.findMany({ select: { id: true, slug: true } })).map((comune) => [comune.slug, comune.id]));
  const events = await prisma.event.findMany({ where: { comuneId: null }, select: { id: true, location: true } });
  const eventIdsByComune = new Map<string, string[]>();
  for (const event of events) {
    if (!event.location) continue;
    const comuneId = comuneBySlug.get(slugifyComune(event.location));
    if (!comuneId) continue;
    eventIdsByComune.set(comuneId, [...(eventIdsByComune.get(comuneId) ?? []), event.id]);
  }
  if (eventIdsByComune.size) {
    await prisma.$transaction(
      [...eventIdsByComune].map(([comuneId, ids]) => prisma.event.updateMany({ where: { id: { in: ids } }, data: { comuneId } })),
    );
  }
  console.info(`Seed completato: ${comuniSardegna.length} comuni sardi, ${[...eventIdsByComune.values()].reduce((total, ids) => total + ids.length, 0)} eventi collegati ai comuni.`);
}

async function seedAdminIfConfigured() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email && !password) return;
  if (!email || !password) throw new Error("Set both ADMIN_EMAIL and ADMIN_PASSWORD to seed the admin account.");

  await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { role: "ADMIN", isActive: true, emailVerified: new Date(), password: await hash(password, 12) },
    create: {
      email: email.toLowerCase(),
      name: "Amministrazione SardiniaFestival",
      password: await hash(password, 12),
      role: "ADMIN",
      emailVerified: new Date(),
    },
  });
}

async function main() {
  await seedComuni();
  if (!process.argv.includes("--comuni-only")) await seedAdminIfConfigured();
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
