export type Trip = {
  tripId: string;
  driverId: string;
  driverName: string;
  origin: string;
  destination: string;
  date: string;
  seatsAvailable: number;
  pricePerSeat: number;
  vehicleId: string;
  vehicleLabel: string;
  notes: string;
  createdAt: string;
};

export type Vehicle = {
  vehicleId: string;
  ownerId: string;
  make: string;
  model: string;
  color: string;
  year: number | null;
  plate: string | null;
  photoUrl: string | null;
  verified: boolean;
  createdAt: string;
};
