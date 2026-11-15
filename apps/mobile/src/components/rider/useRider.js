import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { demoRiderAccount } from '../../data/riderRequests';
import { riderKey, selectRiderAccount } from '../../redux/riderSlice';

// Read-only view of the signed-in rider. The account itself is created at sign-in (redux/session.js).
export default function useRider() {
  const user = useSelector(state => state.auth.user);
  const saved = useSelector(selectRiderAccount);
  const userKey = riderKey(user);
  const initial = useMemo(() => demoRiderAccount(user), [user]);
  return useMemo(() => ({
    ...initial, ...saved,
    profile: { ...initial.profile, ...saved.profile },
    documents: { ...initial.documents, ...saved.documents },
    application: { ...initial.application, ...saved.application },
    deliveries: saved.deliveries?.length ? saved.deliveries : initial.deliveries,
    userKey,
  }), [initial, saved, userKey]);
}
