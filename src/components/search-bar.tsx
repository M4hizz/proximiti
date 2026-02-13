import { useState, useEffect, useRef } from "react";
import { Search, MapPin, Navigation, Building2, Home } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onLocateUser: () => void;
  onLocationSelect?: (lat: number, lng: number, displayName: string) => void;
}

interface LocationSuggestion {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    city?: string;
    state?: string;
    country?: string;
    road?: string;
    house_number?: string;
  };
}

/**
 * Search bar component with location search and button.
 * Allows searching by business name or category, and location autocomplete.
 */
export function SearchBar({
  value,
  onChange,
  onLocateUser,
  onLocationSelect,
}: SearchBarProps) {
  const [locationQuery, setLocationQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
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

  // Fetch location suggestions with debounce
  useEffect(() => {
    if (locationQuery.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    // Show dropdown immediately when user starts typing
    setShowDropdown(true);

    const timeoutId = setTimeout(async () => {
      setIsLoadingSuggestions(true);
      console.log("Fetching suggestions for:", locationQuery);
      try {
        // Using Nominatim (OpenStreetMap) geocoding API with POI support
        // This includes addresses, landmarks, schools, buildings, and other named locations
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
            `format=json&q=${encodeURIComponent(locationQuery)}` +
            `&limit=15` +
            `&addressdetails=1` +
            `&extratags=1` +
            `&namedetails=1` +
            `&dedupe=1`,
          {
            headers: {
              "User-Agent": "Proximiti Business Finder",
            },
          },
        );
        const data = await response.json();
        console.log("Received suggestions:", data);

        // Remove duplicates based on proximity and name similarity
        const uniqueResults = data.reduce(
          (acc: LocationSuggestion[], current: LocationSuggestion) => {
            const isDuplicate = acc.some((item) => {
              const latDiff = Math.abs(
                parseFloat(item.lat) - parseFloat(current.lat),
              );
              const lonDiff = Math.abs(
                parseFloat(item.lon) - parseFloat(current.lon),
              );
              const isSameLocation = latDiff < 0.0001 && lonDiff < 0.0001;
              const isSameName =
                item.display_name.toLowerCase() ===
                current.display_name.toLowerCase();
              return isSameLocation || isSameName;
            });

            if (!isDuplicate) {
              acc.push(current);
            }
            return acc;
          },
          [],
        );

        // Smart sorting like Google Maps:
        // 1. Exact name matches first
        // 2. Street addresses
        // 3. POIs (schools, landmarks, businesses)
        // 4. Neighborhoods/areas
        // 5. Cities/regions
        const sortedResults = uniqueResults.sort(
          (a: LocationSuggestion, b: LocationSuggestion) => {
            const queryLower = locationQuery.toLowerCase();
            const aName = a.display_name.toLowerCase();
            const bName = b.display_name.toLowerCase();

            // Exact match bonus
            const aExact = aName.startsWith(queryLower) ? -1000 : 0;
            const bExact = bName.startsWith(queryLower) ? -1000 : 0;

            // Type priority
            const aHasStreet = a.address?.house_number && a.address?.road;
            const bHasStreet = b.address?.house_number && b.address?.road;
            const aIsPOI =
              a.address &&
              !aHasStreet &&
              !a.address.city
                ?.toLowerCase()
                .includes(a.display_name.split(",")[0].toLowerCase().trim());
            const bIsPOI =
              b.address &&
              !bHasStreet &&
              !b.address.city
                ?.toLowerCase()
                .includes(b.display_name.split(",")[0].toLowerCase().trim());

            const aScore =
              aExact + (aHasStreet ? -100 : 0) + (aIsPOI ? -50 : 0);
            const bScore =
              bExact + (bHasStreet ? -100 : 0) + (bIsPOI ? -50 : 0);

            return aScore - bScore;
          },
        );

        setSuggestions(sortedResults.slice(0, 5)); // Show top 5 results
      } catch (error) {
        console.error("Error fetching location suggestions:", error);
        setSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 150); // Reduced to 150ms for faster response

    return () => clearTimeout(timeoutId);
  }, [locationQuery]);

  const handleLocationSelect = (suggestion: LocationSuggestion) => {
    // Determine what to show in the input after selection
    const streetAddress = [
      suggestion.address.house_number,
      suggestion.address.road,
    ]
      .filter(Boolean)
      .join(" ");

    // If there's a street address, use it
    // Otherwise use the first part of display_name (POI name, landmark, school, etc.)
    const displayText =
      streetAddress || suggestion.display_name.split(",")[0].trim();

    setLocationQuery(displayText);
    setShowDropdown(false);

    if (onLocationSelect) {
      onLocationSelect(
        parseFloat(suggestion.lat),
        parseFloat(suggestion.lon),
        suggestion.display_name,
      );
    }
  };

  const formatGeneralLocation = (suggestion: LocationSuggestion) => {
    // Format like Google Maps: "City, State, Country" or "State, Country"
    const parts = [];

    // Skip city if it's the same as the main location name
    const mainName = suggestion.display_name.split(",")[0].trim().toLowerCase();
    const city = suggestion.address.city;

    if (city && city.toLowerCase() !== mainName) {
      parts.push(city);
    }

    // Add state/province
    if (suggestion.address.state) {
      parts.push(suggestion.address.state);
    }

    // Add country
    if (suggestion.address.country) {
      parts.push(suggestion.address.country);
    }

    return parts.length > 0 ? parts.join(", ") : "";
  };

  const formatSpecificLocation = (suggestion: LocationSuggestion) => {
    // Format like Google Maps: specific name/address on the left
    const addr = suggestion.address;

    // If it's a street address with number, show full address
    if (addr?.house_number && addr?.road) {
      const parts = [];
      if (addr.house_number) parts.push(addr.house_number);
      if (addr.road) parts.push(addr.road);
      return parts.join(" ");
    }

    // If it's just a road/street name
    if (addr?.road && !addr?.house_number) {
      return addr.road;
    }

    // For POIs, landmarks, businesses, schools - show the name
    const firstPart = suggestion.display_name.split(",")[0].trim();

    // Don't show if it's just the city name
    if (addr?.city && firstPart.toLowerCase() === addr.city.toLowerCase()) {
      // For cities, show city name
      return addr.city;
    }

    // Show the POI/landmark name
    return firstPart;
  };

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
          className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
        />
      </div>

      {/* Location input with autocomplete */}
      <div className="flex-1 relative" ref={dropdownRef}>
        <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          ref={locationInputRef}
          type="text"
          value={locationQuery}
          onChange={(e) => setLocationQuery(e.target.value)}
          onFocus={() =>
            locationQuery.length >= 3 &&
            suggestions.length > 0 &&
            setShowDropdown(true)
          }
          placeholder="Enter location..."
          className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
        />

        {/* Dropdown with suggestions */}
        {(showDropdown || isLoadingSuggestions) &&
          locationQuery.length >= 3 && (
            <div
              className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border-2 border-green-500 rounded-xl shadow-2xl max-h-96 overflow-y-auto z-[9999]"
              style={{ minWidth: "300px" }}
            >
              {isLoadingSuggestions ? (
                <div className="px-4 py-4 text-green-400 text-sm font-medium animate-pulse">
                  🔍 Searching for "{locationQuery}"...
                </div>
              ) : suggestions.length > 0 ? (
                suggestions.map((suggestion) => {
                  const specificLocation = formatSpecificLocation(suggestion);
                  const generalLocation = formatGeneralLocation(suggestion);
                  const hasStreetAddress =
                    suggestion.address?.house_number &&
                    suggestion.address?.road;

                  return (
                    <button
                      key={suggestion.place_id}
                      onClick={() => handleLocationSelect(suggestion)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0 flex items-center gap-3 first:rounded-t-xl last:rounded-b-xl group"
                    >
                      {/* Icon like Google Maps */}
                      <div className="shrink-0 text-gray-400 group-hover:text-green-400 transition-colors">
                        {hasStreetAddress ? (
                          <Home className="w-4 h-4" />
                        ) : (
                          <Building2 className="w-4 h-4" />
                        )}
                      </div>

                      {/* Text content */}
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="text-white font-medium truncate text-sm">
                          {specificLocation}
                        </div>
                        {generalLocation && (
                          <div className="text-gray-400 text-xs truncate mt-0.5">
                            {generalLocation}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="px-4 py-4">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                    <MapPin className="w-4 h-4" />
                    <span className="font-medium">No locations found</span>
                  </div>
                  <div className="text-gray-500 text-xs ml-6">
                    Try searching for:
                    <br />
                    • Street address: "123 Main St, City"
                    <br />
                    • Landmark: "Central Park"
                    <br />• Business: "Starbucks"
                  </div>
                </div>
              )}
            </div>
          )}

        {/* Debug indicator */}
        {locationQuery.length >= 3 && (
          <div className="absolute -bottom-5 left-0 text-xs text-gray-500">
            {isLoadingSuggestions
              ? "Loading..."
              : `${suggestions.length} results`}
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
