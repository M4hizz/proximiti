import { ThumbsUp } from "lucide-react";
import { useState } from "react";
import { StarRating } from "./star-rating";
import type { ProximitiReview } from "@/lib/reviewApi";
import { toggleHelpful } from "@/lib/reviewApi";
import { cn } from "@/lib/utils";
import { useAuth } from "@/App";

interface ReviewCardProps {
  review: ProximitiReview;
  onHelpfulToggled?: (reviewId: string, isNowHelpful: boolean) => void;
}

/** Display a single Proximiti review with a "Found this helpful?" button. */
export function ReviewCard({ review, onHelpfulToggled }: ReviewCardProps) {
  const { isAuthenticated } = useAuth();
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulCount);
  const [isHelpful, setIsHelpful] = useState(review.userFoundHelpful);
  const [toggling, setToggling] = useState(false);

  const handleHelpful = async () => {
    if (!isAuthenticated || toggling) return;
    setToggling(true);
    try {
      const { helpful } = await toggleHelpful(review.id);
      setIsHelpful(helpful);
      setHelpfulCount((prev) => prev + (helpful ? 1 : -1));
      onHelpfulToggled?.(review.id, helpful);
    } catch {
      // silently ignore
    } finally {
      setToggling(false);
    }
  };

  const initials = review.userName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const formattedDate = new Date(review.createdAt).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="shrink-0 w-9 h-9 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-sm font-semibold text-green-700 dark:text-green-300">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">
              {review.userName}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
              {formattedDate}
            </span>
          </div>
          <StarRating value={review.rating} size="sm" className="mt-0.5" />
        </div>
      </div>

      {/* Review text */}
      <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
        {review.text}
      </p>

      {/* Helpful button */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleHelpful}
          disabled={!isAuthenticated || toggling}
          className={cn(
            "flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 border transition-colors",
            isAuthenticated
              ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
              : "cursor-default opacity-60",
            isHelpful
              ? "border-green-400 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30"
              : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400",
          )}
          title={
            isAuthenticated ? undefined : "Log in to mark reviews as helpful"
          }
        >
          <ThumbsUp
            className={cn(
              "w-3 h-3",
              isHelpful && "fill-green-500 dark:fill-green-400",
            )}
          />
          <span>Helpful{helpfulCount > 0 ? ` (${helpfulCount})` : ""}</span>
        </button>
        {!isAuthenticated && (
          <span className="text-xs text-gray-400 dark:text-gray-500 italic">
            Log in to vote
          </span>
        )}
      </div>
    </div>
  );
}
