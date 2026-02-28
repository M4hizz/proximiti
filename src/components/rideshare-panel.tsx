import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/App";
import rideshareApi, {
  type Rideshare,
  type RidesharePassenger,
  type RideshareStatus,
} from "@/lib/rideshareApi";
import { Button } from "@/components/ui/button";
import {
  Car,
  MapPin,
  Users,
  Plus,
  X,
  ArrowLeft,
  Navigation,
  Clock,
  CheckCircle,
  XCircle,
  Lock,
  UserPlus,
  LogOut,
  Play,
  Flag,
  Loader2,
  Route,
  ChevronRight,
  LocateFixed,
  Copy,
  Search,
  Share2,
} from "lucide-react";
import {
  LocationSearchEngine,
  formatDistance,
  type LocationResult,
} from "@/lib/locationSearch";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
} from "react-leaflet";
import { Icon } from "leaflet";
import "leaflet/dist/leaflet.css";


const originIcon = new Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const destIcon = new Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface SelectedLocation {
  lat: number;
  lng: number;
  name: string;
}


function LocationSearchInput({
  label,
  dotColor,
  value,
  onSelect,
  onUseCurrentLocation,
  placeholder,
  userLocation,
}: {
  label: string;
  dotColor: string;
  value: string;
  onSelect: (lat: number, lng: number, name: string) => void;
  onUseCurrentLocation?: () => void;
  placeholder: string;
  userLocation?: [number, number] | null;
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<LocationResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<LocationSearchEngine | null>(null);

  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = new LocationSearchEngine(
        userLocation?.[0],
        userLocation?.[1],
      );
    } else if (userLocation) {
      engineRef.current.updateLocation(userLocation[0], userLocation[1]);
    }
  }, [userLocation]);

  // Sync display value when parent changes it
  useEffect(() => {
    if (!isFocused) setQuery(value);
  }, [value, isFocused]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      )
        setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setShowDropdown(true);
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const engine = engineRef.current ?? new LocationSearchEngine();
        const hits = await engine.search(query, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setResults(hits);
        }
      } catch {
        // aborted or failed
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 120);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const handleResultSelect = (r: LocationResult) => {
    setQuery(r.name);
    setShowDropdown(false);
    onSelect(r.lat, r.lng, r.name);
  };

  // Group results by source for clean display
  const appResults = results.filter((r) => r.source === "app");
  const osmResults = results.filter((r) => r.source === "osm");
  const nominatimResults = results.filter((r) => r.source === "nominatim");
  const hasResults = results.length > 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full shrink-0 ${dotColor}`} />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          {label}
        </span>
      </div>

      <div className="relative" ref={dropdownRef}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!e.target.value) onSelect(0, 0, "");
              }}
              onFocus={() => {
                setIsFocused(true);
                if (query.length >= 2 && results.length > 0)
                  setShowDropdown(true);
              }}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              className="w-full pl-9 pr-3 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            />
          </div>
          {onUseCurrentLocation && (
            <button
              type="button"
              onClick={onUseCurrentLocation}
              className="shrink-0 px-3 py-2.5 bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-800/60 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Use my current location"
            >
              <LocateFixed className="w-3.5 h-3.5" />
              <span>My Location</span>
            </button>
          )}
        </div>

        {/* Results dropdown */}
        {showDropdown && query.length >= 2 && (hasResults || isLoading) && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border-2 border-green-500 rounded-xl shadow-2xl max-h-80 overflow-y-auto z-9999">
            {/* ── App businesses ── */}
            {appResults.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-widest bg-green-50 dark:bg-green-900/20 sticky top-0 border-b border-gray-100 dark:border-gray-700">
                  Proximiti Businesses
                </div>
                {appResults.map((r) => (
                  <ResultRow
                    key={r.id}
                    result={r}
                    onSelect={handleResultSelect}
                  />
                ))}
              </>
            )}

            {/* ── OSM nearby POIs ── */}
            {osmResults.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 sticky top-0 border-b border-gray-100 dark:border-gray-700">
                  Nearby Places
                </div>
                {osmResults.map((r) => (
                  <ResultRow
                    key={r.id}
                    result={r}
                    onSelect={handleResultSelect}
                  />
                ))}
              </>
            )}

            {/* ── Nominatim / address results ── */}
            {nominatimResults.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest bg-gray-50 dark:bg-gray-900/40 sticky top-0 border-b border-gray-100 dark:border-gray-700">
                  Addresses &amp; Landmarks
                </div>
                {nominatimResults.map((r) => (
                  <ResultRow
                    key={r.id}
                    result={r}
                    onSelect={handleResultSelect}
                  />
                ))}
              </>
            )}

            {/* Loading */}
            {isLoading && results.length === 0 && (
              <div className="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Searching nearby places&hellip;
              </div>
            )}

            {/* Searching more in background */}
            {isLoading && results.length > 0 && (
              <div className="px-4 py-2 text-xs text-gray-400 flex items-center gap-1.5 border-t border-gray-100 dark:border-gray-700">
                <Loader2 className="w-3 h-3 animate-spin" />
                Finding more results&hellip;
              </div>
            )}

            {/* No results */}
            {!isLoading && !hasResults && query.length >= 3 && (
              <div className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">
                No results found. Try a different name or address.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** A single result row in the dropdown */
function ResultRow({
  result: r,
  onSelect,
}: {
  result: LocationResult;
  onSelect: (r: LocationResult) => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onSelect(r);
      }}
      className="w-full px-4 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 flex items-center gap-3 group"
    >
      <span className="text-base shrink-0 leading-none">{r.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {r.name}
        </div>
        {r.address && (
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {r.address}
          </div>
        )}
      </div>
      {r.distanceKm != null && (
        <span className="shrink-0 text-[11px] font-medium text-gray-400 dark:text-gray-500 tabular-nums">
          {formatDistance(r.distanceKm)}
        </span>
      )}
    </button>
  );
}


interface RoutePolyline {
  points: [number, number][];
  distanceKm: number;
  durationMin: number;
}

function MapFitter({
  origin,
  dest,
  routePoints,
}: {
  origin: SelectedLocation | null;
  dest: SelectedLocation | null;
  routePoints: [number, number][] | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (routePoints && routePoints.length >= 2) {
      map.fitBounds(routePoints, { padding: [30, 30], maxZoom: 15 });
    } else if (origin && dest) {
      map.fitBounds(
        [
          [origin.lat, origin.lng],
          [dest.lat, dest.lng],
        ],
        { padding: [40, 40], maxZoom: 14 },
      );
    } else if (origin) {
      map.flyTo([origin.lat, origin.lng], 14, { duration: 0.4 });
    } else if (dest) {
      map.flyTo([dest.lat, dest.lng], 14, { duration: 0.4 });
    }
  }, [map, origin, dest, routePoints]);
  return null;
}

function RoutePreviewMap({
  origin,
  dest,
}: {
  origin: SelectedLocation | null;
  dest: SelectedLocation | null;
}) {
  const [route, setRoute] = useState<RoutePolyline | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  const defaultCenter: [number, number] = [43.7182, -79.3762];
  const center: [number, number] = origin
    ? [origin.lat, origin.lng]
    : dest
      ? [dest.lat, dest.lng]
      : defaultCenter;

  useEffect(() => {
    if (!origin || !dest || origin.lat === 0 || dest.lat === 0) {
      setRoute(null);
      return;
    }

    let cancelled = false;
    setLoadingRoute(true);

    (async () => {
      try {
        const url =
          `https://router.project-osrm.org/route/v1/driving/` +
          `${origin.lng},${origin.lat};${dest.lng},${dest.lat}` +
          `?overview=full&geometries=geojson`;
        const resp = await fetch(url, { signal: AbortSignal.timeout(12000) });
        if (!resp.ok || cancelled) return;
        const data = await resp.json();
        if (data.code !== "Ok" || !data.routes?.[0] || cancelled) return;
        const r = data.routes[0];
        const points = (r.geometry.coordinates as [number, number][]).map(
          ([lng, lat]) => [lat, lng] as [number, number],
        );
        if (!cancelled)
          setRoute({
            points,
            distanceKm: r.distance / 1000,
            durationMin: Math.round(r.duration / 60),
          });
      } catch {
        // Silently fail
      } finally {
        if (!cancelled) setLoadingRoute(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [origin?.lat, origin?.lng, dest?.lat, dest?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!origin && !dest) return null;

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 relative isolate">
      <MapContainer
        center={center}
        zoom={13}
        className="w-full"
        style={{ height: 180 }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapFitter
          origin={origin}
          dest={dest}
          routePoints={route?.points ?? null}
        />
        {origin && origin.lat !== 0 && (
          <Marker position={[origin.lat, origin.lng]} icon={originIcon} />
        )}
        {dest && dest.lat !== 0 && (
          <Marker position={[dest.lat, dest.lng]} icon={destIcon} />
        )}
        {route && (
          <Polyline
            positions={route.points}
            color="#3b82f6"
            weight={5}
            opacity={0.85}
          />
        )}
      </MapContainer>

      {/* Stats overlay */}
      {(loadingRoute || route) && (
        <div className="absolute bottom-2 left-2 right-2 z-800 flex justify-center pointer-events-none">
          <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow flex items-center gap-3 text-xs font-medium">
            {loadingRoute ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                <span className="text-gray-500 dark:text-gray-400">
                  Calculating route&hellip;
                </span>
              </>
            ) : route ? (
              <>
                <span className="flex items-center gap-1 text-gray-700 dark:text-gray-200">
                  <Route className="w-3 h-3" />
                  {route.distanceKm < 1
                    ? `${Math.round(route.distanceKm * 1000)} m`
                    : `${route.distanceKm.toFixed(1)} km`}
                </span>
                <span className="text-gray-400">&middot;</span>
                <span className="flex items-center gap-1 text-gray-700 dark:text-gray-200">
                  <Clock className="w-3 h-3" />
                  {route.durationMin < 60
                    ? `~${route.durationMin} min`
                    : `~${Math.floor(route.durationMin / 60)}h ${route.durationMin % 60}m`}
                </span>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}


const STATUS_CONFIG: Record<
  RideshareStatus,
  { label: string; color: string; bg: string; icon: typeof Clock }
> = {
  waiting: {
    label: "Waiting for Driver",
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    icon: Clock,
  },
  accepted: {
    label: "Driver Assigned",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    icon: Car,
  },
  in_transit: {
    label: "In Transit",
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-900/30",
    icon: Navigation,
  },
  completed: {
    label: "Completed",
    color: "text-gray-500 dark:text-gray-400",
    bg: "bg-gray-100 dark:bg-gray-800",
    icon: CheckCircle,
  },
  cancelled: {
    label: "Cancelled",
    color: "text-red-500 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-900/30",
    icon: XCircle,
  },
};

function StatusBadge({ status }: { status: RideshareStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color} ${cfg.bg}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
}


type View = "list" | "create" | "detail";

interface RidesharePanelProps {
  isOpen: boolean;
  onClose: () => void;
  userLocation: [number, number] | null;
}


export function RidesharePanel({
  isOpen,
  onClose,
  userLocation,
}: RidesharePanelProps) {
  const { user } = useAuth();
  const [view, setView] = useState<View>("list");
  const [rideshares, setRideshares] = useState<Rideshare[]>([]);
  const [selectedRide, setSelectedRide] = useState<Rideshare | null>(null);
  const [passengers, setPassengers] = useState<RidesharePassenger[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);


  const fetchRideshares = useCallback(async () => {
    try {
      const { rideshares: data } = await rideshareApi.getActiveRideshares();
      setRideshares(Array.isArray(data) ? data : []);
    } catch {
      // Silently fail on poll – don't overwrite existing data
    }
  }, []);

  const fetchRideDetail = useCallback(async (id: string) => {
    try {
      const { rideshare, passengers: pax } =
        await rideshareApi.getRideshare(id);
      setSelectedRide(rideshare);
      setPassengers(Array.isArray(pax) ? pax : []);
    } catch {
      setError("Failed to load ride details");
    }
  }, []);


  useEffect(() => {
    if (!isOpen || !user) return;

    fetchRideshares();

    // Poll every 3 seconds
    pollRef.current = setInterval(() => {
      fetchRideshares();
      if (selectedRide) {
        fetchRideDetail(selectedRide.id);
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isOpen, user, fetchRideshares, fetchRideDetail, selectedRide]);


  const handleAction = async (action: () => Promise<any>) => {
    setActionLoading(true);
    setError("");
    try {
      await action();
      if (selectedRide) await fetchRideDetail(selectedRide.id);
      await fetchRideshares();
    } catch (e: any) {
      setError(e.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const openDetail = async (ride: Rideshare) => {
    setSelectedRide(ride);
    setView("detail");
    setError("");
    setLoading(true);
    try {
      const { rideshare, passengers: pax } = await rideshareApi.getRideshare(
        ride.id,
      );
      setSelectedRide(rideshare);
      setPassengers(Array.isArray(pax) ? pax : []);
    } catch {
      setError("Failed to load details");
    } finally {
      setLoading(false);
    }
  };

  const joinByCode = async (code: string) => {
    setError("");
    setLoading(true);
    try {
      const { rideshare, passengers: pax } =
        await rideshareApi.getRideshareByCode(code);
      setSelectedRide(rideshare);
      setPassengers(Array.isArray(pax) ? pax : []);
      setView("detail");
    } catch {
      setError("No ride found with that code");
    } finally {
      setLoading(false);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full sm:max-w-lg h-full sm:h-auto sm:max-h-[90vh] bg-white dark:bg-gray-900 sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {view !== "list" && (
              <button
                onClick={() => {
                  setView("list");
                  setSelectedRide(null);
                  setError("");
                }}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            )}
            <Car className="w-6 h-6 text-green-500" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {view === "list" && "Rideshare Lobby"}
              {view === "create" && "Create Ride"}
              {view === "detail" && "Ride Details"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-5 mt-3 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded-lg flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0" />
            {error}
            <button onClick={() => setError("")} className="ml-auto">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4">
          {view === "list" && (
            <RideList
              rideshares={rideshares}
              userId={user?.id}
              onOpenDetail={openDetail}
              onCreateNew={() => {
                setView("create");
                setError("");
              }}
              onJoinByCode={joinByCode}
            />
          )}

          {view === "create" && (
            <CreateRideForm
              userLocation={userLocation}
              onCreated={async (ride) => {
                await fetchRideshares();
                setSelectedRide(ride);
                setView("detail");
                await fetchRideDetail(ride.id);
              }}
              onError={(msg) => setError(msg)}
            />
          )}

          {view === "detail" && selectedRide && (
            <RideDetail
              ride={selectedRide}
              passengers={passengers}
              userId={user?.id ?? ""}
              loading={loading}
              actionLoading={actionLoading}
              onJoin={() =>
                handleAction(() => rideshareApi.joinRideshare(selectedRide.id))
              }
              onLeave={() =>
                handleAction(async () => {
                  await rideshareApi.leaveRideshare(selectedRide.id);
                })
              }
              onAcceptTransport={() =>
                handleAction(() =>
                  rideshareApi.acceptTransport(selectedRide.id),
                )
              }
              onStartTransport={() =>
                handleAction(() => rideshareApi.startTransport(selectedRide.id))
              }
              onComplete={() =>
                handleAction(async () => {
                  await rideshareApi.completeRideshare(selectedRide.id);
                  setView("list");
                  setSelectedRide(null);
                })
              }
              onCancel={() =>
                handleAction(async () => {
                  await rideshareApi.cancelRideshare(selectedRide.id);
                  setView("list");
                  setSelectedRide(null);
                })
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}


function RideList({
  rideshares,
  userId,
  onOpenDetail,
  onCreateNew,
  onJoinByCode,
}: {
  rideshares: Rideshare[];
  userId?: string;
  onOpenDetail: (r: Rideshare) => void;
  onCreateNew: () => void;
  onJoinByCode: (code: string) => void;
}) {
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);

  const handleJoinByCode = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      setJoinError("Code must be 6 characters");
      return;
    }
    setJoinLoading(true);
    setJoinError("");
    try {
      onJoinByCode(code);
    } catch {
      setJoinError("Could not find that ride");
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={onCreateNew}
        className="w-full bg-green-600 hover:bg-green-700 text-white"
      >
        <Plus className="w-4 h-4 mr-2" />
        Create a Ride
      </Button>

      {/* Join by share code */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 mb-2">
          <Share2 className="w-4 h-4" />
          Join by Code
        </h4>
        <div className="flex gap-2">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => {
              setJoinCode(e.target.value.toUpperCase().slice(0, 6));
              setJoinError("");
            }}
            placeholder="Enter 6-digit code"
            maxLength={6}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono tracking-widest uppercase placeholder:tracking-normal placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <Button
            onClick={handleJoinByCode}
            disabled={joinCode.length !== 6 || joinLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4"
          >
            {joinLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </Button>
        </div>
        {joinError && <p className="text-xs text-red-500 mt-1">{joinError}</p>}
      </div>

      {!Array.isArray(rideshares) || rideshares.length === 0 ? (
        <div className="text-center py-10 text-gray-400 dark:text-gray-500">
          <Car className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No active rides</p>
          <p className="text-sm mt-1">Create one to get started!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rideshares.map((ride) => {
            const isInvolved =
              ride.creatorId === userId || ride.driverId === userId;
            return (
              <button
                key={ride.id}
                onClick={() => onOpenDetail(ride)}
                className={`w-full text-left p-4 rounded-xl border transition-all hover:shadow-md ${
                  isInvolved
                    ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20"
                    : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {ride.creatorName}'s Ride
                      </span>
                      {isInvolved && (
                        <span className="text-xs bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 px-1.5 py-0.5 rounded">
                          You
                        </span>
                      )}
                    </div>
                    <StatusBadge status={ride.status} />
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 mt-1 shrink-0" />
                </div>

                {/* Route */}
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                    <span className="truncate">{ride.originName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                    <span className="truncate">{ride.destinationName}</span>
                  </div>
                </div>

                {/* Passengers */}
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {ride.currentPassengers}/{ride.maxPassengers} passengers
                  </span>
                  {ride.driverName && (
                    <span className="flex items-center gap-1">
                      <Car className="w-3.5 h-3.5" />
                      {ride.driverName}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}


function CreateRideForm({
  userLocation,
  onCreated,
  onError,
}: {
  userLocation: [number, number] | null;
  onCreated: (ride: Rideshare) => void;
  onError: (msg: string) => void;
}) {
  const [origin, setOrigin] = useState<SelectedLocation | null>(
    userLocation
      ? {
          lat: userLocation[0],
          lng: userLocation[1],
          name: "My Current Location",
        }
      : null,
  );
  const [originDisplay, setOriginDisplay] = useState(
    userLocation ? "My Current Location" : "",
  );
  const [dest, setDest] = useState<SelectedLocation | null>(null);
  const [destDisplay, setDestDisplay] = useState("");
  const [maxPax, setMaxPax] = useState(4);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleOriginSelect = (lat: number, lng: number, name: string) => {
    if (lat === 0 && lng === 0) {
      setOrigin(null);
      setOriginDisplay("");
    } else {
      setOrigin({ lat, lng, name });
      setOriginDisplay(name);
    }
  };

  const handleDestSelect = (lat: number, lng: number, name: string) => {
    if (lat === 0 && lng === 0) {
      setDest(null);
      setDestDisplay("");
    } else {
      setDest({ lat, lng, name });
      setDestDisplay(name);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!userLocation) return;
    const name = "My Current Location";
    setOrigin({ lat: userLocation[0], lng: userLocation[1], name });
    setOriginDisplay(name);
  };

  const handleUseDestCurrentLocation = () => {
    if (!userLocation) return;
    const name = "My Current Location";
    setDest({ lat: userLocation[0], lng: userLocation[1], name });
    setDestDisplay(name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (!origin) throw new Error("Pick-up location is required");
      if (!dest) throw new Error("Destination is required");

      const { rideshare } = await rideshareApi.createRideshare({
        originName: origin.name,
        originLat: origin.lat,
        originLng: origin.lng,
        destinationName: dest.name,
        destinationLat: dest.lat,
        destinationLng: dest.lng,
        maxPassengers: maxPax,
        note: note.trim() || undefined,
      });

      onCreated(rideshare);
    } catch (e: any) {
      onError(e.message || "Failed to create ride");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Pick-up Location */}
      <LocationSearchInput
        label="Pick-up Location"
        dotColor="bg-blue-500"
        value={originDisplay}
        onSelect={handleOriginSelect}
        onUseCurrentLocation={
          userLocation ? handleUseCurrentLocation : undefined
        }
        placeholder="Search for a pick-up point…"
        userLocation={userLocation}
      />

      {/* Destination */}
      <LocationSearchInput
        label="Destination"
        dotColor="bg-red-500"
        value={destDisplay}
        onSelect={handleDestSelect}
        onUseCurrentLocation={
          userLocation ? handleUseDestCurrentLocation : undefined
        }
        placeholder="Search for your destination…"
        userLocation={userLocation}
      />

      {/* Live route preview */}
      <RoutePreviewMap origin={origin} dest={dest} />

      {/* Max passengers */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Max Passengers (including you)
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setMaxPax(n)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                maxPax === n
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Note */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          Note (optional)
        </label>
        <textarea
          placeholder="Any details for passengers or drivers..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          rows={2}
          className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
        />
      </div>

      <Button
        type="submit"
        disabled={submitting || !origin || !dest}
        className="w-full bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Plus className="w-4 h-4 mr-2" />
        )}
        {submitting ? "Creating..." : "Create Ride"}
      </Button>
    </form>
  );
}


function RideDetail({
  ride,
  passengers,
  userId,
  loading,
  actionLoading,
  onJoin,
  onLeave,
  onAcceptTransport,
  onStartTransport,
  onComplete,
  onCancel,
}: {
  ride: Rideshare;
  passengers: RidesharePassenger[];
  userId: string;
  loading: boolean;
  actionLoading: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onAcceptTransport: () => void;
  onStartTransport: () => void;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const isCreator = ride.creatorId === userId;
  const isDriver = ride.driverId === userId;
  const isPassenger = passengers.some((p) => p.userId === userId);
  const lobbyOpen = ride.status === "waiting" || ride.status === "accepted";
  const canJoin =
    lobbyOpen &&
    !isPassenger &&
    !isDriver &&
    ride.currentPassengers < ride.maxPassengers;
  const canLeave = isPassenger && !isCreator && lobbyOpen;
  const canAcceptTransport =
    ride.status === "waiting" && !isCreator && !isDriver;
  const canStartTransport = isDriver && ride.status === "accepted";
  const canComplete = (isDriver || isCreator) && ride.status === "in_transit";
  const canCancel =
    (isCreator || isDriver) &&
    ride.status !== "completed" &&
    ride.status !== "cancelled";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Status + Creator */}
      <div className="flex items-center justify-between">
        <StatusBadge status={ride.status} />
        <span className="text-xs text-gray-500 dark:text-gray-400">
          by {ride.creatorName}
          {isCreator && " (You)"}
        </span>
      </div>

      {/* Share code */}
      {ride.shareCode && (
        <div className="bg-linear-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-green-600 dark:text-green-400 font-semibold uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5" />
                Share Code
              </p>
              <p className="text-2xl font-bold tracking-[0.3em] text-green-700 dark:text-green-300 font-mono">
                {ride.shareCode}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40"
              onClick={() => {
                navigator.clipboard.writeText(ride.shareCode);
              }}
            >
              <Copy className="w-4 h-4 mr-1.5" />
              Copy
            </Button>
          </div>
          <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-2">
            Share this code with others so they can join your ride
          </p>
        </div>
      )}

      {/* Route card */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex flex-col items-center gap-1 pt-1">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <div className="w-0.5 h-8 bg-gray-300 dark:bg-gray-600" />
            <div className="w-3 h-3 rounded-full bg-red-500" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Pick-up
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {ride.originName}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Destination
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {ride.destinationName}
              </p>
            </div>
          </div>
        </div>

        {/* Live route map */}
        <RoutePreviewMap
          origin={{
            lat: ride.originLat,
            lng: ride.originLng,
            name: ride.originName,
          }}
          dest={{
            lat: ride.destinationLat,
            lng: ride.destinationLng,
            name: ride.destinationName,
          }}
        />

        {/* Open in Maps link */}
        <a
          href={`https://www.google.com/maps/dir/${ride.originLat},${ride.originLng}/${ride.destinationLat},${ride.destinationLng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          <MapPin className="w-4 h-4" />
          View route in Google Maps
        </a>
      </div>

      {/* Note */}
      {ride.note && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-4 py-3">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            {ride.note}
          </p>
        </div>
      )}

      {/* Driver info */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 mb-2">
          <Car className="w-4 h-4" />
          Driver
        </h3>
        {ride.driverName ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 text-sm font-bold">
              {ride.driverName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm text-gray-900 dark:text-white font-medium">
              {ride.driverName}
              {isDriver && " (You)"}
            </span>
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">
            No driver yet — waiting for someone to accept transport
          </p>
        )}
      </div>

      {/* Passengers */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 mb-3">
          <Users className="w-4 h-4" />
          Passengers ({ride.currentPassengers}/{ride.maxPassengers})
        </h3>

        {ride.status === "in_transit" && (
          <div className="mb-3 flex items-center gap-2 text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-3 py-1.5 rounded-lg">
            <Lock className="w-3.5 h-3.5" />
            Lobby locked — ride is in transit
          </div>
        )}

        <div className="space-y-2">
          {(Array.isArray(passengers) ? passengers : []).map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 rounded-lg"
            >
              <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-700 dark:text-green-300 text-xs font-bold">
                {p.userName.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-gray-900 dark:text-white">
                {p.userName}
                {p.userId === userId && " (You)"}
              </span>
              {p.userId === ride.creatorId && (
                <span className="ml-auto text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded">
                  Creator
                </span>
              )}
            </div>
          ))}

          {ride.currentPassengers < ride.maxPassengers && lobbyOpen && (
            <div className="flex items-center justify-center py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-400">
              {ride.maxPassengers - ride.currentPassengers} spot
              {ride.maxPassengers - ride.currentPassengers !== 1
                ? "s"
                : ""}{" "}
              available
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-2 pt-2">
        {canJoin && (
          <Button
            onClick={onJoin}
            disabled={actionLoading}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            {actionLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4 mr-2" />
            )}
            Join Ride
          </Button>
        )}

        {canLeave && (
          <Button
            onClick={onLeave}
            disabled={actionLoading}
            variant="outline"
            className="w-full"
          >
            {actionLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4 mr-2" />
            )}
            Leave Ride
          </Button>
        )}

        {canAcceptTransport && (
          <Button
            onClick={onAcceptTransport}
            disabled={actionLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {actionLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Car className="w-4 h-4 mr-2" />
            )}
            Accept Transport
          </Button>
        )}

        {canStartTransport && (
          <Button
            onClick={onStartTransport}
            disabled={actionLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {actionLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Passengers in Transport
          </Button>
        )}

        {canComplete && (
          <Button
            onClick={onComplete}
            disabled={actionLoading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            {actionLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Flag className="w-4 h-4 mr-2" />
            )}
            Complete Ride
          </Button>
        )}

        {canCancel && (
          <Button
            onClick={onCancel}
            disabled={actionLoading}
            variant="destructive"
            className="w-full"
          >
            {actionLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <XCircle className="w-4 h-4 mr-2" />
            )}
            Cancel Ride
          </Button>
        )}
      </div>
    </div>
  );
}

export default RidesharePanel;
