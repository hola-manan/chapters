import { StyleSheet, Text, View } from 'react-native';

// Phase 0 baseline only — confirms the app boots in Expo Go.
// Phase 1 replaces this with the skeleton library screen.
export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chapters</Text>
      <Text>Phase 0 baseline. If you can read this, Expo Go is wired up.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  title: { fontSize: 24, fontWeight: '600' },
});
