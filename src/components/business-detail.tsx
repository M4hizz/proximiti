import type { Business } from "@/lib/businesses";
import { Star, MapPin, Clock, Phone, X, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BusinessDetailProps {
  business: Business;
  onClose: () => void;
}

/**
 * Detailed view of a selected business.
 * Shows full information including description, contact, and actions.
 */
export function BusinessDetail({ business, onClose }: BusinessDetailProps) {
  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
      {/* Header image */}
      <div className="relative h-48">
        <img
          src={business.image}
          alt={business.name}
          className="w-full h-full object-cover"
        />
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 bg-gray-900/80 rounded-full hover:bg-gray-900 transition-colors"
          aria-label="Close details"
        >
          <X className="w-5 h-5 text-white" />
        </button>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 to-transparent p-4">
          <span className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-full capitalize">
            {business.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Title and rating */}
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold text-white">{business.name}</h2>
          <span className="text-green-400 font-semibold text-lg">
            {business.priceLevel}
          </span>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2 mt-2">
          <div className="flex items-center gap-1">
            <Star className="w-5 h-5 fill-green-400 text-green-400" />
            <span className="text-white font-semibold">{business.rating}</span>
          </div>
          <span className="text-gray-400">({business.reviewCount} reviews)</span>
        </div>

        {/* Description */}
        <p className="mt-4 text-gray-300 text-sm leading-relaxed">
          {business.description}
        </p>

        {/* Details list */}
        <div className="mt-5 space-y-3">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <span className="text-gray-300 text-sm">{business.address}</span>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-green-400 flex-shrink-0" />
            <span className="text-gray-300 text-sm">{business.hours}</span>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-green-400 flex-shrink-0" />
            <span className="text-gray-300 text-sm">{business.phone}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex gap-3">
          <Button className="flex-1 bg-green-500 hover:bg-green-600 text-white">
            <Navigation className="w-4 h-4 mr-2" />
            Get Directions
          </Button>
          <Button variant="outline" className="flex-1 border-gray-600 text-white hover:bg-gray-700">
            <Phone className="w-4 h-4 mr-2" />
            Call
          </Button>
        </div>
      </div>
    </div>
  );
}
