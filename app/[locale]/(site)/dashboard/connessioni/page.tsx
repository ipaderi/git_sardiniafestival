import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/authz";
import { dictionary } from "@/lib/dictionary";
import { prisma } from "@/lib/prisma";
import it from "@/messages/it/connections.json";
import en from "@/messages/en/connections.json";

export const metadata: Metadata = { robots: { index: false, follow: false } };

async function revokeConnection(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const id = formData.get("id");
  if (typeof id !== "string" || id.length > 128) throw new Error("Invalid connection");
  await prisma.mcpGrant.updateMany({
    where: { id, userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  revalidatePath("/[locale]/dashboard/connessioni", "page");
}

export default async function ConnectionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = dictionary(locale, it, en);
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/auth/login?callbackUrl=${encodeURIComponent(`/${locale}/dashboard/connessioni`)}`);
  const grants = await prisma.mcpGrant.findMany({
    where: { userId: user.id, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
  });
  return <main className="min-h-[65vh] bg-[#f6f7f4] px-5 py-10">
    <div className="mx-auto max-w-3xl">
      <Link href={`/${locale}/dashboard`} className="text-sm font-semibold text-sea">← {t.back}</Link>
      <h1 className="mt-6 font-display text-3xl font-semibold text-ink">{t.title}</h1>
      <p className="mt-2 text-sm text-muted">{t.description}</p>
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 md:p-7">
        {grants.length === 0 ? <p className="text-sm text-muted">{t.empty}</p> :
          <div className="divide-y divide-slate-100">{grants.map((grant) => <div key={grant.id} className="flex flex-wrap items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
            <div><h2 className="font-semibold text-ink">ChatGPT</h2>
              <p className="mt-1 text-sm text-muted">{t.connectedOn} {grant.createdAt.toLocaleDateString(locale === "en" ? "en-GB" : "it-IT", { timeZone: "Europe/Rome" })}</p>
              <p className="mt-2 text-sm text-muted">{t.permissions}</p>
            </div>
            <form action={revokeConnection}><input type="hidden" name="id" value={grant.id}/><button type="submit" className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">{t.revoke}</button></form>
          </div>)}</div>}
      </section>
      {grants.length > 0 && <p className="mt-4 text-xs text-muted">{t.revokeHelp}</p>}
    </div>
  </main>;
}
