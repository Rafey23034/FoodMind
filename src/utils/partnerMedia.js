import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

async function retain(asset, kind) {
  const name = asset.name || asset.fileName || `${kind}.jpg`;
  const extension = name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  let uri = asset.uri;
  if (Platform.OS !== 'web') {
    uri = `${FileSystem.documentDirectory}foodmind-partner-${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
    await FileSystem.copyAsync({ from: asset.uri, to: uri });
  }
  return { uri, name, size: asset.size || asset.fileSize || 0, mimeType: asset.mimeType || 'image/jpeg' };
}
export async function choosePartnerDocument(kind) {
  const result = await DocumentPicker.getDocumentAsync({ type: kind === 'logo' ? ['image/*'] : ['application/pdf', 'image/*'], copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.[0]) return null;
  return retain(result.assets[0], kind);
}
export async function choosePartnerPhotos({ kind = 'photo', multiple = false } = {}) {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: multiple,
    allowsEditing: !multiple, aspect: kind === 'cover' ? [16, 9] : [1, 1], quality: 0.85 });
  if (result.canceled || !result.assets?.length) return [];
  return Promise.all(result.assets.map(asset => retain(asset, kind)));
}
export function fileSize(size) { return !size ? 'Size unavailable' : size >= 1048576 ? `${(size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`; }
