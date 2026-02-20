/**
 * Mock business data for the Local Business Finder app.
 * Each business includes location coordinates for map pins.
 */

export interface Business {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviewCount: number;
  address: string;
  hours: string;
  description: string;
  image: string;
  lat: number;
  lng: number;
  phone: string;
  priceLevel: string;
  website?: string;
}

export const categories = [
  { id: "all", name: "All", icon: "🏪" },
  { id: "food", name: "Food & Dining", icon: "🍔" },
  { id: "coffee", name: "Coffee & Tea", icon: "☕" },
  { id: "retail", name: "Retail", icon: "🛍️" },
  { id: "services", name: "Services", icon: "🔧" },
  { id: "health", name: "Health & Wellness", icon: "💪" },
  { id: "entertainment", name: "Entertainment", icon: "🎬" },
];

export const businesses: Business[] = [
  {
    id: "1",
    name: "The Green Kitchen",
    category: "food",
    rating: 4.7,
    reviewCount: 234,
    address: "123 Queen Street West, Toronto, ON M5H 2M9",
    hours: "8:00 AM - 10:00 PM",
    description:
      "Farm-to-table restaurant serving organic, locally-sourced dishes. Known for their seasonal menu and sustainable practices.",
    image:
      "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400&h=300&fit=crop",
    lat: 43.6532,
    lng: -79.3832,
    phone: "(416) 123-4567",
    priceLevel: "$$",
    website: "https://www.thegreenkitchen.ca",
  },
  {
    id: "2",
    name: "Urban Brews Coffee",
    category: "coffee",
    rating: 4.5,
    reviewCount: 189,
    address: "456 King Street East, Toronto, ON M5A 1L5",
    hours: "6:00 AM - 8:00 PM",
    description:
      "Artisan coffee roasters with a cozy atmosphere. Try our signature cold brew and fresh-baked pastries.",
    image:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop",
    lat: 43.6514,
    lng: -79.3598,
    phone: "(416) 234-5678",
    priceLevel: "$",
    website: "https://www.urbanbrewscoffee.com",
  },
  {
    id: "3",
    name: "Tech Haven Electronics",
    category: "retail",
    rating: 4.3,
    reviewCount: 156,
    address: "789 Dundas Street West, Mississauga, ON L5B 1H8",
    hours: "10:00 AM - 9:00 PM",
    description:
      "Your one-stop shop for the latest gadgets, computers, and electronics. Expert staff ready to help.",
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=300&fit=crop",
    lat: 43.589,
    lng: -79.6441,
    phone: "(905) 345-6789",
    priceLevel: "$$$",
    website: "https://www.techhaven.ca",
  },
  {
    id: "4",
    name: "Zen Fitness Studio",
    category: "health",
    rating: 4.8,
    reviewCount: 312,
    address: "321 Yonge Street, North York, ON M2M 3W2",
    hours: "5:00 AM - 11:00 PM",
    description:
      "Modern fitness center offering yoga, pilates, and HIIT classes. Personal training available.",
    image:
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop",
    lat: 43.7615,
    lng: -79.4111,
    phone: "(416) 456-7890",
    priceLevel: "$$",
    website: "https://www.zenfitnessstudio.ca",
  },
  {
    id: "5",
    name: "Quick Fix Auto",
    category: "services",
    rating: 4.6,
    reviewCount: 98,
    address: "555 Eglinton Avenue West, Etobicoke, ON M6C 2E3",
    hours: "7:00 AM - 6:00 PM",
    description:
      "Trusted auto repair shop with certified mechanics. Oil changes, brake service, and full diagnostics.",
    image:
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=300&fit=crop",
    lat: 43.7001,
    lng: -79.4444,
    phone: "(416) 567-8901",
    priceLevel: "$$",
    website: "https://www.quickfixauto.ca",
  },
  {
    id: "6",
    name: "Cinema Paradise",
    category: "entertainment",
    rating: 4.4,
    reviewCount: 445,
    address: "888 Lawrence Avenue East, Scarborough, ON M1P 2T7",
    hours: "11:00 AM - 12:00 AM",
    description:
      "Luxury movie theater with reclining seats, IMAX screens, and a full-service bar and restaurant.",
    image:
      "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=300&fit=crop",
    lat: 43.7731,
    lng: -79.2364,
    phone: "(416) 678-9012",
    priceLevel: "$$",
    website: "https://www.cinemaparadise.ca",
  },
  {
    id: "7",
    name: "Bella Italia",
    category: "food",
    rating: 4.9,
    reviewCount: 567,
    address: "222 College Street, Toronto, ON M5S 3M2",
    hours: "11:00 AM - 11:00 PM",
    description:
      "Authentic Italian cuisine made with imported ingredients. Famous for homemade pasta and wood-fired pizzas.",
    image:
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop",
    lat: 43.6578,
    lng: -79.4003,
    phone: "(416) 789-0123",
    priceLevel: "$$$",
    website: "https://www.bellaitalia.ca",
  },
  {
    id: "8",
    name: "Style Boutique",
    category: "retail",
    rating: 4.2,
    reviewCount: 123,
    address: "444 Bloor Street West, Toronto, ON M5S 1X8",
    hours: "10:00 AM - 8:00 PM",
    description:
      "Trendy clothing store featuring local designers and sustainable fashion. Personal styling available.",
    image:
      "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=400&h=300&fit=crop",
    lat: 43.6677,
    lng: -79.4103,
    phone: "(416) 890-1234",
    priceLevel: "$$",
    website: "https://www.styleboutiqueto.com",
  },
  {
    id: "9",
    name: "Matcha House",
    category: "coffee",
    rating: 4.6,
    reviewCount: 201,
    address: "666 Danforth Avenue, Toronto, ON M4K 1R2",
    hours: "7:00 AM - 9:00 PM",
    description:
      "Japanese-inspired tea house specializing in premium matcha drinks and traditional desserts.",
    image:
      "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop",
    lat: 43.6762,
    lng: -79.3487,
    phone: "(416) 901-2345",
    priceLevel: "$",
    website: "https://www.matchahouse.ca",
  },
  {
    id: "10",
    name: "Serenity Spa",
    category: "health",
    rating: 4.7,
    reviewCount: 278,
    address: "999 The Queensway, Etobicoke, ON M8Z 6A1",
    hours: "9:00 AM - 9:00 PM",
    description:
      "Full-service day spa offering massages, facials, and body treatments. Couples packages available.",
    image:
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&h=300&fit=crop",
    lat: 43.6205,
    lng: -79.5132,
    phone: "(416) 012-3456",
    priceLevel: "$$$",
    website: "https://www.serenityspa.ca",
  },
];

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Get nearest businesses to a location
 * @param userLat User's latitude
 * @param userLng User's longitude
 * @param limit Maximum number of businesses to return (default: 25)
 * @returns Array of businesses sorted by distance (nearest first)
 */
export function getNearestBusinesses(
  userLat: number,
  userLng: number,
  limit: number = 25,
): Business[] {
  // Calculate distance for each business and add it to the object
  const businessesWithDistance = businesses.map((business) => ({
    ...business,
    distance: calculateDistance(userLat, userLng, business.lat, business.lng),
  }));

  // Sort by distance and return top N
  return businessesWithDistance
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}
