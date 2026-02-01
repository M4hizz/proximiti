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
    description: "Farm-to-table restaurant serving organic, locally-sourced dishes. Known for their seasonal menu and sustainable practices.",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop",
    lat: 43.6532,
    lng: -79.3832,
    phone: "(416) 123-4567",
    priceLevel: "$$",
  },
  {
    id: "2",
    name: "Urban Brews Coffee",
    category: "coffee",
    rating: 4.5,
    reviewCount: 189,
    address: "456 King Street East, Toronto, ON M5A 1L5",
    hours: "6:00 AM - 8:00 PM",
    description: "Artisan coffee roasters with a cozy atmosphere. Try our signature cold brew and fresh-baked pastries.",
    image: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop",
    lat: 43.6514,
    lng: -79.3598,
    phone: "(416) 234-5678",
    priceLevel: "$",
  },
  {
    id: "3",
    name: "Tech Haven Electronics",
    category: "retail",
    rating: 4.3,
    reviewCount: 156,
    address: "789 Dundas Street West, Mississauga, ON L5B 1H8",
    hours: "10:00 AM - 9:00 PM",
    description: "Your one-stop shop for the latest gadgets, computers, and electronics. Expert staff ready to help.",
    image: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=400&h=300&fit=crop",
    lat: 43.5890,
    lng: -79.6441,
    phone: "(905) 345-6789",
    priceLevel: "$$$",
  },
  {
    id: "4",
    name: "Zen Fitness Studio",
    category: "health",
    rating: 4.8,
    reviewCount: 312,
    address: "321 Yonge Street, North York, ON M2M 3W2",
    hours: "5:00 AM - 11:00 PM",
    description: "Modern fitness center offering yoga, pilates, and HIIT classes. Personal training available.",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&fit=crop",
    lat: 43.7615,
    lng: -79.4111,
    phone: "(416) 456-7890",
    priceLevel: "$$",
  },
  {
    id: "5",
    name: "Quick Fix Auto",
    category: "services",
    rating: 4.6,
    reviewCount: 98,
    address: "555 Eglinton Avenue West, Etobicoke, ON M6C 2E3",
    hours: "7:00 AM - 6:00 PM",
    description: "Trusted auto repair shop with certified mechanics. Oil changes, brake service, and full diagnostics.",
    image: "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=400&h=300&fit=crop",
    lat: 43.7001,
    lng: -79.4444,
    phone: "(416) 567-8901",
    priceLevel: "$$",
  },
  {
    id: "6",
    name: "Cinema Paradise",
    category: "entertainment",
    rating: 4.4,
    reviewCount: 445,
    address: "888 Lawrence Avenue East, Scarborough, ON M1P 2T7",
    hours: "11:00 AM - 12:00 AM",
    description: "Luxury movie theater with reclining seats, IMAX screens, and a full-service bar and restaurant.",
    image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=300&fit=crop",
    lat: 43.7731,
    lng: -79.2364,
    phone: "(416) 678-9012",
    priceLevel: "$$",
  },
  {
    id: "7",
    name: "Bella Italia",
    category: "food",
    rating: 4.9,
    reviewCount: 567,
    address: "222 College Street, Toronto, ON M5S 3M2",
    hours: "11:00 AM - 11:00 PM",
    description: "Authentic Italian cuisine made with imported ingredients. Famous for homemade pasta and wood-fired pizzas.",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop",
    lat: 43.6578,
    lng: -79.4003,
    phone: "(416) 789-0123",
    priceLevel: "$$$",
  },
  {
    id: "8",
    name: "Style Boutique",
    category: "retail",
    rating: 4.2,
    reviewCount: 123,
    address: "444 Bloor Street West, Toronto, ON M5S 1X8",
    hours: "10:00 AM - 8:00 PM",
    description: "Trendy clothing store featuring local designers and sustainable fashion. Personal styling available.",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop",
    lat: 43.6677,
    lng: -79.4103,
    phone: "(416) 890-1234",
    priceLevel: "$$",
  },
  {
    id: "9",
    name: "Matcha House",
    category: "coffee",
    rating: 4.6,
    reviewCount: 201,
    address: "666 Danforth Avenue, Toronto, ON M4K 1R2",
    hours: "7:00 AM - 9:00 PM",
    description: "Japanese-inspired tea house specializing in premium matcha drinks and traditional desserts.",
    image: "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=400&h=300&fit=crop",
    lat: 43.6762,
    lng: -79.3487,
    phone: "(416) 901-2345",
    priceLevel: "$",
  },
  {
    id: "10",
    name: "Serenity Spa",
    category: "health",
    rating: 4.7,
    reviewCount: 278,
    address: "999 The Queensway, Etobicoke, ON M8Z 6A1",
    hours: "9:00 AM - 9:00 PM",
    description: "Full-service day spa offering massages, facials, and body treatments. Couples packages available.",
    image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=300&fit=crop",
    lat: 43.6205,
    lng: -79.5132,
    phone: "(416) 012-3456",
    priceLevel: "$$$",
  },
];
