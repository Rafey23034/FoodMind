import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useDispatch } from 'react-redux';
import PartnerLayout from '../../components/partner/PartnerLayout';
import usePartner from '../../components/partner/usePartner';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import { BillRow, Notice, ui } from '../../components/customer/ui';
import { approvePartnerDemo } from '../../redux/partnerSlice';
import { routes } from '../../navigation/routes';
import { openPartnerTab } from '../../navigation/partnerNavigation';
import Icon from '../../components/Icon';
import { COLORS } from '../../theme/colors';

export default function PartnerUnderReviewScreen({ navigation }) {
  const dispatch = useDispatch();
  const { profile, application, userKey } = usePartner();
  const submitted = Boolean(application.submittedAt);
  function preview() {
    dispatch(approvePartnerDemo({ userKey, at: new Date().toISOString() }));
    navigation.reset({ index: 0, routes: [{ name: routes.PARTNER_TABS, params: { screen: routes.DASHBOARD } }] });
  }
  return <PartnerLayout navigation={navigation} title="Application status"
    footer={<><AppButton title="Edit details or documents" variant="outline" onPress={() => navigation.navigate(routes.PARTNER_REGISTER)} />
      <AppButton title={application.status === 'Approved' ? 'Open Dashboard' : 'Preview approved dashboard (demo)'} variant="text" disabled={!submitted && application.status !== 'Approved'}
        onPress={application.status === 'Approved' ? () => openPartnerTab(navigation, routes.DASHBOARD) : preview} /></>}>
    <View style={styles.hero}><View style={styles.clock}><Icon name={application.status === 'Approved' ? 'check' : 'hourglass'} size={28} color={application.status === 'Approved' ? COLORS.success : COLORS.warning} /></View>
      <AppText variant="title">{application.status === 'Approved' ? 'Approved' : 'Under review'}</AppText>
      <AppText variant="small" color={COLORS.textSecondary} style={ui.center}>{application.status === 'Approved' ? 'Your restaurant is approved. You can still edit your details and documents.' : 'Your restaurant application is awaiting review. You can edit your details and selected documents.'}</AppText>
    </View>
    <View style={ui.card}><BillRow label="Restaurant" value={profile.name || 'Your restaurant'} /><BillRow label="Submitted" value={application.submittedAt ? new Date(application.submittedAt).toLocaleDateString() : 'Not submitted'} /><BillRow label="Status" value={application.status} bold /></View>
    <View style={ui.card}><AppText variant="subheading">Timeline</AppText>
      {[['Application submitted', submitted ? new Date(application.submittedAt).toLocaleString() : 'Pending', submitted],
        ['Documents under review', submitted ? 'In progress' : 'Pending', submitted],
        ['Approved · start selling', application.status === 'Approved' ? 'Demo preview enabled' : 'Pending', application.status === 'Approved']].map(([title, text, done]) => <View key={title} style={ui.row}>
          <AppText color={done ? COLORS.success : COLORS.disabled} style={ui.bold}>{done ? '✓' : '○'}</AppText><View style={ui.flex}><AppText style={ui.bold} variant="small">{title}</AppText><AppText variant="caption" color={COLORS.textSecondary}>{text}</AppText></View>
        </View>)}
    </View>
    <Notice title="Local registration preview">No documents are sent for real verification yet. The demo button lets you explore the approved partner screens.</Notice>
  </PartnerLayout>;
}
const styles = StyleSheet.create({ hero: { alignItems: 'center', gap: 16, paddingVertical: 24 }, clock: { width: 76, height: 76, borderRadius: 38, borderWidth: 1, borderColor: COLORS.warningBorder, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.warningLight } });
