import { store } from '@/store/store';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { Provider } from 'react-redux';
import React from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthInitialization } from '@/hooks/useAuthInitialization';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { storage } from '@/utils/storage';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutContent() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const [onboardingState, setOnboardingState] = React.useState<'loading' | 'pending' | 'done'>(
    'loading',
  );
  
  // Initialize authentication on app start
  useAuthInitialization();
  usePushNotifications();

  React.useEffect(() => {
    let mounted = true;

    const loadOnboardingState = async () => {
      const completed = await storage.hasCompletedOnboarding();
      if (!mounted) return;
      setOnboardingState(completed ? 'done' : 'pending');
    };

    void loadOnboardingState();

    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (onboardingState !== 'pending') return;

    let cancelled = false;
    const firstSegment = segments[0];
    const isAllowedBeforeOnboarding =
      firstSegment === 'onboarding' || firstSegment === '(auth)' || firstSegment === 'modal';

    const enforceOnboarding = async () => {
      const completed = await storage.hasCompletedOnboarding();
      if (cancelled) return;

      if (completed) {
        setOnboardingState('done');
        return;
      }

      if (!isAllowedBeforeOnboarding) {
        router.replace('/onboarding');
      }
    };

    void enforceOnboarding();

    return () => {
      cancelled = true;
    };
  }, [onboardingState, router, segments]);

  if (onboardingState === 'loading') {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="modal" 
          options={{ 
            presentation: 'modal',
            headerShown: false,
            animation: 'slide_from_bottom',
          }} 
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <RootLayoutContent />
    </Provider>
  );
}
