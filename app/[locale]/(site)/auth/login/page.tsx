import type { Metadata } from "next";
import { AccountAuthPage } from "@/components/account/auth-page";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ callbackUrl?: string; verification?: string }> }) { const { locale } = await params; const query = await searchParams; return <AccountAuthPage locale={locale} mode="login" {...query} />; }
