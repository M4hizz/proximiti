export interface Restaurant {
  id: string;
  name: string;
  image: string;
  rating: number;
  deliveryTime: string;
  deliveryFee?: string;
  promo?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface Store {
  id: string;
  name: string;
  logo: string;
}

export const categories: Category[] = [
  { id: "1", name: "Pizza", icon: "🍕" },
  { id: "2", name: "Burgers", icon: "🍔" },
  { id: "3", name: "Sushi", icon: "🍣" },
  { id: "4", name: "Chinese", icon: "🥡" },
  { id: "5", name: "Mexican", icon: "🌮" },
  { id: "6", name: "Indian", icon: "🍛" },
  { id: "7", name: "Thai", icon: "🍜" },
  { id: "8", name: "Italian", icon: "🍝" },
  { id: "9", name: "Desserts", icon: "🍰" },
  { id: "10", name: "Healthy", icon: "🥗" },
  { id: "11", name: "Coffee", icon: "☕" },
  { id: "12", name: "Breakfast", icon: "🥞" },
];

export const speedyRestaurants: Restaurant[] = [
  {
    id: "1",
    name: "McDonald's",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop",
    rating: 4.5,
    deliveryTime: "10-20 min",
    deliveryFee: "$0.49",
  },
  {
    id: "2",
    name: "Burger King",
    image:
      "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=300&fit=crop",
    rating: 4.3,
    deliveryTime: "15-25 min",
    deliveryFee: "$0.99",
  },
  {
    id: "3",
    name: "Wendy's",
    image:
      "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400&h=300&fit=crop",
    rating: 4.4,
    deliveryTime: "10-20 min",
    deliveryFee: "$0.49",
  },
  {
    id: "4",
    name: "Taco Bell",
    image:
      "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=300&fit=crop",
    rating: 4.2,
    deliveryTime: "15-25 min",
    deliveryFee: "$0.99",
  },
  {
    id: "5",
    name: "KFC",
    image:
      "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=400&h=300&fit=crop",
    rating: 4.3,
    deliveryTime: "15-25 min",
    deliveryFee: "$1.49",
  },
  {
    id: "6",
    name: "Popeyes",
    image:
      "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400&h=300&fit=crop",
    rating: 4.5,
    deliveryTime: "15-30 min",
    deliveryFee: "$0.99",
  },
];

export const bogoRestaurants: Restaurant[] = [
  {
    id: "7",
    name: "Subway",
    image:
      "https://images.unsplash.com/photo-1509722747041-616f39b57569?w=400&h=300&fit=crop",
    rating: 4.2,
    deliveryTime: "20-30 min",
    promo: "Buy 1, Get 1 Free",
  },
  {
    id: "8",
    name: "Chipotle",
    image:
      "https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?w=400&h=300&fit=crop",
    rating: 4.6,
    deliveryTime: "20-35 min",
    promo: "Buy 1, Get 1 Free",
  },
  {
    id: "9",
    name: "Panera Bread",
    image:
      "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&h=300&fit=crop",
    rating: 4.5,
    deliveryTime: "25-40 min",
    promo: "Buy 1, Get 1 Free",
  },
  {
    id: "10",
    name: "Five Guys",
    image:
      "https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&h=300&fit=crop",
    rating: 4.7,
    deliveryTime: "20-35 min",
    promo: "Buy 1, Get 1 Free",
  },
  {
    id: "11",
    name: "Shake Shack",
    image:
      "https://images.unsplash.com/photo-1586816001966-79b736744398?w=400&h=300&fit=crop",
    rating: 4.6,
    deliveryTime: "20-30 min",
    promo: "Buy 1, Get 1 Free",
  },
  {
    id: "12",
    name: "Panda Express",
    image:
      "https://images.unsplash.com/photo-1525755662778-989d0524087e?w=400&h=300&fit=crop",
    rating: 4.3,
    deliveryTime: "15-25 min",
    promo: "Buy 1, Get 1 Free",
  },
];

export const stores: Store[] = [
  {
    id: "1",
    name: "Walgreens",
    logo: "https://images.unsplash.com/photo-1631006235194-1fdb1d48e2c6?w=80&h=80&fit=crop",
  },
  {
    id: "2",
    name: "CVS",
    logo: "https://images.unsplash.com/photo-1585435557343-3b092031a831?w=80&h=80&fit=crop",
  },
  {
    id: "3",
    name: "7-Eleven",
    logo: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=80&h=80&fit=crop",
  },
  {
    id: "4",
    name: "Circle K",
    logo: "https://images.unsplash.com/photo-1556767576-5ec41e3239ea?w=80&h=80&fit=crop",
  },
  {
    id: "5",
    name: "Wawa",
    logo: "https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=80&h=80&fit=crop",
  },
  {
    id: "6",
    name: "Sheetz",
    logo: "https://images.unsplash.com/photo-1557844352-761f2565b576?w=80&h=80&fit=crop",
  },
  {
    id: "7",
    name: "QuikTrip",
    logo: "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=80&h=80&fit=crop",
  },
  {
    id: "8",
    name: "RaceTrac",
    logo: "https://images.unsplash.com/photo-1559181567-c3190ca9959b?w=80&h=80&fit=crop",
  },
];

export const filters = [
  { id: "offers", label: "Offers", icon: "tag" },
  { id: "delivery-fee", label: "Delivery Fee", icon: "dollar" },
  { id: "under-30", label: "Under 30 min", icon: "clock" },
  { id: "best-overall", label: "Best Overall", icon: "star" },
  { id: "rating", label: "Rating", icon: "thumbs-up" },
  { id: "sort", label: "Sort", icon: "sliders" },
];
