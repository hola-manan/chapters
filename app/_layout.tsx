import {
  SourceSerif4_400Regular,
  SourceSerif4_600SemiBold,
  useFonts,
} from '@expo-google-fonts/source-serif-4';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PdfParserView } from '../pdf/index.ts';
import { ThemeProvider } from '../ui/index.ts';

SplashScreen.preventAutoHideAsync();

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
        <Stack />
        <PdfParserView />
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}
