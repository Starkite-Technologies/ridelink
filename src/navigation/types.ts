export type ProfileStackParamList = {
  ProfileHome: undefined;
  SignIn: undefined;
  SignUp: undefined;
  ConfirmSignUp: { email: string };
};

export type TripsStackParamList = {
  TripList: undefined;
  TripDetail: { tripId: string };
};

export type RootTabParamList = {
  TripsTab: undefined;
  PostTrip: undefined;
  Bookings: undefined;
  Profile: undefined;
};
