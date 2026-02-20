import { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
} from "react-leaflet";
import { Icon, type LatLngExpression } from "leaflet";
import {
  X,
  Navigation,
  ExternalLink,
  Loader2,
  MapPin,
  Clock,
  Route,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Business } from "@/lib/businesses";
import "leaflet/dist/leaflet.css";

// ── Leaflet marker icons ──────────────────────────────────────────────────────
const businessIcon = new Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const userIcon = new Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// ── OSRM route helpers ────────────────────────────────────────────────────────
interface RouteInfo {
  polyline: [number, number][]; // [lat, lng] pairs for Leaflet
  distanceM: number;
  durationS: number;
}

async function fetchRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): Promise<RouteInfo> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${fromLng},${fromLat};${toLng},${toLat}` +
    `?overview=full&geometries=geojson`;

  const resp = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!resp.ok) throw new Error("OSRM request failed");
  const data = await resp.json();
  if (data.code !== "Ok" || !data.routes?.[0])
    throw new Error("No route found");

  const route = data.routes[0];
  // GeoJSON coords are [lng, lat] → convert to [lat, lng] for Leaflet
  const polyline = (route.geometry.coordinates as [number, number][]).map(
    ([lng, lat]) => [lat, lng] as [number, number],
  );

  return {
    polyline,
    distanceM: route.distance as number,
    durationS: route.duration as number,
  };
}

function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

function formatDuration(s: number): string {
  const mins = Math.round(s / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} h ${mins % 60} min`;
}

// ── Auto-fit bounds ───────────────────────────────────────────────────────────
function MapBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length >= 2) {
      map.fitBounds(positions, { padding: [60, 60] });
    } else if (positions.length === 1) {
      map.setView(positions[0], 15);
    }
  }, [map, positions]);
  return null;
}

// ── Main component ────────────────────────────────────────────────────────────
interface DirectionsModalProps {
  business: Business;
  onClose: () => void;
}

export function DirectionsModal({ business, onClose }: DirectionsModalProps) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null,
  );
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [loadingRoute, setLoadingRoute] = useState(false);

  const businessPos: [number, number] = [business.lat, business.lng];
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${business.lat},${business.lng}&travelmode=driving`;

  // Step 1 – get user geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported by your browser.");
      setLoadingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        setLoadingLocation(false);
      },
      () => {
        setLocationError(
          "Couldn't get your location. Showing destination only.",
        );
        setLoadingLocation(false);
      },
      { timeout: 10000, enableHighAccuracy: false },
    );
  }, []);

  // Step 2 – fetch OSRM route once location is known
  useEffect(() => {
    if (!userLocation) return;
    setLoadingRoute(true);
    setRouteError(null);

    fetchRoute(userLocation[0], userLocation[1], business.lat, business.lng)
      .then(setRouteInfo)
      .catch(() =>
        setRouteError("Couldn't calculate route. Use 'Open in Maps' below."),
      )
      .finally(() => setLoadingRoute(false));
  }, [userLocation, business.lat, business.lng]);

  // Map centre & bound positions
  const mapCenter: LatLngExpression = userLocation
    ? [
        (userLocation[0] + business.lat) / 2,
        (userLocation[1] + business.lng) / 2,
      ]
    : businessPos;

  const boundsPositions: [number, number][] = routeInfo
    ? routeInfo.polyline
    : userLocation
      ? [userLocation, businessPos]
      : [businessPos];

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "90vh" }}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="p-2 bg-cherry-rose/10 rounded-lg">
            <Navigation className="w-5 h-5 text-cherry-rose" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-gray-900 dark:text-white text-base leading-tight">
              Directions to {business.name}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
              {business.address}
            </p>
          </div>

          {/* Distance / duration badges */}
          {routeInfo && (
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
                <Route className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {formatDistance(routeInfo.distanceM)}
                </span>
              </div>
              <div className="flex items-center gap-1 bg-cherry-rose/10 px-2.5 py-1 rounded-full">
                <Clock className="w-3.5 h-3.5 text-cherry-rose" />
                <span className="text-xs font-medium text-cherry-rose">
                  {formatDuration(routeInfo.durationS)}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="ml-1 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
            aria-label="Close directions"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* ── Map area ── */}
        <div className="relative flex-1" style={{ minHeight: "420px" }}>
          {loadingLocation ? (
            // Location loading state
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-50 dark:bg-gray-800">
              <Loader2 className="w-8 h-8 animate-spin text-cherry-rose" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Getting your location…
              </p>
            </div>
          ) : (
            <MapContainer
              center={mapCenter}
              zoom={13}
              style={{ width: "100%", height: "100%", minHeight: "420px" }}
              zoomControl
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* User location marker (blue) */}
              {userLocation && (
                <Marker position={userLocation} icon={userIcon} />
              )}

              {/* Business destination marker (green) */}
              <Marker position={businessPos} icon={businessIcon} />

              {/* Driving route polyline */}
              {routeInfo && (
                <Polyline
                  positions={routeInfo.polyline}
                  color="#e8364d"
                  weight={5}
                  opacity={0.85}
                />
              )}

              {/* Auto-fit the map to show the full route */}
              <MapBounds positions={boundsPositions} />
            </MapContainer>
          )}

          {/* Route calculating overlay */}
          {loadingRoute && !loadingLocation && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 border border-gray-200 dark:border-gray-700">
              <Loader2 className="w-4 h-4 animate-spin text-cherry-rose" />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Calculating route…
              </span>
            </div>
          )}

          {/* Route error toast */}
          {routeError && !loadingRoute && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 px-4 py-2 rounded-full shadow-lg">
              <span className="text-sm text-yellow-700 dark:text-yellow-300">
                {routeError}
              </span>
            </div>
          )}

          {/* Location denied notice */}
          {locationError && !loadingLocation && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700 px-4 py-2 rounded-full shadow-lg whitespace-nowrap">
              <span className="text-xs text-blue-700 dark:text-blue-300">
                {locationError}
              </span>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4">
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            {userLocation && (
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                You
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
              {business.name}
            </span>
            {routeInfo && (
              <span className="flex items-center gap-1.5">
                <span className="w-6 h-1 rounded-full bg-cherry-rose shrink-0" />
                Route
              </span>
            )}
          </div>

          {/* Open in Google Maps button */}
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0"
          >
            <Button
              variant="outline"
              size="sm"
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open in Maps
            </Button>
          </a>
        </div>

        {/* Map attribution notice */}
        <div className="flex items-center justify-center gap-1.5 pb-2 text-[10px] text-gray-400 dark:text-gray-600">
          <MapPin className="w-3 h-3" />
          Map data © OpenStreetMap · Routing by OSRM
        </div>
      </div>
    </div>
  );
}
