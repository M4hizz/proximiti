import { useState, useEffect } from "react";
import { Tag, Copy, Check, Clock, Lock, Crown } from "lucide-react";
import type { Coupon } from "@/lib/couponApi";
import {
  getBusinessCoupons,
  redeemCoupon,
  formatDiscount,
  isCouponExpired,
  isCouponValid,
  isExpiringSoon,
  formatCouponDate,
} from "@/lib/couponApi";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/App";
import { PremiumUpgradeModal } from "@/components/premium-upgrade-modal";

interface DealsSectionProps {
  businessId: string;
}

/**
 * Displays active coupons for a business
 */
export function DealsSection({ businessId }: DealsSectionProps) {
  const { user } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [redeemingCode, setRedeemingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    loadCoupons();
  }, [businessId]);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getBusinessCoupons(businessId);
      setCoupons(data);
    } catch (err) {
      console.error("Failed to load coupons:", err);
      setError("Failed to load deals");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  const handleRedeem = async (code: string) => {
    try {
      setRedeemingCode(code);
      setError(null);
      await redeemCoupon(code);
      // Reload coupons to get updated usage count
      await loadCoupons();
      alert("Coupon redeemed successfully! 🎉");
    } catch (err: any) {
      setError(err.message || "Failed to redeem coupon");
    } finally {
      setRedeemingCode(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-pulse text-gray-500 dark:text-gray-400">
          Loading deals...
        </div>
      </div>
    );
  }

  if (coupons.length === 0) {
    return null; // Don't show section if no deals
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Tag className="w-5 h-5 text-green-600 dark:text-green-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Available Deals
        </h3>
        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
          {coupons.length}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-3">
        {coupons.map((coupon) => {
          const expired = isCouponExpired(coupon);
          const valid = isCouponValid(coupon);
          const expiringSoon = isExpiringSoon(coupon);
          const usageFull =
            coupon.usageLimit !== null &&
            coupon.usageCount >= coupon.usageLimit;
          const isPremiumLocked = coupon.isPremiumOnly && !user?.isPremium;

          return (
            <div
              key={coupon.id}
              className={`p-4 rounded-lg border ${
                expired || !valid || isPremiumLocked
                  ? "bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 opacity-60"
                  : "bg-linear-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-green-200 dark:border-green-800"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  {/* Title and badges */}
                  <div className="flex items-start gap-2 flex-wrap">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {coupon.title}
                    </h4>
                    {coupon.isPremiumOnly && (
                      <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-medium rounded-full flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Premium Only
                      </span>
                    )}
                    {expiringSoon && valid && !isPremiumLocked && (
                      <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-medium rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Limited Time
                      </span>
                    )}
                    {expired && (
                      <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-full">
                        Expired
                      </span>
                    )}
                    {usageFull && !expired && (
                      <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-full">
                        Sold Out
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {coupon.description}
                  </p>

                  {/* Discount badge */}
                  <div className="mt-2">
                    <span className="inline-block px-3 py-1 bg-cherry-rose text-white font-bold text-lg rounded-md">
                      {formatDiscount(coupon)}
                    </span>
                  </div>

                  {/* Expiry date */}
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Valid until {formatCouponDate(coupon.endDate)}
                  </div>

                  {/* Usage info */}
                  {coupon.usageLimit !== null && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {coupon.usageLimit - coupon.usageCount} uses remaining
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mt-3">
                {/* Coupon code display */}
                <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg">
                  <code className="flex-1 font-mono text-sm font-semibold text-gray-900 dark:text-white">
                    {isPremiumLocked ? "••••••••" : coupon.couponCode}
                  </code>
                  <button
                    onClick={() => handleCopyCode(coupon.couponCode)}
                    disabled={expired || !valid || isPremiumLocked}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      isPremiumLocked ? "Premium members only" : "Copy code"
                    }
                  >
                    {isPremiumLocked ? (
                      <Lock className="w-4 h-4 text-gray-400" />
                    ) : copiedCode === coupon.couponCode ? (
                      <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    )}
                  </button>
                </div>

                {/* Redeem / Upgrade button */}
                {isPremiumLocked ? (
                  <Button
                    onClick={() => setShowUpgradeModal(true)}
                    className="bg-linear-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-semibold shadow"
                  >
                    <Crown className="w-4 h-4 mr-1" />
                    Upgrade
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleRedeem(coupon.couponCode)}
                    disabled={
                      expired || !valid || redeemingCode === coupon.couponCode
                    }
                    className="bg-cherry-rose hover:bg-green-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {redeemingCode === coupon.couponCode
                      ? "Redeeming..."
                      : "Redeem"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Premium upgrade modal */}
      <PremiumUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgraded={() => setShowUpgradeModal(false)}
      />
    </div>
  );
}
