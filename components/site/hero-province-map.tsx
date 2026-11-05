"use client";

import { dictionary, interpolate } from "@/lib/dictionary";
import publicIt from "@/messages/it/public.json";
import publicEn from "@/messages/en/public.json";

import Link from "next/link";
import { useRef, useState, type PointerEvent } from "react";
import { PROVINCES } from "@/lib/provinces";
import paths from "./map-data/sardinia-provinces.json";
import styles from "./hero-province-map.module.css";

/** The paths come from the user-supplied 2025 provincial SVG map. */
export function HeroProvinceMap({ locale = "it" }: { locale?: string }) {
  const [active, setActive] = useState<string | null>(null);
  const tooltip = useRef<HTMLDivElement>(null);
  const moveTooltip = (event: PointerEvent<Element>) => {
    if (event.pointerType === "touch" || !tooltip.current) return;
    tooltip.current.style.left = `${Math.min(event.clientX + 16, window.innerWidth - 220)}px`;
    tooltip.current.style.top = `${Math.min(event.clientY + 18, window.innerHeight - 55)}px`;
  };
  return (
    <div className="relative mx-auto flex h-[350px] w-full max-w-[460px] items-center justify-center md:h-[430px]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-3 rounded-full bg-[#16a6a0]/10 blur-3xl" />
      <svg viewBox="-100 -80 2486.118 4562.728" role="group" aria-label={dictionary(locale, publicIt, publicEn).provinceMapAriaLabel} className="relative h-[92%] max-w-full overflow-visible drop-shadow-[0_16px_22px_rgba(0,20,37,.2)]">
        <title>{dictionary(locale, publicIt, publicEn).sardiniaChooseAProvince}</title>
        {PROVINCES.map((province) => (
          <Link
            key={province.code}
            href={`/${locale}/events/province/${province.slug}`}
            prefetch={false}
            aria-label={interpolate(dictionary(locale, publicIt, publicEn).provinceEventsTitle, { name: province.name })}
            className={`${styles.province} ${active === province.code ? styles.active : ""}`}
            onPointerEnter={(event) => { if (event.pointerType !== "touch") { setActive(province.code); moveTooltip(event); } }}
            onPointerMove={moveTooltip}
            onPointerLeave={() => setActive(null)}
          >
            <g className={styles.provinceShape} fill={province.color} stroke="#082848" strokeWidth="7" strokeLinejoin="round">
              {paths[province.mapId].map((d, index) => <path key={index} d={d} />)}
            </g>
          </Link>
        ))}
      </svg>
      <div ref={tooltip} aria-hidden="true" className={`pointer-events-none fixed z-50 rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#082848] shadow-xl ${active ? "opacity-100" : "opacity-0"}`}>
        {PROVINCES.find((province) => province.code === active)?.name}
      </div>
      <div className="pointer-events-none absolute bottom-1 right-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-xs text-blue-50 shadow-xl backdrop-blur-md">
        <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-teal-300" /> {dictionary(locale, publicIt, publicEn).chooseAProvince}</span>
      </div>
    </div>
  );
}
