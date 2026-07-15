import { DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";
import { House, MapPin, RoadHorizon, SteeringWheel, Ticket, UserCircle, UsersThree, Wallet } from "../components/icons";
import type { BookingsStackParamList, DriverStackParamList, LongRoutesStackParamList, ProfileStackParamList, RootTabParamList, TripsStackParamList } from "./types";
import TripListScreen from "../screens/TripListScreen";
import TripDetailScreen from "../screens/TripDetailScreen";
import PostTripScreen from "../screens/PostTripScreen";
import BookingsScreen from "../screens/BookingsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import WelcomeScreen from "../screens/WelcomeScreen";
import SignInScreen from "../screens/SignInScreen";
import SignUpScreen from "../screens/SignUpScreen";
import ConfirmSignUpScreen from "../screens/ConfirmSignUpScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import LongRouteHomeScreen from "../screens/long-routes/long-route-home-screen";
import LongRouteResultsScreen from "../screens/long-routes/long-route-results-screen";
import LongRouteDetailScreen from "../screens/long-routes/long-route-detail-screen";
import SeatSelectionScreen from "../screens/long-routes/seat-selection-screen";
import PassengerDetailsScreen from "../screens/long-routes/passenger-details-screen";
import PaymentScreen from "../screens/long-routes/payment-screen";
import BookingConfirmationScreen from "../screens/long-routes/booking-confirmation-screen";
import BookingDetailScreen from "../screens/long-routes/booking-detail-screen";
import DriverDashboardScreen from "../screens/long-routes/driver-dashboard-screen";
import CreateLongRouteTripScreen from "../screens/long-routes/create-long-route-trip-screen";
import DriverTripManagementScreen from "../screens/long-routes/driver-trip-management-screen";
import PassengerManifestScreen from "../screens/long-routes/passenger-manifest-screen";
import DriverVerificationScreen from "../screens/long-routes/driver-verification-screen";
import { colors } from "../theme";
import { useAuth } from "../auth/AuthContext";
import DashboardScreen from "../screens/DashboardScreen";
import DriverPassengersScreen from "../screens/DriverPassengersScreen";
import DriverEarningsScreen from "../screens/DriverEarningsScreen";
import type { AccountType } from "../auth/AuthContext";
import { useAppTheme } from "../theme-context";

const Tab = createBottomTabNavigator<RootTabParamList>();
const TripsStack = createNativeStackNavigator<TripsStackParamList>();
const LongRoutesStack = createNativeStackNavigator<LongRoutesStackParamList>();
const DriverStack = createNativeStackNavigator<DriverStackParamList>();
const BookingsStack = createNativeStackNavigator<BookingsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

const stackOptions = { headerTitleStyle: { fontFamily: "Manrope_700Bold" }, headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.ink, contentStyle: { backgroundColor: colors.wash }, headerShadowVisible: false, headerBackTitle: "Back" } as const;

function TripsStackNavigator() {
  return <TripsStack.Navigator screenOptions={stackOptions}><TripsStack.Screen name="TripList" component={TripListScreen} options={{ title: "Local rides", headerShown: false }} /><TripsStack.Screen name="TripDetail" component={TripDetailScreen} options={{ title: "Trip details", headerShown: false }} /><TripsStack.Screen name="PostTripLegacy" component={PostTripScreen} options={{ title: "Post a local ride" }} /></TripsStack.Navigator>;
}

function LongRoutesStackNavigator() {
  return <LongRoutesStack.Navigator screenOptions={stackOptions}><LongRoutesStack.Screen name="LongRouteHome" component={LongRouteHomeScreen} options={{ headerShown: false }} /><LongRoutesStack.Screen name="LongRouteResults" component={LongRouteResultsScreen} options={{ title: "Available trips" }} /><LongRoutesStack.Screen name="LongRouteDetail" component={LongRouteDetailScreen} options={{ title: "Trip details" }} /><LongRoutesStack.Screen name="SeatSelection" component={SeatSelectionScreen} options={{ title: "Select seats" }} /><LongRoutesStack.Screen name="PassengerDetails" component={PassengerDetailsScreen} options={{ title: "Passengers" }} /><LongRoutesStack.Screen name="Payment" component={PaymentScreen} options={{ title: "Checkout" }} /><LongRoutesStack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} options={{ title: "Booking confirmed", headerBackVisible: false, gestureEnabled: false }} /><LongRoutesStack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ title: "Digital ticket" }} /></LongRoutesStack.Navigator>;
}

function DriverStackNavigator() {
  return <DriverStack.Navigator screenOptions={stackOptions}><DriverStack.Screen name="DriverDashboard" component={DriverDashboardScreen} options={{ headerShown: false }} /><DriverStack.Screen name="DriverVerification" component={DriverVerificationScreen} options={{ title: "Driver verification" }} /><DriverStack.Screen name="CreateLongRouteTrip" component={CreateLongRouteTripScreen} options={{ title: "Create long-route trip" }} /><DriverStack.Screen name="DriverTripManagement" component={DriverTripManagementScreen} options={{ title: "Manage trip" }} /><DriverStack.Screen name="PassengerManifest" component={PassengerManifestScreen} options={{ title: "Passenger manifest" }} /><DriverStack.Screen name="PostTripLegacy" component={PostTripScreen} options={{ title: "Post a local ride" }} /></DriverStack.Navigator>;
}

