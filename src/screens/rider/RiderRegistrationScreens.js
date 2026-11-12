import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useDispatch } from 'react-redux';
import RiderLayout from '../../components/rider/RiderLayout';
import useRider from '../../components/rider/useRider';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import AppText from '../../components/AppText';
import { Chip, Notice, ui } from '../../components/customer/ui';
import { approveRiderDemo, saveRiderDocument, saveRiderProfile, submitRiderApplication, riderApplicationProblem, RIDER_DOCUMENTS } from '../../redux/riderSlice';
import { chooseRiderDocument } from '../../utils/riderMedia';
import { routes } from '../../navigation/routes';
import Icon from '../../components/Icon';
import { initials } from '../../utils/format';
import { COLORS } from '../../theme/colors';

export function RiderRegistrationScreen({ navigation }) {
  const dispatch = useDispatch();
  const rider = useRider();
  const [form, setForm] = useState(rider.profile);
  const [error, setError] = useState('');
  const field = name => value => setForm(previous => ({ ...previous, [name]: value }));
  function continueToDocuments() {
    const problem = riderApplicationProblem({ profile: form, documents: Object.fromEntries(RIDER_DOCUMENTS.map(kind => [kind, true])) });
    if (problem) { setError(problem); return; }
    dispatch(saveRiderProfile({ userKey: rider.userKey, profile: { ...form, fullName: form.fullName.trim(), phone: form.phone.trim(), city: form.city.trim(), vehicleRegistration: form.vehicleRegistration.trim(), email: rider.profile.email } }));
    navigation.navigate(routes.RIDER_DOCUMENTS);
  }
  return <RiderLayout navigation={navigation} title="Create Rider Account" subtitle="Set up your delivery profile" error={error} footer={<AppButton title="Continue to Documents →" onPress={continueToDocuments} />}>
    <View style={styles.progress}><View style={[styles.fill, { width: '50%' }]} /></View>
    <View style={ui.between}><AppText variant="small" color={COLORS.textSecondary}>1 · Personal details</AppText><AppText variant="caption" color={COLORS.primary}>Step 1 of 2</AppText></View>
    <AppInput label="FULL NAME" placeholder="Tariq Mehmood" value={form.fullName} onValueChange={field('fullName')} autoCapitalize="words" />
    <AppInput label="PHONE NUMBER" placeholder="0300 1234567" value={form.phone} onValueChange={field('phone')} keyboardType="phone-pad" />
    <AppInput label="EMAIL ADDRESS" placeholder="you@example.com" value={rider.profile.email} editable={false} />
    <AppInput label="CURRENT CITY" placeholder="Lahore" value={form.city} onValueChange={field('city')} />
    <AppText variant="caption" color={COLORS.textSecondary} style={ui.bold}>DELIVERY VEHICLE</AppText>
    <View style={ui.wrap}>{['Motorbike', 'Bicycle', 'Scooter'].map(vehicle => <Chip key={vehicle} label={vehicle} selected={form.vehicle === vehicle} onPress={() => setForm(previous => ({ ...previous, vehicle }))} />)}</View>
    <AppInput label="VEHICLE REGISTRATION" placeholder="LEB-2048" value={form.vehicleRegistration} onValueChange={field('vehicleRegistration')} autoCapitalize="characters" />
  </RiderLayout>;
}

