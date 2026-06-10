import { Product, Category, Order, ActivityLog, Customer } from '../types';

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'c1', name: 'Coffee & Espresso', slug: 'coffee', icon: 'Coffee' },
  { id: 'c2', name: 'Cold Beverages', slug: 'beverages', icon: 'CupSoda' },
  { id: 'c3', name: 'Hot Kitchen & Food', slug: 'food', icon: 'Utensils' },
  { id: 'c4', name: 'Bakery & Dessert', slug: 'dessert', icon: 'CakeSlice' },
  { id: 'c5', name: 'Retail beans & Merch', slug: 'merch', icon: 'Package' },
];

export const INITIAL_PRODUCTS: Product[] = [
  // Coffee
  { id: 'p1', name: 'Double Espresso', sku: 'COF-EXP-01', price: 3.50, cost: 0.60, category: 'coffee', stock: 120, unit: 'shot', isPopular: true, imageUrl: 'https://picsum.photos/seed/espresso-double/300/225' },
  { id: 'p2', name: 'Classic Cappuccino', sku: 'COF-CAP-02', price: 4.50, cost: 0.90, category: 'coffee', stock: 95, unit: 'cup', isPopular: true, imageUrl: 'https://picsum.photos/seed/cappuccino-classic/300/225' },
  { id: 'p3', name: 'Iced Vanilla Latte', sku: 'COF-LAT-03', price: 4.95, cost: 1.10, category: 'coffee', stock: 80, unit: 'cup', isPopular: true, imageUrl: 'https://picsum.photos/seed/icedlatte-vanilla/300/225' },
  { id: 'p4', name: 'Caramel Macchiato', sku: 'COF-MAC-04', price: 5.25, cost: 1.25, category: 'coffee', stock: 65, unit: 'cup' },
  { id: 'p5', name: 'Cold Brew Coffee', sku: 'COF-COL-05', price: 4.25, cost: 0.75, category: 'coffee', stock: 110, unit: 'cup', isPopular: true, imageUrl: 'https://picsum.photos/seed/coldbrew-classic/300/225' },
  { id: 'p6', name: 'Pour Over Special', sku: 'COF-POV-06', price: 5.50, cost: 1.50, category: 'coffee', stock: 40, unit: 'cup' },

  // Beverages
  { id: 'p7', name: 'Iced Matcha Latte', sku: 'BEV-MAT-01', price: 5.25, cost: 1.15, category: 'beverages', stock: 75, unit: 'cup', imageUrl: 'https://picsum.photos/seed/matchalatte/300/225' },
  { id: 'p8', name: 'Organic Lemonade', sku: 'BEV-LEM-02', price: 3.95, cost: 0.50, category: 'beverages', stock: 90, unit: 'cup' },
  { id: 'p9', name: 'Fresh Orange Juice', sku: 'BEV-ORJ-03', price: 4.50, cost: 1.20, category: 'beverages', stock: 50, unit: 'cup' },
  { id: 'p10', name: 'Sparkling Mineral Water', sku: 'BEV-SPW-04', price: 2.75, cost: 0.45, category: 'beverages', stock: 150, unit: 'bottle' },
  { id: 'p11', name: 'Hibiscus Iced Tea', sku: 'BEV-HIT-05', price: 3.85, cost: 0.60, category: 'beverages', stock: 85, unit: 'cup' },

  // Food
  { id: 'p12', name: 'Truffle Egg Croissant', sku: 'FOD-CRO-01', price: 7.50, cost: 2.20, category: 'food', stock: 15, unit: 'pcs', isPopular: true, imageUrl: 'https://picsum.photos/seed/eggcroissant/300/225' },
  { id: 'p13', name: 'Avocado Toast & Feta', sku: 'FOD-AVO-02', price: 9.50, cost: 3.10, category: 'food', stock: 20, unit: 'pcs', isPopular: true, imageUrl: 'https://picsum.photos/seed/avocadotoast/300/225' },
  { id: 'p14', name: 'Smoked Salmon Bagel', sku: 'FOD-BAG-03', price: 11.25, cost: 4.50, category: 'food', stock: 12, unit: 'pcs' },
  { id: 'p15', name: 'Spiced Chicken Panini', sku: 'FOD-PAN-04', price: 8.95, cost: 2.90, category: 'food', stock: 18, unit: 'pcs' },
  { id: 'p16', name: 'Vegan Falafel Wrap', sku: 'FOD-WRP-05', price: 8.50, cost: 2.50, category: 'food', stock: 25, unit: 'pcs' },

  // Desserts
  { id: 'p17', name: 'Fudge Chocolate Cake', sku: 'DES-FGC-01', price: 5.50, cost: 1.30, category: 'dessert', stock: 18, unit: 'slice', imageUrl: 'https://picsum.photos/seed/chocolatecake/300/225' },
  { id: 'p18', name: 'Classic Butter Croissant', sku: 'DES-BCR-02', price: 3.25, cost: 0.65, category: 'dessert', stock: 45, unit: 'pcs', isPopular: true, imageUrl: 'https://picsum.photos/seed/croissant-butter/300/225' },
  { id: 'p19', name: 'Blueberry Crumble Muffin', sku: 'DES-BLM-03', price: 3.75, cost: 0.85, category: 'dessert', stock: 30, unit: 'pcs' },
  { id: 'p20', name: 'New York Cheesecake', sku: 'DES-NYC-04', price: 5.95, cost: 1.60, category: 'dessert', stock: 14, unit: 'slice' },
  { id: 'p21', name: 'Chocolate Chip Cookie', sku: 'DES-CCC-05', price: 2.50, cost: 0.50, category: 'dessert', stock: 60, unit: 'pcs' },

  // Merch
  { id: 'p22', name: 'Signature Blend Beans (250g)', sku: 'RTL-SBB-01', price: 14.50, cost: 5.50, category: 'merch', stock: 40, unit: 'bag' },
  { id: 'p23', name: 'Decaf Espresso Beans (250g)', sku: 'RTL-DEB-02', price: 15.00, cost: 5.80, category: 'merch', stock: 25, unit: 'bag' },
  { id: 'p24', name: 'Eco-Friendly Ceramic Mug', sku: 'RTL-MUG-03', price: 18.00, cost: 6.00, category: 'merch', stock: 35, unit: 'pcs' },
  { id: 'p25', name: 'Canvas Tote Bag', sku: 'RTL-TOT-04', price: 12.00, cost: 4.00, category: 'merch', stock: 50, unit: 'pcs' },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'c-1', name: 'Sarah Jenkins', email: 'sarah.j@gmail.com', phone: '555-012-3456', loyaltyPoints: 125, createdAt: '2026-01-15T09:00:00Z' },
  { id: 'c-2', name: 'Alex Rivera', email: 'alex.r@outlook.com', phone: '555-014-9876', loyaltyPoints: 45, createdAt: '2026-02-18T14:30:00Z' },
  { id: 'c-3', name: 'Emily Davis', email: 'emily.d@yahoo.com', phone: '555-018-2468', loyaltyPoints: 210, createdAt: '2026-03-05T11:15:00Z' },
  { id: 'c-4', name: 'Michael Chang', email: 'mchang@techsolutions.com', phone: '555-011-1357', loyaltyPoints: 80, createdAt: '2026-03-24T08:45:00Z' },
  { id: 'c-5', name: 'Jessica Taylor', email: 'jess.taylor@me.com', phone: '555-019-8642', loyaltyPoints: 15, createdAt: '2026-04-12T16:20:00Z' },
  { id: 'c-6', name: 'David Miller', email: 'dmiller@company.com', phone: '555-021-4321', loyaltyPoints: 340, createdAt: '2026-04-30T10:00:00Z' },
  { id: 'c-7', name: 'Sophia Martinez', email: 'sophia.m@gmail.com', phone: '555-025-5678', loyaltyPoints: 60, createdAt: '2026-05-15T13:10:00Z' },
  { id: 'c-8', name: 'James Wilson', email: 'jwilson@gmail.com', phone: '555-032-1098', loyaltyPoints: 110, createdAt: '2026-05-28T15:40:00Z' },
];

