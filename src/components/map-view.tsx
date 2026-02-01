import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Icon, type LatLngExpression } from "leaflet";
import { useEffect } from "react";
import type { Business } from "@/lib/businesses";
import "leaflet/dist/leaflet.css";

// Custom green marker icon
const greenIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Selected marker icon (larger/highlighted)
const selectedIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [35, 57],
  iconAnchor: [17, 57],
  popupAnchor: [1, -45],
  shadowSize: [57, 57],
});

interface MapViewProps {
  businesses: Business[];
  selectedBusiness: Business | null;
  onSelectBusiness: (business: Business) => void;
  userLocation: [number, number] | null;
}

// Component to handle map center changes
function MapController({ center }: { center: LatLngExpression }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, map.getZoom(), { duration: 0.5 });
  }, [center, map]);
  return null;
}

/**
 * Interactive map component using Leaflet and OpenStreetMap.
 * Displays business pins and handles selection.
 */
export function MapView({
  businesses,
  selectedBusiness,
  onSelectBusiness,
  userLocation,
}: MapViewProps) {
  // Default center (New York City)
  const defaultCenter: [number, number] = [40.7128, -74.006];
  const center = userLocation || defaultCenter;

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-gray-700">
      <MapContainer
        center={center}
        zoom={14}
        className="w-full h-full"
        style={{ background: "#1a1a1a" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <MapController center={center} />

        {/* Business markers */}
        {businesses.map((business) => (
          <Marker
            key={business.id}
            position={[business.lat, business.lng]}
            icon={selectedBusiness?.id === business.id ? selectedIcon : greenIcon}
            eventHandlers={{
              click: () => onSelectBusiness(business),
            }}
          >
            <Popup>
              <div className="text-gray-900 font-medium">{business.name}</div>
              <div className="text-gray-600 text-sm">{business.category}</div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Map legend */}
      <div className="absolute bottom-4 left-4 bg-gray-800/90 backdrop-blur-sm px-3 py-2 rounded-lg text-xs text-white">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span>{businesses.length} businesses nearby</span>
        </div>
      </div>
    </div>
  );
}
