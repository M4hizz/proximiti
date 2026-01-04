import type { ReactNode } from "react";
import { useState } from "react";
import {
  Tag,
  DollarSign,
  Clock,
  Star,
  ThumbsUp,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import { filters } from "@/lib/data";
import { cn } from "@/lib/utils";

const iconMap: Record<string, ReactNode> = {
  tag: <Tag className="h-4 w-4" />,
  dollar: <DollarSign className="h-4 w-4" />,
  clock: <Clock className="h-4 w-4" />,
  star: <Star className="h-4 w-4" />,
  "thumbs-up": <ThumbsUp className="h-4 w-4" />,
  sliders: <SlidersHorizontal className="h-4 w-4" />,
};

export function FilterRow() {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const toggleFilter = (filterId: string) => {
    setActiveFilters((prev) =>
      prev.includes(filterId)
        ? prev.filter((id) => id !== filterId)
        : [...prev, filterId]
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => toggleFilter(filter.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium whitespace-nowrap transition-colors",
              activeFilters.includes(filter.id)
                ? "bg-foreground text-background border-foreground"
                : "border-border hover:bg-muted"
            )}
          >
            {iconMap[filter.icon]}
            <span>{filter.label}</span>
            {filter.id === "sort" && <ChevronDown className="h-4 w-4" />}
          </button>
        ))}
      </div>
    </div>
  );
}
