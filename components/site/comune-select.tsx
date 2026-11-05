"use client";

import { useEffect, useRef, useState } from "react";

export type ComuneOption = {
  id: string;
  name: string;
  slug: string;
  provinceCode: string;
  provinceName: string;
  latitude: number;
  longitude: number;
};

let comuniRequest: Promise<ComuneOption[]> | undefined;

export function fetchComuni(): Promise<ComuneOption[]> {
  if (!comuniRequest) {
    comuniRequest = fetch("/api/comuni")
      .then(async (response) => {
        if (!response.ok) throw new Error("Elenco dei comuni non disponibile.");
        const data = await response.json() as { comuni: ComuneOption[] };
        return data.comuni;
      })
      .catch((error) => { comuniRequest = undefined; throw error; });
  }
  return comuniRequest;
}

type Props = {
  name?: string;
  id?: string;
  value?: string;
  defaultValue?: string | null;
  defaultName?: string;
  onChange?: (comune: ComuneOption | null) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
};

export function ComuneSelect({ name, id, value, defaultValue, defaultName, onChange, required, disabled, className }: Props) {
  const [comuni, setComuni] = useState<ComuneOption[]>([]);
  const [selection, setSelection] = useState(defaultValue ?? "");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    fetchComuni().then((items) => {
      if (!active) return;
      setComuni(items);
      if (!defaultValue && defaultName) {
        const match = items.find((item) => item.name.toLocaleLowerCase("it-IT") === defaultName.trim().toLocaleLowerCase("it-IT"));
        if (match) {
          setSelection(match.id);
          onChangeRef.current?.(match);
        }
      }
    }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt, defaultName, defaultValue]);

  return <span className="block min-w-0">
    <select id={id} name={name} value={value ?? selection} required={required} disabled={disabled || loading || error} className={className} onChange={(event) => {
      const selected = comuni.find((comune) => comune.id === event.target.value) ?? null;
      setSelection(event.target.value);
      onChange?.(selected);
    }}>
      <option value="">{loading ? "Caricamento comuni…" : error ? "Comuni non disponibili" : "Seleziona un comune"}</option>
      {comuni.map((comune) => <option key={comune.id} value={comune.id}>{comune.name} ({comune.provinceCode})</option>)}
    </select>
    {error && <button type="button" className="mt-1 text-xs font-semibold text-rose-700 underline" onClick={() => setAttempt((current) => current + 1)}>Riprova a caricare i comuni</button>}
  </span>;
}
