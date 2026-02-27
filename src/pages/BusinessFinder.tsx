import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth, useTheme } from "@/App";
import { MapView } from "@/components/map-view";
import { BusinessCard } from "@/components/business-card";
import { BusinessDetail } from "@/components/business-detail";
import { SearchBar } from "@/components/search-bar";
import { CategoryFilter } from "@/components/category-filter";
import { AdminPanel } from "@/components/admin-panel";
import { AskAIPanel, type AIResult } from "@/components/ask-ai-panel";
import { RidesharePanel } from "@/components/rideshare-panel";
import { businesses, calculateDistance } from "@/lib/businesses";
import { fetchNearbyBusinesses, searchBusinesses } from "@/lib/api";
import { getBookmarkedIds } from "@/lib/bookmarks";
import type { Business } from "@/lib/businesses";
import {
  User,
  LogOut,
  LogIn,
  Shield,
  SlidersHorizontal,
  Sun,
  Moon,
  Bookmark,
  Sparkles,
  Car,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlansModal } from "@/components/plans-modal";

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
  const location = useLocation();
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
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [premiumNotification, setPremiumNotification] = useState<
    "success" | "cancelled" | null
  >(null);

  // Handle return from Stripe checkout (?premium=success or ?premium=cancelled)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const premiumParam = params.get("premium");
    if (premiumParam === "success") {
      // Refresh user so isPremium / planType reflect the new state
      auth.refreshUser().then(() => {
        setPremiumNotification("success");
        setTimeout(() => setPremiumNotification(null), 6000);
      });
      // Clean URL without re-rendering the whole page
      navigate("/", { replace: true });
    } else if (premiumParam === "cancelled") {
      setPremiumNotification("cancelled");
      setTimeout(() => setPremiumNotification(null), 4000);
      navigate("/", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);
  const [sortBy, setSortBy] = useState<SortOption>("location");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);
  const [locationLabel, setLocationLabel] = useState<string>("");
  const [directionsTarget, setDirectionsTarget] = useState<Business | null>(
    null,
  );
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showRidesharePanel, setShowRidesharePanel] = useState(false);
  const [searchResults, setSearchResults] = useState<Business[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  // Live search via Google Places whenever the query changes.
  // Uses the known user location if available; otherwise silently gets it first.
  const locationRef = useRef(userLocation);
  locationRef.current = userLocation;

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Use known location, or get it now, or fall back to a wide default
        let searchLat = locationRef.current?.[0];
        let searchLng = locationRef.current?.[1];

        if (!searchLat || !searchLng) {
          // Try to get location silently (only once)
          try {
            const pos = await new Promise<GeolocationPosition>(
              (resolve, reject) =>
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                  timeout: 5000,
                  maximumAge: 60000,
                }),
            );
            searchLat = pos.coords.latitude;
            searchLng = pos.coords.longitude;
            setUserLocation([searchLat, searchLng]);
          } catch {
            // No location available — use a default
            searchLat = 43.7;
            searchLng = -79.4; // Greater Toronto area default
          }
        }

        const results = await searchBusinesses(
          trimmed,
          searchLat,
          searchLng,
          10000, // 10 km when searching by name
        );
        setSearchResults(results.length > 0 ? results : []);
      } catch {
        setSearchResults(null);
      } finally {
        setIsSearching(false);
      }
    }, 400); // 400 ms debounce
    return () => clearTimeout(timer);
  }, [searchQuery]); // Only depend on searchQuery — not userLocation (avoids re-fire loop)

  // Close sort dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
      case "$":
        return 1;
      case "$$":
        return 2;
      case "$$$":
        return 3;
      case "$$$$":
        return 4;
      default:
        return 5;
    }
  };

  // Filter businesses based on search and category, then sort based on selected option
  const filteredBusinesses = useMemo(() => {
    const bookmarkedIds = getBookmarkedIds();

    // Use live Google search results when available, otherwise filter local list
    const baseList: Business[] =
      searchResults !== null ? searchResults : availableBusinesses;

    let filtered: (Business & { distance?: number })[] = baseList.filter(
      (business) => {
        // When using search results, only apply category + bookmark filters
        if (searchResults !== null) {
          const matchesCategory =
            selectedCategory === "all" ||
            business.category === selectedCategory;
          const matchesBookmark =
            !showBookmarkedOnly || bookmarkedIds.includes(business.id);
          return matchesCategory && matchesBookmark;
        }
        const matchesSearch =
          business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          business.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          business.description
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
        const matchesCategory =
          selectedCategory === "all" || business.category === selectedCategory;
        const matchesBookmark =
          !showBookmarkedOnly || bookmarkedIds.includes(business.id);
        return matchesSearch && matchesCategory && matchesBookmark;
      },
    );

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
        filtered.sort(
          (a, b) => getPriceValue(a.priceLevel) - getPriceValue(b.priceLevel),
        );
        break;
    }

    return filtered;
  }, [
    availableBusinesses,
    searchResults,
    searchQuery,
    selectedCategory,
    userLocation,
    sortBy,
    showBookmarkedOnly,
  ]);

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

          // Reverse-geocode to get a human-readable label for the location input
          fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&format=json`,
            { headers: { "User-Agent": "Proximiti Business Finder" } },
          )
            .then((r) => r.json())
            .then((geo) => {
              const a = geo.address ?? {};
              const label =
                a.neighbourhood ||
                a.suburb ||
                a.quarter ||
                a.village ||
                a.town ||
                a.city ||
                a.county ||
                "Current Location";
              setLocationLabel(label);
            })
            .catch(() => setLocationLabel("Current Location"));

          // Fetch real nearby businesses from OpenStreetMap
          setIsLoadingBusinesses(true);
          try {
            const fetched = await fetchNearbyBusinesses(
              position.coords.latitude,
              position.coords.longitude,
              2000, // 2km radius
            );
            if (fetched.length > 0) {
              setNearbyBusinesses(fetched.slice(0, 25));
            } else {
              // No OSM results – fall back to static list sorted by distance
              const { getNearestBusinesses } = await import("@/lib/businesses");
              setNearbyBusinesses(
                getNearestBusinesses(
                  position.coords.latitude,
                  position.coords.longitude,
                  25,
                ),
              );
            }
          } catch (error) {
            console.error("Error fetching nearby businesses:", error);
            // Fall back to static businesses sorted by distance
            const { getNearestBusinesses } = await import("@/lib/businesses");
            setNearbyBusinesses(
              getNearestBusinesses(
                position.coords.latitude,
                position.coords.longitude,
                25,
              ),
            );
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
    // Use the first 1–2 parts of the Nominatim display name as the label
    const shortLabel = displayName.split(",").slice(0, 2).join(",").trim();
    setLocationLabel(shortLabel);

    // Fetch nearby businesses for the selected location
    setIsLoadingBusinesses(true);
    try {
      const fetched = await fetchNearbyBusinesses(lat, lng, 2000); // 2km radius
      if (fetched.length > 0) {
        setNearbyBusinesses(fetched.slice(0, 25));
      } else {
        const { getNearestBusinesses } = await import("@/lib/businesses");
        setNearbyBusinesses(getNearestBusinesses(lat, lng, 25));
      }
    } catch (error) {
      console.error("Error fetching nearby businesses:", error);
      const { getNearestBusinesses } = await import("@/lib/businesses");
      setNearbyBusinesses(getNearestBusinesses(lat, lng, 25));
    } finally {
      setIsLoadingBusinesses(false);
    }
  };

  // Handle business selection
  const handleSelectBusiness = (business: Business) => {
    setSelectedBusiness(business);
  };

  // Convert an AI result into a Business shape so it can be shown in the detail view
  const handleAIResult = (result: AIResult) => {
    const asBusiness: Business = {
      id: `ai-${result.id}`,
      name: result.name,
      category: result.category,
      rating: result.rating ?? 0,
      reviewCount: 0,
      address: result.address ?? "Address not available",
      hours: result.openingHours ?? "Hours not available",
      description: result.matchReason,
      image: `https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop`,
      lat: result.lat,
      lng: result.lng,
      phone: result.phone ?? "",
      priceLevel: "$$",
      website: result.website ?? undefined,
    };
    // Temporarily show this business in the list so it can be selected
    setNearbyBusinesses((prev) => {
      const withoutPrev = prev.filter((b) => !b.id.startsWith("ai-"));
      return [asBusiness, ...withoutPrev];
    });
    if (!userLocation) {
      setUserLocation([result.lat, result.lng]);
    }
    setSelectedBusiness(asBusiness);
    setSearchQuery("");
    // Scroll map into view on mobile
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Stripe return notifications */}
      {premiumNotification === "success" && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-100 flex items-center gap-3 px-5 py-3 bg-green-600 text-white rounded-xl shadow-xl text-sm font-medium animate-fade-in">
          🎉 You're now Premium! Enjoy your new plan.
          <button
            onClick={() => setPremiumNotification(null)}
            className="ml-2 text-white/70 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}
      {premiumNotification === "cancelled" && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-100 flex items-center gap-3 px-5 py-3 bg-gray-700 text-white rounded-xl shadow-xl text-sm font-medium">
          Payment cancelled — no charge was made.
          <button
            onClick={() => setPremiumNotification(null)}
            className="ml-2 text-white/70 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 overflow-visible">
        <div className="max-w-7xl mx-auto px-4 py-4 overflow-visible">
          {/* Top bar with logo and user */}
          <div className="flex items-center justify-between mb-4">
            {/* Logo and title */}
            <div className="flex items-center gap-3">
              <img
                src="/ProximitiImage.png"
                alt="Proximiti"
                className="w-10 h-10"
              />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Proximiti
              </h1>
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
                    onClick={() => setShowPlansModal(true)}
                    className={
                      auth.user?.isPremium
                        ? "text-green-400 hover:text-green-300 hover:bg-gray-800"
                        : "text-yellow-400 hover:text-yellow-300 hover:bg-gray-800"
                    }
                    title={
                      auth.user?.isPremium
                        ? "Manage Plan"
                        : "Upgrade to Premium"
                    }
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">
                      {auth.user?.isPremium ? "Plan" : "Upgrade"}
                    </span>
                  </Button>

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
                    title={
                      theme === "dark"
                        ? "Switch to light mode"
                        : "Switch to dark mode"
                    }
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
            locationDisplay={locationLabel}
            userLocation={userLocation}
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
      <main className="max-w-7xl mx-auto px-4 py-6 lg:h-[calc(100vh-65px)] lg:overflow-hidden lg:py-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Map section */}
          <div className="h-100 lg:h-[calc(100vh-200px)] lg:sticky lg:top-50">
            <MapView
              businesses={filteredBusinesses}
              selectedBusiness={selectedBusiness}
              onSelectBusiness={handleSelectBusiness}
              userLocation={userLocation}
              directionsTarget={directionsTarget}
              onClearDirections={() => setDirectionsTarget(null)}
            />
          </div>

          {/* List section */}
          <div className="relative lg:h-[calc(100vh-200px)] lg:overflow-hidden flex flex-col gap-4">
            {/* Results count and sort */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isLoadingBusinesses
                  ? "Loading..."
                  : isSearching
                    ? "Searching..."
                    : `${filteredBusinesses.length} ${filteredBusinesses.length === 1 ? "business" : "businesses"} found`}
              </h2>
              <div className="flex items-center gap-3">
                {userLocation && !isLoadingBusinesses && !isSearching && (
                  <span className="text-green-600 dark:text-green-400 text-sm flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full animate-pulse"></span>
                    {searchResults !== null
                      ? "Search results"
                      : "Using your location"}
                  </span>
                )}
                {isLoadingBusinesses && (
                  <span className="text-yellow-600 dark:text-yellow-400 text-sm flex items-center gap-1">
                    <span className="w-2 h-2 bg-yellow-500 dark:bg-yellow-400 rounded-full animate-pulse"></span>
                    Fetching nearby businesses...
                  </span>
                )}
                {isSearching && (
                  <span className="text-blue-600 dark:text-blue-400 text-sm flex items-center gap-1">
                    <span className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse"></span>
                    Searching Google Places...
                  </span>
                )}
                {/* Bookmarks filter button */}
                <button
                  onClick={() => setShowBookmarkedOnly(!showBookmarkedOnly)}
                  className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                    showBookmarkedOnly
                      ? "bg-cherry-rose text-white"
                      : "bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-white"
                  }`}
                  title="Show bookmarked businesses only"
                >
                  <Bookmark
                    className={`w-5 h-5 ${showBookmarkedOnly ? "fill-current" : ""}`}
                  />
                </button>
                {/* Ask AI button */}
                <button
                  onClick={() => setShowAIPanel(true)}
                  className="flex items-center gap-1.5 px-3 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/40 hover:bg-violet-200 dark:hover:bg-violet-800/60 text-violet-700 dark:text-violet-300 text-sm font-medium transition-colors"
                  title="Search with AI"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden sm:inline">Ask AI</span>
                </button>

                {/* Rideshare button */}
                <button
                  onClick={() => setShowRidesharePanel(true)}
                  className="flex items-center gap-1.5 px-3 h-10 rounded-lg bg-green-100 dark:bg-green-900/40 hover:bg-green-200 dark:hover:bg-green-800/60 text-green-700 dark:text-green-300 text-sm font-medium transition-colors"
                  title="Rideshare Lobby"
                >
                  <Car className="w-4 h-4" />
                  <span className="hidden sm:inline">Rideshare</span>
                </button>

                {/* Sort dropdown */}
                <div className="relative" ref={sortRef}>
                  <button
                    onClick={() => setIsSortOpen(!isSortOpen)}
                    className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                      isSortOpen
                        ? "bg-green-600 text-white"
                        : "bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-white"
                    }`}
                    title="Sort options"
                  >
                    <SlidersHorizontal className="w-5 h-5" />
                  </button>
                  {isSortOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Sort by
                      </div>
                      {sortOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setSortBy(option.value);
                            setIsSortOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 last:rounded-b-lg transition-colors ${
                            sortBy === option.value
                              ? "text-green-600 dark:text-green-400"
                              : "text-gray-900 dark:text-white"
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

            {/* Business list */}
            <div
              className={`space-y-3 overflow-y-auto flex-1 ${selectedBusiness ? "scrollbar-hide" : ""}`}
            >
              {isLoadingBusinesses || isSearching ? (
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

            {/* Business detail — overlays the list column */}
            {selectedBusiness && (
              <div className="absolute inset-0 z-20 overflow-y-auto rounded-xl shadow-2xl">
                <BusinessDetail
                  key={selectedBusiness.id}
                  business={selectedBusiness}
                  onClose={() => setSelectedBusiness(null)}
                  onGetDirections={() => {
                    setSelectedBusiness(null);
                    setDirectionsTarget(selectedBusiness);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Plans / Upgrade Modal */}
      <PlansModal
        isOpen={showPlansModal}
        onClose={() => setShowPlansModal(false)}
      />

      {/* Admin Panel Modal */}
      <AdminPanel
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
        businesses={availableBusinesses}
      />

      {/* Ask AI Panel */}
      <AskAIPanel
        isOpen={showAIPanel}
        onClose={() => setShowAIPanel(false)}
        userLocation={userLocation}
        onSelectResult={handleAIResult}
      />

      {/* Rideshare Panel */}
      <RidesharePanel
        isOpen={showRidesharePanel}
        onClose={() => setShowRidesharePanel(false)}
        userLocation={userLocation}
      />
    </div>
  );
}

export default BusinessFinder;
