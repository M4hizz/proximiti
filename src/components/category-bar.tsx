import { useState } from "react";
import { categories } from "@/lib/data";
import { cn } from "@/lib/utils";

export function CategoryBar() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  return (
    <div className="border-b border-border">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex gap-2 py-4 overflow-x-auto scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() =>
                setActiveCategory(
                  category.id === activeCategory ? null : category.id
                )
              }
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-lg min-w-[72px] transition-colors",
                activeCategory === category.id
                  ? "bg-foreground text-background"
                  : "hover:bg-muted"
              )}
            >
              <span className="text-2xl">{category.icon}</span>
              <span className="text-xs font-medium whitespace-nowrap">
                {category.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
