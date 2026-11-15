import { dishes } from '../data/catalog';

export const clean = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const dishByName = new Map(dishes.map(dish => [clean(dish.name), dish]));

export function apiOrderToLocal(order) {
  const items = (order?.items || []).map(item => {
    const dish = dishByName.get(clean(item.name));
    return {
      id: String(item.id),
      dishId: dish?.id || `api-${item.menuItemId}`,
      menuItemId: String(item.menuItemId),
      restaurantId: String(item.restaurantId),
      restaurant: order.restaurant,
      name: item.name,
      subtitle: item.options?.map(option => option.name).join(', ') || dish?.category || 'Menu',
      option: item.options?.map(option => option.name).join(', ') || 'Regular',
      price: Number(item.price),
      rating: dish?.rating ?? null,
      symbol: dish?.symbol || '🍽️',
      quantity: Number(item.quantity),
      options: item.options || [],
    };
  });

  return {
    ...order,
    id: String(order.id),
    customerEmail: order.customerEmail || null,
    items,
    payment: order.payment || 'cash',
    source: 'api',
  };
}
