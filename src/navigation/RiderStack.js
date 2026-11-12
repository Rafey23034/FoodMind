import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { routes } from './routes';
import useRider from '../components/rider/useRider';
import RiderTabs from '../components/rider/RiderTabs';
import {
  RiderRegistrationScreen, RiderDocumentsScreen, RiderUnderReviewScreen,
  RiderEditProfileScreen, RiderDocumentsVehicleScreen,
} from '../screens/rider/RiderRegistrationScreens';
import {
  RiderJobsScreen, RiderRequestDetailsScreen, RiderSubmitBidScreen, RiderBidSubmittedScreen,
  RiderBidsScreen, RiderJobDecisionScreen, RiderEarningsScreen, RiderHistoryScreen,
  RiderRateScreen, RiderProfileScreen,
} from '../screens/rider/RiderWorkScreens';
import {
  RiderActiveDeliveryScreen, RiderToPickupScreen, RiderConfirmPickupScreen,
  RiderToCustomerScreen, RiderUpdateStatusScreen, RiderProofScreen,
  RiderCompletedScreen, RiderSupportScreen,
} from '../screens/rider/RiderDeliveryScreens';

const Root = createNativeStackNavigator();
const Jobs = createNativeStackNavigator();
const Bids = createNativeStackNavigator();
const Earnings = createNativeStackNavigator();
const Profile = createNativeStackNavigator();

function RiderJobsStack() {
  return <Jobs.Navigator initialRouteName={routes.RIDER_JOBS} screenOptions={{ headerShown: false }}>
    <Jobs.Screen name={routes.RIDER_JOBS} component={RiderJobsScreen} />
    <Jobs.Screen name={routes.RIDER_REQUEST_DETAILS} component={RiderRequestDetailsScreen} />
    <Jobs.Screen name={routes.RIDER_SUBMIT_BID} component={RiderSubmitBidScreen} />
    <Jobs.Screen name={routes.RIDER_BID_SUBMITTED} component={RiderBidSubmittedScreen} />
    <Jobs.Screen name={routes.RIDER_JOB_DECISION} component={RiderJobDecisionScreen} />
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
function RiderBidsStack() {
  return <Bids.Navigator initialRouteName={routes.RIDER_BIDS_ROOT} screenOptions={{ headerShown: false }}>
    <Bids.Screen name={routes.RIDER_BIDS_ROOT} component={RiderBidsScreen} />
  </Bids.Navigator>;
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
function RiderMainTabs() {
  return <RiderTabs Jobs={RiderJobsStack} Bids={RiderBidsStack} Earnings={RiderEarningsStack} Profile={RiderProfileStack} />;
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
