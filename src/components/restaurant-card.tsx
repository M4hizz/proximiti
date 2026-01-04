import { Star } from "lucide-react";
import type { Restaurant } from "@/lib/data";

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export function RestaurantCard({ restaurant }: RestaurantCardProps) {
  return (
    <div className="group cursor-pointer min-w-[280px] max-w-[280px]">
      <div className="relative aspect-[3/2] rounded-xl overflow-hidden mb-3">
        <img
          src={restaurant.image}
          alt={restaurant.name}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
        />
        {restaurant.promo && (
          <div className="absolute top-3 left-3 bg-accent text-accent-foreground text-xs font-bold px-2 py-1 rounded">
            {restaurant.promo}
          </div>
        )}
        {restaurant.deliveryFee && (
          <div className="absolute bottom-3 left-3 bg-background/90 backdrop-blur-sm text-foreground text-xs font-medium px-2 py-1 rounded">
            {restaurant.deliveryFee} Delivery Fee
          </div>
        )}
      </div>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-medium text-foreground group-hover:underline">
            {restaurant.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            {restaurant.deliveryTime}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded">
          <Star className="h-3 w-3 fill-foreground" />
          <span className="text-sm font-medium">{restaurant.rating}</span>
        </div>
      </div>
    </div>
  );
}
