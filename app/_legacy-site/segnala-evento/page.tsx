import type { Metadata } from "next";
import { CalendarDays, Check, ShieldCheck, Sparkles } from "lucide-react";
import { SubmitEventForm } from "@/components/site/submit-event-form";

export const metadata: Metadata = { title: "Segnala un evento", description: "Aggiungi il tuo festival, spettacolo o appuntamento al calendario SardiniaFestival.", alternates: { canonical: "/segnala-evento" } };

export default function SubmitEventPage() {
  return <main className="bg-[#f6f7f4] px-5 py-10 md:py-14"><div className="mx-auto grid max-w-6xl gap-9 lg:grid-cols-[.72fr_1.28fr] lg:gap-14">
    <div><span className="inline-flex items-center gap-2 rounded-full bg-[#e1f2ed] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.14em] text-sea"><Sparkles size={13} /> Per chi organizza</span><h1 className="mt-5 font-display text-4xl font-semibold leading-[1.05] tracking-[-.05em] text-ink md:text-5xl">La tua festa<br />merita di essere<br /><span className="text-sea">trovata.</span></h1><p className="mt-5 max-w-md text-sm leading-7 text-ink-soft/80">Segnala un evento in Sardegna. Il nostro team controllerà le informazioni e lo aggiungerà al calendario.</p><div className="mt-8 space-y-4">{["Gratuito: nessuna commissione", "Revisione prima della pubblicazione", "Modifica i dettagli dal tuo account"].map((item) => <div key={item} className="flex items-center gap-3 text-sm font-medium text-ink-soft"><span className="flex size-6 items-center justify-center rounded-full bg-white text-sea shadow-sm"><Check size={14} /></span>{item}</div>)}</div><div className="mt-10 hidden rounded-2xl bg-[#082848] p-5 text-white lg:block"><CalendarDays size={20} className="text-teal-200" /><p className="mt-4 font-display text-lg font-semibold">Il calendario è di tutti.</p><p className="mt-2 text-xs leading-5 text-blue-100/75">Dalle sagre di paese ai grandi festival: ogni appuntamento aiuta qualcuno a conoscere meglio l'isola.</p></div></div>
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_55px_rgba(8,40,72,.06)] md:p-8"><SubmitEventForm /></div>
    <div className="flex gap-3 text-xs leading-5 text-muted lg:col-start-2"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-sea" />Le informazioni vengono usate solo per pubblicare e verificare l'evento. Il contatto email non sarà mostrato nella scheda pubblica.</div>
  </div></main>;
}