const onboardingDocuments = [
  ['nationalId', 'National ID / CNIC', 'Front and back image or PDF'],
  ['drivingLicense', 'Driving licence', 'A clear image or PDF'],
  ['vehicleRegistration', 'Vehicle registration', 'Registration document or card'],
  ['profilePhoto', 'Profile photo', 'Choose a clear face photo'],
];
export function RiderDocumentsScreen({ navigation }) {
  const dispatch = useDispatch();
  const rider = useRider();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  async function select(kind) {
    setBusy(kind); setError('');
    try {
      const document = await chooseRiderDocument(kind);
      if (document) dispatch(saveRiderDocument({ userKey: rider.userKey, kind, document }));
    } catch (problem) { setError('Could not keep that file. Please choose it again.'); }
    finally { setBusy(''); }
  }
  function submit() {
    // The same rule the reducer applies, so the screen can say what is missing instead of moving on.
    const problem = riderApplicationProblem(rider);
    if (problem) { setError(problem); return; }
    dispatch(submitRiderApplication({ userKey: rider.userKey, at: new Date().toISOString() }));
    navigation.replace(routes.RIDER_UNDER_REVIEW);
  }
  return <RiderLayout navigation={navigation} title="Verify your details" subtitle="2 of 2 · Upload your account files" error={error}
    footer={<><AppButton title="Submit for Verification" onPress={submit} disabled={Boolean(busy)} /><AppText variant="caption" color={COLORS.textSecondary} style={ui.center}>Your files stay on this device in the preview.</AppText></>}>
    <View style={styles.progress}><View style={[styles.fill, { width: '100%' }]} /></View>
    {onboardingDocuments.map(([kind, title, hint]) => <View key={kind} style={[ui.card, ui.row]}>
      <View style={[styles.fileIcon, rider.documents[kind] && styles.complete]}><AppText color={rider.documents[kind] ? COLORS.success : COLORS.primary}>{rider.documents[kind] ? '✓' : '↑'}</AppText></View>
      <View style={ui.flex}><AppText style={ui.bold}>{title}</AppText><AppText variant="caption" color={COLORS.textSecondary}>{rider.documents[kind]?.name || hint}</AppText></View>
      <Pressable accessibilityRole="button" accessibilityLabel={`${rider.documents[kind] ? 'Replace' : 'Upload'} ${title}`} disabled={Boolean(busy)} onPress={() => select(kind)} style={styles.upload}>
        <AppText variant="small" color={COLORS.primary}>{busy === kind ? 'Opening…' : rider.documents[kind] ? 'Replace' : 'Upload'}</AppText>
      </Pressable>
    </View>)}
    <Notice title="Verification in progress after review">Document selection is local; a rider approval service is not connected.</Notice>
  </RiderLayout>;
}

export function RiderUnderReviewScreen({ navigation }) {
  const dispatch = useDispatch();
  const rider = useRider();
  const pending = rider.application.status === 'Under review';
  function preview() {
    dispatch(approveRiderDemo({ userKey: rider.userKey, at: new Date().toISOString() }));
    navigation.reset({ index: 0, routes: [{ name: routes.RIDER_TABS, params: { screen: routes.RIDER_JOBS } }] });
  }
  return <RiderLayout navigation={navigation} title="Verification in progress" subtitle="Your details have been sent for review"
    footer={<><AppButton title="View Application Details" variant="outline" onPress={() => navigation.navigate(routes.RIDER_DOCUMENTS)} />
      <AppButton title={pending ? 'Preview approval · demo' : 'Open Delivery Requests'} variant="text" disabled={!rider.application.submittedAt} onPress={pending ? preview : () => navigation.reset({ index: 0, routes: [{ name: routes.RIDER_TABS }] })} /></>}>
    <View style={styles.reviewHero}><View style={styles.clock}><Icon name={pending ? 'hourglass' : 'check'} size={28} color={pending ? COLORS.warning : COLORS.success} /></View><AppText variant="title">{pending ? 'Under review' : rider.application.status}</AppText><AppText variant="small" color={COLORS.textSecondary} style={ui.center}>We are reviewing your rider information. You will be able to accept delivery jobs after approval.</AppText></View>
    <View style={ui.card}><AppText variant="subheading">Your onboarding checklist</AppText>
      {[["Account created", true], ['Documents uploaded', Boolean(rider.application.submittedAt)], ['Rider approval', rider.application.status === 'Approved']].map(([label, complete]) => <View key={label} style={ui.between}><AppText variant="small" color={complete ? COLORS.success : COLORS.textSecondary}>{complete ? '✓' : '○'}  {label}</AppText><AppText variant="caption" color={complete ? COLORS.success : COLORS.warning}>{complete ? 'Complete' : 'Awaiting review'}</AppText></View>)}
    </View>
    <Notice title="Preview only">No documents are sent to a verification service. The approval button is a local preview.</Notice>
  </RiderLayout>;
}

