import { ChevronRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  showSeeAll?: boolean;
}

export function SectionHeader({
  title,
  showSeeAll = true,
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      {showSeeAll && (
        <button className="flex items-center gap-1 text-sm font-medium hover:underline">
          See all
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
