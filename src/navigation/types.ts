import type { LongRouteBooking, PassengerDetails, RoutePoint, TripSearch } from "../long-routes/types";
import type { AccountType } from "../auth/AuthContext";

export type ProfileStackParamList = {
  ProfileHome: undefined;
  Welcome: undefined;
  SignIn: undefined;
  ForgotPassword: undefined;
  SignUp: { accountType?: AccountType } | undefined;
  ConfirmSignUp: { email: string; accountType?: AccountType };
};

export type TripsStackParamList = {
  TripList: undefined;
  TripDetail: { tripId: string };
  PostTripLegacy: undefined;
};

export type LongRoutesStackParamList = {
  LongRouteHome: undefined;
  LongRouteResults: { search: TripSearch };
  LongRouteDetail: { tripId: string; passengers: number };
  SeatSelection: { tripId: string; passengers: number };
  PassengerDetails: { tripId: string; seatNumbers: string[]; holdExpiresAt: string };
  Payment: { tripId: string; seatNumbers: string[]; holdExpiresAt: string; passengers: PassengerDetails[]; pickupPoint: RoutePoint; dropOffPoint: RoutePoint };
  BookingConfirmation: { booking: LongRouteBooking };
  BookingDetail: { bookingId: string };
};

export type DriverStackParamList = {
  DriverDashboard: undefined;
  DriverVerification: undefined;
  CreateLongRouteTrip: undefined;
  DriverTripManagement: { tripId: string };
  PassengerManifest: { tripId: string };
  PostTripLegacy: undefined;
};

export type BookingsStackParamList = {
  BookingsHome: undefined;
  BookingDetail: { bookingId: string };
};

export type RootTabParamList = {
  HomeTab: undefined;
  TripsTab: undefined;
  ActivityTab: undefined;
  WalletTab: undefined;
  Profile: undefined;
};
