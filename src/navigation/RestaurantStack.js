import React from 'react';
import { useDispatch } from 'react-redux';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { routes } from './routes';
import { logout } from '../redux/authSlice';
import { transitionPartnerOrder, loadPartnerExamples } from '../redux/partnerSlice';
import { orderDestination, partnerStage } from '../data/partnerOrders';
import { CustomerPreviewContext } from './PreviewContext';
import BackButton from '../components/BackButton';
import { confirmLogout } from '../utils/confirm';
import { openPartnerPreparation } from './partnerNavigation';
import usePartner from '../components/partner/usePartner';
import PartnerTabs from '../components/partner/PartnerTabs';
import AppText from '../components/AppText';
import CustomerStack from './CustomerStack';
import PartnerRegistrationScreen from '../screens/restaurant/PartnerRegistrationScreen';
import PartnerDocumentsScreen from '../screens/restaurant/PartnerDocumentsScreen';
import PartnerUnderReviewScreen from '../screens/restaurant/PartnerUnderReviewScreen';
import PartnerOrdersScreen from '../screens/restaurant/PartnerOrdersScreen';
import PartnerNewOrderScreen from '../screens/restaurant/PartnerNewOrderScreen';
import PartnerPreparingOrderScreen from '../screens/restaurant/PartnerPreparingOrderScreen';
import PartnerOrderStatusScreen from '../screens/restaurant/PartnerOrderStatusScreen';
import PartnerReviewsScreen from '../screens/restaurant/PartnerReviewsScreen';
import PartnerStoreScreen from '../screens/restaurant/PartnerStoreScreen';
import EditRestaurantProfileScreen from '../screens/restaurant/EditRestaurantProfileScreen';
import { COLORS } from '../theme/colors';
import PartnerPortalScreen from '../screens/restaurant/PartnerPortalScreen';
import ManageMenuScreen from '../screens/restaurant/ManageMenu';
import MenuItemEditorScreen from '../screens/restaurant/MenuItemEditorScreen';

const Stack = createNativeStackNavigator();
const PartnerFeatureStack = createNativeStackNavigator();
const partnerDetailScreens = [
  [routes.PARTNER_NEW_ORDER, NewOrder],
  [routes.PARTNER_PREPARING_ORDER, Preparation],
  [routes.PARTNER_ORDER_STATUS, OrderStatus],
  [routes.EDIT_MENU_ITEM, MenuEditor],
  [routes.PARTNER_EDIT_STORE, StoreEditor],
];
const screens = [
  [routes.PARTNER_REGISTER, PartnerRegistrationScreen],
  [routes.PARTNER_DOCUMENTS, PartnerDocumentsScreen],
  [routes.PARTNER_UNDER_REVIEW, PartnerUnderReviewScreen],
  [routes.PARTNER_NEW_ORDER, PartnerNewOrderScreen],
  [routes.PARTNER_ORDER_STATUS, PartnerOrderStatusScreen],
  [routes.PARTNER_EDIT_STORE, EditRestaurantProfileScreen],
];

