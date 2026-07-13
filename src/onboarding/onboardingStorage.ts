import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "ridelink:hasSeenOnboarding:v1";

export async function getHasSeenOnboarding(): Promise<boolean> {
  const value = await AsyncStorage.getItem(KEY);
  return value === "true";
}

export async function setHasSeenOnboarding(): Promise<void> {
  await AsyncStorage.setItem(KEY, "true");
}
