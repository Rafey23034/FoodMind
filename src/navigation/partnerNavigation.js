import { routes } from './routes';

// Return to the existing tab navigator rather than creating another instance.
export function openPartnerTab(navigation, screen, params) {
  navigation.navigate(routes.PARTNER_TABS, { screen, params }, { pop: true });
}
export function openPartnerPreparation(navigation, orderId) {
  openPartnerTab(navigation, routes.PARTNER_ORDERS, {
    screen: routes.PARTNER_PREPARING_ORDER, params: { orderId }, initial: false, pop: true,
  });
}
export function openPartnerOrders(navigation) {
  openPartnerTab(navigation, routes.PARTNER_ORDERS, { screen: routes.PARTNER_ORDERS_LIST, pop: true });
}
