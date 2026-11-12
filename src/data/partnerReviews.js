import { restaurant } from './catalog';

export const samplePartnerReviews = [
  { id: 'sample-review-1', author: 'Ali K.', rating: 5, dishId: 'classic-smash', dishName: 'Classic Smash Burger', text: 'The burger was great and still hot.', tags: ['Juicy'], dateLabel: 'Sample review', isDemo: true },
  { id: 'sample-review-2', author: 'Sara M.', rating: 4, dishId: 'loaded-fries', dishName: 'Loaded Fries', text: 'Good, a bit mild for the price.', tags: ['Crispy'], dateLabel: 'Sample review', isDemo: true },
  { id: 'sample-review-3', author: 'Hamza R.', rating: 5, dishId: 'fire-burger', dishName: 'Fire Burger', text: 'Perfect heat and the mayo is great.', tags: ['Large portion'], dateLabel: 'Sample review', isDemo: true },
];
export function restaurantReviews(byUser, orders) {
  return Object.entries(byUser || {}).flatMap(([key, account]) => (account.reviews || [])
    .filter(review => review.restaurant === restaurant.name && review.rating >= 1 && review.rating <= 5)
    .map(review => ({ ...review, id: `${key}:${review.id}`, author: account.profile?.name || 'FoodMind diner',
      verified: orders.some(order => order.id === review.orderId && order.status === 'Delivered'),
      dateLabel: review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'Saved review' })))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}
export function ratingSummary(reviews) {
  const count = reviews.length;
  return { count, average: count ? reviews.reduce((sum, review) => sum + review.rating, 0) / count : 0,
    distribution: [5, 4, 3, 2, 1].map(rating => ({ rating, count: reviews.filter(review => review.rating === rating).length })) };
}
