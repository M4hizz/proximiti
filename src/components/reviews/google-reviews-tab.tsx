import { useState, useEffect, useCallback } from "react";
import { StarRating } from "./star-rating";
import { Button } from "@/components/ui/button";
import { fetchGoogleReviews, type GoogleReview } from "@/lib/reviewApi";
import { Loader2, MessageSquare } from "lucide-react";

// Palette of avatar bg/text colour pairs – deterministically chosen per reviewer name
const AVATAR_COLOURS = [
  "bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300",
  "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300",
  "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300",
  "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300",
  "bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300",
  "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
  "bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300",
  "bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300",
];

function avatarColour(name: string): string {
  const hash = name
    .split("")
    .reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0);
  return AVATAR_COLOURS[hash % AVATAR_COLOURS.length];
}

interface GoogleReviewsTabProps {
  businessName: string;
  lat: number;
  lng: number;
  /** Overall Google rating passed from business data */
  googleRating?: number;
  /** Called once Google's live rating + review count are known */
  onGoogleData?: (rating: number, totalRatings: number) => void;
}

const INITIAL_COUNT = 5;
const LOAD_MORE_COUNT = 5;

/** Formats a Unix timestamp to a human-readable date string. */
function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Tab that fetches and paginates Google reviews (SerpAPI when configured, Places API as fallback). */
export function GoogleReviewsTab({
  businessName,
  lat,
  lng,
  googleRating,
  onGoogleData,
}: GoogleReviewsTabProps) {
  const [reviews, setReviews] = useState<GoogleReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const cooldown = false;
  const [error, setError] = useState<string | null>(null);
  const [apiConfigured, setApiConfigured] = useState(true);
  const [liveRating, setLiveRating] = useState<number | null>(
    googleRating ?? null,
  );
  const [totalRatings, setTotalRatings] = useState<number | null>(null);
  const [displayCount, setDisplayCount] = useState(INITIAL_COUNT);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [hasMorePages, setHasMorePages] = useState(false);
  // placeId is returned server-side and sent back on subsequent pagination requests
  const [placeId, setPlaceId] = useState<string | null>(null);

  const loadGoogleReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchGoogleReviews(businessName, lat, lng);
      setReviews(data.reviews);
      setNextPageToken(data.nextPageToken);
      setHasMorePages(data.nextPageToken !== null);
      if (data.placeId) setPlaceId(data.placeId);
      if (data.googleRating !== null) {
        setLiveRating(data.googleRating);
        if (data.totalRatings !== null) {
          onGoogleData?.(data.googleRating, data.totalRatings);
        }
      }
      if (data.totalRatings !== null) setTotalRatings(data.totalRatings);
    } catch (err: any) {
      if (err.message?.includes("not configured")) {
        setApiConfigured(false);
      } else {
        setError("Could not load Google reviews at this time.");
      }
    } finally {
      setLoading(false);
    }
  }, [businessName, lat, lng]); // eslint-disable-line react-hooks/exhaustive-deps -- onGoogleData intentionally omitted to avoid re-runs

  const loadMoreGoogleReviews = useCallback(async () => {
    if (!nextPageToken) {
      return;
    }
    setLoadingMore(true);
    setError(null);
    try {
      const data = await fetchGoogleReviews(businessName, lat, lng, {
        pagetoken: nextPageToken,
        placeId: placeId ?? undefined,
      });
      setReviews((prev) => [...prev, ...data.reviews]);
      setNextPageToken(data.nextPageToken);
      setHasMorePages(data.nextPageToken !== null);
      setDisplayCount((prev) => prev + LOAD_MORE_COUNT);
    } catch (err: any) {
      const errorMsg = err.message || "Could not load more reviews.";
      if (errorMsg.includes("429") || errorMsg.includes("rate")) {
        setError("Rate limited by Google. Please wait a moment and try again.");
      } else {
        setError(errorMsg);
      }
      console.error("Error loading more reviews:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [businessName, lat, lng, nextPageToken]);

  useEffect(() => {
    loadGoogleReviews();
  }, [loadGoogleReviews]);

  const handleShowMore = () => {
    loadMoreGoogleReviews();
  };

  if (!apiConfigured) {
    return (
      <div className="text-center py-8 text-gray-400 dark:text-gray-500 space-y-2">
        <MessageSquare className="w-8 h-8 mx-auto opacity-50" />
        <p className="text-sm">
          Google Reviews integration is not yet configured.
        </p>
        <p className="text-xs text-gray-400">
          Add GOOGLE_PLACES_API_KEY to your server .env to enable this.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-green-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6 space-y-3">
        <p className="text-sm text-red-500">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={loadGoogleReviews}
          className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall Google rating */}
      {liveRating !== null && (
        <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
          <img
            src="https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png"
            alt="Google"
            className="w-7 h-7 object-contain"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {liveRating.toFixed(1)}
              </span>
              <StarRating value={liveRating} size="sm" />
            </div>
            {totalRatings !== null && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {totalRatings.toLocaleString()} Google ratings
              </p>
            )}
          </div>
        </div>
      )}

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <div className="text-center py-8 text-gray-400 dark:text-gray-500">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No Google reviews found for this business.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-4 space-y-2"
            >
              {/* Author row */}
              <div className="flex items-start gap-3">
                {/* Coloured letter avatar – no external image request */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${avatarColour(review.author_name)}`}
                >
                  {review.author_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                      {review.author_name}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                      {review.relative_time_description ||
                        formatTimestamp(review.time)}
                    </span>
                  </div>
                  <StarRating
                    value={review.rating}
                    size="sm"
                    className="mt-0.5"
                  />
                </div>
              </div>

              {/* Review text */}
              {review.text && (
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                  {review.text}
                </p>
              )}

              {/* Google attribution */}
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                via Google
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Show more – only present when SerpAPI has a next page */}
      {nextPageToken && (
        <Button
          variant="outline"
          onClick={handleShowMore}
          disabled={loadingMore || cooldown}
          className="w-full border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
        >
          {loadingMore ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading…
            </>
          ) : cooldown ? (
            "Please wait…"
          ) : hasMorePages ? (
            "Load More Reviews"
          ) : (
            "Show More Reviews"
          )}
        </Button>
      )}
    </div>
  );
}
