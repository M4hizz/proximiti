import type { Business } from "@/lib/businesses";
import { Star, MapPin, Clock } from "lucide-react";

interface BusinessCardProps {
  business: Business;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * Card component for displaying a business in the list view.
 * Shows key info at a glance with a clean, modern design.
 */
export function BusinessCard({ business, isSelected, onClick }: BusinessCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
        isSelected
          ? "bg-green-500/20 border-2 border-green-500"
          : "bg-gray-800 border-2 border-transparent hover:border-gray-600 hover:bg-gray-750"
      }`}
    >
      <div className="flex gap-4">
        {/* Business image */}
        <img
          src={business.image}
          alt={business.name}
          className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
        />

        {/* Business info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-white truncate">{business.name}</h3>
            <span className="text-green-400 font-medium text-sm flex-shrink-0">
              {business.priceLevel}
            </span>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-4 h-4 fill-green-400 text-green-400" />
            <span className="text-white font-medium text-sm">{business.rating}</span>
            <span className="text-gray-400 text-sm">({business.reviewCount})</span>
          </div>

          {/* Category badge */}
          <span className="inline-block mt-2 px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded-full capitalize">
            {business.category}
          </span>

          {/* Address */}
          <div className="flex items-center gap-1 mt-2 text-gray-400 text-sm">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{business.address.split(",")[0]}</span>
          </div>

          {/* Hours */}
          <div className="flex items-center gap-1 mt-1 text-gray-400 text-sm">
            <Clock className="w-3 h-3 flex-shrink-0" />
            <span>{business.hours}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
