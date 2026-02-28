import { businesses as appBusinesses, calculateDistance } from "./businesses";

const API_BASE =
  (import.meta as any).env?.VITE_API_URL ?? "http://localhost:3001/api";

export type LocationResultSource = "app" | "osm" | "nominatim" | "google";

export interface LocationResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distanceKm: number | null;
  source: LocationResultSource;
  icon: string;
  type?: string;
}

const CATEGORY_EMOJI: Record<string, string> = {
  food: "🍔",
  coffee: "☕",
  retail: "🛍️",
  services: "🔧",
  health: "💪",
  entertainment: "🎬",
  restaurant: "🍴",
  cafe: "☕",
  fast_food: "🍟",
  bar: "🍺",
  pub: "🍻",
  bakery: "🥐",
  supermarket: "🛒",
  pharmacy: "💊",
  hospital: "🏥",
  hotel: "🏨",
  bank: "🏦",
  school: "🎓",
  fuel: "⛽",
  parking: "🅿️",
  cinema: "🎬",
  gym: "💪",
  clothes: "👚",
  electronics: "📱",
  books: "📚",
  hairdresser: "💇",
  beauty: "💅",
};

function getEmoji(type?: string, category?: string): string {
  if (category && CATEGORY_EMOJI[category]) return CATEGORY_EMOJI[category];
  if (type && CATEGORY_EMOJI[type]) return CATEGORY_EMOJI[type];
  return "📍";
}

function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  return calculateDistance(lat1, lng1, lat2, lng2);
}

interface NominatimResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  class?: string;
  address: {
    city?: string;
    state?: string;
    country?: string;
    road?: string;
    house_number?: string;
    suburb?: string;
    neighbourhood?: string;
  };
}

function dedupeResults(results: LocationResult[]): LocationResult[] {
  const seen = new Map<string, LocationResult>();
  for (const r of results) {
    // Generate a proximity key — items within 50m of each other with similar names are dupes
    const existing = Array.from(seen.values()).find((s) => {
      if (!s.lat || !r.lat) return false;
      const dist = distanceKm(s.lat, s.lng, r.lat, r.lng);
      const sameName =
        s.name.toLowerCase().trim() === r.name.toLowerCase().trim();
      return dist < 0.05 && sameName;
    });
    if (!existing) {
      seen.set(r.id, r);
    }
  }
  return Array.from(seen.values());
}

export class LocationSearchEngine {
  private userLat: number | null;
  private userLng: number | null;
  private abortController: AbortController | null = null;

  constructor(userLat?: number | null, userLng?: number | null) {
    this.userLat = userLat ?? null;
    this.userLng = userLng ?? null;
  }

  updateLocation(lat: number, lng: number) {
    this.userLat = lat;
    this.userLng = lng;
  }

  async search(
    query: string,
    opts?: { signal?: AbortSignal },
  ): Promise<LocationResult[]> {
    if (this.abortController) this.abortController.abort();
    this.abortController = new AbortController();
    const signal = opts?.signal ?? this.abortController.signal;

    const q = query.trim();
    if (q.length < 2) return [];

    // 1) Instant: filter local app businesses
    const localResults = this.searchLocalBusinesses(q);

    // 2) Parallel network searches
    const [osmResults, nominatimResults] = await Promise.all([
      q.length >= 3 ? this.searchOSM(q, signal) : Promise.resolve([]),
      q.length >= 3 ? this.searchNominatim(q, signal) : Promise.resolve([]),
    ]);

    // 3) Combine, dedupe, sort by distance
    const all = dedupeResults([
      ...localResults,
      ...osmResults,
      ...nominatimResults,
    ]);

    // Sort: items with distance first (by distance), then items without distance
    all.sort((a, b) => {
      if (a.distanceKm != null && b.distanceKm != null)
        return a.distanceKm - b.distanceKm;
      if (a.distanceKm != null) return -1;
      if (b.distanceKm != null) return 1;
      return 0;
    });

    return all.slice(0, 15);
  }

