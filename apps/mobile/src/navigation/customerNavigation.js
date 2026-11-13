import { routes } from './routes';

export function openHome(navigation) {
  navigation.navigate(routes.HOME, { screen: routes.HOME_ROOT, pop: true });
}
export function openSearch(navigation) {
  navigation.navigate(routes.SEARCH, { screen: routes.SEARCH_ROOT, pop: true });
}
export function openProfile(navigation) {
  navigation.navigate(routes.PROFILE, { screen: routes.PROFILE_ROOT, pop: true });
}
export function openCart(navigation) {
  navigation.navigate(routes.CART, { screen: routes.CART_ROOT, pop: true });
}
export function openOrderHistory(navigation) {
  navigation.navigate(routes.PROFILE, { screen: routes.ORDERS, initial: false, pop: true });
}
export function resetSearch(navigation) {
  navigation.navigate(routes.SEARCH, { screen: routes.SEARCH_ROOT, params: { reset: Date.now() }, pop: true });
}
