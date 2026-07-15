export type TripStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "BOOKING_OPEN"
  | "BOOKING_CLOSED"
  | "BOARDING"
  | "DEPARTED"
  | "IN_PROGRESS"
  | "ARRIVED"
  | "COMPLETED"
  | "CANCELLED";

export type SeatStatus = "AVAILABLE" | "SELECTED" | "HELD" | "BOOKED" | "BLOCKED" | "UNAVAILABLE" | "DRIVER";

export type RoutePoint = {
  id?: string;
  name: string;
  address?: string;
  town?: string;
  instructions?: string;
  estimatedTime?: string;
};

export type LongRouteTrip = {
  tripId: string;
  module: "LONG_ROUTE";
  driverId: string;
  driverName: string;
  operatorName: string;
  operatorVerified: boolean;
  driverRating: number;
  completedTripCount: number;
  departureTown: string;
  destinationTown: string;
  departureDateTime: string;
  estimatedArrivalDateTime: string;
  bookingCloseDateTime: string;
  routeDistanceKm: number;
  routeDurationMinutes: number;
  basePrice: number;
  bookingFee: number;
  luggageFee: number;
  currency: "NAD";
  luggageAllowance: string;
  cancellationPolicy: string;
  cancellationCutoffHours: number;
  availableSeatCount: number;
  totalSeatCount: number;
  bookedSeatCount: number;
  status: TripStatus;
  layoutTemplateId: SeatTemplateId;
  vehicleId: string;
  vehicleType: string;
  vehicle: {
    make: string;
    model: string;
    color: string;
    registrationNumber: string;
    vehicleType: string;
    verificationStatus: string;
    photos: string[];
  };
  pickupPoints: RoutePoint[];
  dropOffPoints: RoutePoint[];
  stops: Array<RoutePoint & { stopOrder: number }>;
  amenities: string[];
  tripRules: string[];
  pickupInstructions?: string;
  locationSharingActive?: boolean;
  currentLocation?: { latitude: number; longitude: number; accuracy: number; updatedAt: string };
  recurringSeriesId?: string | null;
  recurringOccurrenceTripIds?: string[];
  seriesPaused?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SeatTemplateId = "SEVEN_SEATER" | "MINIBUS_2_1" | "BUS_2_2" | "SHUTTLE";

export type TripSeat = {
  tripId: string;
  seatNumber: string;
  row: number;
  column: number;
  seatType: "DRIVER" | "PASSENGER";
  isBookable: boolean;
  status: SeatStatus;
  price: number;
  heldByUserId?: string;
  holdExpiresAt?: string;
  bookingId?: string;
};

export type SeatAvailability = {
  tripId: string;
  layoutTemplateId: SeatTemplateId;
  vehicle: LongRouteTrip["vehicle"];
  seats: TripSeat[];
  serverTime: string;
  holdDurationSeconds: number;
};

export type PassengerDetails = {
  seatNumber: string;
  fullName: string;
  phoneNumber: string;
  identificationNumber: string;
  ageCategory: "ADULT" | "CHILD" | "INFANT" | "SENIOR";
  emergencyContact: string;
  luggageDetails: string;
  specialAssistance: string;
};

export type LongRouteBooking = {
  bookingId: string;
  bookingReference: string;
  tripId: string;
  accountHolderId: string;
  passengerCount: number;
  seatNumbers: string[];
  subtotal: number;
  fees: { booking: number; luggage: number; insurance: number };
  totalAmount: number;
  currency: "NAD";
  paymentMethod: string;
  paymentStatus: string;
  bookingStatus: string;
  cancellationStatus: string;
  pickupPoint: RoutePoint;
  dropOffPoint: RoutePoint;
  tripSnapshot: {
    departureTown: string;
    destinationTown: string;
    departureDateTime: string;
    operatorName: string;
    vehicle: LongRouteTrip["vehicle"];
  };
  trip?: LongRouteTrip;
  passengers?: PassengerDetails[];
  createdAt: string;
  updatedAt: string;
};

export type Vehicle = {
  vehicleId: string;
  ownerId: string;
  make: string;
  model: string;
  color: string;
  registrationNumber: string;
  vehicleType: string;
  layoutTemplateId: SeatTemplateId;
  seatCapacity: number;
  verificationStatus: "PENDING" | "APPROVED" | "SUSPENDED";
  photos: string[];
};

export type DriverVerificationStatus = "NOT_STARTED" | "IN_PROGRESS" | "PENDING" | "APPROVED" | "REJECTED";

export type DriverVerificationInput = {
  completionStep: number;
  personalDetails: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    idType: string;
    idNumber: string;
    phoneNumber: string;
    address: string;
  };
  documents: {
    idFrontKey: string;
    idBackKey: string;
    selfieKey: string;
    vehiclePhotoKeys: string[];
  };
  selfieConsent: boolean;
  vehicleDetails: {
    make: string;
    model: string;
    color: string;
    registrationNumber: string;
    layoutTemplateId: SeatTemplateId;
  };
};

export type DriverVerification = DriverVerificationInput & {
  driverId: string;
  status: DriverVerificationStatus;
  vehicleId?: string;
  reviewNote?: string | null;
  submittedAt?: string;
  reviewedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type TripSearch = {
  departureTown: string;
  destinationTown: string;
  date: string;
  passengers: number;
  sort?: "LOWEST_PRICE" | "EARLIEST" | "SHORTEST" | "HIGHEST_RATING" | "MOST_SEATS";
};

export type LongRouteNotification = {
  notificationId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
};
