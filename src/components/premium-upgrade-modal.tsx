import { useState } from "react";
import { Button } from "@/components/ui/button";
import { startStripeCheckout, demoUpgrade } from "@/lib/paymentApi";
import { useAuth } from "@/App";
import {
  Crown,
  Check,
  Zap,
  Lock,
  CreditCard,
  FlaskConical,
  X,
} from "lucide-react";

interface PremiumUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful upgrade so the parent can refresh state */
  onUpgraded?: () => void;
}

const BENEFITS = [
  "Unlock exclusive Premium-only coupons & deals",
  "Early access to limited-time offers",
  "Ad-free browsing experience",
  "Priority customer support",
  "Monthly deal digest newsletter",
];

export function PremiumUpgradeModal({
  isOpen,
  onClose,
  onUpgraded,
}: PremiumUpgradeModalProps) {
  const { refreshUser } = useAuth();
  const [loadingStripe, setLoadingStripe] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoSuccess, setDemoSuccess] = useState(false);

  if (!isOpen) return null;

  const handleStripe = async () => {
    setError(null);
    setLoadingStripe(true);
    try {
      await startStripeCheckout();
      // Page will redirect to Stripe — no further action needed here
    } catch (err: any) {
      setError(
        err.message || "Failed to start checkout. Try the demo upgrade.",
      );
      setLoadingStripe(false);
    }
  };

  const handleDemo = async () => {
    setError(null);
    setLoadingDemo(true);
    try {
      await demoUpgrade();
      await refreshUser(); // Pull fresh user data (isPremium = true)
      setDemoSuccess(true);
      setTimeout(() => {
        onUpgraded?.();
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(err.message || "Demo upgrade failed.");
      setLoadingDemo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Gradient header */}
        <div className="bg-linear-to-r from-yellow-400 via-orange-400 to-pink-500 p-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <Crown className="w-8 h-8" />
            <h2 className="text-2xl font-bold">Go Premium</h2>
          </div>
          <p className="text-white/90 text-sm">
            Unlock exclusive deals and premium coupons from local businesses.
          </p>
          <div className="mt-4 flex items-end gap-1">
            <span className="text-4xl font-extrabold">$4.99</span>
            <span className="text-white/80 mb-1">/ month</span>
          </div>
        </div>

        {/* Benefits */}
        <div className="p-6 space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            What you get
          </h3>
          <ul className="space-y-2">
            {BENEFITS.map((b) => (
              <li
                key={b}
                className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
              >
                <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                {b}
              </li>
            ))}
          </ul>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Success */}
          {demoSuccess && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg text-green-700 dark:text-green-400 text-sm font-medium text-center">
              🎉 Premium unlocked! Redirecting…
            </div>
          )}

          {/* CTA buttons */}
          <div className="space-y-2 pt-1">
            {/* Real Stripe checkout */}
            <Button
              onClick={handleStripe}
              disabled={loadingStripe || loadingDemo || demoSuccess}
              className="w-full bg-linear-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-semibold shadow-md disabled:opacity-50"
            >
              {loadingStripe ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Redirecting to Stripe…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Subscribe with Stripe
                </span>
              )}
            </Button>

            {/* Demo upgrade — clearly labeled for hackathon */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-dashed border-gray-200 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white dark:bg-gray-900 text-gray-400">
                  or for hackathon demo
                </span>
              </div>
            </div>

            <Button
              onClick={handleDemo}
              disabled={loadingStripe || loadingDemo || demoSuccess}
              variant="outline"
              className="w-full border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 disabled:opacity-50"
            >
              {loadingDemo ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500" />
                  Upgrading…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4" />
                  Instant Demo Upgrade (no payment)
                </span>
              )}
            </Button>

            {/* Stripe test card hint */}
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 p-3 text-xs text-blue-700 dark:text-blue-400 space-y-1">
              <div className="flex items-center gap-1 font-semibold">
                <Zap className="w-3 h-3" />
                Stripe test card
              </div>
              <div className="font-mono">4242 4242 4242 4242</div>
              <div>Any future date · Any CVC · Any ZIP</div>
            </div>

            {/* Lock icon notice */}
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" />
              Secure payment powered by Stripe. Cancel anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
