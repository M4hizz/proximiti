import { SectionHeader } from "./section-header";
import type { Store } from "@/lib/data";

interface StoreGridProps {
  title: string;
  stores: Store[];
}

export function StoreGrid({ title, stores }: StoreGridProps) {
  return (
    <section className="max-w-7xl mx-auto px-4 py-6">
      <SectionHeader title={title} />
      <div className="flex gap-6 overflow-x-auto scrollbar-hide pb-2">
        {stores.map((store) => (
          <div
            key={store.id}
            className="flex flex-col items-center gap-2 cursor-pointer group min-w-[80px]"
          >
            <div className="relative h-16 w-16 rounded-full overflow-hidden bg-muted ring-2 ring-transparent group-hover:ring-foreground transition-all">
              <img
                src={store.logo}
                alt={store.name}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xs font-medium text-center group-hover:underline">
              {store.name}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
