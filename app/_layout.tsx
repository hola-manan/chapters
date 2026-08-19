import {
  SourceSerif4_400Regular,
  SourceSerif4_600SemiBold,
  useFonts,
} from '@expo-google-fonts/source-serif-4';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { type ReadingSizeName } from '../design/index.ts';
import { PdfParserView } from '../pdf/index.ts';
import { getSettings, saveSettings } from '../storage/index.ts';
import { ImportProvider } from '../features/index.ts';
import { ReadingSizeProvider, ThemeProvider, ToastProvider, type ThemeMode, useTheme } from '../ui/index.ts';

void SplashScreen.preventAutoHideAsync().catch(() => {});

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
        <Stack.Screen name="book/[id]/index" options={{ headerShown: false }} />
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

  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [readingSize, setReadingSize] = useState<ReadingSizeName>('default');
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');

  useEffect(() => {
    let isMounted = true;
    getSettings()
      .then((s) => {
        if (isMounted) {
          setReadingSize(s.readingSize);
          setThemeMode(s.themeMode);
          setSettingsLoaded(true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSettingsLoaded(true);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const isReady = (fontsLoaded || fontError) && settingsLoaded;

  useEffect(() => {
    if (isReady) {
      void SplashScreen.hideAsync().catch(() => {});
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  const handleReadingSizeChange = (newSize: ReadingSizeName) => {
    setReadingSize(newSize);
    void saveSettings({ readingSize: newSize, themeMode });
  };

  const handleThemeModeChange = (newMode: ThemeMode) => {
    setThemeMode(newMode);
    void saveSettings({ readingSize, themeMode: newMode });
  };

  return (
    <ThemeProvider mode={themeMode} onModeChange={handleThemeModeChange}>
      <ReadingSizeProvider value={readingSize} onChange={handleReadingSizeChange}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <ToastProvider>
            <ImportProvider>
              {/*
                Accepted limitation: a toast cannot draw over the settings Sheet,
                because that is a native Modal. Finishing an import while the sheet
                is open means the toast is missed; the card in the library is the
                durable record.
              */}
              <ThemedStack />
              <PdfParserView />
            </ImportProvider>
          </ToastProvider>
        </GestureHandlerRootView>
      </ReadingSizeProvider>
    </ThemeProvider>
  );
}