function OverviewTab({ navigation }) {
  const dispatch = useDispatch();
  const { userKey } = usePartner();
  function openOrder(order) {
    const destination = orderDestination(order);
    if (destination === routes.PARTNER_PREPARING_ORDER) openPartnerPreparation(navigation, order.id);
    else navigation.navigate(destination, { orderId: order.id });
  }
  return <PartnerPortalScreen
    onManageMenu={() => navigation.navigate(routes.MANAGE_MENU)}
    onSignOut={() => confirmLogout(() => dispatch(logout()))}
    onOpenOrder={openOrder}
    onViewAllOrders={() => navigation.navigate(routes.PARTNER_ORDERS, { screen: routes.PARTNER_ORDERS_LIST, pop: true })}
    onOpenStore={() => navigation.navigate(routes.PARTNER_STORE)}
    onCustomerPreview={() => navigation.navigate(routes.PARTNER_CUSTOMER_PREVIEW)}
    onDemoOrders={() => dispatch(loadPartnerExamples({ userKey, at: new Date().toISOString() }))}
    onAcceptOrder={id => {
      if (dispatch(transitionPartnerOrder({ id, stage: 'preparing' }))) openPartnerPreparation(navigation, id);
    }}
    onRejectOrder={id => navigation.navigate(routes.PARTNER_NEW_ORDER, { orderId: id, confirmReject: true })}
    onReadyOrder={order => {
      // Already-ready orders open their status screen; preparing orders are marked ready first.
      if (partnerStage(order) === 'ready' || dispatch(transitionPartnerOrder({ id: order.id, stage: 'ready' }))) {
        navigation.navigate(routes.PARTNER_ORDER_STATUS, { orderId: order.id });
      }
    }}
    onAddMenuItem={() => navigation.navigate(routes.EDIT_MENU_ITEM)} />;
}
function MenuContents({ navigation }) {
  return <ManageMenuScreen onBack={() => navigation.goBack()}
    onAddItem={() => navigation.navigate(routes.EDIT_MENU_ITEM)}
    onEditItem={itemId => navigation.navigate(routes.EDIT_MENU_ITEM, { itemId })} />;
}
function OrdersList(props) { return <PartnerOrdersScreen {...props} hasPartnerTabs />; }
function Preparation(props) { return <PartnerPreparingOrderScreen {...props} hasPartnerTabs />; }
function NewOrder(props) { return <PartnerNewOrderScreen {...props} hasPartnerTabs />; }
function OrderStatus(props) { return <PartnerOrderStatusScreen {...props} hasPartnerTabs />; }
function MenuEditor(props) { return <MenuItemEditorScreen {...props} hasPartnerTabs />; }
function StoreEditor(props) { return <EditRestaurantProfileScreen {...props} hasPartnerTabs />; }
function PartnerTabStack({ initialRouteName, initialScreen: InitialScreen }) {
  return <PartnerFeatureStack.Navigator initialRouteName={initialRouteName} screenOptions={{ headerShown: false }}>
    <PartnerFeatureStack.Screen name={initialRouteName} component={InitialScreen} />
    {partnerDetailScreens.map(([name, component]) => <PartnerFeatureStack.Screen key={name} name={name} component={component} />)}
  </PartnerFeatureStack.Navigator>;
}
function DashboardTab() { return <PartnerTabStack initialRouteName={routes.DASHBOARD} initialScreen={OverviewTab} />; }
function MenuTab() { return <PartnerTabStack initialRouteName={routes.MANAGE_MENU} initialScreen={MenuContents} />; }
function OrdersTab() { return <PartnerTabStack initialRouteName={routes.PARTNER_ORDERS_LIST} initialScreen={OrdersList} />; }
function ReviewsTab() { return <PartnerTabStack initialRouteName={routes.PARTNER_REVIEWS} initialScreen={ReviewsContents} />; }
function StoreTab() { return <PartnerTabStack initialRouteName={routes.PARTNER_STORE} initialScreen={StoreContents} />; }
function ReviewsContents(props) { return <PartnerReviewsScreen {...props} hasPartnerTabs />; }
function StoreContents(props) { return <PartnerStoreScreen {...props} hasPartnerTabs />; }
function PartnerMainTabs() {
  return <PartnerTabs Overview={DashboardTab} Menu={MenuTab} Orders={OrdersTab} Reviews={ReviewsTab} Store={StoreTab} />;
}
function CustomerPreview({ navigation }) {
  return <View style={styles.page}>
    <SafeAreaView edges={['top']} style={styles.previewHeader}>
      <BackButton onPress={() => navigation.goBack()} label="Return to Partner Portal" />
      <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" style={styles.flex}>
        <AppText variant="small" color={COLORS.textSecondary}>Customer preview</AppText>
        <AppText color={COLORS.primary} style={styles.bold}>Return to Partner Portal</AppText>
      </Pressable>
    </SafeAreaView>
    <CustomerPreviewContext.Provider value>
      <SafeAreaProvider style={styles.page}><CustomerStack /></SafeAreaProvider>
    </CustomerPreviewContext.Provider>
  </View>;
}

export default function RestaurantStack() {
  const { application } = usePartner();
  const initial = application.status === 'Pending approval' ? routes.PARTNER_UNDER_REVIEW : application.status === 'Approved' ? routes.PARTNER_TABS : routes.PARTNER_REGISTER;
  return <Stack.Navigator initialRouteName={initial} screenOptions={{ headerShown: false }}>
    <Stack.Screen name={routes.PARTNER_TABS} component={PartnerMainTabs} />
    <Stack.Screen name={routes.EDIT_MENU_ITEM} component={MenuItemEditorScreen} />
    {screens.map(([name, component]) => <Stack.Screen key={name} name={name} component={component} />)}
    <Stack.Screen name={routes.PARTNER_CUSTOMER_PREVIEW} component={CustomerPreview} />
  </Stack.Navigator>;
}
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: COLORS.background }, previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingBottom: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border }, bold: { fontWeight: '700' }, flex: { flex: 1 } });
