const categorySymbols = {
  Burgers: '🍔',
  Pizza: '🍕',
  Pasta: '🍝',
  Sides: '🍟',
  Desi: '🍛',
  Desserts: '🍰',
};

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function iso(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const text = String(value);
  return text.includes('T') ? text : `${text.replace(' ', 'T')}Z`;
}

function location(row) {
  if (row?.lat == null || row?.lng == null) return null;
  return { lat: number(row.lat), lng: number(row.lng) };
}

const CUSTOMER_STATUS = {
  placed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Preparing',
  picked_up: 'On the way',
  delivered: 'Delivered',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

const PARTNER_STAGE = {
  placed: 'new',
  preparing: 'preparing',
  ready: 'ready',
  picked_up: 'picked-up',
  delivered: 'delivered',
  rejected: 'rejected',
  cancelled: 'rejected',
};

function menuItem(row, options = []) {
  const tags = row.tags ? String(row.tags).split(',').filter(Boolean) : [];
  return {
    id: String(row.id),
    dishId: String(row.id),
    restaurantId: String(row.restaurant_id),
    restaurant: row.restaurant_name,
    name: row.name,
    description: row.description || '',
    price: number(row.price),
    category: row.category_name || 'Menu',
    tags,
    rating: row.rating == null ? null : number(row.rating),
    ratingCount: number(row.rating_count),
    isAvailable: Boolean(row.is_available),
    isBestseller: Boolean(row.is_bestseller),
    isRecommended: Boolean(row.is_recommended),
    imageUrl: row.image_url || null,
    symbol: categorySymbols[row.category_name] || '🍽️',
    options,
  };
}

function orderItem(row) {
  return {
    id: String(row.id),
    menuItemId: String(row.menu_item_id),
    dishId: String(row.menu_item_id),
    restaurantId: String(row.restaurant_id),
    name: row.item_name,
    unitPrice: number(row.unit_price),
    optionsPrice: number(row.options_price),
    price: number(row.unit_price) + number(row.options_price),
    quantity: number(row.quantity),
    lineTotal: number(row.line_total),
    options: [],
  };
}

function order(row, items = []) {
  return {
    id: String(row.id),
    customerId: String(row.customer_id),
    customerName: row.customer_name || null,
    customerEmail: row.customer_email || null,
    customerPhone: row.customer_phone || null,
    restaurantId: String(row.restaurant_id),
    restaurant: row.restaurant_name,
    restaurantPhone: row.restaurant_phone || null,
    restaurantLocation: location({ lat: row.restaurant_lat, lng: row.restaurant_lng }),
    status: CUSTOMER_STATUS[row.status] || row.status,
    dbStatus: row.status,
    partnerStage: PARTNER_STAGE[row.status] || 'new',
    rider: row.rider_id ? {
      id: String(row.rider_id),
      name: row.rider_name,
      phone: row.rider_phone || null,
      vehicle: row.rider_vehicle || null,
      location: location({ lat: row.rider_lat, lng: row.rider_lng }),
    } : null,
    items,
    address: row.delivery_address,
    addressLabel: row.delivery_label,
    destination: {
      label: row.delivery_label,
      address: row.delivery_address,
      location: location({ lat: row.delivery_lat, lng: row.delivery_lng }),
    },
    deliveryDistanceM: row.delivery_distance_m == null ? null : number(row.delivery_distance_m),
    subtotal: number(row.subtotal),
    deliveryFee: number(row.delivery_fee),
    platformFee: number(row.platform_fee),
    discountAmount: number(row.discount_amount),
    total: number(row.total),
    payment: row.payment_method,
    isPaid: row.payment_status === 'collected',
    customerNote: row.customer_note || '',
    prepMinutes: row.prep_minutes == null ? null : number(row.prep_minutes),
    delayMinutes: number(row.delay_minutes),
    estimatedReadyAt: iso(row.estimated_ready_at),
    pickupCode: row.pickup_code || null,
    proofPhotoUrl: row.proof_photo_url || null,
    rejectionReason: row.rejection_reason || null,
    createdAt: iso(row.placed_at),
    updatedAt: iso(row.updated_at),
  };
}

module.exports = { number, iso, location, menuItem, order, orderItem, categorySymbols };
