import type { NavigatorScreenParams } from "@react-navigation/native";

export type ProfileStackParamList = {
  ProfileHome: undefined;
  Welcome: undefined;
  SignIn: undefined;
  SignUp: undefined;
  ConfirmSignUp: { email: string };
  MyCars: undefined;
  AddCar: undefined;
};

export type TripsStackParamList = {
  TripList: undefined;
  TripDetail: { tripId: string };
};

export type RootTabParamList = {
  TripsTab: undefined;
  PostTrip: undefined;
  Bookings: undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
};
