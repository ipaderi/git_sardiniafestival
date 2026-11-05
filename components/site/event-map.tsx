"use client";

import { useEffect, useRef } from "react";
import type { LatLngExpression, Map as LeafletMap } from "leaflet";

export type EventMapMarker = {
  id: string;
  title: string;
  place: string;
  href: string;
  latitude: number;
  longitude: number;
  kind?: "event" | "poi";
  approximate?: boolean;
};

type Props = {
  markers: EventMapMarker[];
  center?: [number, number];
  zoom?: number;
  className?: string;
};

const SARDINIA_CENTER: [number, number] = [40.08, 9.0];

export function EventMap({ markers, center, zoom = 7.6, className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | undefined;

    async function mountMap() {
      if (!containerRef.current) return;
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, { scrollWheelZoom: false, zoomControl: false });
      mapRef.current = map;
      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      }).addTo(map);

      const pointIcon = L.divIcon({
        className: "sf-map-marker",
        html: '<span class="sf-map-marker__dot"></span>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      // Several events can share a venue or a municipality centre. Group them so
      // every link remains reachable instead of stacking markers on top of one another.
      const groups = new Map<string, EventMapMarker[]>();
      for (const point of markers) {
        if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) continue;
        const key = `${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`;
        groups.set(key, [...(groups.get(key) ?? []), point]);
      }
      const locations = [...groups.values()];
      for (const group of locations) {
        const marker = L.marker([group[0].latitude, group[0].longitude], {
          icon: pointIcon,
          title: group.length === 1 ? group[0].title : `${group.length} luoghi ed eventi`,
        }).addTo(map);
        const popup = document.createElement("div");
        popup.className = "sf-map-popup";
        for (const [index, point] of group.entries()) {
          const item = document.createElement("div");
          item.style.display = "grid";
          item.style.gap = "4px";
          if (index) item.style.marginTop = "12px";
          const kind = document.createElement("span");
          kind.className = "sf-map-popup__eyebrow";
          kind.textContent = point.kind === "poi" ? "Punto di interesse" : "Evento";
          const link = document.createElement("a");
          link.className = "sf-map-popup__title";
          link.href = point.href;
          link.textContent = point.title;
          const place = document.createElement("span");
          place.className = "sf-map-popup__place";
          place.textContent = [point.place, point.approximate ? "Posizione approssimativa: centro del comune" : ""].filter(Boolean).join(" · ");
          item.append(kind, link, place);
          popup.append(item);
        }
        marker.bindPopup(popup);
      }

      const chosenCenter: LatLngExpression = center ?? SARDINIA_CENTER;
      if (center) {
        map.setView(chosenCenter, zoom);
      } else if (locations.length > 1) {
        const bounds = L.latLngBounds(locations.map(([point]) => [point.latitude, point.longitude] as [number, number]));
        map.fitBounds(bounds, { padding: [36, 36], maxZoom: 10 });
      } else if (locations.length === 1) {
        map.setView([locations[0][0].latitude, locations[0][0].longitude], 9);
      } else {
        map.setView(chosenCenter, zoom);
      }

      resizeObserver = new ResizeObserver(() => map.invalidateSize());
      resizeObserver.observe(containerRef.current);
    }

    void mountMap();
    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [markers, center, zoom]);

  return <div ref={containerRef} role="application" aria-label="Mappa interattiva degli eventi e dei luoghi in Sardegna" className={`event-map ${className}`} />;
}
