import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useTheme } from "@/App";
import { MapView } from "@/components/map-view";
import { BusinessCard } from "@/components/business-card";
import { BusinessDetail } from "@/components/business-detail";
import { SearchBar } from "@/components/search-bar";
import { CategoryFilter } from "@/components/category-filter";
import { AdminPanel } from "@/components/admin-panel";
import { businesses, calculateDistance } from "@/lib/businesses";
import { fetchNearbyBusinesses } from "@/lib/api";
import { getBookmarkedIds } from "@/lib/bookmarks";
import type { Business } from "@/lib/businesses";
import { User, LogOut, LogIn, Shield, SlidersHorizontal, Sun, Moon, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";

export type SortOption = "location" | "reviews" | "az" | "price";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "location", label: "Location (Nearest)" },
  { value: "reviews", label: "Highest Rated" },
  { value: "az", label: "A-Z" },
  { value: "price", label: "Price: Low to High" },
];

/**
 * Main Business Finder page.
 * Features interactive map, searchable business list, and detail views.
 */
export function BusinessFinder() {
  const navigate = useNavigate();
  const auth = useAuth();
  const { theme, toggleTheme } = useTheme();

  // State management
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(
    null,
  );
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null,
  );
  const [nearbyBusinesses, setNearbyBusinesses] = useState<Business[]>([]);
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("location");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);

  // Get businesses based on user location (real API data) or default mock businesses
  const availableBusinesses = useMemo(() => {
    if (userLocation && nearbyBusinesses.length > 0) {
      return nearbyBusinesses;
    }
    return businesses;
  }, [userLocation, nearbyBusinesses]);

  // Helper to convert price level to numeric value
  const getPriceValue = (priceLevel: string): number => {
    switch (priceLevel) {
      case "$": return 1;
      case "$$": return 2;
      case "$$$": return 3;
      case "$$$$": return 4;
      default: return 5;
    }
  };

  // Filter businesses based on search and category, then sort based on selected option
  const filteredBusinesses = useMemo(() => {
    const bookmarkedIds = getBookmarkedIds();
    
    let filtered: (Business & { distance?: number })[] = availableBusinesses.filter((business) => {
      const matchesSearch =
        business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        business.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        business.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === "all" || business.category === selectedCategory;

      const matchesBookmark = !showBookmarkedOnly || bookmarkedIds.includes(business.id);

      return matchesSearch && matchesCategory && matchesBookmark;
    });

    // Add distance to each business if user location is available
    if (userLocation) {
      filtered = filtered.map((business) => ({
        ...business,
        distance: calculateDistance(
          userLocation[0],
          userLocation[1],
          business.lat,
          business.lng,
        ),
      }));
    }

    // Apply sorting based on selected option
    switch (sortBy) {
      case "location":
        if (userLocation) {
          filtered.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
        }
        break;
      case "reviews":
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case "az":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "price":
        filtered.sort((a, b) => getPriceValue(a.priceLevel) - getPriceValue(b.priceLevel));
        break;
    }

    return filtered;
  }, [availableBusinesses, searchQuery, selectedCategory, userLocation, sortBy, showBookmarkedOnly]);

  // Handle user location detection and fetch nearby businesses
  const handleLocateUser = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords: [number, number] = [
            position.coords.latitude,
            position.coords.longitude,
          ];
          setUserLocation(coords);

          // Fetch real nearby businesses from OpenStreetMap
          setIsLoadingBusinesses(true);
          try {
            const businesses = await fetchNearbyBusinesses(
              position.coords.latitude,
              position.coords.longitude,
              2000, // 2km radius
            );
            // Limit to 25 closest businesses
            setNearbyBusinesses(businesses.slice(0, 25));
          } catch (error) {
            console.error("Error fetching nearby businesses:", error);
            alert("Unable to fetch nearby businesses. Showing default list.");
          } finally {
            setIsLoadingBusinesses(false);
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          alert(
            "Unable to get your location. Please enable location services.",
          );
        },
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  // Handle manual location selection from autocomplete
  const handleLocationSelect = async (
    lat: number,
    lng: number,
    displayName: string,
  ) => {
    const coords: [number, number] = [lat, lng];
    setUserLocation(coords);

    // Fetch nearby businesses for the selected location
    setIsLoadingBusinesses(true);
    try {
      const businesses = await fetchNearbyBusinesses(lat, lng, 2000); // 2km radius
      setNearbyBusinesses(businesses.slice(0, 25));
    } catch (error) {
      console.error("Error fetching nearby businesses:", error);
      alert("Unable to fetch nearby businesses. Showing default list.");
    } finally {
      setIsLoadingBusinesses(false);
    }
  };

  // Handle business selection
  const handleSelectBusiness = (business: Business) => {
    setSelectedBusiness(business);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 overflow-visible">
        <div className="max-w-7xl mx-auto px-4 py-4 overflow-visible">
          {/* Top bar with logo and user */}
          <div className="flex items-center justify-between mb-4">
            {/* Logo and title */}
            <div className="flex items-center gap-3">
              <img src="/ProximitiImage.png" alt="Proximiti" className="w-10 h-10" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Proximiti</h1>
              <span className="text-gray-500 dark:text-gray-400 text-sm hidden sm:inline">
                Discover local businesses
              </span>
            </div>

            {/* User section */}
            <div className="flex items-center gap-3">
              {auth.user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-200 dark:bg-gray-800 rounded-full">
                    <User className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-gray-900 dark:text-white text-sm font-medium">
                      {auth.user.name}
                    </span>
                    {auth.user.role === "admin" && (
                      <span className="ml-2 px-2 py-1 bg-purple-600 text-white text-xs rounded-full">
                        Admin
                      </span>
                    )}
                  </div>

                  {/* Admin Panel Button */}
                  {auth.user.role === "admin" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsAdminPanelOpen(true)}
                      className="text-purple-400 hover:text-purple-300 hover:bg-gray-800"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Admin</span>
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => auth.logout()}
                    className="text-gray-400 hover:text-white hover:bg-gray-800 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Log out</span>
                  </Button>

                  {/* Theme toggle */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleTheme}
                    className="text-gray-400 hover:text-white hover:bg-gray-800 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800"
                    title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                  >
                    {theme === "dark" ? (
                      <Sun className="w-4 h-4" />
                    ) : (
                      <Moon className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => navigate("/login")}
                  className="bg-cherry-rose hover:bg-green-600 text-white"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              )}
            </div>
          </div>

          {/* Search bar */}
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onLocateUser={handleLocateUser}
            onLocationSelect={handleLocationSelect}
          />

          {/* Category filter */}
          <div className="mt-4">
            <CategoryFilter
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Map section */}
          <div className="h-[400px] lg:h-[calc(100vh-280px)] lg:sticky lg:top-[200px]">
            <MapView
              businesses={filteredBusinesses}
              selectedBusiness={selectedBusiness}
              onSelectBusiness={handleSelectBusiness}
              userLocation={userLocation}
            />
          </div>

          {/* List section */}
          <div className="space-y-4">
            {/* Results count and sort */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isLoadingBusinesses
                  ? "Loading..."
                  : `${filteredBusinesses.length} ${filteredBusinesses.length === 1 ? "business" : "businesses"} found`}
              </h2>
              <div className="flex items-center gap-3">
                {userLocation && !isLoadingBusinesses && (
                  <span className="text-green-600 dark:text-green-400 text-sm flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full animate-pulse"></span>
                    Using your location
                  </span>
                )}
                {isLoadingBusinesses && (
                  <span className="text-yellow-600 dark:text-yellow-400 text-sm flex items-center gap-1">
                    <span className="w-2 h-2 bg-yellow-500 dark:bg-yellow-400 rounded-full animate-pulse"></span>
                    Fetching nearby businesses...
                  </span>
                )}
                {/* Bookmarks filter button */}
                <button
                  onClick={() => setShowBookmarkedOnly(!showBookmarkedOnly)}
                  className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                    showBookmarkedOnly ? "bg-cherry-rose text-white" : "bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-white"
                  }`}
                  title="Show bookmarked businesses only"
                >
                  <Bookmark className={`w-5 h-5 ${showBookmarkedOnly ? "fill-current" : ""}`} />
                </button>
                {/* Sort dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsSortOpen(!isSortOpen)}
                    className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                      isSortOpen ? "bg-green-600 text-white" : "bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-white"
                    }`}
                    title="Sort options"
                  >
                    <SlidersHorizontal className="w-5 h-5" />
                  </button>
                  {isSortOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Sort by</div>
                      {sortOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setSortBy(option.value);
                            setIsSortOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 last:rounded-b-lg transition-colors ${
                            sortBy === option.value ? "text-green-600 dark:text-green-400" : "text-gray-900 dark:text-white"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Business list with inline detail expansion */}
            <div className="space-y-3">
              {isLoadingBusinesses ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
                  <p className="text-lg">Finding nearby businesses...</p>
                </div>
              ) : filteredBusinesses.length > 0 ? (
                filteredBusinesses.map((business) => (
                  <div key={business.id}>
                    <BusinessCard
                      business={business}
                      isSelected={selectedBusiness?.id === business.id}
                      onClick={() => handleSelectBusiness(business)}
                    />
                    {/* Show detail below the selected card */}
                    {selectedBusiness?.id === business.id && (
                      <div className="mt-3 animate-slideDown">
                        <BusinessDetail
                          key={selectedBusiness.id}
                          business={selectedBusiness}
                          onClose={() => setSelectedBusiness(null)}
                        />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <p className="text-lg">No businesses found</p>
                  <p className="text-sm mt-2">
                    Try adjusting your search or filters
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Admin Panel Modal */}
      <AdminPanel
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
      />
    </div>
  );
}

export default BusinessFinder;