function BookingsStackNavigator() {
  return <BookingsStack.Navigator screenOptions={stackOptions}><BookingsStack.Screen name="BookingsHome" component={BookingsScreen} options={{ headerShown: false }} /><BookingsStack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ title: "Digital ticket" }} /></BookingsStack.Navigator>;
}

function ProfileStackNavigator() {
  return <ProfileStack.Navigator screenOptions={stackOptions}><ProfileStack.Screen name="ProfileHome" component={ProfileScreen} options={{ title: "Profile", headerShown: false }} /></ProfileStack.Navigator>;
}

function AuthStackNavigator() {
  return <ProfileStack.Navigator initialRouteName="Welcome" screenOptions={stackOptions}><ProfileStack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} /><ProfileStack.Screen name="SignIn" component={SignInScreen} options={{ title: "Sign in", headerShown: false }} /><ProfileStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: "Reset password", headerShown: false }} /><ProfileStack.Screen name="SignUp" component={SignUpScreen} options={{ title: "Sign up", headerShown: false }} /><ProfileStack.Screen name="ConfirmSignUp" component={ConfirmSignUpScreen} options={{ title: "Verify email", headerShown: false }} /></ProfileStack.Navigator>;
}

const passengerTabMeta: Record<keyof RootTabParamList, { label: string; icon: typeof House }> = {
  HomeTab: { label: "Home", icon: House },
  TripsTab: { label: "Routes", icon: RoadHorizon },
  ActivityTab: { label: "Local", icon: MapPin },
  WalletTab: { label: "Bookings", icon: Ticket },
  Profile: { label: "Account", icon: UserCircle },
};

const driverTabMeta: Record<keyof RootTabParamList, { label: string; icon: typeof House }> = {
  HomeTab: { label: "Home", icon: House },
  TripsTab: { label: "Trips", icon: SteeringWheel },
  ActivityTab: { label: "Passengers", icon: UsersThree },
  WalletTab: { label: "Earnings", icon: Wallet },
  Profile: { label: "Account", icon: UserCircle },
};

function MainTabs({ accountType }: { accountType: AccountType }) {
  const isDriver = accountType === "DRIVER";
  const tabMeta = isDriver ? driverTabMeta : passengerTabMeta;
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: colors.success,
      tabBarInactiveTintColor: "#71829a",
      tabBarLabelStyle: { fontSize: 9, fontFamily: "Manrope_700Bold", marginTop: 1 },
      tabBarStyle: { height: 76, paddingTop: 8, paddingBottom: 11, borderTopColor: colors.line, backgroundColor: colors.surface },
      tabBarIcon: ({ focused, color }) => {
        const Icon = tabMeta[route.name].icon;
        return <View style={{ width: 34, height: 30, borderRadius: 11, backgroundColor: focused ? "rgba(20,184,122,0.16)" : "transparent", alignItems: "center", justifyContent: "center" }}><Icon size={20} color={color} weight={focused ? "fill" : "regular"} /></View>;
      },
    })}>
      <Tab.Screen name="HomeTab" component={DashboardScreen} options={{ title: tabMeta.HomeTab.label }} />
      <Tab.Screen name="TripsTab" component={isDriver ? DriverStackNavigator : LongRoutesStackNavigator} options={{ title: tabMeta.TripsTab.label }} />
      <Tab.Screen name="ActivityTab" component={isDriver ? DriverPassengersScreen : TripsStackNavigator} options={{ title: tabMeta.ActivityTab.label }} />
      <Tab.Screen name="WalletTab" component={isDriver ? DriverEarningsScreen : BookingsStackNavigator} options={{ title: tabMeta.WalletTab.label }} />
      <Tab.Screen name="Profile" component={ProfileStackNavigator} options={{ title: tabMeta.Profile.label }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { isLoading, isSignedIn, accountType } = useAuth();
  const { isDark } = useAppTheme();
  const previewRole = process.env.EXPO_OS === "web" && __DEV__ && typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("previewRole")
    : null;
  const resolvedRole = previewRole === "DRIVER" || previewRole === "PASSENGER" ? previewRole : accountType;
  if (isLoading) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.navy }}><ActivityIndicator color={colors.success} /></View>;
  const baseTheme = isDark ? NavigationDarkTheme : NavigationDefaultTheme;
  const navigationTheme = { ...baseTheme, colors: { ...baseTheme.colors, primary: colors.success, background: colors.wash, card: colors.surface, text: colors.ink, border: colors.line } };
  const authenticated = (isSignedIn || resolvedRole) && resolvedRole;
  return <NavigationContainer theme={navigationTheme}>{authenticated ? <MainTabs accountType={resolvedRole} /> : <AuthStackNavigator />}</NavigationContainer>;
}