// Generate past order history dynamically leading up to June 10, 2026.
export const generateMockOrders = (): Order[] => {
  const orders: Order[] = [];
  const paymentMethods: ('Cash' | 'Card' | 'Mobile Pay')[] = ['Card', 'Card', 'Cash', 'Mobile Pay', 'Card'];
  const tables: string[] = ['Table 1', 'Table 2', 'Table 4', 'Takeaway', 'Takeaway', 'Table 6', 'Takeaway'];
  const customers: string[] = ['Sarah Jenkins', 'Alex Rivera', 'Emily Davis', 'Michael Chang', 'Jessica Taylor', 'David Miller', 'Sophia Martinez', 'James Wilson'];
  const cashiers: string[] = ['Alex (Shift Mgr)', 'Taylor (Cashier)', 'Jordan (Cashier)'];

  // Base dates from 2026-06-04 to 2026-06-10
  const daysOfHistory = 7;
  let orderSequence = 10001;

  for (let i = daysOfHistory - 1; i >= 0; i--) {
    const d = new Date('2026-06-10T08:00:00Z');
    d.setDate(d.getDate() - i);

    // Number of orders per day (let it fluctuate to look realistic)
    // 04: 15, 05: 18, 06: 25 (Saturday), 07: 22 (Sunday), 08: 14, 09: 16, 10: 12 (partial day so far)
    let orderCount = 14 + Math.floor(Math.sin((daysOfHistory - i) * 1.5) * 5) + (i === 4 || i === 3 ? 6 : 0); // extra on weekend
    if (i === 0) orderCount = 8; // partial day

    for (let j = 0; j < orderCount; j++) {
      // Create random purchase items
      const selectedProducts: Product[] = [];
      const itemCount = 1 + Math.floor(Math.random() * 3); // 1 to 3 items
      
      while (selectedProducts.length < itemCount) {
        const prod = INITIAL_PRODUCTS[Math.floor(Math.random() * INITIAL_PRODUCTS.length)];
        if (!selectedProducts.find(p => p.id === prod.id)) {
          selectedProducts.push(prod);
        }
      }

      const items = selectedProducts.map(p => {
        const quantity = 1 + Math.floor(Math.random() * 2); // 1 or 2 of this item
        const discountPercent = Math.random() > 0.85 ? 10 : 0; // 15% chance of 10% discount
        return {
          productId: p.id,
          name: p.name,
          price: p.price,
          quantity,
          discountPercent,
        };
      });

      // Calculate financials
      let subtotal = 0;
      let discountAmount = 0;
      items.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        discountAmount += (itemTotal * item.discountPercent) / 100;
      });

      const tax = parseFloat(((subtotal - discountAmount) * 0.08).toFixed(2));
      const total = parseFloat((subtotal - discountAmount + tax).toFixed(2));

      // Spread orders throughout the day (8:00 AM to 8:00 PM)
      const orderTime = new Date(d);
      orderTime.setHours(8 + Math.floor(j * (12 / orderCount)), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));

      const isRefunded = Math.random() > 0.95 && i > 0; // 5% chance of older orders being refunded

      orders.push({
        id: `ord-${orderSequence}`,
        orderNumber: `TX-${orderSequence}`,
        items,
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax,
        discountAmount: parseFloat(discountAmount.toFixed(2)),
        total,
        paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        status: isRefunded ? 'Refunded' : 'Completed',
        timestamp: orderTime.toISOString(),
        customerName: Math.random() > 0.4 ? customers[Math.floor(Math.random() * customers.length)] : undefined,
        tableNumber: tables[Math.floor(Math.random() * tables.length)],
        cashierName: cashiers[Math.floor(Math.random() * cashiers.length)],
      });

      orderSequence++;
    }
  }

  // Sort orders newest first
  return orders;
};

export const INITIAL_ACTIVITY_LOGS: ActivityLog[] = [
  { id: 'act-1', timestamp: '2026-06-10T08:45:00Z', user: 'Alex (Shift Mgr)', action: 'Completed POS checkout TX-10084', type: 'sale', details: 'Total: $24.75 via Card' },
  { id: 'act-2', timestamp: '2026-06-10T08:30:10Z', user: 'System', action: 'Low Stock Alert: Smoked Salmon Bagel (12 left)', type: 'system', details: 'FOD-BAG-03 stock is below threshold of 15' },
  { id: 'act-3', timestamp: '2026-06-10T08:15:32Z', user: 'Taylor (Cashier)', action: 'Completed POS checkout TX-10083', type: 'sale', details: 'Total: $18.50 via Cash' },
  { id: 'act-4', timestamp: '2026-06-10T07:55:00Z', user: 'Alex (Shift Mgr)', action: 'Bulk restocked Espresso Coffee Beans', type: 'inventory', details: 'Added 10 units to stock' },
  { id: 'act-5', timestamp: '2026-06-09T19:30:00Z', user: 'Jordan (Cashier)', action: 'Processed refund for order TX-10052', type: 'refund', details: 'Refunded $14.50 to client for sour latte' },
];
