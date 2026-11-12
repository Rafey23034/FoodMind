export const riderRequests = [
  {
    id: 'RDR-1042', restaurant: 'Urban Bites', orderId: 'FM-4182',
    customer: 'Ayesha K. · Model Town', customerAddress: 'Model Town, Lahore',
    pickupAddress: 'Main Boulevard, Johar Town', distanceKm: 3.2, etaMinutes: 12,
    items: [{ name: 'Classic Smash Burger', quantity: 2 }, { name: 'Loaded Fries', quantity: 1 }],
    customerNote: 'Online paid · No cash to collect.', deliveryFee: 240, prepMinutes: 12, createdLabel: 'Just now',
  },
  {
    id: 'RDR-1043', restaurant: 'Bella Kitchen', orderId: 'FM-4181',
    customer: 'Omar · Gulberg', customerAddress: 'Gulberg III, Lahore',
    pickupAddress: 'MM Alam Road, Gulberg', distanceKm: 2.8, etaMinutes: 18,
    items: [{ name: 'Creamy Chicken Pasta', quantity: 1 }, { name: 'Garlic Bread', quantity: 1 }],
    customerNote: 'Cash on delivery · Call on arrival.', deliveryFee: 330, prepMinutes: 15, createdLabel: '4 min ago',
  },
  {
    id: 'RDR-1044', restaurant: 'Burger Lab', orderId: 'FM-4178',
    customer: 'Mariam · DHA Phase 5', customerAddress: 'DHA Phase 5, Lahore',
    pickupAddress: 'Y Block Commercial, DHA', distanceKm: 4.6, etaMinutes: 21,
    items: [{ name: 'Fire Burger', quantity: 1 }, { name: 'Loaded Fries', quantity: 1 }],
    customerNote: 'Cash on delivery.', deliveryFee: 410, prepMinutes: 18, createdLabel: '9 min ago',
  },
];

export const riderRequestById = id => riderRequests.find(request => request.id === id);

export function demoRiderAccount(user, at = new Date().toISOString()) {
  const demo = user?.email?.toLowerCase() === 'rider@food.com';
  const day = offset => new Date(Date.now() - offset * 86400000).toISOString();
  return {
    profile: {
      fullName: demo ? 'Tariq Mehmood' : user?.name || '',
      email: user?.email || '', phone: demo ? '0300 1234567' : '',
      city: demo ? 'Lahore' : '', vehicle: demo ? 'Motorbike' : '',
      vehicleRegistration: demo ? 'LEB-2048' : '',
    },
    documents: demo ? {
      nationalId: { name: 'National ID / CNIC', size: 820000, isDemo: true },
      drivingLicense: { name: 'Driving License', size: 640000, isDemo: true },
      vehicleRegistration: { name: 'Vehicle registration · LEB-2048', size: 510000, isDemo: true },
      profilePhoto: { name: 'Tariq profile photo', isDemo: true },
    } : {},
    application: { status: demo ? 'Approved' : 'Draft', submittedAt: demo ? at : null, demoApproval: demo },
    online: demo,
    bids: [], activeDelivery: null,
    deliveries: demo ? [
      { id: 'DEMO-DEL-240', requestId: 'RDR-1042', restaurant: 'Urban Bites', customer: 'Ayesha K. · Model Town', customerAddress: 'Model Town, Lahore', distanceKm: 3.2, earnings: 240, completedAt: day(0), status: 'Delivered', rating: 5, isDemo: true },
      { id: 'DEMO-DEL-239', requestId: 'RDR-1043', restaurant: 'Bella Kitchen', customer: 'Omar · Gulberg', customerAddress: 'Gulberg III, Lahore', distanceKm: 2.8, earnings: 320, completedAt: day(1), status: 'Delivered', rating: 5, isDemo: true },
      { id: 'DEMO-DEL-238', requestId: 'RDR-1044', restaurant: 'Burger Lab', customer: 'Mariam · DHA Phase 5', customerAddress: 'DHA Phase 5, Lahore', distanceKm: 4.6, earnings: 270, completedAt: day(2), status: 'Delivered', rating: 4, isDemo: true },
    ] : [],
    exampleMetrics: demo ? { weekTotal: 8420, availableBalance: 3180, jobCount: 24, completionRate: 98 } : null,
  };
}
