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
    address: "123 Main Street, New York, NY 10001",
    hours: "8:00 AM - 10:00 PM",
    description: "Farm-to-table restaurant serving organic, locally-sourced dishes. Known for their seasonal menu and sustainable practices.",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop",
    lat: 40.7128,
    lng: -74.006,
    phone: "(555) 123-4567",
    priceLevel: "$$",
  },
  {
    id: "2",
    name: "Urban Brews Coffee",
    category: "coffee",
    rating: 4.5,
    reviewCount: 189,
    address: "456 Oak Avenue, New York, NY 10002",
    hours: "6:00 AM - 8:00 PM",
    description: "Artisan coffee roasters with a cozy atmosphere. Try our signature cold brew and fresh-baked pastries.",
    image: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop",
    lat: 40.7148,
    lng: -74.002,
    phone: "(555) 234-5678",
    priceLevel: "$",
  },
  {
    id: "3",
    name: "Tech Haven Electronics",
    category: "retail",
    rating: 4.3,
    reviewCount: 156,
    address: "789 Tech Boulevard, New York, NY 10003",
    hours: "10:00 AM - 9:00 PM",
    description: "Your one-stop shop for the latest gadgets, computers, and electronics. Expert staff ready to help.",
    image: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=400&h=300&fit=crop",
    lat: 40.7108,
    lng: -74.008,
    phone: "(555) 345-6789",
    priceLevel: "$$$",
  },
  {
    id: "4",
    name: "Zen Fitness Studio",
    category: "health",
    rating: 4.8,
    reviewCount: 312,
    address: "321 Wellness Way, New York, NY 10004",
    hours: "5:00 AM - 11:00 PM",
    description: "Modern fitness center offering yoga, pilates, and HIIT classes. Personal training available.",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&fit=crop",
    lat: 40.7158,
    lng: -74.010,
    phone: "(555) 456-7890",
    priceLevel: "$$",
  },
  {
    id: "5",
    name: "Quick Fix Auto",
    category: "services",
    rating: 4.6,
    reviewCount: 98,
    address: "555 Mechanic Lane, New York, NY 10005",
    hours: "7:00 AM - 6:00 PM",
    description: "Trusted auto repair shop with certified mechanics. Oil changes, brake service, and full diagnostics.",
    image: "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=400&h=300&fit=crop",
    lat: 40.7098,
    lng: -74.004,
    phone: "(555) 567-8901",
    priceLevel: "$$",
  },
  {
    id: "6",
    name: "Cinema Paradise",
    category: "entertainment",
    rating: 4.4,
    reviewCount: 445,
    address: "888 Movie Street, New York, NY 10006",
    hours: "11:00 AM - 12:00 AM",
    description: "Luxury movie theater with reclining seats, IMAX screens, and a full-service bar and restaurant.",
    image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=300&fit=crop",
    lat: 40.7138,
    lng: -74.012,
    phone: "(555) 678-9012",
    priceLevel: "$$",
  },
  {
    id: "7",
    name: "Bella Italia",
    category: "food",
    rating: 4.9,
    reviewCount: 567,
    address: "222 Pasta Place, New York, NY 10007",
    hours: "11:00 AM - 11:00 PM",
    description: "Authentic Italian cuisine made with imported ingredients. Famous for homemade pasta and wood-fired pizzas.",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop",
    lat: 40.7168,
    lng: -74.000,
    phone: "(555) 789-0123",
    priceLevel: "$$$",
  },
  {
    id: "8",
    name: "Style Boutique",
    category: "retail",
    rating: 4.2,
    reviewCount: 123,
    address: "444 Fashion Ave, New York, NY 10008",
    hours: "10:00 AM - 8:00 PM",
    description: "Trendy clothing store featuring local designers and sustainable fashion. Personal styling available.",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop",
    lat: 40.7118,
    lng: -74.014,
    phone: "(555) 890-1234",
    priceLevel: "$$",
  },
  {
    id: "9",
    name: "Matcha House",
    category: "coffee",
    rating: 4.6,
    reviewCount: 201,
    address: "666 Tea Garden Road, New York, NY 10009",
    hours: "7:00 AM - 9:00 PM",
    description: "Japanese-inspired tea house specializing in premium matcha drinks and traditional desserts.",
    image: "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=400&h=300&fit=crop",
    lat: 40.7178,
    lng: -74.008,
    phone: "(555) 901-2345",
    priceLevel: "$",
  },
  {
    id: "10",
    name: "Serenity Spa",
    category: "health",
    rating: 4.7,
    reviewCount: 278,
    address: "999 Relaxation Blvd, New York, NY 10010",
    hours: "9:00 AM - 9:00 PM",
    description: "Full-service day spa offering massages, facials, and body treatments. Couples packages available.",
    image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=300&fit=crop",
    lat: 40.7088,
    lng: -74.002,
    phone: "(555) 012-3456",
    priceLevel: "$$$",
  },
];
