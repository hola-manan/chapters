import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function DevGalleryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Component Gallery</Text>
      <Text style={styles.subtitle}>
        Design workbench for Phase 2+. Placeholder route for custom design system components.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center', gap: 8 },
  title: { fontSize: 20, fontWeight: 'bold' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center' },
});
