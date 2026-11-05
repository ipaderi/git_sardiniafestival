import type { Metadata } from "next";
import { AccountAuthPage } from "@/components/account/auth-page";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ locale: string }> }) { const { locale } = await params; return <AccountAuthPage locale={locale} mode="register" />; }
