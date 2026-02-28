import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Tooltip,
  Polyline,
  useMap,
} from "react-leaflet";
import { Icon, type LatLngExpression } from "leaflet";
import { useEffect, useState } from "react";
import type { Business } from "@/lib/businesses";
import { Loader2, X } from "lucide-react";
import "leaflet/dist/leaflet.css";

const selectedIcon = new Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [35, 57],
  iconAnchor: [17, 57],
  popupAnchor: [1, -45],
  shadowSize: [57, 57],
});

const blueIcon = new Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface RouteInfo {
  polyline: [number, number][];
  distanceM: number;
  durationS: number;
}

async function fetchOSRMRoute(
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
  if (!resp.ok) throw new Error("OSRM failed");
  const data = await resp.json();
  if (data.code !== "Ok" || !data.routes?.[0]) throw new Error("No route");
  const route = data.routes[0];
  const polyline = (route.geometry.coordinates as [number, number][]).map(
    ([lng, lat]) => [lat, lng] as [number, number],
  );
  return { polyline, distanceM: route.distance, durationS: route.duration };
}

function formatDistance(m: number) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}
function formatDuration(s: number) {
  const mins = Math.round(s / 60);
  return mins < 60
    ? `${mins} min`
    : `${Math.floor(mins / 60)} h ${mins % 60} min`;
}

function MapController({
  center,
  selectedBusiness,
  userLocation,
  routePolyline,
}: {
  center: LatLngExpression;
  selectedBusiness: Business | null;
  userLocation: [number, number] | null;
  routePolyline: [number, number][] | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (routePolyline && routePolyline.length >= 2) {
      map.fitBounds(routePolyline as [number, number][], {
        padding: [56, 56],
        maxZoom: 16,
      });
      return;
    }
    if (selectedBusiness && userLocation) {
      map.fitBounds(
        [userLocation, [selectedBusiness.lat, selectedBusiness.lng]],
        { padding: [50, 50], maxZoom: 15 },
      );
    } else if (selectedBusiness) {
      map.flyTo([selectedBusiness.lat, selectedBusiness.lng], 15, {
        duration: 0.5,
      });
    } else {
      map.flyTo(center, map.getZoom(), { duration: 0.5 });
    }
  }, [center, map, selectedBusiness, userLocation, routePolyline]);

  return null;
}

interface MapViewProps {
  businesses: Business[];
  selectedBusiness: Business | null;
  onSelectBusiness: (business: Business) => void;
  userLocation: [number, number] | null;
  /** When set, fetches + draws the driving route to this business on the map */
  directionsTarget?: Business | null;
  /** Called when the user dismisses the route */
  onClearDirections?: () => void;
}

export function MapView({
  businesses,
  selectedBusiness,
  onSelectBusiness,
  userLocation,
  directionsTarget,
  onClearDirections,
}: MapViewProps) {
  const defaultCenter: [number, number] = [43.7182, -79.3762];
  const center = userLocation || defaultCenter;

  const [routeUserPos, setRouteUserPos] = useState<[number, number] | null>(
    null,
  );
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  useEffect(() => {
    if (!directionsTarget) {
      setRouteInfo(null);
      setRouteUserPos(null);
      setRouteError(null);
      return;
    }
    setRouteLoading(true);
    setRouteError(null);
    setRouteInfo(null);

    if (!navigator.geolocation) {
      setRouteError("Geolocation not supported.");
      setRouteLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const from: [number, number] = [
          pos.coords.latitude,
          pos.coords.longitude,
        ];
        setRouteUserPos(from);
        try {
          const info = await fetchOSRMRoute(
            from[0],
            from[1],
            directionsTarget.lat,
            directionsTarget.lng,
          );
          setRouteInfo(info);
        } catch {
          setRouteError("Couldn't calculate route.");
        } finally {
          setRouteLoading(false);
        }
      },
      () => {
        setRouteError("Location denied — showing destination only.");
        setRouteLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: false },
    );
  }, [directionsTarget]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-400">
      <MapContainer center={center} zoom={14} className="w-full h-full">
        {/* Standard OSM tiles – light, readable */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController
          center={center}
          selectedBusiness={selectedBusiness}
          userLocation={userLocation}
          routePolyline={routeInfo?.polyline ?? null}
        />

        {/* User GPS location marker (only when not in directions mode) */}
        {userLocation && !directionsTarget && (
          <Marker position={userLocation} icon={blueIcon}>
            <Popup>
              <div className="text-gray-900 font-medium">Your Location</div>
            </Popup>
          </Marker>
        )}

        {/* Selected business marker */}
        {selectedBusiness && (
          <Marker
            key={selectedBusiness.id}
            position={[selectedBusiness.lat, selectedBusiness.lng]}
            icon={selectedIcon}
            eventHandlers={{ click: () => onSelectBusiness(selectedBusiness) }}
          >
            <Tooltip direction="top" offset={[0, -20]} opacity={0.9}>
              {selectedBusiness.name}
            </Tooltip>
            <Popup>
              <div className="text-gray-900 font-medium">
                {selectedBusiness.name}
              </div>
              <div className="text-gray-600 text-sm">
                {selectedBusiness.category}
              </div>
            </Popup>
          </Marker>
        )}

        {/* ── Route overlay ── */}
        {directionsTarget && (
          <>
            {routeUserPos && (
              <Marker position={routeUserPos} icon={blueIcon}>
                <Popup>
                  <div className="text-gray-900 font-medium">You are here</div>
                </Popup>
              </Marker>
            )}
            {routeInfo && (
              <Polyline
                positions={routeInfo.polyline}
                color="#e8364d"
                weight={5}
                opacity={0.85}
              />
            )}
          </>
        )}
      </MapContainer>

      {/* ── Directions info bar ── */}
      {directionsTarget && (
        <div className="absolute top-3 left-3 right-3 z-800 flex items-center gap-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-lg px-4 py-2.5 border border-gray-200 dark:border-gray-700">
          {routeLoading ? (
            <div className="flex items-center gap-2 flex-1">
              <Loader2 className="w-4 h-4 animate-spin text-cherry-rose shrink-0" />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Calculating route to{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {directionsTarget.name}
                </span>
                …
              </span>
            </div>
          ) : routeError ? (
            <span className="text-sm text-amber-600 flex-1">{routeError}</span>
          ) : routeInfo ? (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full bg-cherry-rose shrink-0" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {directionsTarget.name}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                {formatDistance(routeInfo.distanceM)}
              </span>
              <span className="text-xs bg-cherry-rose/10 text-cherry-rose font-semibold px-2 py-0.5 rounded-full shrink-0">
                {formatDuration(routeInfo.durationS)}
              </span>
            </div>
          ) : (
            <span className="text-sm text-gray-500 flex-1">
              Directions to{" "}
              <span className="font-semibold">{directionsTarget.name}</span>
            </span>
          )}
          <button
            onClick={onClearDirections}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
            title="Clear route"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      )}

      {/* ── Default legend ── */}
      {!directionsTarget && (
        <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-3 py-2 rounded-lg text-xs text-gray-700 dark:text-white border border-gray-200 dark:border-gray-600 z-800">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-cherry-rose rounded-full" />
            <span>
              {selectedBusiness
                ? `Viewing: ${selectedBusiness.name}`
                : `${businesses.length} businesses nearby`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
