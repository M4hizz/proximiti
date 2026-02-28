/**
 * Frontend API service for the Proximiti review system and Google Places proxy.
 */

import authApi from "./authApi";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = authApi.getStoredToken();
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || "Request failed");
  return data as T;
}

// ─── Proximiti Review Types ───────────────────────────────────────────────────

export interface ProximitiReview {
  id: string;
  businessId: string;
  userId: string;
  userName: string;
  userEmail: string;
  rating: number;
  text: string;
  helpfulCount: number;
  userFoundHelpful: boolean;
  createdAt: string;
}

export interface ReviewsResponse {
  reviews: ProximitiReview[];
  total: number;
  proximitiCount: number;
  useProximitiOnly: boolean;
  userReview: ProximitiReview | null;
  hasMore: boolean;
}

// ─── Google Review Types ──────────────────────────────────────────────────────

export interface GoogleReview {
  author_name: string;
  author_url?: string;
  profile_photo_url?: string;
  rating: number;
  text: string;
  time: number;
  relative_time_description: string;
}

export interface GoogleReviewsResponse {
  placeId: string | null;
  reviews: GoogleReview[];
  googleRating: number | null;
  totalRatings: number | null;
  nextPageToken: string | null;
}

// ─── Proximiti Reviews ────────────────────────────────────────────────────────

export async function fetchProximitiReviews(
  businessId: string,
  limit = 5,
  offset = 0,
): Promise<ReviewsResponse> {
  return request<ReviewsResponse>(
    `/reviews/${encodeURIComponent(businessId)}?limit=${limit}&offset=${offset}`,
  );
}

export async function submitReview(
  businessId: string,
  rating: number,
  text: string,
): Promise<{ message: string; review: ProximitiReview }> {
  return request(`/reviews/${encodeURIComponent(businessId)}`, {
    method: "POST",
    body: JSON.stringify({ rating, text }),
  });
}

export async function toggleHelpful(
  reviewId: string,
): Promise<{ helpful: boolean }> {
  return request(`/reviews/${reviewId}/helpful`, { method: "POST" });
}

// ─── Google Reviews ───────────────────────────────────────────────────────────

export async function fetchGoogleReviews(
  name: string,
  lat: number,
  lng: number,
  options?: { placeId?: string; pagetoken?: string },
): Promise<GoogleReviewsResponse> {
  const params = new URLSearchParams({
    name,
    lat: lat.toString(),
    lng: lng.toString(),
  });
  if (options?.placeId) params.set("placeId", options.placeId);
  if (options?.pagetoken) params.set("pagetoken", options.pagetoken);
  return request<GoogleReviewsResponse>(`/places/google-reviews?${params}`);
}
