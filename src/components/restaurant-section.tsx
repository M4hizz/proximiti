import { RestaurantCard } from "./restaurant-card";
import { SectionHeader } from "./section-header";
import type { Restaurant } from "@/lib/data";

interface RestaurantSectionProps {
  title: string;
  restaurants: Restaurant[];
}

export function RestaurantSection({
  title,
  restaurants,
}: RestaurantSectionProps) {
  return (
    <section className="max-w-7xl mx-auto px-4 py-6">
      <SectionHeader title={title} />
      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
        {restaurants.map((restaurant) => (
          <RestaurantCard key={restaurant.id} restaurant={restaurant} />
        ))}
      </div>
    </section>
  );
}
