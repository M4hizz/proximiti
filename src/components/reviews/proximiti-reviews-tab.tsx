import { useState, useEffect, useCallback } from "react";
import { ReviewCard } from "./review-card";
import { AddReviewForm } from "./add-review-form";
import { StarRating } from "./star-rating";
import { Button } from "@/components/ui/button";
import {
  fetchProximitiReviews,
  type ProximitiReview,
  type ReviewsResponse,
} from "@/lib/reviewApi";
import { Loader2, MessageSquare } from "lucide-react";

interface ProximitiReviewsTabProps {
  businessId: string;
}

const PAGE_SIZE = 5;

/** Tab showing Proximiti (our own) reviews + submission form. */
export function ProximitiReviewsTab({ businessId }: ProximitiReviewsTabProps) {
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [displayedReviews, setDisplayedReviews] = useState<ProximitiReview[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [offset, setOffset] = useState(PAGE_SIZE);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchProximitiReviews(businessId, PAGE_SIZE, 0);
      setData(res);
      setDisplayedReviews(res.reviews);
      setHasMore(res.hasMore);
      setOffset(PAGE_SIZE);
    } catch (err: any) {
      setError("Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const loadMore = async () => {
    if (loadingMore || cooldown) return;
    setLoadingMore(true);
    setCooldown(true);
    try {
      const res = await fetchProximitiReviews(businessId, PAGE_SIZE, offset);
      setDisplayedReviews((prev) => [...prev, ...res.reviews]);
      setHasMore(res.hasMore);
      setOffset((prev) => prev + PAGE_SIZE);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
      setTimeout(() => setCooldown(false), 3000);
    }
  };

  const handleReviewSubmitted = (review: ProximitiReview) => {
    setDisplayedReviews((prev) => [review, ...prev]);
    setData((prev) =>
      prev
        ? {
            ...prev,
            total: prev.total + 1,
            userReview: review,
            proximitiCount: prev.proximitiCount + 1,
          }
        : prev,
    );
  };

  // Compute aggregate rating
  const avgRating =
    displayedReviews.length > 0
      ? displayedReviews.reduce((sum, r) => sum + r.rating, 0) /
        displayedReviews.length
      : 0;

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-green-500" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-500 text-center py-6">{error}</p>;
  }

  return (
    <div className="space-y-5">
      {/* Overall rating summary */}
      {data && data.total > 0 && (
        <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {avgRating.toFixed(1)}
            </div>
            <StarRating
              value={avgRating}
              size="sm"
              className="mt-1 justify-center"
            />
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {data.total} review{data.total !== 1 ? "s" : ""}
            </div>
          </div>
          {/* Rating distribution bars */}
          <div className="flex-1 space-y-1">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = displayedReviews.filter(
                (r) => r.rating === star,
              ).length;
              const pct = data.total > 0 ? (count / data.total) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-gray-500 dark:text-gray-400 text-right">
                    {star}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-yellow-400 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add review form – only show if user hasn't reviewed yet */}
      {!data?.userReview && (
        <AddReviewForm
          businessId={businessId}
          onReviewSubmitted={handleReviewSubmitted}
        />
      )}

      {/* Already reviewed banner */}
      {data?.userReview && (
        <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          You've already reviewed this business. Thank you!
        </div>
      )}

      {/* Reviews list */}
      {displayedReviews.length === 0 ? (
        <div className="text-center py-8 text-gray-400 dark:text-gray-500">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No Proximiti reviews yet. Be the first!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}

      {/* Show more */}
      {hasMore && (
        <Button
          variant="outline"
          onClick={loadMore}
          disabled={loadingMore || cooldown}
          className="w-full border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
        >
          {loadingMore ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading…
            </>
          ) : cooldown ? (
            "Please wait…"
          ) : (
            "Show More Reviews"
          )}
        </Button>
      )}
    </div>
  );
}
