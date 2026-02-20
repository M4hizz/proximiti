import { useState, useEffect } from "react";
import { GoogleReviewsTab } from "./google-reviews-tab";
import { ProximitiReviewsTab } from "./proximiti-reviews-tab";
import { fetchProximitiReviews } from "@/lib/reviewApi";
import { cn } from "@/lib/utils";

interface ReviewsSectionProps {
  businessId: string;
  businessName: string;
  lat: number;
  lng: number;
  /** Fallback star rating from business data */
  rating?: number;
  /** Called once Google's live rating + total ratings count are known */
  onGoogleData?: (rating: number, totalRatings: number) => void;
}

type Tab = "google" | "proximiti";

/** Phase-out threshold – must match server constant */
const PROXIMITI_PHASE_OUT_THRESHOLD = 10;

/**
 * Combined reviews section with Google and Proximiti tabs.
 * Once a business accumulates >= 10 Proximiti reviews the Google tab is
 * hidden entirely and Proximiti reviews are shown exclusively.
 */
export function ReviewsSection({
  businessId,
  businessName,
  lat,
  lng,
  rating,
  onGoogleData,
}: ReviewsSectionProps) {
  const [activeTab, setActiveTab] = useState<Tab>("google");
  const [proximitiCount, setProximitiCount] = useState<number | null>(null);
  const [useProximitiOnly, setUseProximitiOnly] = useState(false);

  // Fetch the Proximiti review count once so we know which tabs to show
  useEffect(() => {
    fetchProximitiReviews(businessId, 1, 0)
      .then((res) => {
        setProximitiCount(res.proximitiCount);
        const phaseOut = res.proximitiCount >= PROXIMITI_PHASE_OUT_THRESHOLD;
        setUseProximitiOnly(phaseOut);
        if (phaseOut) setActiveTab("proximiti");
      })
      .catch(() => {
        // silently ignore – both tabs will still render
      });
  }, [businessId]);

  const tabs: { id: Tab; label: string; badge?: number | null }[] =
    useProximitiOnly
      ? [{ id: "proximiti", label: "Proximiti Reviews", badge: proximitiCount }]
      : [
          { id: "google", label: "Google Reviews" },
          {
            id: "proximiti",
            label: "Proximiti Reviews",
            badge: proximitiCount ?? undefined,
          },
        ];

  return (
    <div className="space-y-4">
      {/* Phase-out notice */}
      {useProximitiOnly && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          🎉 This business has enough Proximiti reviews to stand on its own —
          Google reviews are no longer shown.
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg py-2 px-3 transition-colors",
              activeTab === tab.id
                ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200",
            )}
          >
            {tab.id === "google" && (
              <img
                src="https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png"
                alt=""
                className="w-4 h-4 object-contain"
              />
            )}
            {tab.label}
            {tab.badge != null && tab.badge > 0 && (
              <span className="ml-1 text-xs bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 rounded-full px-1.5 py-0.5">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "google" && !useProximitiOnly && (
        <GoogleReviewsTab
          businessName={businessName}
          lat={lat}
          lng={lng}
          googleRating={rating}
          onGoogleData={onGoogleData}
        />
      )}
      {activeTab === "proximiti" && (
        <ProximitiReviewsTab businessId={businessId} />
      )}
    </div>
  );
}
