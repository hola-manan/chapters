import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PdfParserView } from '../pdf/index.ts';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack />
      <PdfParserView />
    </GestureHandlerRootView>
  );
}
