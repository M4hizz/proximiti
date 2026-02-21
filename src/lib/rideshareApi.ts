/**
 * Rideshare API service – handles all rideshare lobby operations.
 */

export type RideshareStatus =
  | "waiting"
  | "accepted"
  | "in_transit"
  | "completed"
  | "cancelled";

export interface Rideshare {
  id: string;
  creatorId: string;
  creatorName: string;
  driverId: string | null;
  driverName: string | null;
  originName: string;
  originLat: number;
  originLng: number;
  destinationName: string;
  destinationLat: number;
  destinationLng: number;
  maxPassengers: number;
  currentPassengers: number;
  status: RideshareStatus;
  note: string | null;
  shareCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface RidesharePassenger {
  id: string;
  rideshareId: string;
  userId: string;
  userName: string;
  joinedAt: string;
}

class RideshareApiService {
  private readonly baseUrl =
    import.meta.env.VITE_API_URL || "http://localhost:3001/api";

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const config: RequestInit = {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    };

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || "Request failed");
    }

    return data;
  }

  // ─── List ────────────────────────────────────────────────────────────────────

  /** Get active rideshares (waiting + accepted) */
  async getActiveRideshares(): Promise<{ rideshares: Rideshare[] }> {
    return this.request("/rideshares");
  }

  /** Get a user's own rideshares (created, joined, or driving) */
  async getMyRideshares(): Promise<{ rideshares: Rideshare[] }> {
    return this.request("/rideshares?mine=true");
  }

  /** Get a single rideshare with its passengers */
  async getRideshare(
    id: string,
  ): Promise<{ rideshare: Rideshare; passengers: RidesharePassenger[] }> {
    return this.request(`/rideshares/${id}`);
  }

  /** Look up a rideshare by its 6-character share code */
  async getRideshareByCode(
    code: string,
  ): Promise<{ rideshare: Rideshare; passengers: RidesharePassenger[] }> {
    return this.request(
      `/rideshares/code/${encodeURIComponent(code.toUpperCase().trim())}`,
    );
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  /** Create a new rideshare lobby */
  async createRideshare(data: {
    originName: string;
    originLat: number;
    originLng: number;
    destinationName: string;
    destinationLat: number;
    destinationLng: number;
    maxPassengers: number;
    note?: string;
  }): Promise<{ message: string; rideshare: Rideshare }> {
    return this.request("/rideshares", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /** Join a rideshare as a passenger */
  async joinRideshare(id: string): Promise<{
    message: string;
    rideshare: Rideshare;
    passengers: RidesharePassenger[];
  }> {
    return this.request(`/rideshares/${id}/join`, { method: "POST" });
  }

  /** Leave a rideshare */
  async leaveRideshare(id: string): Promise<{ message: string }> {
    return this.request(`/rideshares/${id}/leave`, { method: "POST" });
  }

  /** Accept transport – become the driver */
  async acceptTransport(
    id: string,
  ): Promise<{ message: string; rideshare: Rideshare }> {
    return this.request(`/rideshares/${id}/accept-transport`, {
      method: "POST",
    });
  }

  /** Start the ride – lock the lobby ("Passengers in Transport") */
  async startTransport(
    id: string,
  ): Promise<{ message: string; rideshare: Rideshare }> {
    return this.request(`/rideshares/${id}/start`, { method: "POST" });
  }

  /** Complete the ride */
  async completeRideshare(
    id: string,
  ): Promise<{ message: string; rideshare: Rideshare }> {
    return this.request(`/rideshares/${id}/complete`, { method: "POST" });
  }

  /** Cancel a rideshare */
  async cancelRideshare(
    id: string,
  ): Promise<{ message: string; rideshare: Rideshare }> {
    return this.request(`/rideshares/${id}/cancel`, { method: "POST" });
  }
}

const rideshareApi = new RideshareApiService();
export default rideshareApi;
