import type { Metadata } from "next";
import { DM_Sans, Outfit } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://sardiniafestival.com"),
  title: { default: "SardiniaFestival — Eventi in Sardegna", template: "%s | SardiniaFestival" },
  description: "Trova festival, concerti, sagre, spettacoli e appuntamenti in Sardegna. La tua prossima storia comincia qui.",
  applicationName: "SardiniaFestival",
  openGraph: {
    type: "website",
    locale: "it_IT",
    siteName: "SardiniaFestival",
    title: "SardiniaFestival — Eventi in Sardegna",
    description: "Scopri cosa succede in Sardegna: festival, musica, tradizioni e cultura.",
  },
  twitter: { card: "summary_large_image", title: "SardiniaFestival — Eventi in Sardegna", description: "Scopri gli eventi dell'isola." },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body className={`${dmSans.variable} ${outfit.variable} antialiased`}>{children}</body>
    </html>
  );
}
