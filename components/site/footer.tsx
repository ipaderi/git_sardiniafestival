import Link from "next/link";
import { Instagram, Facebook, ArrowUpRight } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#062440] text-white">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-14 md:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
        <div>
          <div className="inline-flex rounded-lg bg-white px-3 py-2"><img src="/brand/logo-sardiniafestival.svg" alt="SardiniaFestival" className="w-48" /></div>
          <p className="mt-5 max-w-sm text-sm leading-6 text-blue-100/75">L'isola ha sempre qualcosa da raccontare. Noi ti aiutiamo a trovare dove comincia la tua prossima storia.</p>
          <div className="mt-5 flex gap-3"><a className="focus-ring rounded-full border border-white/20 p-2.5 hover:bg-white/10" href="https://www.instagram.com/" aria-label="Instagram"><Instagram size={17} /></a><a className="focus-ring rounded-full border border-white/20 p-2.5 hover:bg-white/10" href="https://www.facebook.com/" aria-label="Facebook"><Facebook size={17} /></a></div>
        </div>
        <div><h2 className="font-display text-sm font-semibold uppercase tracking-[.16em] text-teal-200">Scopri</h2><ul className="mt-5 space-y-3 text-sm text-blue-100/75"><li><Link href="/categorie/musica" className="hover:text-white">Concerti e festival</Link></li><li><Link href="/categorie/tradizione" className="hover:text-white">Tradizioni sarde</Link></li><li><Link href="/categorie" className="hover:text-white">Tutte le categorie</Link></li><li><Link href="/#territori" className="hover:text-white">Città e territori</Link></li></ul></div>
        <div><h2 className="font-display text-sm font-semibold uppercase tracking-[.16em] text-teal-200">Partecipa</h2><ul className="mt-5 space-y-3 text-sm text-blue-100/75"><li><Link href="/segnala-evento" className="inline-flex items-center gap-1 hover:text-white">Segnala un evento <ArrowUpRight size={14} /></Link></li><li><Link href="/registrati" className="hover:text-white">Crea un account</Link></li><li><a href="mailto:ciao@sardiniafestival.com" className="hover:text-white">Contattaci</a></li></ul></div>
      </div>
      <div className="border-t border-white/10"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-xs text-blue-100/55 sm:flex-row sm:items-center sm:justify-between lg:px-8"><span>© {new Date().getFullYear()} SardiniaFestival. Tutta l'isola, un calendario.</span><span>Fatto con cura in Sardegna <span aria-hidden="true">✳</span></span></div></div>
    </footer>
  );
}
