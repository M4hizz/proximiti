import { Search, MapPin } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onLocateUser: () => void;
}

/**
 * Search bar component with location button.
 * Allows searching by business name or category.
 */
export function SearchBar({ value, onChange, onLocateUser }: SearchBarProps) {
  return (
    <div className="flex gap-3">
      {/* Search input */}
      <div className="flex-1 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search businesses, categories..."
          className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
        />
      </div>

      {/* Location button */}
      <button
        onClick={onLocateUser}
        className="px-4 bg-green-500 hover:bg-green-600 rounded-xl transition-colors flex items-center gap-2 text-white font-medium"
        aria-label="Use my location"
      >
        <MapPin className="w-5 h-5" />
        <span className="hidden sm:inline">Near me</span>
      </button>
    </div>
  );
}
