import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { AuthProvider } from './src/auth/AuthContext';
import { getHasSeenOnboarding } from './src/onboarding/onboardingStorage';
import { colors } from './src/theme';
import { ThemeProvider, useAppTheme } from './src/theme-context';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';

function RideLinkApp() {
  const { isDark } = useAppTheme();
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

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
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy }}>
            <ActivityIndicator color={colors.success} />
          </View>
        ) : showOnboarding ? (
          <OnboardingScreen onDone={() => setShowOnboarding(false)} />
        ) : (
          <RootNavigator />
        )}
        <StatusBar style={isDark ? "light" : "dark"} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default function App() {
  return <ThemeProvider><RideLinkApp /></ThemeProvider>;
}
