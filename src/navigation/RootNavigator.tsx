import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";
import { Text } from "../components/Typography";
import type { RootTabParamList, TripsStackParamList, ProfileStackParamList } from "./types";
import TripListScreen from "../screens/TripListScreen";
import TripDetailScreen from "../screens/TripDetailScreen";
import PostTripScreen from "../screens/PostTripScreen";
import BookingsScreen from "../screens/BookingsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import WelcomeScreen from "../screens/WelcomeScreen";
import SignInScreen from "../screens/SignInScreen";
import SignUpScreen from "../screens/SignUpScreen";
import ConfirmSignUpScreen from "../screens/ConfirmSignUpScreen";
import { colors } from "../theme";
import { useAuth } from "../auth/AuthContext";

const Tab = createBottomTabNavigator<RootTabParamList>();
const TripsStack = createNativeStackNavigator<TripsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

function TripsStackNavigator() {
  return (
    <TripsStack.Navigator screenOptions={{ headerTitleStyle: { fontFamily: "Manrope_700Bold" } }}>
      <TripsStack.Screen name="TripList" component={TripListScreen} options={{ title: "Trips", headerShown: false }} />
      <TripsStack.Screen name="TripDetail" component={TripDetailScreen} options={{ title: "Trip Details", headerShown: false }} />
    </TripsStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerTitleStyle: { fontFamily: "Manrope_700Bold" } }}>
      <ProfileStack.Screen name="ProfileHome" component={ProfileScreen} options={{ title: "Profile", headerShown: false }} />
    </ProfileStack.Navigator>
  );
}

function AuthStackNavigator() {
  return (
    <ProfileStack.Navigator
      initialRouteName="Welcome"
      screenOptions={{ headerTitleStyle: { fontFamily: "Manrope_700Bold" } }}
    >
      <ProfileStack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="SignIn" component={SignInScreen} options={{ title: "Sign In", headerShown: false }} />
      <ProfileStack.Screen name="SignUp" component={SignUpScreen} options={{ title: "Sign Up", headerShown: false }} />
      <ProfileStack.Screen name="ConfirmSignUp" component={ConfirmSignUpScreen} options={{ title: "Verify Email", headerShown: false }} />
    </ProfileStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.navy,
          tabBarInactiveTintColor: colors.muted,
          tabBarLabelStyle: { fontSize: 11, fontFamily: "Manrope_600SemiBold" },
          tabBarStyle: {
            height: 72,
            paddingTop: 8,
            paddingBottom: 10,
            borderTopColor: colors.line,
            backgroundColor: colors.surface,
          },
          tabBarIcon: ({ focused, color }) => {
            const labels: Record<keyof RootTabParamList, string> = {
              TripsTab: "TR",
              PostTrip: "+",
              Bookings: "BK",
              Profile: "PR",
            };
            return (
              <Text
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  overflow: "hidden",
                  backgroundColor: focused ? colors.navy : "transparent",
                  color: focused ? colors.surface : color,
                  textAlign: "center",
                  lineHeight: 24,
                  fontSize: route.name === "PostTrip" ? 18 : 10,
                  fontWeight: "800",
                }}
              >
                {labels[route.name]}
              </Text>
            );
          },
        })}
      >
        <Tab.Screen name="TripsTab" component={TripsStackNavigator} options={{ title: "Trips" }} />
        <Tab.Screen name="PostTrip" component={PostTripScreen} options={{ title: "Post a Trip" }} />
        <Tab.Screen name="Bookings" component={BookingsScreen} options={{ title: "My Bookings" }} />
      <Tab.Screen name="Profile" component={ProfileStackNavigator} options={{ title: "Profile" }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { isLoading, isSignedIn } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }}>
        <ActivityIndicator color={colors.success} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isSignedIn ? <MainTabs /> : <AuthStackNavigator />}
    </NavigationContainer>
  );
}
