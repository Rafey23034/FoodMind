import React from 'react';
import { useSelector } from 'react-redux';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { routes } from './routes';
import useRider from '../components/rider/useRider';
import RiderTabs from '../components/rider/RiderTabs';
import useRiderRealtime, { RiderLiveContext } from '../components/rider/useRiderRealtime';
import {
  RiderRegistrationScreen, RiderDocumentsScreen, RiderUnderReviewScreen,
  RiderEditProfileScreen, RiderDocumentsVehicleScreen,
} from '../screens/rider/RiderRegistrationScreens';
import {
  RiderJobsScreen, RiderRequestDetailsScreen, RiderEarningsScreen, RiderHistoryScreen,
  RiderRateScreen, RiderProfileScreen,
} from '../screens/rider/RiderWorkScreens';
import {
  RiderActiveDeliveryScreen, RiderToPickupScreen, RiderConfirmPickupScreen,
  RiderToCustomerScreen, RiderUpdateStatusScreen, RiderProofScreen,
  RiderCompletedScreen, RiderSupportScreen,
} from '../screens/rider/RiderDeliveryScreens';

const Root = createNativeStackNavigator();
const Jobs = createNativeStackNavigator();
const Earnings = createNativeStackNavigator();
const Profile = createNativeStackNavigator();

function RiderJobsStack() {
  return <Jobs.Navigator initialRouteName={routes.RIDER_JOBS} screenOptions={{ headerShown: false }}>
    <Jobs.Screen name={routes.RIDER_JOBS} component={RiderJobsScreen} />
    <Jobs.Screen name={routes.RIDER_REQUEST_DETAILS} component={RiderRequestDetailsScreen} />
    <Jobs.Screen name={routes.RIDER_ACTIVE_DELIVERY} component={RiderActiveDeliveryScreen} />
    <Jobs.Screen name={routes.RIDER_TO_PICKUP} component={RiderToPickupScreen} />
    <Jobs.Screen name={routes.RIDER_CONFIRM_PICKUP} component={RiderConfirmPickupScreen} />
    <Jobs.Screen name={routes.RIDER_TO_CUSTOMER} component={RiderToCustomerScreen} />
    <Jobs.Screen name={routes.RIDER_UPDATE_STATUS} component={RiderUpdateStatusScreen} />
    <Jobs.Screen name={routes.RIDER_PROOF} component={RiderProofScreen} />
    <Jobs.Screen name={routes.RIDER_COMPLETED} component={RiderCompletedScreen} />
    <Jobs.Screen name={routes.RIDER_RATE} component={RiderRateScreen} />
    <Jobs.Screen name={routes.RIDER_SUPPORT} component={RiderSupportScreen} />
  </Jobs.Navigator>;
}
function RiderEarningsStack() {
  return <Earnings.Navigator initialRouteName={routes.RIDER_EARNINGS} screenOptions={{ headerShown: false }}>
    <Earnings.Screen name={routes.RIDER_EARNINGS} component={RiderEarningsScreen} />
    <Earnings.Screen name={routes.RIDER_HISTORY} component={RiderHistoryScreen} />
    <Earnings.Screen name={routes.RIDER_RATE} component={RiderRateScreen} />
  </Earnings.Navigator>;
}
function RiderProfileStack() {
  return <Profile.Navigator initialRouteName={routes.RIDER_PROFILE} screenOptions={{ headerShown: false }}>
    <Profile.Screen name={routes.RIDER_PROFILE} component={RiderProfileScreen} />
    <Profile.Screen name={routes.RIDER_EDIT_PROFILE} component={RiderEditProfileScreen} />
    <Profile.Screen name={routes.RIDER_DOCUMENTS_VEHICLE} component={RiderDocumentsVehicleScreen} />
    <Profile.Screen name={routes.RIDER_SUPPORT} component={RiderSupportScreen} />
  </Profile.Navigator>;
}
// One live connection for all rider screens while signed in through the API.
function RiderMainTabs() {
  const apiSession = useSelector(state => Boolean(state.auth.user?.accessToken || state.auth.user?.refreshToken));
  const live = useRiderRealtime(apiSession);
  return <RiderLiveContext.Provider value={live}>
    <RiderTabs Jobs={RiderJobsStack} Earnings={RiderEarningsStack} Profile={RiderProfileStack} />
  </RiderLiveContext.Provider>;
}

export default function RiderStack() {
  const { application } = useRider();
  const initial = application.status === 'Approved' ? routes.RIDER_TABS
    : application.status === 'Under review' ? routes.RIDER_UNDER_REVIEW : routes.RIDER_REGISTER;
  return <Root.Navigator initialRouteName={initial} screenOptions={{ headerShown: false }}>
    <Root.Screen name={routes.RIDER_TABS} component={RiderMainTabs} />
    <Root.Screen name={routes.RIDER_REGISTER} component={RiderRegistrationScreen} />
    <Root.Screen name={routes.RIDER_DOCUMENTS} component={RiderDocumentsScreen} />
    <Root.Screen name={routes.RIDER_UNDER_REVIEW} component={RiderUnderReviewScreen} />
  </Root.Navigator>;
}
