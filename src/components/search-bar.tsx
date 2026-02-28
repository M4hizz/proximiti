import { useState, useEffect, useRef } from "react";
import { Search, MapPin, Navigation, Store, Globe, Map } from "lucide-react";
import {
  LocationSearchEngine,
  formatDistance,
  type LocationResult,
} from "@/lib/locationSearch";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onLocateUser: () => void;
  onLocationSelect?: (lat: number, lng: number, displayName: string) => void;
  /** When set, populates the location input (e.g. after "Near Me" detects a location) */
  locationDisplay?: string;
  /** Current user location for distance-sorted results */
  userLocation?: [number, number] | null;
}

/* ── Source icons / colours ─────────────────────────────── */
const SOURCE_META: Record<
  string,
  { icon: React.ReactNode; color: string; label: string }
> = {
  business: {
    icon: <Store className="w-4 h-4" />,
    color: "text-green-500",
    label: "Proximiti Businesses",
  },
  osm: {
    icon: <Globe className="w-4 h-4" />,
    color: "text-blue-500",
    label: "Nearby Places",
  },
  nominatim: {
    icon: <Map className="w-4 h-4" />,
    color: "text-gray-400",
    label: "Addresses & Landmarks",
  },
};

export function SearchBar({
  value,
  onChange,
  onLocateUser,
  onLocationSelect,
  locationDisplay,
  userLocation,
}: SearchBarProps) {
  const [locationQuery, setLocationQuery] = useState(locationDisplay ?? "");
  const [results, setResults] = useState<LocationResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocationFocused, setIsLocationFocused] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const engineRef = useRef(new LocationSearchEngine());

  useEffect(() => {
    if (userLocation) {
      engineRef.current.updateLocation(userLocation[0], userLocation[1]);
    }
  }, [userLocation]);

  useEffect(() => {
    if (
      locationDisplay !== undefined &&
      locationDisplay !== "" &&
      !isLocationFocused
    ) {
      setLocationQuery(locationDisplay);
    }
  }, [locationDisplay]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (locationQuery.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setShowDropdown(true);

    const ac = new AbortController();
    const timeout = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await engineRef.current.search(locationQuery, {
          signal: ac.signal,
        });
        if (!ac.signal.aborted) {
          setResults(res);
        }
      } catch {
        if (!ac.signal.aborted) setResults([]);
      } finally {
        if (!ac.signal.aborted) setIsLoading(false);
      }
    }, 150);

    return () => {
      clearTimeout(timeout);
      ac.abort();
    };
  }, [locationQuery]);

  const handleSelect = (r: LocationResult) => {
    setLocationQuery(r.name);
    setShowDropdown(false);
    onLocationSelect?.(r.lat, r.lng, r.address || r.name);
  };

  /* ── Group results by source ────────────────────────── */
  const grouped: { source: string; items: LocationResult[] }[] = [];
  const order: string[] = ["business", "osm", "nominatim"];
  for (const src of order) {
    const items = results.filter((r) => r.source === src);
    if (items.length > 0) grouped.push({ source: src, items });
  }

  return (
    <div className="flex gap-3 relative z-10">
      {/* Search input */}
      <div className="flex-1 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search businesses, categories..."
          className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl pl-12 pr-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
        />
      </div>

      {/* Location input with smart autocomplete */}
      <div className="flex-1 relative" ref={dropdownRef}>
        <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          ref={locationInputRef}
          type="text"
          value={locationQuery}
          onChange={(e) => setLocationQuery(e.target.value)}
          onFocus={() => {
            setIsLocationFocused(true);
            if (locationQuery.length >= 2 && results.length > 0)
              setShowDropdown(true);
          }}
          onBlur={() => setIsLocationFocused(false)}
          placeholder="Enter location..."
          className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl pl-12 pr-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
        />

        {/* Dropdown with grouped results */}
        {(showDropdown || isLoading) && locationQuery.length >= 2 && (
          <div
            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border-2 border-green-500 rounded-xl shadow-2xl max-h-96 overflow-y-auto z-9999"
            style={{ minWidth: "300px" }}
          >
            {isLoading && results.length === 0 ? (
              <div className="px-4 py-4 text-green-600 dark:text-green-400 text-sm font-medium animate-pulse">
                Searching for &ldquo;{locationQuery}&rdquo;...
              </div>
            ) : grouped.length > 0 ? (
              grouped.map(({ source, items }) => {
                const meta = SOURCE_META[source] ?? SOURCE_META.nominatim;
                return (
                  <div key={source}>
                    {/* Section header */}
                    <div
                      className={`px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider ${meta.color} bg-gray-50 dark:bg-gray-900/60 sticky top-0`}
                    >
                      {meta.label}
                    </div>

                    {items.map((r) => (
                      <button
                        key={r.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelect(r)}
                        className="w-full px-4 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700/50 last:border-b-0 flex items-center gap-3 group"
                      >
                        {/* Icon */}
                        <div
                          className={`shrink-0 ${meta.color} group-hover:scale-110 transition-transform`}
                        >
                          {r.icon ? (
                            <span className="text-base">{r.icon}</span>
                          ) : (
                            meta.icon
                          )}
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="text-gray-900 dark:text-white font-medium truncate text-sm">
                            {r.name}
                          </div>
                          {r.address && (
                            <div className="text-gray-500 dark:text-gray-400 text-xs truncate mt-0.5">
                              {r.address}
                            </div>
                          )}
                        </div>

                        {/* Distance */}
                        {r.distanceKm != null && r.distanceKm >= 0 && (
                          <span className="shrink-0 text-[11px] text-gray-400 dark:text-gray-500 tabular-nums">
                            {formatDistance(r.distanceKm)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-4">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-2">
                  <MapPin className="w-4 h-4" />
                  <span className="font-medium">No locations found</span>
                </div>
                <div className="text-gray-400 dark:text-gray-500 text-xs ml-6">
                  Try searching for:
                  <br />
                  &bull; Street address: &ldquo;123 Main St, City&rdquo;
                  <br />
                  &bull; Landmark: &ldquo;Central Park&rdquo;
                  <br />
                  &bull; Business: &ldquo;Starbucks&rdquo;
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Location button */}
      <button
        onClick={onLocateUser}
        className="px-4 bg-cherry-rose hover:bg-green-600 rounded-xl transition-colors flex items-center gap-2 text-white font-medium shrink-0"
        aria-label="Use my location"
      >
        <MapPin className="w-5 h-5" />
        <span className="hidden sm:inline">Near me</span>
      </button>
    </div>
  );
}
