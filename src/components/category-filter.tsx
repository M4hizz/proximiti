import { categories } from "@/lib/businesses";

interface CategoryFilterProps {
  selected: string;
  onSelect: (category: string) => void;
}

/**
 * Horizontal scrollable category filter.
 * Allows users to filter businesses by category.
 */
export function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelect(category.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
            selected === category.id
              ? "bg-cherry-rose text-white"
              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }`}
        >
          <span className="text-lg">{category.icon}</span>
          <span className="text-sm font-medium">{category.name}</span>
        </button>
      ))}
    </div>
  );
}
