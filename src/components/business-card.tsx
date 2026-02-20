import { useState, useEffect } from "react";
import type { Business } from "@/lib/businesses";
import { Star, MapPin, Clock, Bookmark } from "lucide-react";
import { isBookmarked } from "@/lib/bookmarks";

interface BusinessCardProps {
  business: Business;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * Card component for displaying a business in the list view.
 * Shows key info at a glance with a clean, modern design.
 */
export function BusinessCard({
  business,
  isSelected,
  onClick,
}: BusinessCardProps) {
  const [bookmarked, setBookmarked] = useState(() => isBookmarked(business.id));

  useEffect(() => {
    setBookmarked(isBookmarked(business.id));
  }, [business.id]);
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
        isSelected
          ? "bg-cherry-rose/20 border-2 border-cherry-rose"
          : "bg-white dark:bg-gray-800 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-750 shadow-sm dark:shadow-none"
      }`}
    >
      <div className="flex gap-4">
        {/* Business image – curated Unsplash category image, no API call required */}
        <img
          src={business.image}
          alt={business.name}
          className="w-24 h-24 object-cover rounded-lg shrink-0"
        />

        {/* Business info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {business.name}
            </h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              {bookmarked && (
                <Bookmark className="w-5 h-5 fill-cherry-rose text-cherry-rose" />
              )}
              <span className="text-green-600 dark:text-green-400 font-medium text-sm">
                {business.priceLevel}
              </span>
            </div>
          </div>

          {/* Rating row */}
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-3 h-3 ${
                    s <= Math.round(business.rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "fill-gray-200 text-gray-200 dark:fill-gray-600 dark:text-gray-600"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
              {business.rating.toFixed(1)}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              ({business.reviewCount.toLocaleString()})
            </span>
          </div>

          {/* Category badge */}
          <span className="inline-block mt-1.5 px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full capitalize">
            {business.category}
          </span>

          {/* Address */}
          <div className="flex items-center gap-1 mt-2 text-gray-500 dark:text-gray-400 text-sm">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{business.address.split(",")[0]}</span>
          </div>

          {/* Hours */}
          <div className="flex items-center gap-1 mt-1 text-gray-500 dark:text-gray-400 text-sm">
            <Clock className="w-3 h-3 shrink-0" />
            <span>{business.hours}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
