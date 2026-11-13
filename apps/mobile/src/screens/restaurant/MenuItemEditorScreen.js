import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Switch, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import PartnerLayout from '../../components/partner/PartnerLayout';
import AppButton from '../../components/AppButton';
import AppInput from '../../components/AppInput';
import AppText from '../../components/AppText';
import { Chip, EmptyState, ui } from '../../components/customer/ui';
import { selectMenuItems, selectMenuCategories, saveMenuItem, toggleMenuItem, deleteMenuItem } from '../../redux/menuSlice';
import { getFoodPhoto } from '../../data/foodPhotos';
import { choosePartnerPhotos } from '../../utils/partnerMedia';
import { confirmAction } from '../../utils/confirm';
import { COLORS } from '../../theme/colors';
import { RADIUS } from '../../theme/spacing';

function SwitchRow({ title, detail, value, onValueChange }) {
  return <View style={ui.between}>
    <View style={ui.flex}><AppText style={ui.bold}>{title}</AppText>{detail ? <AppText variant="caption" color={COLORS.textSecondary}>{detail}</AppText> : null}</View>
    <Switch accessibilityLabel={title} value={value} onValueChange={onValueChange} trackColor={{ false: COLORS.border, true: COLORS.success }} thumbColor={COLORS.white} />
  </View>;
}

// Add or edit a dish. Partner changes are saved on this device and reach the customer menu immediately.
export default function MenuItemEditorScreen({ navigation, route, hasPartnerTabs }) {
  const dispatch = useDispatch();
  const items = useSelector(selectMenuItems);
  const categories = useSelector(selectMenuCategories);
  const unavailableIds = useSelector(state => state.menu.unavailable);
  const existing = items.find(item => item.id === route.params?.itemId);
  const [name, setName] = useState(existing?.name || '');
  const [category, setCategory] = useState(existing?.category || categories[0] || 'Burgers');
  const [newCategory, setNewCategory] = useState('');
  const [price, setPrice] = useState(existing ? String(existing.price) : '');
  const [description, setDescription] = useState(existing?.description || '');
  const [message, setMessage] = useState('');
  const [photoUri, setPhotoUri] = useState(existing?.photoUri || null);
  const [available, setAvailable] = useState(!unavailableIds.includes(existing?.id));
  const [bestseller, setBestseller] = useState(Boolean(existing?.bestseller));
  const [recommended, setRecommended] = useState(Boolean(existing?.recommended));
  const [customizations, setCustomizations] = useState((existing?.customizations || []).join(', '));
  const [picking, setPicking] = useState(false);
  const missing = Boolean(route.params?.itemId && !existing);

  async function changePhoto() {
    setPicking(true); setMessage('');
    try {
      const photos = await choosePartnerPhotos({ kind: 'dish' });
      if (photos[0]) setPhotoUri(photos[0].uri);
    } catch (error) { setMessage('Could not keep that photo. Please try another image.'); }
    finally { setPicking(false); }
  }

  function save() {
    if (missing) return;
    const amount = Number(price);
    // A typed category reuses an existing one when only the letter case differs ("burgers" → "Burgers").
    const typed = newCategory.trim();
    const finalCategory = typed ? (categories.find(value => value.toLowerCase() === typed.toLowerCase()) || typed) : category;
    if (!name.trim() || !finalCategory || !Number.isInteger(amount) || amount <= 0) {
      setMessage('Enter an item name, a category, and a whole-rupee price above zero.');
      return;
    }
    const item = {
      id: existing?.id || 'partner-' + Date.now(),
      name: name.trim(), category: finalCategory, price: amount,
      description: description.trim(),
      rating: existing?.rating ?? 0,
      tags: existing?.tags || [finalCategory.toLowerCase()],
      symbol: existing?.symbol || '🍽️',
      image: existing?.image,
      featuredImage: existing?.featuredImage,
      recommended, photoUri, bestseller,
      customizations: customizations.split(',').map(value => value.trim()).filter(Boolean),
    };
    dispatch(saveMenuItem(item));
    const wasAvailable = !unavailableIds.includes(item.id);
    if (available !== wasAvailable) dispatch(toggleMenuItem(item.id));
    navigation.goBack();
  }

  const remove = () => confirmAction({
    title: `Delete ${existing.name}?`, message: 'Customers will no longer see this dish.', confirmLabel: 'Delete',
    onConfirm: () => { dispatch(deleteMenuItem(existing.id)); navigation.goBack(); },
  });
  const photo = photoUri ? { uri: photoUri } : getFoodPhoto(existing);

  return (
    <PartnerLayout navigation={navigation} title={route.params?.itemId ? 'Edit Item' : 'Add Menu Item'} hasTabs={hasPartnerTabs} error={message}
      right={existing ? <Pressable accessibilityRole="button" accessibilityLabel="Delete menu item" hitSlop={10} onPress={remove}><AppText variant="small" color={COLORS.danger} style={ui.bold}>Delete</AppText></Pressable> : null}
      footer={missing ? null : <AppButton title={existing ? 'Save Changes' : 'Add Item'} onPress={save} disabled={picking} />}>
      {missing ? <><EmptyState title="Item not found">This menu item is no longer on the menu.</EmptyState><AppButton title="Back to Menu" onPress={() => navigation.goBack()} /></> : <>
        <Pressable accessibilityRole="button" accessibilityLabel="Change dish photo" onPress={changePhoto} disabled={picking} style={styles.photoBox}>
          {photo ? <Image source={photo} style={styles.photo} /> : <AppText style={styles.emoji}>🍽️</AppText>}
          <View style={styles.photoLabel}><AppText variant="small" color={COLORS.primary} style={ui.bold}>{picking ? 'Opening photos…' : 'Change photo'}</AppText></View>
        </Pressable>
        <AppInput label="Item name" value={name} onValueChange={setName} placeholder="e.g. Cheese Burger" />
        <AppText variant="small" style={ui.bold}>Category</AppText>
        <View style={ui.wrap}>{categories.map(value => <Chip key={value} label={value} selected={!newCategory.trim() && category === value}
          onPress={() => { setCategory(value); setNewCategory(''); }} />)}</View>
        <AppInput label="Or add a new category" value={newCategory} onValueChange={setNewCategory} placeholder="e.g. Desserts" />
        <AppInput label="Price (Rs.)" value={price} onValueChange={value => setPrice(value.replace(/[^\d]/g, ''))} keyboardType="number-pad" placeholder="e.g. 850" />
        <AppInput label="Description" value={description} onValueChange={setDescription} multiline placeholder="Describe your dish" />
        <View style={ui.card}>
          <SwitchRow title="Available" detail="Customers can find and order this item" value={available} onValueChange={setAvailable} />
          <SwitchRow title="Bestseller" detail="Shows a Bestseller label" value={bestseller} onValueChange={setBestseller} />
          <SwitchRow title="Recommended" detail="Appears in “Recommended for you” on Home" value={recommended} onValueChange={setRecommended} />
        </View>
        <AppInput label="Customization choices (comma separated)" value={customizations} onValueChange={setCustomizations} placeholder="e.g. Extra cheese, No onions" />
        <AppText variant="caption" color={COLORS.textSecondary}>Customization choices are saved with the item for when customer customization is extended.</AppText>
      </>}
    </PartnerLayout>
  );
}

const styles = StyleSheet.create({
  photoBox: { height: 170, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.primaryBorder, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  photoLabel: { position: 'absolute', bottom: 12, backgroundColor: COLORS.surface, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.pill },
  emoji: { fontSize: 35, lineHeight: 44 },
});
