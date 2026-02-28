/**
 * Coupon API client functions
 * Handles all coupon-related API calls
 */

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export interface Coupon {
  id: string;
  businessId: string;
  title: string;
  description: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  couponCode: string;
  startDate: string;
  endDate: string;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
  isPremiumOnly: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCouponData {
  title: string;
  description: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  couponCode: string;
  startDate: string;
  endDate: string;
  usageLimit?: number;
  isPremiumOnly?: boolean;
}

export interface UpdateCouponData {
  title?: string;
  description?: string;
  discountType?: "percentage" | "fixed";
  discountValue?: number;
  startDate?: string;
  endDate?: string;
  usageLimit?: number | null;
  isActive?: boolean;
  isPremiumOnly?: boolean;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Get active coupons for a business
 */
export async function getBusinessCoupons(
  businessId: string,
): Promise<Coupon[]> {
  const response = await fetch(`${API_URL}/businesses/${businessId}/coupons`);
  if (!response.ok) {
    throw new Error("Failed to fetch coupons");
  }
  const data = await response.json();
  return data.coupons ?? [];
}

/**
 * Get active coupon count for a business (for badge display)
 */
export async function getBusinessCouponCount(
  businessId: string,
): Promise<number> {
  const response = await fetch(
    `${API_URL}/businesses/${businessId}/coupons/count`,
  );
  if (!response.ok) {
    throw new Error("Failed to fetch coupon count");
  }
  const data = await response.json();
  return data.count;
}

/**
 * Fetch coupon counts for multiple businesses in a single request.
 * Returns a map of businessId → count (missing ids have 0 coupons).
 */
export async function getBatchCouponCounts(
  businessIds: string[],
): Promise<Record<string, number>> {
  if (businessIds.length === 0) return {};
  const ids = businessIds.slice(0, 50).join(",");
  const response = await fetch(
    `${API_URL}/businesses/coupons/batch-counts?ids=${encodeURIComponent(ids)}`,
  );
  if (!response.ok) return {};
  const data = await response.json();
  return data.counts ?? {};
}

/**
 * Redeem a coupon
 */
export async function redeemCoupon(couponCode: string): Promise<{
  message: string;
  coupon: Coupon;
}> {
  const response = await fetch(`${API_URL}/coupons/redeem`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ couponCode }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to redeem coupon");
  }

  return data;
}

// ─── Admin API ───────────────────────────────────────────────────────────────

/**
 * Get all coupons (admin only)
 */
export async function getAllCoupons(businessId?: string): Promise<Coupon[]> {
  const url = businessId
    ? `${API_URL}/admin/coupons?businessId=${businessId}`
    : `${API_URL}/admin/coupons`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch coupons");
  }

  const data = await response.json();
  return data.coupons ?? [];
}

/**
 * Create a new coupon (admin only)
 */
export async function createCoupon(
  businessId: string,
  couponData: CreateCouponData,
): Promise<Coupon> {
  const response = await fetch(`${API_URL}/businesses/${businessId}/coupons`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(couponData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to create coupon");
  }

  return data.coupon;
}

/**
 * Update a coupon (admin only)
 */
export async function updateCoupon(
  couponId: string,
  updates: UpdateCouponData,
): Promise<Coupon> {
  const response = await fetch(`${API_URL}/coupons/${couponId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(updates),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to update coupon");
  }

  return data.coupon;
}

/**
 * Delete a coupon (admin only)
 */
export async function deleteCoupon(couponId: string): Promise<void> {
  const response = await fetch(`${API_URL}/coupons/${couponId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to delete coupon");
  }
}

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Format discount value for display
 */
export function formatDiscount(coupon: Coupon): string {
  if (coupon.discountType === "percentage") {
    return `${coupon.discountValue}% OFF`;
  } else {
    return `$${coupon.discountValue.toFixed(2)} OFF`;
  }
}

/**
 * Check if a coupon is expired
 */
export function isCouponExpired(coupon: Coupon): boolean {
  return new Date(coupon.endDate) < new Date();
}

/**
 * Check if a coupon is valid (active, within date range, has usage available)
 */
export function isCouponValid(coupon: Coupon): boolean {
  const now = new Date();
  const start = new Date(coupon.startDate);
  const end = new Date(coupon.endDate);

  return (
    coupon.isActive &&
    now >= start &&
    now <= end &&
    (coupon.usageLimit === null || coupon.usageCount < coupon.usageLimit)
  );
}

/**
 * Check if coupon expires within 48 hours (for "Limited Time" badge)
 */
export function isExpiringSoon(coupon: Coupon): boolean {
  const end = new Date(coupon.endDate);
  const now = new Date();
  const hoursRemaining = (end.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursRemaining > 0 && hoursRemaining <= 48;
}

/**
 * Format date for display
 */
export function formatCouponDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
