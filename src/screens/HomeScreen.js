import React from 'react';
import { StyleSheet, View } from 'react-native';
import AppText from '../components/AppText';
import { COLORS } from '../theme/colors';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <AppText variant="heading">Home Page</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
});
