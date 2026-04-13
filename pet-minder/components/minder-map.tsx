"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { PublicMinderListItem } from "@/lib/types/minder-profile";

type MinderMapProps = {
  minders: PublicMinderListItem[];
};

const DEFAULT_CENTER: [number, number] = [51.505, -0.09]; // London
const DEFAULT_ZOOM = 11;

export function MinderMap({ minders }: MinderMapProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Dynamically import Leaflet to avoid SSR issues.
    import("leaflet").then((L) => {
      // Fix the default icon path broken by webpack/Next.js bundling.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current!).setView(
          DEFAULT_CENTER,
          DEFAULT_ZOOM,
        );

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(mapRef.current);
      }

      const map = mapRef.current;

      // Remove previous markers by clearing all layers except the tile layer.
      map.eachLayer((layer) => {
        if (layer instanceof L.Marker) map.removeLayer(layer);
      });

      const MAX_PINS = 30;
      const allPinned = minders.filter(
        (m) => m.latitude !== null && m.longitude !== null,
      );
      const pinned = allPinned.slice(0, MAX_PINS);

      if (pinned.length === 0) {
        map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
        return;
      }

      const bounds: [number, number][] = [];

      for (const minder of pinned) {
        const lat = minder.latitude!;
        const lng = minder.longitude!;
        bounds.push([lat, lng]);

        const ratingLine =
          minder.averageRating !== null
            ? `<span>⭐ ${minder.averageRating.toFixed(1)}/5.0</span>`
            : "";
        const priceLine = minder.servicePricing
          ? `<span>${minder.servicePricing}</span>`
          : "";
        const locationLine = minder.locationName
          ? `<span class="text-xs text-gray-500">${minder.locationName}</span>`
          : "";

        const popup = `
          <div style="min-width:140px;font-family:sans-serif;line-height:1.4">
            <strong>${minder.displayName}</strong><br/>
            ${locationLine}
            <div style="display:flex;gap:8px;margin-top:4px;font-size:0.8rem">
              ${ratingLine}${priceLine}
            </div>
          </div>
        `;

        L.marker([lat, lng]).addTo(map).bindPopup(popup);
      }

      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 });
    });

    return () => {
      // Do not destroy the map on filter re-renders — only destroy on unmount
      // of the whole component. We detect unmount by checking containerRef.
    };
  }, [minders]);

  // Destroy the Leaflet instance on true unmount.
  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  const MAX_PINS = 30;
  const allPinnedCount = minders.filter(
    (m) => m.latitude !== null && m.longitude !== null,
  ).length;
  const shownCount = Math.min(allPinnedCount, MAX_PINS);
  const isCapped = allPinnedCount > MAX_PINS;

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="h-[340px] w-full rounded-lg border border-border sm:h-[420px]"
        aria-label="Map of available minders"
      />
      <p className="text-xs text-muted-foreground">
        {allPinnedCount === 0
          ? "No minders in the current results have set a location yet."
          : isCapped
            ? `Showing ${shownCount} of ${allPinnedCount} pinned minders (capped at ${MAX_PINS}). Narrow your filters to see more.`
            : `Showing ${shownCount} minder${shownCount === 1 ? "" : "s"} with a pinned location.`}
      </p>
    </div>
  );
}
