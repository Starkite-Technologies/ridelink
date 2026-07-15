import { AWS_CONFIG } from "../config";
import type { Trip, Vehicle } from "../types";

export type Booking = {
  bookingId: string;
  tripId: string;
  riderId: string;
  seats: number;
  status: string;
  createdAt: string;
};

type NewTrip = {
  origin: string;
  destination: string;
  date: string;
  seatsAvailable: number;
  pricePerSeat: number;
  vehicleId: string;
  notes?: string;
};

type NewVehicle = {
  make: string;
  model: string;
  color: string;
  year?: number;
  plate?: string;
  photoUrl?: string;
};

type PhotoUploadUrlResponse = {
  uploadUrl: string;
  photoUrl: string;
};

async function request<T>(path: string, options: { method?: string; body?: unknown; idToken?: string | null } = {}): Promise<T> {
  const res = await fetch(`${AWS_CONFIG.apiUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.idToken ? { Authorization: options.idToken } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message ?? `Request failed with status ${res.status}`);
  }

  return res.json();
}

export const api = {
  listTrips: () => request<Trip[]>("/trips"),
  getTrip: (tripId: string) => request<Trip>(`/trips/${tripId}`),
  createTrip: (trip: NewTrip, idToken: string) =>
    request<Trip>("/trips", { method: "POST", body: trip, idToken }),
  createBooking: (tripId: string, seats: number, idToken: string) =>
    request<Booking>("/bookings", { method: "POST", body: { tripId, seats }, idToken }),
  listBookings: (idToken: string) => request<Booking[]>("/bookings", { idToken }),
  listVehicles: (idToken: string) => request<Vehicle[]>("/vehicles", { idToken }),
  createVehicle: (vehicle: NewVehicle, idToken: string) =>
    request<Vehicle>("/vehicles", { method: "POST", body: vehicle, idToken }),
  deleteVehicle: (vehicleId: string, idToken: string) =>
    request<{ deleted: boolean }>(`/vehicles/${vehicleId}`, { method: "DELETE", idToken }),
  getPhotoUploadUrl: (contentType: string, idToken: string) =>
    request<PhotoUploadUrlResponse>("/vehicles/photo-upload-url", { method: "POST", body: { contentType }, idToken }),
};
