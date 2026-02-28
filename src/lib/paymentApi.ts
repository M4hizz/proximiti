import authApi from "./authApi";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

function authHeaders(): Record<string, string> {
  const token = authApi.getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function startStripeCheckout(
  planId: "essential" | "enterprise" = "essential",
): Promise<void> {
  const response = await fetch(`${API_URL}/payments/create-checkout-session`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ planId }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to start checkout");
  }

  if (data.url) {
    window.location.href = data.url;
  } else {
    throw new Error("No checkout URL returned from server");
  }
}

export async function demoUpgrade(
  planType: "essential" | "enterprise" = "essential",
): Promise<{
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  isVerified: boolean;
  isPremium: boolean;
  planType: string;
  planExpiresAt: string | null;
}> {
  const response = await fetch(`${API_URL}/payments/demo-upgrade`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ planType }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Demo upgrade failed");
  }

  return data.user;
}

export async function cancelSubscription(): Promise<{
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  isVerified: boolean;
  isPremium: boolean;
  planType: string;
  planExpiresAt: string | null;
  stripeSubscriptionId?: string | null;
}> {
  const response = await fetch(`${API_URL}/payments/subscription`, {
    method: "DELETE",
    credentials: "include",
    headers: { ...authHeaders() },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to cancel subscription");
  }
  return data.user;
}

export async function demoDowngrade(): Promise<void> {
  const response = await fetch(`${API_URL}/payments/demo-downgrade`, {
    method: "DELETE",
    credentials: "include",
    headers: { ...authHeaders() },
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Demo downgrade failed");
  }
}
