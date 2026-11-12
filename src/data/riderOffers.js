import { COLORS } from '../theme/colors';

// Example offers for exercising the community-delivery frontend without a server.
export const riderOffers = [
  { id: 'rider-c', name: 'Rider C', initials: 'RC', rating: 4.8, fee: 120, minutes: 18, eta: '15-20 min', badge: 'Lowest price', color: COLORS.infoLight },
  { id: 'rider-b', name: 'Rider B', initials: 'RB', rating: 4.7, fee: 150, minutes: 12, eta: '10-15 min', badge: 'Fastest', color: COLORS.primaryLight },
  { id: 'rider-a', name: 'Rider A', initials: 'RA', rating: 4.9, fee: 180, minutes: 15, eta: '12-18 min', badge: 'Top rated', color: COLORS.successLight },
];
export const COMMUNITY_STAGES = ['Rider accepted', 'Heading to shop', 'Food picked up', 'On the way', 'Delivered'];
export function sortRiderOffers(offers, sort) {
  return [...offers].sort((a, b) => sort === 'Fastest' ? a.minutes - b.minutes : sort === 'Top rated' ? b.rating - a.rating : a.fee - b.fee);
}
