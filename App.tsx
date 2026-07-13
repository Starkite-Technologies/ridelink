import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import OnboardingScreen from './src/screens/OnboardingScreen';
import type { OnboardingDestination } from './src/screens/OnboardingScreen';
import { AuthProvider } from './src/auth/AuthContext';
import { getHasSeenOnboarding } from './src/onboarding/onboardingStorage';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';

export default function App() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [destination, setDestination] = useState<OnboardingDestination>('signIn');

  useEffect(() => {
    getHasSeenOnboarding().then((seen) => {
      setShowOnboarding(!seen);
      setCheckingOnboarding(false);
    });
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        {!fontsLoaded || checkingOnboarding ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator />
          </View>
        ) : showOnboarding ? (
          <OnboardingScreen
            onDone={(nextDestination) => {
              setDestination(nextDestination);
              setShowOnboarding(false);
            }}
          />
        ) : (
          <RootNavigator initialDestination={destination} />
        )}
        <StatusBar style="auto" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
