import type { Metadata } from "next";
import { AccountAuthPage } from "@/components/account/auth-page";
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ token?: string }> }) { const { locale } = await params; const { token } = await searchParams; return <AccountAuthPage locale={locale} mode="password-reset" token={token} />; }
