import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  /** Current value (1-5). Pass 0 for empty. */
  value: number;
  /** If true, stars are clickable. */
  interactive?: boolean;
  onChange?: (rating: number) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "w-3.5 h-3.5",
  md: "w-5 h-5",
  lg: "w-7 h-7",
};

/**
 * Reusable star rating component.
 * Renders 5 stars; filled stars match the `value`.
 * When `interactive` is true, hovering / clicking updates the rating.
 */
export function StarRating({
  value,
  interactive = false,
  onChange,
  size = "md",
  className,
}: StarRatingProps) {
  const starClass = sizeMap[size];

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.round(value);
        // Fractional fill for display-only mode
        const partial = !interactive && star - 1 < value && value < star;

        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(star)}
            className={cn(
              "relative transition-transform",
              interactive
                ? "cursor-pointer hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                : "cursor-default",
            )}
            aria-label={
              interactive
                ? `Rate ${star} star${star !== 1 ? "s" : ""}`
                : undefined
            }
          >
            {/* Background (empty) star */}
            <Star
              className={cn(starClass, "text-gray-300 dark:text-gray-600")}
            />
            {/* Filled overlay */}
            {(filled || partial) && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={
                  partial
                    ? { width: `${(value - Math.floor(value)) * 100}%` }
                    : undefined
                }
              >
                <Star
                  className={cn(starClass, "fill-yellow-400 text-yellow-400")}
                />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
