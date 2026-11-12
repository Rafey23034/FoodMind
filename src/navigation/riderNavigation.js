import { routes } from './routes';

export function openRiderTab(navigation, screen, params) {
  navigation.navigate(routes.RIDER_TABS, { screen, params }, { pop: true });
}
export function openRiderJob(navigation, screen, params) {
  openRiderTab(navigation, routes.RIDER_JOBS, { screen, params, initial: false, pop: true });
}
