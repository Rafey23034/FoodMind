import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useDispatch } from 'react-redux';
import PartnerLayout from '../../components/partner/PartnerLayout';
import usePartner from '../../components/partner/usePartner';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import { Notice, ui } from '../../components/customer/ui';
import { savePartnerDocument, addPartnerPhotos, removePartnerPhoto, submitPartnerApplication, savePartnerProfile } from '../../redux/partnerSlice';
import { choosePartnerDocument, choosePartnerPhotos, fileSize } from '../../utils/partnerMedia';
import { validateRestaurant } from '../../data/partnerOrders';
import { routes } from '../../navigation/routes';
import { openPartnerTab } from '../../navigation/partnerNavigation';
import { COLORS } from '../../theme/colors';

const documents = [['license', 'Business license', 'PDF or clear image'], ['cnic', 'Owner CNIC', 'A PDF or image with front and back'], ['logo', 'Restaurant logo', 'Choose an image']];
export default function PartnerDocumentsScreen({ navigation }) {
  const dispatch = useDispatch();
  const { documents: files, photos, profile, userKey, application } = usePartner();
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  async function selectFile(kind) {
    setBusy(kind); setError('');
    try {
      const document = await choosePartnerDocument(kind);
      if (document) {
        dispatch(savePartnerDocument({ userKey, kind, document }));
        if (kind === 'logo') dispatch(savePartnerProfile({ userKey, profile: { logoUri: document.uri } }));
      }
    } catch (problem) { setError('Could not keep that file. Please choose it again.'); }
    finally { setBusy(null); }
  }
  async function addPhotos() {
    setBusy('photos'); setError('');
    try {
      const selected = await choosePartnerPhotos({ multiple: true });
      if (selected.length) dispatch(addPartnerPhotos({ userKey, photos: selected }));
    } catch (problem) { setError('Could not keep those photos. Please try again.'); }
    finally { setBusy(null); }
  }
  function submit() {
    const problem = validateRestaurant(profile);
    if (problem) { setError(`Complete your restaurant details first. ${problem}`); return; }
    if (documents.some(([kind]) => !files[kind])) { setError('Choose a business license, owner CNIC, and restaurant logo before submitting.'); return; }
    dispatch(savePartnerProfile({ userKey, profile }));
    // An approved store only updates its details; it is not sent back for review.
    if (application.status === 'Approved') { openPartnerTab(navigation, routes.PARTNER_STORE); return; }
    dispatch(submitPartnerApplication({ userKey, at: new Date().toISOString() }));
    navigation.replace(routes.PARTNER_UNDER_REVIEW);
  }
  return <PartnerLayout navigation={navigation} title="Documents & photos" error={error} footer={<AppButton title={application.status === 'Approved' ? 'Save changes' : 'Submit for approval →'} onPress={submit} disabled={Boolean(busy)} />}>
    <View style={styles.progress} />
    <View style={ui.between}><AppText variant="small" color={COLORS.textSecondary}>Choose clear photos or PDFs.</AppText><AppText variant="caption" color={COLORS.primary}>Step 2 of 2</AppText></View>
    {documents.map(([kind, title, hint]) => <View key={kind} style={[ui.card, ui.row]}>
      <View style={[styles.uploadIcon, files[kind] && styles.uploaded]}><AppText color={files[kind] ? COLORS.success : COLORS.primary}>{files[kind] ? '✓' : '↑'}</AppText></View>
      <View style={ui.flex}><AppText style={ui.bold}>{title}</AppText><AppText variant="caption" color={COLORS.textSecondary}>{files[kind] ? `${files[kind].name} · ${fileSize(files[kind].size)}` : hint}</AppText></View>
      <Pressable accessibilityRole="button" accessibilityLabel={`${files[kind] ? 'Replace' : 'Upload'} ${title}`} disabled={Boolean(busy)} onPress={() => selectFile(kind)} style={styles.uploadButton}>
        <AppText variant="small" color={files[kind] ? COLORS.success : COLORS.primary}>{busy === kind ? 'Opening…' : files[kind] ? 'Replace' : 'Upload'}</AppText>
      </Pressable>
    </View>)}
    <AppText variant="subheading">Restaurant & food photos</AppText>
    <View style={ui.wrap}>{photos.map(photo => <View key={photo.uri} style={styles.thumbnail}>
      <Image source={{ uri: photo.uri }} style={styles.image} />
      <Pressable accessibilityLabel={`Remove photo ${photo.name}`} style={styles.remove} onPress={() => dispatch(removePartnerPhoto({ userKey, uri: photo.uri }))}><AppText color={COLORS.danger}>×</AppText></Pressable>
    </View>)}<Pressable accessibilityRole="button" accessibilityLabel="Add restaurant photos" disabled={Boolean(busy)} style={[styles.thumbnail, styles.add]} onPress={addPhotos}><AppText variant="heading" color={COLORS.primary}>+</AppText></Pressable></View>
    <Notice icon="info" title="Your restaurant goes live after review">Files and this application stay on this device in the frontend preview.</Notice>
    <AppButton title="Edit restaurant details" variant="text" onPress={() => navigation.navigate(routes.PARTNER_REGISTER)} />
  </PartnerLayout>;
}
const styles = StyleSheet.create({
  progress: { height: 4, borderRadius: 3, backgroundColor: COLORS.primary },
  uploadIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  uploaded: { backgroundColor: COLORS.successLight }, uploadButton: { paddingVertical: 10, paddingHorizontal: 5 },
  thumbnail: { width: 78, height: 78, borderRadius: 14, overflow: 'hidden' }, image: { width: '100%', height: '100%' },
  add: { borderWidth: 1, borderColor: COLORS.primaryBorder, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  remove: { position: 'absolute', right: 2, top: 2, borderRadius: 10, backgroundColor: COLORS.white, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
});
