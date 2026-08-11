import {
  SourceSerif4_400Regular,
  SourceSerif4_600SemiBold,
  useFonts,
} from '@expo-google-fonts/source-serif-4';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PdfParserView } from '../pdf/index.ts';
import { ThemeProvider, useTheme } from '../ui/index.ts';

SplashScreen.preventAutoHideAsync();

function ThemedStack() {
  const theme = useTheme();

  return (
    <>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.surface.page },
          headerTintColor: theme.text.primary,
          headerTitleStyle: { color: theme.text.primary },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="book/[id]/index"
          options={{
            // Header title is hidden to avoid duplicating the book title displayed by ContentsHeader
            headerTitle: '',
          }}
        />
        <Stack.Screen name="book/[id]/[chapter]" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SourceSerif4_400Regular,
    SourceSerif4_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemedStack />
        <PdfParserView />
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}

