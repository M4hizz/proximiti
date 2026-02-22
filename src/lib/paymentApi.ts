/**
 * Payment API client
 * Handles Stripe checkout and demo upgrade/downgrade
 */

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

/**
 * Create a Stripe Checkout session and redirect to Stripe payment page.
 * Requires the user to be logged in.
 */
export async function startStripeCheckout(): Promise<void> {
  const response = await fetch(`${API_URL}/payments/create-checkout-session`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to start checkout");
  }

  // Redirect to Stripe Checkout
  if (data.url) {
    window.location.href = data.url;
  } else {
    throw new Error("No checkout URL returned from server");
  }
}

/**
 * Hackathon demo: instantly mark the current user as Premium.
 * Returns the updated user object.
 */
export async function demoUpgrade(): Promise<{
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  isVerified: boolean;
  isPremium: boolean;
}> {
  const response = await fetch(`${API_URL}/payments/demo-upgrade`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Demo upgrade failed");
  }

  return data.user;
}

/**
 * Hackathon demo: revert the current user back to free tier.
 */
export async function demoDowngrade(): Promise<void> {
  const response = await fetch(`${API_URL}/payments/demo-downgrade`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Demo downgrade failed");
  }
}
