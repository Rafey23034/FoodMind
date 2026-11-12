import React from 'react';
import { useDispatch } from 'react-redux';
import ProfileScreen from './ProfileScreen';
import { logout } from '../../redux/authSlice';
import { routes } from '../../navigation/routes';
import { confirmLogout } from '../../utils/confirm';

// The Profile tab root. Order history lives in the profile; Cart has its own bottom tab.
const DESTINATIONS = {
  orders: routes.ORDERS, addresses: routes.ADDRESSES, settings: routes.SETTINGS, edit_profile: routes.EDIT_PROFILE,
  reviews: routes.MY_REVIEWS, rewards: routes.REWARDS, community: routes.COMMUNITY_DELIVERY, help: routes.HELP_SUPPORT,
};

export default function MenuScreen({ navigation }) {
  const dispatch = useDispatch();
  function handleMenuItem(id) {
    if (id === 'logout') confirmLogout(() => dispatch(logout()));
    else if (DESTINATIONS[id]) navigation.navigate(DESTINATIONS[id]);
  }
  return <ProfileScreen navigation={navigation} onItemPress={handleMenuItem} />;
}
