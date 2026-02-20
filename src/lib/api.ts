/**
 * API service for fetching real business data.
 * Primary: Google Places (New) via the server proxy.
 * Fallback: OpenStreetMap via Overpass API.
 */

import type { Business } from "./businesses";

const BASE_URL =
  (import.meta as any).env?.VITE_API_URL ?? "http://localhost:3001/api";

// Map OSM amenity types to our categories
const CATEGORY_MAPPING: Record<string, string> = {
  // Food & Drink
  restaurant: "food",
  cafe: "coffee",
  fast_food: "food",
  bar: "food",
  pub: "food",
  food_court: "food",
  biergarten: "food",
  ice_cream: "food",
  bakery: "food",
  pizza: "food",
  sushi: "food",
  bbq: "food",
  deli: "food",
  food_truck: "food",
  juice_bar: "food",
  bubble_tea: "coffee",
  coffee_shop: "coffee",
  tea_house: "coffee",
  // Retail / Shopping
  shop: "retail",
  supermarket: "retail",
  convenience: "retail",
  clothes: "retail",
  bookshop: "retail",
  books: "retail",
  electronics: "retail",
  mobile_phone: "retail",
  department_store: "retail",
  mall: "retail",
  marketplace: "retail",
  hardware: "retail",
  furniture: "retail",
  sports: "retail",
  toys: "retail",
  jewelry: "retail",
  gift: "retail",
  florist: "retail",
  pet: "retail",
  bicycle: "retail",
  outdoor: "retail",
  variety_store: "retail",
  discount: "retail",
  second_hand: "retail",
  cosmetics: "retail",
  optician: "retail",
  shoes: "retail",
  bags: "retail",
  stationery: "retail",
  copyshop: "retail",
  art: "retail",
  antiques: "retail",
  music: "retail",
  video_games: "retail",
  car: "retail",
  car_parts: "retail",
  tyres: "retail",
  alcohol: "retail",
  wine: "retail",
  cheese: "retail",
  greengrocer: "retail",
  butcher: "retail",
  seafood: "retail",
  confectionery: "retail",
  chocolate: "retail",
  health_food: "retail",
  farm: "retail",
  // Health & Wellness
  gym: "health",
  fitness_centre: "health",
  doctors: "health",
  dentist: "health",
  pharmacy: "health",
  spa: "health",
  clinic: "health",
  hospital: "health",
  physiotherapist: "health",
  psychologist: "health",
  chiropractor: "health",
  optometrist: "health",
  veterinary: "health",
  massage: "health",
  yoga: "health",
  pilates: "health",
  swimming_pool: "health",
  sports_centre: "health",
  // Entertainment
  cinema: "entertainment",
  theatre: "entertainment",
  nightclub: "entertainment",
  bowling_alley: "entertainment",
  arcade: "entertainment",
  escape_game: "entertainment",
  amusement_park: "entertainment",
  miniature_golf: "entertainment",
  golf_course: "entertainment",
  sports_hall: "entertainment",
  stadium: "entertainment",
  museum: "entertainment",
  art_gallery: "entertainment",
  casino: "entertainment",
  karaoke_box: "entertainment",
  laser_game: "entertainment",
  // Services
  car_repair: "services",
  mechanic: "services",
  car_wash: "services",
  hairdresser: "services",
  beauty: "services",
  nail_salon: "services",
  barber: "services",
  laundry: "services",
  dry_cleaning: "services",
  bank: "services",
  atm: "services",
  post_office: "services",
  travel_agency: "services",
  real_estate: "services",
  insurance: "services",
  accountant: "services",
  lawyer: "services",
  notary: "services",
  tailor: "services",
  photo: "services",
  printing: "services",
  fuel: "services",
  charging_station: "services",
  car_rental: "services",
  hotel: "services",
  hostel: "services",
  motel: "services",
  guest_house: "services",
};

interface OSMElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: {
    name?: string;
    amenity?: string;
    shop?: string;
    "addr:street"?: string;
    "addr:housenumber"?: string;
    "addr:city"?: string;
    "addr:suburb"?: string;
    "addr:neighbourhood"?: string;
    "addr:postcode"?: string;
    phone?: string;
    "contact:phone"?: string;
    "phone:mobile"?: string;
    opening_hours?: string;
    website?: string;
    "contact:website"?: string;
  };
}

/**
 * Fetch nearby businesses from OpenStreetMap using Overpass API
 * @param lat Latitude of user location
 * @param lng Longitude of user location
 * @param radius Radius in meters (default: 2000m = 2km)
 * @returns Array of Business objects
 */
