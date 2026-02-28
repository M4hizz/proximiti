import { useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Check,
  CreditCard,
  Lock,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { startStripeCheckout, cancelSubscription } from "@/lib/paymentApi";
import { useAuth } from "@/App";

interface PlansModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PLANS = [
  {
    id: "basic" as const,
    name: "Basic",
    price: null,
    priceLabel: "Free",
    features: ["Advertisements", "Bi-weekly coupons", "Service fees"],
  },
  {
    id: "essential" as const,
    name: "Essential",
    price: 18.99,
    priceLabel: "$18.99",
    features: ["Ad-free browsing", "Weekly express coupons", "Free delivery"],
    popular: true,
  },
  {
    id: "enterprise" as const,
    name: "Enterprise",
    price: 45.99,
    priceLabel: "$45.99",
    features: [
      "Everything from Essential",
      "In-site sponsored ads",
      "Business analytics",
    ],
  },
] as const;

function getMonthsLeft(
  planExpiresAt: string | null | undefined,
): number | null {
  if (!planExpiresAt) return null;
  const diff = new Date(planExpiresAt).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24 * 30));
}

export function PlansModal({ isOpen, onClose }: PlansModalProps) {
  const { user, login } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentPlan = user?.planType ?? "basic";
  const monthsLeft = getMonthsLeft(user?.planExpiresAt);

  const handleStripe = async (planId: "essential" | "enterprise") => {
    setError(null);
    setLoadingPlan(planId);
    try {
      await startStripeCheckout(planId);
    } catch (err: any) {
      setError(err.message || "Failed to start checkout.");
      setLoadingPlan(null);
    }
  };

  const handleCancel = async () => {
    if (!confirmCancel) {
      setConfirmCancel(true);
      return;
    }
    setError(null);
    setCancelling(true);
    try {
      const updatedUser = await cancelSubscription();
      // Update auth state directly from the response — avoids a separate
      // getCurrentUser() call that can fail mid-session
      login(updatedUser as any);
      setConfirmCancel(false);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to cancel subscription.");
    } finally {
      setCancelling(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl bg-white dark:bg-gray-950 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Choose your plan
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Unlock more with Proximiti Premium
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Plans grid */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const isBasic = plan.id === "basic";
            const isLoading = loadingPlan === plan.id;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-xl border p-5 transition-all ${
                  isCurrent
                    ? "border-green-500 dark:border-green-500 bg-green-50 dark:bg-green-900/10 shadow-sm"
                    : isBasic
                      ? "border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 opacity-70"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-green-400 dark:hover:border-green-500 hover:shadow-sm"
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-green-600 text-white text-xs font-bold rounded-full whitespace-nowrap">
                    Current Plan
                  </div>
                )}
                {"popular" in plan && plan.popular && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full whitespace-nowrap">
                    Most Popular
                  </div>
                )}

                <div className="mb-4">
                  <h3
                    className={`text-base font-bold ${isBasic && !isCurrent ? "text-gray-400 dark:text-gray-500" : "text-gray-900 dark:text-white"}`}
                  >
                    {plan.name}
                  </h3>
                  <div className="mt-1 flex items-end gap-1">
                    <span
                      className={`text-2xl font-extrabold ${
                        isCurrent
                          ? "text-green-600 dark:text-green-400"
                          : isBasic
                            ? "text-gray-400 dark:text-gray-500"
                            : "text-gray-900 dark:text-white"
                      }`}
                    >
                      {plan.priceLabel}
                    </span>
                    {plan.price && (
                      <span className="text-gray-400 text-xs mb-1">/ mo</span>
                    )}
                  </div>
                  {isCurrent && !isBasic && monthsLeft !== null && (
                    <div className="mt-1.5 flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                      <Calendar className="w-3 h-3" />
                      {monthsLeft > 0
                        ? `${monthsLeft} month${monthsLeft === 1 ? "" : "s"} remaining`
                        : "Expires soon"}
                    </div>
                  )}
                </div>

                <ul className="flex-1 space-y-2 mb-5">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm"
                    >
                      {isBasic ? (
                        <span className="mt-0.5 w-4 h-4 shrink-0 text-gray-400 text-center leading-none">
                          ·
                        </span>
                      ) : (
                        <Check className="w-4 h-4 shrink-0 mt-0.5 text-green-500" />
                      )}
                      <span
                        className={
                          isBasic && !isCurrent
                            ? "text-gray-400 dark:text-gray-500"
                            : "text-gray-700 dark:text-gray-300"
                        }
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="w-full py-2 rounded-lg text-center text-green-600 dark:text-green-400 text-sm font-semibold border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                    Active
                  </div>
                ) : isBasic ? (
                  <div className="w-full py-2 rounded-lg text-center text-gray-400 text-sm font-medium border border-gray-200 dark:border-gray-700">
                    Free
                  </div>
                ) : (
                  <Button
                    onClick={() =>
                      handleStripe(plan.id as "essential" | "enterprise")
                    }
                    disabled={loadingPlan !== null}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold disabled:opacity-50"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Redirecting…
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        {currentPlan !== "basic"
                          ? `Switch to ${plan.name}`
                          : `Get ${plan.name}`}
                      </span>
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 space-y-3">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Cancel subscription for paid plan users */}
          {user?.isPremium && currentPlan !== "basic" && (
            <div
              className={`rounded-lg border p-3 transition-all ${confirmCancel ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20" : "border-gray-200 dark:border-gray-700"}`}
            >
              {confirmCancel ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-medium">
                    <AlertTriangle className="w-4 h-4" />
                    Are you sure? You'll lose premium access immediately.
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmCancel(false)}
                      disabled={cancelling}
                      className="flex-1 text-gray-600 dark:text-gray-400"
                    >
                      Keep Plan
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    >
                      {cancelling ? "Cancelling…" : "Yes, Cancel"}
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmCancel(true)}
                  className="w-full text-sm text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors text-center"
                >
                  Cancel subscription
                </button>
              )}
            </div>
          )}

          <p className="text-center text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1">
            <Lock className="w-3 h-3" />
            Secure payment powered by Stripe.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
