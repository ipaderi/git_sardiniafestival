import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <><Header />{children}<Footer /></>;
}