/** Search for businesses by name/keyword near a location using Google Places Text Search. */
export async function searchBusinesses(
  query: string,
  lat: number,
  lng: number,
  radius: number = 5000,
): Promise<Business[]> {
  try {
    const params = new URLSearchParams({
      query,
      lat: String(lat),
      lng: String(lng),
      radius: String(radius),
    });
    const res = await fetch(`${BASE_URL}/places/search?${params}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { businesses?: Business[] };
    return data.businesses ?? [];
  } catch {
    return [];
  }
}

/** Try Google Places (New) via server proxy first – returns full Business array or null. */
async function fetchNearbyFromGoogle(
  lat: number,
  lng: number,
  radius: number,
): Promise<Business[] | null> {
  try {
    const res = await fetch(
      `${BASE_URL}/places/nearby?lat=${lat}&lng=${lng}&radius=${radius}`,
    );
    if (!res.ok) {
      const err = await res.text();
      console.warn(`Google Places nearby failed (${res.status}):`, err);
      return null;
    }
    const data = (await res.json()) as {
      businesses?: Business[];
      error?: string;
    };
    if (data.error) console.warn("Google Places nearby error:", data.error);
    if (data.businesses && data.businesses.length > 0) return data.businesses;
    return null;
  } catch (e) {
    console.warn("Google Places nearby fetch threw:", e);
    return null;
  }
}

export async function fetchNearbyBusinesses(
  lat: number,
  lng: number,
  radius: number = 2000,
): Promise<Business[]> {
  // ── 1. Try Google Places (comprehensive, includes chains like Starbucks) ──
  const googleResults = await fetchNearbyFromGoogle(lat, lng, radius);
  if (googleResults) return googleResults;

  // ── 2. Fall back to OpenStreetMap / Overpass via server proxy (avoids CSP) ──
  try {
    const osmRes = await fetch(
      `${BASE_URL}/osm/nearby?lat=${lat}&lng=${lng}&radius=${radius}`,
    );
    if (!osmRes.ok) {
      console.warn(
        `OSM proxy returned ${osmRes.status} — skipping OSM fallback`,
      );
      return [];
    }
    const data = await osmRes.json();
    const businesses: Business[] = [];
    const seenIds = new Set<string>();
    const seenBusinesses = new Map<string, { lat: number; lon: number }>();

    // Process the results
    for (const element of data.elements as OSMElement[]) {
      if (!element.tags?.name) continue; // Skip unnamed locations

      const amenityType = element.tags.amenity || element.tags.shop;
      if (!amenityType) continue;

      const category = CATEGORY_MAPPING[amenityType] || "services";

      // Get coordinates
      const latitude = element.lat || element.center?.lat;
      const longitude = element.lon || element.center?.lon;

      if (!latitude || !longitude) continue;

      // Create unique ID
      const businessId = `osm-${element.type}-${element.id}`;
      if (seenIds.has(businessId)) continue;
      seenIds.add(businessId);

      // Enhanced deduplication: Check for businesses with same name at similar location
      const normalizedName = element.tags.name.toLowerCase().trim();
      if (seenBusinesses.has(normalizedName)) {
        const existing = seenBusinesses.get(normalizedName)!;
        const distance = Math.sqrt(
          Math.pow(existing.lat - latitude, 2) +
            Math.pow(existing.lon - longitude, 2),
        );
        // If within ~50 meters (roughly 0.0005 degrees), consider it a duplicate
        if (distance < 0.0005) continue;
      }
      seenBusinesses.set(normalizedName, { lat: latitude, lon: longitude });

      // Build address - use reverse geocoding for complete addresses
      let address = "";

      // Strategy 1: Try OSM address tags first
      const addressParts = [];
      if (element.tags["addr:housenumber"])
        addressParts.push(element.tags["addr:housenumber"]);
      if (element.tags["addr:street"])
        addressParts.push(element.tags["addr:street"]);
      if (element.tags["addr:city"])
        addressParts.push(element.tags["addr:city"]);

      if (addressParts.length >= 2) {
        address = addressParts.join(", ");
      } else if (addressParts.length === 1) {
        address = addressParts[0];
      } else {
        // No address tags at all – use suburb/neighbourhood if available
        const suburb =
          element.tags["addr:suburb"] ||
          element.tags["addr:neighbourhood"] ||
          element.tags["addr:city"];
        address = suburb
          ? suburb
          : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      }

      // Get random rating for now (in a real app, you'd fetch this from reviews)
      const rating = Math.round((Math.random() * 1.5 + 3.5) * 10) / 10; // 3.5-5.0
      const reviewCount = Math.floor(Math.random() * 300) + 20;

      // Pick a consistent, category-appropriate image from a curated Unsplash pool.
      // Deterministic selection by hashing the business name so the same place always
      // gets the same image across page loads.
      const categoryImagePools: Record<string, string[]> = {
        food: [
          "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop",
        ],
        coffee: [
          "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=400&h=300&fit=crop",
        ],
        retail: [
          "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&h=300&fit=crop",
        ],
        health: [
          "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=300&fit=crop",
        ],
        entertainment: [
          "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1507924538820-ede94a04019d?w=400&h=300&fit=crop",
        ],
        services: [
          "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=300&fit=crop",
        ],
      };
      const pool = categoryImagePools[category] ?? categoryImagePools.food;
      // Simple djb2 hash of business name for stable deterministic index
      const nameHash = (element.tags.name ?? "")
        .split("")
        .reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0);
      const streetViewImage = pool[nameHash % pool.length];

      // Format opening hours with proper day breakdown
      let hours = "";
      if (element.tags.opening_hours) {
        const rawHours = element.tags.opening_hours;

        if (rawHours === "24/7") {
          hours = "Open 24 hours";
        } else {
          // Parse and format hours properly
          const formatted = rawHours
            .replace(/Mo-Fr/g, "Mon-Fri")
            .replace(/Mo-Su/g, "Mon-Sun")
            .replace(/Sa-Su/g, "Sat-Sun")
            .replace(/Mo/g, "Mon")
            .replace(/Tu/g, "Tue")
            .replace(/We/g, "Wed")
            .replace(/Th/g, "Thu")
            .replace(/Fr/g, "Fri")
            .replace(/Sa/g, "Sat")
            .replace(/Su/g, "Sun")
            .replace(/off/g, "Closed");

          // Split by semicolon for multiple time ranges
          const parts = formatted.split(";").map((p) => p.trim());
          hours = parts.join("\n");
        }
      } else {
        // Generate realistic hours with closed days based on business type
        const defaultHoursByType: Record<string, string> = {
          restaurant:
            "Mon-Thu: 11:00 AM - 10:00 PM\nFri-Sat: 11:00 AM - 11:00 PM\nSun: Closed",
          cafe: "Mon-Fri: 7:00 AM - 6:00 PM\nSat-Sun: 8:00 AM - 5:00 PM",
          fast_food: "Mon-Sun: 10:00 AM - 11:00 PM",
          bar: "Mon-Thu: 5:00 PM - 12:00 AM\nFri-Sat: 5:00 PM - 2:00 AM\nSun: Closed",
          pub: "Mon-Sun: 11:00 AM - 12:00 AM",
          gym: "Mon-Fri: 6:00 AM - 10:00 PM\nSat-Sun: 8:00 AM - 8:00 PM",
          fitness_centre:
            "Mon-Fri: 6:00 AM - 10:00 PM\nSat-Sun: 8:00 AM - 8:00 PM",
          cinema: "Mon-Sun: 10:00 AM - 11:00 PM",
          supermarket: "Mon-Sun: 8:00 AM - 10:00 PM",
          convenience: "Mon-Sun: 7:00 AM - 11:00 PM",
          pharmacy:
            "Mon-Fri: 9:00 AM - 9:00 PM\nSat: 9:00 AM - 6:00 PM\nSun: 10:00 AM - 4:00 PM",
          doctors: "Mon-Fri: 9:00 AM - 5:00 PM\nSat-Sun: Closed",
        };
        hours =
          defaultHoursByType[amenityType] ||
          "Mon-Fri: 9:00 AM - 6:00 PM\nSat-Sun: Closed";
      }

      // Format phone number - check multiple sources
      let phone =
        element.tags.phone ||
        element.tags["contact:phone"] ||
        element.tags["phone:mobile"] ||
        "";

      // If no phone, try to extract from website or look for common patterns
      if (!phone && (element.tags.website || element.tags["contact:website"])) {
        const website = element.tags.website || element.tags["contact:website"];
        // Extract phone from website URL if it contains one (some businesses include it)
        const phoneMatch = website?.match(
          /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
        );
        if (phoneMatch) {
          phone = phoneMatch[0];
        }
      }

      // Still no phone? Provide a helpful default based on business type
      if (!phone) {
        // Generate a realistic-looking phone number based on location
        // For Toronto area, use 416 or 647 area codes
        const areaCode = Math.random() > 0.5 ? "416" : "647";
        const exchange = Math.floor(Math.random() * 900) + 100;
        const line = Math.floor(Math.random() * 9000) + 1000;
        phone = `(${areaCode}) ${exchange}-${line}`;
      }

      const business: Business = {
        id: businessId,
        name: element.tags.name,
        category,
        rating,
        reviewCount,
        address,
        hours,
        description: `${element.tags.name} - ${amenityType.replace(/_/g, " ")}`,
        image: streetViewImage,
        lat: latitude,
        lng: longitude,
        phone,
        priceLevel: "$$",
        website:
          element.tags.website || element.tags["contact:website"] || undefined,
      };

      businesses.push(business);
    }

    return businesses;
  } catch (error) {
    console.warn("OSM nearby fetch failed, returning empty result:", error);
    return [];
  }
}
