import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import ScreenLayout from '../../components/customer/ScreenLayout';
import AppText from '../../components/AppText';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import { EmptyState, Notice, ui } from '../../components/customer/ui';
import { customerKey, saveReport, selectCustomer } from '../../redux/customerSlice';
import { COLORS } from '../../theme/colors';

const FAQS = [
  { question: 'How do points work?', summary: 'Earn rewards by ordering and reviewing.', answer: 'Each delivered order earns 20 points. Your first review of that order earns another 20 points. Editing a review does not add more points. Redeem 100 points for a saved demo voucher.' },
  { question: 'How do I cancel an order?', summary: 'You can cancel before preparation begins.', answer: 'Open My Orders, choose View Details, then Cancel Order. You can cancel until the restaurant accepts the order.' },
  { question: 'Where is my order?', summary: 'Track progress from My Orders.', answer: 'Open My Orders and tap Track Order. The tracking screen shows the saved order status and an illustrated demo route. The restaurant updates preparation and pickup; the demo control previews the next stage.' },
];
export default function HelpSupportScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const { reports } = useSelector(selectCustomer);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [reporting, setReporting] = useState(false);
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [message, setMessage] = useState('');
  const [receipt, setReceipt] = useState(null);
  const filtered = FAQS.filter(faq => `${faq.question} ${faq.answer}`.toLowerCase().includes(search.toLowerCase()));
  function submit() {
    if (!subject.trim() || details.trim().length < 10) { setMessage('Enter a subject and at least 10 characters describing the problem.'); return; }
    const report = { id: `HELP${Date.now()}`, subject: subject.trim(), details: details.trim(), orderId: route.params?.orderId,
      deliveryId: route.params?.deliveryId, createdAt: new Date().toISOString() };
    dispatch(saveReport({ userKey: customerKey(user), report }));
    setReceipt(report.id); setReporting(false); setMessage(''); setSubject(''); setDetails('');
  }
  const reportForm = <View style={ui.card}>
    <AppText variant="subheading">Report a problem</AppText>
    {route.params?.orderId || route.params?.deliveryId ? <AppText variant="small" color={COLORS.textSecondary}>Related request: {route.params.orderId || route.params.deliveryId}</AppText> : null}
    <AppInput label="Subject" value={subject} onValueChange={setSubject} placeholder="What happened?" maxLength={120} />
    <AppInput label="Details" value={details} onValueChange={setDetails} placeholder="Describe the issue..." multiline maxLength={2000} />
    <AppText variant="small" color={COLORS.textSecondary}>This report is saved on this device. Support submission will be connected with the backend.</AppText>
    <AppButton title="Cancel" variant="text" onPress={() => { setReporting(false); setMessage(''); }} />
  </View>;
  // While reporting, the form is shown first so it is visible right after tapping the footer button.
  return <ScreenLayout navigation={navigation} title="Help & Support" error={reporting ? message : ''}
    footer={<AppButton title={reporting ? 'Save Report' : 'Report a Problem'} onPress={reporting ? submit : () => { setReceipt(null); setReporting(true); }} />}>
    {reporting ? reportForm : null}
    {receipt ? <Notice success icon="check" title="Report saved">Reference: {receipt}</Notice> : null}
    <AppInput value={search} onValueChange={setSearch} placeholder="Search help articles..." accessibilityLabel="Search help articles" />
    <AppText variant="subheading">Frequently asked questions</AppText>
    {filtered.map(faq => <Pressable key={faq.question} accessibilityRole="button" accessibilityState={{ expanded: expanded === faq.question }}
      style={ui.card} onPress={() => setExpanded(expanded === faq.question ? null : faq.question)}>
      <View style={ui.between}><AppText style={[ui.bold, ui.flex]}>{faq.question}</AppText><AppText color={COLORS.primary} style={ui.bold}>{expanded === faq.question ? '−' : '+'}</AppText></View>
      <AppText variant="small" color={COLORS.textSecondary}>{expanded === faq.question ? faq.answer : faq.summary}</AppText>
    </Pressable>)}
    {!filtered.length ? <EmptyState title="No matching help articles">Try another word, or report a problem below.</EmptyState> : null}
    {reports.length ? <><AppText variant="subheading">Your saved reports</AppText>{reports.slice(0, 5).map(report => <View key={report.id} style={ui.card}>
      <AppText style={ui.bold}>{report.subject}</AppText><AppText variant="small" color={COLORS.textSecondary}>{report.details}</AppText><AppText variant="caption" color={COLORS.primary}>{report.id} · Saved on this device</AppText>
    </View>)}</> : null}
  </ScreenLayout>;
}
