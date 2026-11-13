import { Alert, Platform } from 'react-native';

// Asks before a destructive action (clearing a cart, logging out, deleting). Works on native and web.
export function confirmAction({ title, message, confirmLabel = 'Confirm', destructive = true, onConfirm }) {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
    if (window.confirm(message ? `${title}\n\n${message}` : title)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}

export function confirmLogout(onConfirm) {
  confirmAction({ title: 'Log out?', message: 'You can sign back in with the same email at any time.', confirmLabel: 'Log Out', onConfirm });
}
