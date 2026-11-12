import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

async function retain(asset, kind) {
  const name = asset.name || asset.fileName || `${kind}.jpg`;
  const extension = name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  let uri = asset.uri;
  if (Platform.OS !== 'web') {
    uri = `${FileSystem.documentDirectory}foodmind-rider-${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
    await FileSystem.copyAsync({ from: asset.uri, to: uri });
  }
  return { uri, name, size: asset.size || asset.fileSize || 0, mimeType: asset.mimeType || 'application/octet-stream' };
}

export async function chooseRiderDocument(kind) {
  const imageOnly = kind === 'profilePhoto';
  const result = await DocumentPicker.getDocumentAsync({ type: imageOnly ? ['image/*'] : ['application/pdf', 'image/*'], copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.[0]) return null;
  return retain(result.assets[0], kind);
}
export async function chooseRiderProof() {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.85 });
  if (result.canceled || !result.assets?.[0]) return null;
  return retain(result.assets[0], 'delivery-proof');
}
