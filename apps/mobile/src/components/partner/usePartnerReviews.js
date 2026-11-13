import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { restaurantReviews } from '../../data/partnerReviews';

export default function usePartnerReviews() {
  const byUser = useSelector(state => state.customer.byUser);
  const orders = useSelector(state => state.orders.items);
  return useMemo(() => restaurantReviews(byUser, orders), [byUser, orders]);
}
