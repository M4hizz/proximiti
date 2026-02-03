/**
 * API service for fetching real business data from OpenStreetMap via Overpass API
 */

import type { Business } from "./businesses";

// Map OSM amenity types to our categories
const CATEGORY_MAPPING: Record<string, string> = {
  restaurant: "food",
  cafe: "coffee",
  fast_food: "food",
  bar: "food",
  pub: "food",
  shop: "retail",
  supermarket: "retail",
  convenience: "retail",
  clothes: "retail",
  bookshop: "retail",
  electronics: "retail",
  gym: "health",
  fitness_centre: "health",
  doctors: "health",
  dentist: "health",
  pharmacy: "health",
  spa: "health",
  cinema: "entertainment",
  theatre: "entertainment",
  nightclub: "entertainment",
  car_repair: "services",
  mechanic: "services",
  car_wash: "services",
  hairdresser: "services",
  beauty: "services",
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
    phone?: string;
    opening_hours?: string;
    website?: string;
  };
}

/**
 * Fetch nearby businesses from OpenStreetMap using Overpass API
 * @param lat Latitude of user location
 * @param lng Longitude of user location
 * @param radius Radius in meters (default: 2000m = 2km)
 * @returns Array of Business objects
 */
export async function fetchNearbyBusinesses(
  lat: number,
  lng: number,
  radius: number = 2000,
): Promise<Business[]> {
  try {
    // Overpass API query for various amenities and shops
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"~"restaurant|cafe|fast_food|bar|pub|gym|fitness_centre|cinema|theatre|doctors|pharmacy|spa"](around:${radius},${lat},${lng});
        node["shop"~"supermarket|convenience|clothes|bookshop|electronics"](around:${radius},${lat},${lng});
        way["amenity"~"restaurant|cafe|fast_food|bar|pub|gym|fitness_centre|cinema|theatre|doctors|pharmacy|spa"](around:${radius},${lat},${lng});
        way["shop"~"supermarket|convenience|clothes|bookshop|electronics"](around:${radius},${lat},${lng});
      );
      out body;
      >;
      out skel qt;
    `;

    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query,
    });

    if (!response.ok) {
      throw new Error("Failed to fetch from Overpass API");
    }

    const data = await response.json();
    const businesses: Business[] = [];
    const seenIds = new Set<string>();

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

      // Build address
      const addressParts = [];
      if (element.tags["addr:housenumber"])
        addressParts.push(element.tags["addr:housenumber"]);
      if (element.tags["addr:street"])
        addressParts.push(element.tags["addr:street"]);
      if (element.tags["addr:city"])
        addressParts.push(element.tags["addr:city"]);
      const address =
        addressParts.length > 0
          ? addressParts.join(" ")
          : "Address not available";

      // Get random rating for now (in a real app, you'd fetch this from reviews)
      const rating = Math.round((Math.random() * 1.5 + 3.5) * 10) / 10; // 3.5-5.0
      const reviewCount = Math.floor(Math.random() * 300) + 20;

      // Default image based on category
      const categoryImages: Record<string, string> = {
        food: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop",
        coffee:
          "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop",
        retail:
          "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop",
        health:
          "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=300&fit=crop",
        entertainment:
          "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=300&fit=crop",
        services:
          "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=400&h=300&fit=crop",
      };

      const business: Business = {
        id: businessId,
        name: element.tags.name,
        category,
        rating,
        reviewCount,
        address,
        hours: element.tags.opening_hours || "Hours not available",
        description: `${element.tags.name} - ${amenityType.replace(/_/g, " ")}`,
        image: categoryImages[category] || categoryImages.food,
        lat: latitude,
        lng: longitude,
        phone: element.tags.phone || "Phone not available",
        priceLevel: "$$",
      };

      businesses.push(business);
    }

    return businesses;
  } catch (error) {
    console.error("Error fetching nearby businesses:", error);
    throw error;
  }
}