  searchLocalBusinesses(query: string): LocationResult[] {
    const q = query.toLowerCase();
    const matches = appBusinesses.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.address.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q),
    );

    return matches.map((b) => ({
      id: `app-${b.id}`,
      name: b.name,
      address: b.address,
      lat: b.lat,
      lng: b.lng,
      distanceKm:
        this.userLat != null
          ? distanceKm(this.userLat, this.userLng!, b.lat, b.lng)
          : null,
      source: "app" as const,
      icon: getEmoji(undefined, b.category),
      type: b.category,
    }));
  }

  private async searchOSM(
    query: string,
    signal: AbortSignal,
  ): Promise<LocationResult[]> {
    try {
      const lat = this.userLat ?? 43.7;
      const lng = this.userLng ?? -79.4;
      const params = new URLSearchParams({
        query,
        lat: String(lat),
        lng: String(lng),
        radius: "15000", // 15 km
      });
      const resp = await fetch(`${API_BASE}/osm/search?${params}`, { signal });
      if (!resp.ok) return [];
      const data = await resp.json();
      return (data.results ?? []).map((r: any) => ({
        id: `osm-${r.name}-${r.lat.toFixed(4)}`,
        name: r.name,
        address: r.address || "",
        lat: r.lat,
        lng: r.lng,
        distanceKm: r.distance ?? null,
        source: "osm" as const,
        icon: getEmoji(r.type),
        type: r.type,
      }));
    } catch {
      return [];
    }
  }

  private async searchNominatim(
    query: string,
    signal: AbortSignal,
  ): Promise<LocationResult[]> {
    try {
      // Bias results toward user's area if known
      const viewbox =
        this.userLat != null
          ? `&viewbox=${this.userLng! - 0.5},${this.userLat + 0.5},${this.userLng! + 0.5},${this.userLat - 0.5}&bounded=0`
          : "";
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json` +
          `&q=${encodeURIComponent(query)}&limit=10&addressdetails=1&dedupe=1` +
          viewbox,
        { headers: { "User-Agent": "Proximiti App" }, signal },
      );
      const data: NominatimResult[] = await resp.json();

      // Dedupe by proximity
      const unique = data.reduce((acc: NominatimResult[], cur) => {
        const dup = acc.some(
          (item) =>
            Math.abs(parseFloat(item.lat) - parseFloat(cur.lat)) < 0.0001 &&
            Math.abs(parseFloat(item.lon) - parseFloat(cur.lon)) < 0.0001,
        );
        if (!dup) acc.push(cur);
        return acc;
      }, []);

      return unique.slice(0, 6).map((s) => {
        const lat = parseFloat(s.lat);
        const lng = parseFloat(s.lon);
        const street = [s.address?.house_number, s.address?.road]
          .filter(Boolean)
          .join(" ");
        const mainName = street || s.display_name.split(",")[0].trim();
        const sub = [s.address?.city, s.address?.state, s.address?.country]
          .filter(Boolean)
          .join(", ");

        return {
          id: `nom-${s.place_id}`,
          name: mainName,
          address: sub,
          lat,
          lng,
          distanceKm:
            this.userLat != null
              ? distanceKm(this.userLat, this.userLng!, lat, lng)
              : null,
          source: "nominatim" as const,
          icon: s.address?.house_number && s.address?.road ? "🏠" : "📍",
          type: s.type || s.class || undefined,
        };
      });
    } catch {
      return [];
    }
  }
}

export function formatDistance(km: number | null): string {
  if (km == null) return "";
  if (km < 0.1) return `${Math.round(km * 1000)} m`;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

export function sourceLabel(source: LocationResultSource): string {
  switch (source) {
    case "app":
      return "Proximiti";
    case "osm":
      return "Nearby";
    case "nominatim":
      return "Map";
    case "google":
      return "Google";
  }
}
