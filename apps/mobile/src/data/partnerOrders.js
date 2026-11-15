import { dishes, makeCartItem, restaurant } from './catalog';

// One order lifecycle shared by the customer, partner and demo controls.
// `partnerStage` is the source of truth; `status` is the customer-facing label derived from it.
export const PARTNER_STAGES = ['new', 'preparing', 'ready', 'picked-up'];
export const PARTNER_STAGE_LABELS = { new: 'New Order', preparing: 'Preparing', ready: 'Ready for Pickup', 'picked-up': 'Picked Up', delivered: 'Delivered', rejected: 'Rejected' };
export const CUSTOMER_STATUS_FOR_STAGE = { new: 'Confirmed', preparing: 'Preparing', ready: 'Preparing', 'picked-up': 'On the way', delivered: 'Delivered', rejected: 'Rejected' };
export const NEXT_STAGE = { new: 'preparing', preparing: 'ready', ready: 'picked-up', 'picked-up': 'delivered' };
export const DEMO_STAGE_ACTION = { new: 'Restaurant accepts', preparing: 'Food is ready', ready: 'Rider picks up', 'picked-up': 'Mark delivered' };
export const SAMPLE_RIDER = Object.freeze({ name: 'Tariq M.', rating: 4.9, vehicle: 'Honda CB125', eta: '8 min', isDemo: true });

export function partnerStage(order) {
  if (!order) return null;
  if (order.status === 'Rejected' || order.status === 'Cancelled') return 'rejected';
  if (order.status === 'Delivered') return 'delivered';
  if (order.status === 'On the way') return 'picked-up';
  if (order.status === 'Preparing') return order.partnerStage === 'ready' ? 'ready' : 'preparing';
  return 'new';
}

export function canTransitionOrder(order, next) {
  const allowed = { new: ['preparing', 'rejected'], preparing: ['ready'], ready: ['picked-up'], 'picked-up': ['delivered'], delivered: [], rejected: [] };
  return (allowed[partnerStage(order)] || []).includes(next);
}

export function updatedPartnerOrder(order, stage, { prepMinutes = 20, at = new Date().toISOString() } = {}) {
  if (!canTransitionOrder(order, stage)) return order;
  const next = { ...order, partnerStage: stage, status: CUSTOMER_STATUS_FOR_STAGE[stage], statusUpdatedAt: at };
  if (stage === 'preparing') {
    next.prepMinutes = prepMinutes;
    next.acceptedAt = at;
    next.readyAt = new Date(new Date(at).getTime() + prepMinutes * 60000).toISOString();
    next.delayMinutes = 0;
    if (order.isDemo && !order.rider) next.rider = { ...SAMPLE_RIDER };
  }
  // Rider dispatch is not connected yet; a clearly labelled sample rider collects the order.
  if (stage === 'picked-up' && !next.rider) next.rider = { ...SAMPLE_RIDER };
  if (stage === 'delivered') next.deliveredAt = at;
  return next;
}

// Shared by real and sample orders so both behave identically.
export function delayedOrder(order, minutes = 5) {
  if (!order || !['preparing', 'ready'].includes(partnerStage(order))) return order;
  const next = { ...order, delayMinutes: (order.delayMinutes || 0) + minutes };
  if (order.readyAt) next.readyAt = new Date(new Date(order.readyAt).getTime() + minutes * 60000).toISOString();
  return next;
}

export function isLiveForPartner(order) {
  return ['new', 'preparing', 'ready'].includes(partnerStage(order));
}

export function samplePartnerOrders(at = new Date().toISOString()) {
  const item = id => makeCartItem(dishes.find(dish => dish.id === id));
  return [
    { id: 'DEMO-1034', restaurant: restaurant.name, status: 'Confirmed', partnerStage: 'new',
      items: [{ ...item('classic-smash'), quantity: 2 }, item('loaded-fries')], total: 2400,
      payment: 'online', isPaid: true, customerName: 'Ali K.', address: 'Johar Town, Lahore',
      notes: 'No onions on the burger, please.', createdAt: at, isDemo: true },
    { id: 'DEMO-1033', restaurant: restaurant.name, status: 'Preparing', partnerStage: 'preparing',
      items: [item('fire-burger'), item('loaded-fries')], total: 1440, payment: 'cash',
      customerName: 'Sara M.', address: 'Gulberg, Lahore', createdAt: at, acceptedAt: at,
      readyAt: new Date(new Date(at).getTime() + 20 * 60000).toISOString(), prepMinutes: 20,
      rider: { ...SAMPLE_RIDER }, isDemo: true },
  ];
}

export function orderNumber(order) { return String(order?.id || '').replace(/^DEMO-/, '').replace(/^FM/, '').slice(-6); }
export function orderDestination(order) {
  const stage = partnerStage(order);
  return stage === 'new' ? 'PartnerNewOrder' : stage === 'preparing' ? 'PartnerPreparingOrder' : 'PartnerOrderStatus';
}

export function validateRestaurant(profile) {
  if (!profile.name?.trim() || !profile.ownerName?.trim() || !profile.address?.trim()) return 'Enter the restaurant name, owner name, and address.';
  if (!/^\S+@\S+\.\S+$/.test(profile.email?.trim() || '')) return 'Enter a valid contact email.';
  const digits = (profile.phone || '').replace(/\D/g, '');
  if (!/^\+?[\d\s()-]{7,20}$/.test(profile.phone || '') || digits.length < 7 || digits.length > 15) return 'Enter a valid phone number.';
  if (!profile.cuisines?.length) return 'Choose at least one cuisine type.';
  return '';
}
