
import React, { createContext, useContext, useState } from 'react';

const ShopContext = createContext(null);

const BURGER = {
  id: 'burger', name: 'Classic Smash Burger', subtitle: 'Extra Cheddar Cheese',
  option: 'Regular Bun', price: 890, rating: 4.7, quantity: 1,
  image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300',
};

const FRIES = {
  id: 'fries', name: 'Loaded Fries', subtitle: 'Garlic Mayo Dip',
  option: 'Large Size', price: 420, rating: 4.6, quantity: 1,
  image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=300',
};

const INITIAL_ORDERS = [
  {
    id: 'FM1029', restaurant: 'Urban Bites', status: 'Preparing',
    total: 1360, eta: '18–22 mins', items: [BURGER, FRIES],
  },
  {
    id: 'FM1021', restaurant: 'Bella Kitchen', status: 'Delivered',
    total: 1050, description: 'Creamy Pasta · 2 Sep',
    items: [{ ...BURGER, id: 'pasta', name: 'Creamy Pasta', price: 1050 }],
  },
  {
    id: 'FM1018', restaurant: 'Pizza Hub', status: 'Delivered',
    total: 1450, description: 'Pepperoni Pizza · 29 Aug',
    items: [{ ...BURGER, id: 'pizza', name: 'Pepperoni Pizza', price: 1450 }],
  },
];

export function ShopProvider({ children }) {
  const [cart, setCart] = useState([BURGER, FRIES]);
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [promoApplied, setPromoApplied] = useState(true);
  const [instruction, setInstruction] = useState('Leave at doorstep');

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = promoApplied && subtotal > 0 ? Math.min(150, subtotal) : 0;
  const platformFee = subtotal > 0 ? 50 : 0;
  const deliveryFee = subtotal > 0 ? 150 : 0;
  const cartTotal = subtotal > 0 ? subtotal + deliveryFee + platformFee - discount : 0;

  function changeQuantity(id, amount) {
    setCart(previous => previous.map(item =>
      item.id === id ? { ...item, quantity: Math.max(1, item.quantity + amount) } : item
    ));
  }

  const removeItem = id => setCart(previous => previous.filter(item => item.id !== id));
  const clearCart = () => setCart([]);

  function placeOrder(details) {
    if (cart.length === 0) return null;

    const newOrder = {
      id: 'FM' + Date.now(), restaurant: 'Urban Bites', status: 'Confirmed',
      items: cart.map(item => ({ ...item })), ...details,
    };

    setOrders(previous => [newOrder, ...previous]);
    setCart([]);
    return newOrder;
  }

  function cancelOrder(id) {
    setOrders(previous => previous.map(order =>
      order.id === id ? { ...order, status: 'Cancelled' } : order
    ));
  }

  function reorder(order) {
    setCart(order.items.map(item => ({ ...item, quantity: item.quantity || 1 })));
  }

  return (
    <ShopContext.Provider value={{
      cart, orders, subtotal, discount, platformFee, deliveryFee, cartTotal,
      promoApplied, setPromoApplied, instruction, setInstruction,
      changeQuantity, removeItem, clearCart, placeOrder, cancelOrder, reorder,
    }}>
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  return useContext(ShopContext);
}
