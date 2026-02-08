import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import { MapView } from "@/components/map-view";
import { BusinessCard } from "@/components/business-card";
import { BusinessDetail } from "@/components/business-detail";
import { SearchBar } from "@/components/search-bar";
import { CategoryFilter } from "@/components/category-filter";
import { AdminPanel } from "@/components/admin-panel";
import { businesses, calculateDistance } from "@/lib/businesses";
import { fetchNearbyBusinesses } from "@/lib/api";
import type { Business } from "@/lib/businesses";
import { Compass, User, LogOut, LogIn, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Main Business Finder page.
 * Features interactive map, searchable business list, and detail views.
 */
export function BusinessFinder() {
  const navigate = useNavigate();
  const auth = useAuth();

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

  // Get businesses based on user location (real API data) or default mock businesses
  const availableBusinesses = useMemo(() => {
    if (userLocation && nearbyBusinesses.length > 0) {
      return nearbyBusinesses;
    }
    return businesses;
  }, [userLocation, nearbyBusinesses]);

  // Filter businesses based on search and category, then sort by distance if location available
  const filteredBusinesses = useMemo(() => {
    let filtered = availableBusinesses.filter((business) => {
      const matchesSearch =
        business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        business.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        business.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === "all" || business.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });

    // Sort by distance if user location is available
    if (userLocation) {
      filtered = filtered
        .map((business) => ({
          ...business,
          distance: calculateDistance(
            userLocation[0],
            userLocation[1],
            business.lat,
            business.lng,
          ),
        }))
        .sort((a, b) => a.distance - b.distance);
    }

    return filtered;
  }, [availableBusinesses, searchQuery, selectedCategory, userLocation]);

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

  // Handle business selection
  const handleSelectBusiness = (business: Business) => {
    setSelectedBusiness(business);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Top bar with logo and user */}
          <div className="flex items-center justify-between mb-4">
            {/* Logo and title */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cherry-rose rounded-lg">
                <Compass className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">Proximiti</h1>
              <span className="text-gray-400 text-sm hidden sm:inline">
                Discover local businesses
              </span>
            </div>

            {/* User section */}
            <div className="flex items-center gap-3">
              {auth.user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-full">
                    <User className="w-4 h-4 text-green-400" />
                    <span className="text-white text-sm font-medium">
                      {auth.user.name}
                    </span>
                    {auth.user.role === 'admin' && (
                      <span className="ml-2 px-2 py-1 bg-purple-600 text-white text-xs rounded-full">
                        Admin
                      </span>
                    )}
                  </div>
                  
                  {/* Admin Panel Button */}
                  {auth.user.role === 'admin' && (
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
                    className="text-gray-400 hover:text-white hover:bg-gray-800"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Log out</span>
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
            {/* Results count */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                {isLoadingBusinesses
                  ? "Loading..."
                  : `${filteredBusinesses.length} ${filteredBusinesses.length === 1 ? "business" : "businesses"} found`}
              </h2>
              {userLocation && !isLoadingBusinesses && (
                <span className="text-green-400 text-sm flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Using your location
                </span>
              )}
              {isLoadingBusinesses && (
                <span className="text-yellow-400 text-sm flex items-center gap-1">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                  Fetching nearby businesses...
                </span>
              )}
            </div>

            {/* Business detail (shown when selected) */}
            {selectedBusiness && (
              <BusinessDetail
                business={selectedBusiness}
                onClose={() => setSelectedBusiness(null)}
              />
            )}

            {/* Business list */}
            <div className="space-y-3">
              {isLoadingBusinesses ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
                  <p className="text-lg">Finding nearby businesses...</p>
                </div>
              ) : filteredBusinesses.length > 0 ? (
                filteredBusinesses.map((business) => (
                  <BusinessCard
                    key={business.id}
                    business={business}
                    isSelected={selectedBusiness?.id === business.id}
                    onClick={() => handleSelectBusiness(business)}
                  />
                ))
              ) : (
                <div className="text-center py-12 text-gray-400">
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