export function RiderEditProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const rider = useRider();
  const [form, setForm] = useState(rider.profile);
  const [error, setError] = useState('');
  const field = key => value => setForm(previous => ({ ...previous, [key]: value }));
  function save() {
    if (!form.fullName?.trim() || !form.phone?.trim() || !form.city?.trim()) { setError('Enter your name, mobile number and city.'); return; }
    if (!/^\+?[\d\s()-]{7,20}$/.test(form.phone.trim())) { setError('Enter a valid mobile number.'); return; }
    dispatch(saveRiderProfile({ userKey: rider.userKey, profile: { ...form, fullName: form.fullName.trim(), phone: form.phone.trim(), city: form.city.trim(), email: rider.profile.email } }));
    navigation.goBack();
  }
  return <RiderLayout navigation={navigation} title="Edit Rider Profile" subtitle="Update your account information" error={error} footer={<AppButton title="Save Profile Changes" onPress={save} />}>
    <View style={styles.profilePhoto}><View style={styles.photoCircle}><AppText variant="title" color={COLORS.primary}>{initials(form.fullName, 'R')}</AppText></View><AppButton title="Change profile photo" variant="outline" onPress={() => navigation.navigate(routes.RIDER_DOCUMENTS_VEHICLE)} /></View>
    <AppInput label="FULL NAME" placeholder="Your full name" value={form.fullName} onValueChange={field('fullName')} autoCapitalize="words" />
    <AppInput label="MOBILE NUMBER" placeholder="0300 1234567" keyboardType="phone-pad" value={form.phone} onValueChange={field('phone')} />
    <AppInput label="EMAIL ADDRESS" value={rider.profile.email} editable={false} />
    <AppInput label="CURRENT CITY" placeholder="Lahore" value={form.city} onValueChange={field('city')} />
    <AppText variant="caption" color={COLORS.textSecondary} style={ui.bold}>DELIVERY VEHICLE</AppText>
    <View style={ui.wrap}>{['Motorbike', 'Bicycle', 'Scooter'].map(vehicle => <Chip key={vehicle} label={vehicle} selected={form.vehicle === vehicle} onPress={() => setForm(previous => ({ ...previous, vehicle }))} />)}</View>
    <Notice title="Your verified documents stay unchanged">Update documents separately if a vehicle or identity file changes.</Notice>
  </RiderLayout>;
}

export function RiderDocumentsVehicleScreen({ navigation }) {
  const dispatch = useDispatch();
  const rider = useRider();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  async function select(kind) {
    setBusy(kind); setError('');
    try { const document = await chooseRiderDocument(kind); if (document) dispatch(saveRiderDocument({ userKey: rider.userKey, kind, document })); }
    catch (problem) { setError('Could not keep that file. Please choose it again.'); }
    finally { setBusy(''); }
  }
  const files = [['nationalId', 'National ID / CNIC'], ['drivingLicense', 'Driving licence'], ['vehicleRegistration', 'Vehicle registration'], ['profilePhoto', 'Profile photo']];
  const approved = rider.application.status === 'Approved';
  return <RiderLayout navigation={navigation} title="Documents & Vehicle" subtitle={rider.profile.vehicle || 'Vehicle details'} footer={<AppButton title="Done" onPress={() => navigation.goBack()} />}>
    <View style={[ui.card, ui.row]}><View style={[styles.fileIcon, approved && styles.complete]}><Icon name={approved ? 'check' : 'hourglass'} size={14} color={approved ? COLORS.success : COLORS.warning} /></View><View style={ui.flex}><AppText style={ui.bold}>{approved ? 'Verified rider' : 'Verification pending'}</AppText><AppText variant="caption" color={COLORS.textSecondary}>Account and ride documents</AppText></View><AppText variant="caption" color={approved ? COLORS.success : COLORS.warning} style={ui.bold}>{rider.application.status}</AppText></View>
    {files.map(([kind, label]) => <Pressable key={kind} accessibilityRole="button" accessibilityLabel={`Update ${label}`} style={[ui.card, ui.row]} onPress={() => select(kind)} disabled={Boolean(busy)}>
      <View style={ui.flex}><AppText variant="small" style={ui.bold}>{label}</AppText><AppText variant="caption" color={COLORS.textSecondary}>{rider.documents[kind]?.name || 'No file selected'}</AppText></View>
      <AppText variant="small" color={COLORS.primary}>{busy === kind ? 'Opening…' : 'Update'}</AppText>
    </Pressable>)}
    {rider.profile.vehicle ? <Notice title={rider.profile.vehicleRegistration}>{rider.profile.vehicle} · Registration saved in your rider profile.</Notice> : null}
    {error ? <AppText color={COLORS.danger}>{error}</AppText> : null}
  </RiderLayout>;
}

const styles = StyleSheet.create({
  progress: { height: 4, borderRadius: 3, backgroundColor: COLORS.border, overflow: 'hidden' }, fill: { height: 4, backgroundColor: COLORS.primary },
  fileIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryLight }, complete: { backgroundColor: COLORS.successLight }, upload: { padding: 8 },
  reviewHero: { alignItems: 'center', gap: 14, paddingVertical: 16 }, clock: { height: 76, width: 76, borderRadius: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.warningBorder, backgroundColor: COLORS.warningLight },
  profilePhoto: { alignItems: 'center', gap: 10 }, photoCircle: { width: 92, height: 92, borderRadius: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryLight },
});
