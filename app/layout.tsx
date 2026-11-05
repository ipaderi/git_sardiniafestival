import { dictionary } from "@/lib/dictionary";
import it from "@/messages/it/navigation.json";
import en from "@/messages/en/navigation.json";
import type { Metadata } from "next";
import { DM_Sans, Outfit } from "next/font/google";
import { getRequestLocale } from "@/lib/i18n-server";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const title = dictionary(locale, it, en).siteTitle;
  const description = dictionary(locale, it, en).siteDescription;
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://sardiniafestival.com"),
    title: { default: title, template: "%s | SardiniaFestival" }, description,
    applicationName: "SardiniaFestival",
    openGraph: { type: "website", locale: locale === "it" ? "it_IT" : "en_GB", siteName: "SardiniaFestival", title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getRequestLocale();
  return (
    <html lang={locale}>
      <body className={`${dmSans.variable} ${outfit.variable} antialiased`}>{children}</body>
    </html>
  );
}
