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
import SignInScreen from "../screens/SignInScreen";
import SignUpScreen from "../screens/SignUpScreen";
import ConfirmSignUpScreen from "../screens/ConfirmSignUpScreen";
import { colors } from "../theme";
import type { OnboardingDestination } from "../screens/OnboardingScreen";
import { useAuth } from "../auth/AuthContext";

const Tab = createBottomTabNavigator<RootTabParamList>();
const TripsStack = createNativeStackNavigator<TripsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

function TripsStackNavigator() {
  return (
    <TripsStack.Navigator screenOptions={{ headerTitleStyle: { fontFamily: "Manrope_700Bold" } }}>
      <TripsStack.Screen name="TripList" component={TripListScreen} options={{ title: "Trips" }} />
      <TripsStack.Screen name="TripDetail" component={TripDetailScreen} options={{ title: "Trip Details" }} />
    </TripsStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerTitleStyle: { fontFamily: "Manrope_700Bold" } }}>
      <ProfileStack.Screen name="ProfileHome" component={ProfileScreen} options={{ title: "Profile" }} />
    </ProfileStack.Navigator>
  );
}

function AuthStackNavigator({ initialDestination }: { initialDestination: OnboardingDestination }) {
  return (
    <ProfileStack.Navigator
      initialRouteName={initialDestination === "signUp" ? "SignUp" : "SignIn"}
      screenOptions={{ headerTitleStyle: { fontFamily: "Manrope_700Bold" } }}
    >
      <ProfileStack.Screen name="SignIn" component={SignInScreen} options={{ title: "Sign In", headerShown: false }} />
      <ProfileStack.Screen name="SignUp" component={SignUpScreen} options={{ title: "Sign Up", headerShown: false }} />
      <ProfileStack.Screen name="ConfirmSignUp" component={ConfirmSignUpScreen} options={{ title: "Verify Email" }} />
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
        <Tab.Screen
          name="PostTrip"
          component={PostTripScreen}
          options={{ title: "Post a Trip", headerShown: true }}
        />
        <Tab.Screen
          name="Bookings"
          component={BookingsScreen}
          options={{ title: "My Bookings", headerShown: true }}
        />
      <Tab.Screen name="Profile" component={ProfileStackNavigator} options={{ title: "Profile" }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator({ initialDestination = "signIn" }: { initialDestination?: OnboardingDestination }) {
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
      {isSignedIn ? <MainTabs /> : <AuthStackNavigator initialDestination={initialDestination} />}
    </NavigationContainer>
  );
}
