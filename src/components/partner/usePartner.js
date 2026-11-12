import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { defaultPartnerProfile, selectPartnerAccount, partnerKey, isRestaurantOwner } from '../../redux/partnerSlice';

export default function usePartner() {
  const user = useSelector(state => state.auth.user);
  const account = useSelector(selectPartnerAccount);
  return useMemo(() => ({ ...account, userKey: partnerKey(user),
    profile: { ...defaultPartnerProfile(user), ...account.profile },
    // The listed restaurant's owner is already approved; new partners start at registration.
    application: { status: isRestaurantOwner(user) ? 'Approved' : 'Draft', ...account.application },
  }), [account, user]);
}
