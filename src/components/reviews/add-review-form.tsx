import { useState } from "react";
import { Button } from "@/components/ui/button";
import { submitReview, type ProximitiReview } from "@/lib/reviewApi";
import { useAuth } from "@/App";

interface AddReviewFormProps {
  businessId: string;
  onReviewSubmitted: (review: ProximitiReview) => void;
}

/** Form to submit a new Proximiti review. Requires login. */
export function AddReviewForm({
  businessId,
  onReviewSubmitted,
}: AddReviewFormProps) {
  const { isAuthenticated } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated) {
    return (
      <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-5 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            Sign in
          </span>{" "}
          to leave a review.
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rating === 0) {
      setError("Please select a star rating.");
      return;
    }
    if (text.trim().length < 10) {
      setError("Review must be at least 10 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const { review } = await submitReview(businessId, rating, text.trim());
      onReviewSubmitted(review);
      setRating(0);
      setText("");
    } catch (err: any) {
      setError(err.message || "Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoverRating || rating;

  const ratingLabels: Record<number, string> = {
    1: "Poor",
    2: "Fair",
    3: "Good",
    4: "Very Good",
    5: "Excellent",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
        Write a Review
      </h3>

      {/* Star picker */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(star)}
              className="cursor-pointer transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded"
              aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
            >
              <svg
                className={`w-7 h-7 transition-colors ${
                  star <= displayRating
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-gray-300 dark:text-gray-600 fill-none"
                }`}
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                />
              </svg>
            </button>
          ))}
        </div>
        {displayRating > 0 && (
          <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
            {ratingLabels[displayRating]}
          </span>
        )}
      </div>

      {/* Review text */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Share your experience with this business (min. 10 characters)…"
        rows={3}
        maxLength={1000}
        className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm p-3 resize-none focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 transition"
      />
      <div className="flex items-center justify-between -mt-2">
        <span
          className={`text-xs ${text.length > 950 ? "text-orange-500" : "text-gray-400 dark:text-gray-500"}`}
        >
          {text.length}/1000
        </span>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-500 dark:text-red-400 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={submitting || rating === 0 || text.trim().length < 10}
        className="w-full bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit Review"}
      </Button>
    </form>
  );
}
