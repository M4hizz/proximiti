import { useState, useEffect, useCallback } from "react";
import { StarRating } from "./star-rating";
import { Button } from "@/components/ui/button";
import { fetchGoogleReviews, type GoogleReview } from "@/lib/reviewApi";
import { Loader2, MessageSquare, ExternalLink } from "lucide-react";

interface GoogleReviewsTabProps {
  businessName: string;
  lat: number;
  lng: number;
  /** Overall Google rating passed from business data */
  googleRating?: number;
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

/** Tab that fetches and paginates Google Places reviews (via backend proxy). */
export function GoogleReviewsTab({
  businessName,
  lat,
  lng,
  googleRating,
}: GoogleReviewsTabProps) {
  const [reviews, setReviews] = useState<GoogleReview[]>([]);
  const [displayCount, setDisplayCount] = useState(INITIAL_COUNT);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiConfigured, setApiConfigured] = useState(true);
  const [liveRating, setLiveRating] = useState<number | null>(
    googleRating ?? null,
  );
  const [totalRatings, setTotalRatings] = useState<number | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [hasMorePages, setHasMorePages] = useState(false);

  const loadGoogleReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchGoogleReviews(businessName, lat, lng);
      setReviews(data.reviews);
      setNextPageToken(data.nextPageToken);
      setHasMorePages(data.nextPageToken !== null);
      if (data.googleRating !== null) setLiveRating(data.googleRating);
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
  }, [businessName, lat, lng]);

  const loadMoreGoogleReviews = useCallback(async () => {
    if (!nextPageToken) {
      return;
    }
    setLoadingMore(true);
    setError(null);
    try {
      const data = await fetchGoogleReviews(businessName, lat, lng, nextPageToken);
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

  const displayedReviews = reviews.slice(0, displayCount);
  const canShowMore = hasMorePages || (displayCount < reviews.length);

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
      {displayedReviews.length === 0 ? (
        <div className="text-center py-8 text-gray-400 dark:text-gray-500">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No Google reviews found for this business.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedReviews.map((review, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-4 space-y-2"
            >
              {/* Author row */}
              <div className="flex items-start gap-3">
                {review.profile_photo_url ? (
                  <img
                    src={review.profile_photo_url}
                    alt={review.author_name}
                    className="w-8 h-8 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-semibold text-blue-700 dark:text-blue-300 shrink-0">
                    {review.author_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                        {review.author_name}
                      </span>
                      {review.author_url && (
                        <a
                          href={review.author_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0"
                          aria-label="View Google profile"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
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

      {/* Show more */}
      {canShowMore && (
        <Button
          variant="outline"
          onClick={handleShowMore}
          disabled={loadingMore}
          className="w-full border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
        >
          {loadingMore ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading…
            </>
          ) : hasMorePages ? (
            "Load More Reviews"
          ) : (
            `Show More (${reviews.length - displayCount} remaining)`
          )}
        </Button>
      )}
    </div>
  );
}
