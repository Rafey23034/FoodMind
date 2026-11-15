import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import ScreenLayout from '../../components/customer/ScreenLayout';
import AppText from '../../components/AppText';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import Icon from '../../components/Icon';
import FloatingMessage from '../../components/FloatingMessage';
import { EmptyState, ui } from '../../components/customer/ui';
import { addressUserKey, selectUserAddresses, selectAddress } from '../../redux/addressesSlice';
import { deleteCustomerAddress, saveCustomerAddress } from '../../redux/apiThunks';
import { confirmAction } from '../../utils/confirm';
import { COLORS } from '../../theme/colors';
import { RADIUS } from '../../theme/spacing';

export default function AddressBookScreen({ navigation }) {
  const dispatch = useDispatch();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const userKey = useSelector(state => addressUserKey(state.auth.user));
  const list = useSelector(selectUserAddresses);
  const selectedId = useSelector(state => state.addresses.selectedByUser[userKey]);
  const [editing, setEditing] = useState(false);
  const [id, setId] = useState(null);
  const [label, setLabel] = useState('Home');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');

  function startNew() { setId(null); setLabel('Home'); setStreet(''); setCity(''); setError(''); setEditing(true); }
  function startEdit(address) { setId(address.id); setLabel(address.label); setStreet(address.street); setCity(address.city); setError(''); setEditing(true); }
  async function save() {
    if (saving) return;
    if (!label.trim() || !street.trim() || !city.trim()) { setError('Enter a label, street address, and city.'); return; }
    setSaving(true);
    try {
      const existing = list.find(item => item.id === id);
      const address = {
        ...existing,
        id: id || String(Date.now()),
        label: label.trim(), street: street.trim(), city: city.trim(),
        isDefault: existing?.isDefault || list.length === 0,
      };
      const result = await dispatch(saveCustomerAddress({ userKey, address }));
      if (!result.ok) { setError(result.error); return; }
      setEditing(false); setError('');
      setMessage('Address saved and selected for delivery.');
    } finally {
      setSaving(false);
    }
  }
  const remove = address => confirmAction({ title: `Remove ${address.label}?`, message: `${address.street}, ${address.city}`, confirmLabel: 'Remove',
    onConfirm: async () => {
      const result = await dispatch(deleteCustomerAddress({ userKey, address }));
      if (!result.ok) setError(result.error);
    } });

  return (
    <View style={styles.screen}>
      <ScreenLayout navigation={navigation} title="Saved Addresses" error={error}
        footer={editing ? <View style={ui.row}><AppButton style={ui.flex} title="Cancel" variant="outline" onPress={() => { setEditing(false); setError(''); }} />
          <AppButton style={styles.save} title={saving ? 'Saving…' : 'Save address'} onPress={save} disabled={saving} /></View>
          : <AppButton title="+ Add address" onPress={startNew} />}>
        {editing ? <View style={ui.card}>
          <AppText variant="subheading">{id ? 'Edit address' : 'New address'}</AppText>
          <AppInput label="Label" value={label} onValueChange={setLabel} placeholder="Home or University" />
          <AppInput label="Street / House / Block" value={street} onValueChange={setStreet} placeholder="Enter street address" />
          <AppInput label="City" value={city} onValueChange={setCity} placeholder="Enter city" />
        </View> : null}
        {list.length === 0 && !editing ? <EmptyState icon="location" title="No saved addresses yet">Add one to check out. Addresses are saved for this account only.</EmptyState> : null}
        {list.map(address => {
          const selected = selectedId === address.id;
          return <View key={address.id} style={[ui.card, selected && styles.selectedCard]}>
            <Pressable onPress={() => dispatch(selectAddress({ userKey, id: address.id }))} style={ui.row}
              accessibilityRole="radio" accessibilityState={{ checked: selected }} accessibilityLabel={`Deliver to ${address.label}`}>
              <View style={[styles.radio, selected && styles.radioOn]}>{selected ? <View style={styles.radioDot} /> : null}</View>
              <View style={ui.flex}>
                <AppText style={ui.bold}>{address.label}</AppText>
                <AppText variant="small" color={COLORS.textSecondary}>{address.street}, {address.city}</AppText>
              </View>
              {selected ? <Icon name="location" size={15} /> : null}
            </Pressable>
            <View style={styles.actions}>
              <Pressable onPress={() => startEdit(address)} accessibilityRole="button" hitSlop={8}><AppText variant="small" color={COLORS.primary} style={ui.bold}>Edit</AppText></Pressable>
              <Pressable onPress={() => remove(address)} accessibilityRole="button" hitSlop={8}><AppText variant="small" color={COLORS.danger} style={ui.bold}>Remove</AppText></Pressable>
            </View>
          </View>;
        })}
      </ScreenLayout>
      <FloatingMessage message={message} onClose={() => setMessage('')} />
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  save: { flex: 2 },
  selectedCard: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: COLORS.primary },
  radioDot: { width: 10, height: 10, borderRadius: RADIUS.pill, backgroundColor: COLORS.primary },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20 },
});
