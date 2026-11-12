import React, { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, View } from 'react-native';
import { useStore } from 'react-redux';
import AppText from '../components/AppText';
import { hydrateStore, startPersistence } from './persistence';
import { COLORS } from '../theme/colors';

// Loads saved data once, then keeps AsyncStorage in sync with the Redux store.
export default function AppStorage({ children }) {
  const store = useStore();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    let persistence = null;
    let appState = null;
    hydrateStore(store).finally(() => {
      if (!active) return;
      persistence = startPersistence(store);
      // Save immediately when the app goes to the background.
      appState = AppState.addEventListener?.('change', next => { if (next !== 'active') persistence.flush(); });
      setReady(true);
    });
    return () => { active = false; appState?.remove?.(); persistence?.stop(); };
  }, [store]);
  if (ready) return children;
  return <View style={styles.loading} accessibilityLabel="Loading FoodMind">
    <View style={styles.logo}><AppText variant="heading" color={COLORS.white}>FM</AppText></View>
    <ActivityIndicator color={COLORS.primary} />
  </View>;
}
const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, backgroundColor: COLORS.background },
  logo: { width: 72, height: 72, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
});
