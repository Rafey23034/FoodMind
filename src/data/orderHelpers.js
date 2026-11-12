import { partnerStage } from './partnerOrders';

export const orderStatusLabel = order => order?.cancelledByCustomer ? 'Cancelled' : order?.status;
export const isClosedOrder = order => ['Delivered', 'Rejected'].includes(order?.status);
export const canCustomerCancel = order => partnerStage(order) === 'new';

export function orderBill(order) {
  const subtotal = order.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  // Older saved orders did not include a fee breakdown.
  const fees = Math.max(0, order.total - subtotal);
  const deliveryFee = order.deliveryFee ?? Math.max(0, fees - Math.min(50, fees));
  const platformFee = order.platformFee ?? Math.min(50, fees);
  return { subtotal, deliveryFee, platformFee, total: order.total };
}

// What the customer should expect next, derived from the order's real stage.
export function orderEtaText(order, restaurantTime) {
  const stage = partnerStage(order);
  if (stage === 'new') return `Waiting for the restaurant · about ${restaurantTime}`;
  if (stage === 'preparing') return order.readyAt ? `Food ready around ${new Date(order.readyAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Being prepared';
  if (stage === 'ready') return 'Ready · waiting for the rider';
  if (stage === 'picked-up') return order.rider?.eta ? `Arriving in about ${order.rider.eta}` : 'On the way to you';
  if (stage === 'delivered') return 'Delivered';
  return orderStatusLabel(order);
}

export function riderLine(order) {
  if (!order?.rider) return 'A rider is assigned once your food is ready.';
  return `${order.rider.vehicle || 'Delivery rider'} · ★ ${order.rider.rating}${order.rider.isDemo ? ' · Sample rider' : ''}`;
}
