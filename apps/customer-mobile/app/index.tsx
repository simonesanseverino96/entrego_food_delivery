import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Entrego</Text>
      <Text style={styles.subtitle}>Customer App — Phase 0 placeholder</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '700', color: '#f97316' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 8 },
});
