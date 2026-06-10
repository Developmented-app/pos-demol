import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import POSView from './components/POSView';
import InventoryView from './components/InventoryView';
import TransactionsView from './components/TransactionsView';
import SettingsView from './components/SettingsView';

import { Product, Category, Order, ActivityLog, SystemSettings, Customer } from './types';
import { 
  INITIAL_CATEGORIES, 
  INITIAL_PRODUCTS, 
  generateMockOrders, 
  INITIAL_ACTIVITY_LOGS,
  INITIAL_CUSTOMERS
} from './data/initialData';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'pos' | 'inventory' | 'transactions' | 'settings'>('pos');
  const [activeCashier] = useState<string>('Alex (Shift Mgr)');

  // Products state (loads from localStorage or presets)
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('gourmet_pos_products');
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  // Orders state
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('gourmet_pos_orders');
      return saved ? JSON.parse(saved) : generateMockOrders();
    } catch {
      return generateMockOrders();
    }
  });

  // Activity logs state
  const [logs, setLogs] = useState<ActivityLog[]>(() => {
    try {
      const saved = localStorage.getItem('gourmet_pos_logs');
      return saved ? JSON.parse(saved) : INITIAL_ACTIVITY_LOGS;
    } catch {
      return INITIAL_ACTIVITY_LOGS;
    }
  });

  // Dynamic system rules state
  const [settings, setSettings] = useState<SystemSettings>(() => {
    const defaultSettings: SystemSettings = {
      storeName: 'Brew & Bite Cafe',
      storeTelephone: '(555) 767-2233',
      storeAddress: '100 Espresso Drive, Coffee City',
      taxRatePercent: 8.0,
      lowStockThreshold: 5,
      catalogLowStockLimit: 15,
      theme: 'light',
    };
    try {
      const saved = localStorage.getItem('gourmet_pos_settings');
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  // Custom Categories state (loads from localStorage or presets)
  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem('gourmet_pos_categories');
      return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
    } catch {
      return INITIAL_CATEGORIES;
    }
  });

  // Customers state (loads from localStorage or presets)
  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const saved = localStorage.getItem('gourmet_pos_customers');
      return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
    } catch {
      return INITIAL_CUSTOMERS;
    }
  });

  // Helpers to update and sync structures
  const syncProducts = (newProducts: Product[]) => {
    setProducts(newProducts);
    localStorage.setItem('gourmet_pos_products', JSON.stringify(newProducts));
  };

  const syncCustomers = (newCustomers: Customer[]) => {
    setCustomers(newCustomers);
    localStorage.setItem('gourmet_pos_customers', JSON.stringify(newCustomers));
  };

  const syncOrders = (newOrders: Order[]) => {
    setOrders(newOrders);
    localStorage.setItem('gourmet_pos_orders', JSON.stringify(newOrders));
  };

  const syncLogs = (newLogs: ActivityLog[]) => {
    setLogs(newLogs);
    localStorage.setItem('gourmet_pos_logs', JSON.stringify(newLogs));
  };

  const syncSettings = (newSettings: SystemSettings) => {
    setSettings(newSettings);
    localStorage.setItem('gourmet_pos_settings', JSON.stringify(newSettings));
  };

  const syncCategories = (newCategories: Category[]) => {
    setCategories(newCategories);
    localStorage.setItem('gourmet_pos_categories', JSON.stringify(newCategories));
  };

  // Log handler
  const pushActivityLog = (action: string, type: ActivityLog['type'], details?: string) => {
    const newLog: ActivityLog = {
      id: `act-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: activeCashier,
      action,
      type,
      details
    };
    syncLogs([newLog, ...logs]);
  };

  // Sync display theme with settings
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // Real-time complete checkout handler
  const handleCheckoutComplete = (completedOrder: Order) => {
    // 1. Save order to state
    const updatedOrders = [completedOrder, ...orders];
    syncOrders(updatedOrders);

    // 2. Subtract quantities from active products Catalog
    const updatedProducts = products.map(prod => {
      const purchasedItem = completedOrder.items.find(item => item.productId === prod.id);
      if (purchasedItem) {
        return {
          ...prod,
          // Guard against negative stock levels
          stock: Math.max(0, prod.stock - purchasedItem.quantity)
        };
      }
      return prod;
    });
    syncProducts(updatedProducts);

    // 3. Update customer loyalty points if customer exists
    if (completedOrder.customerId) {
      const earned = completedOrder.customerPointsEarned || 0;
      const redeemed = completedOrder.customerPointsRedeemed || 0;
      const netChange = earned - redeemed;

      const updatedCustomers = customers.map(c => {
        if (c.id === completedOrder.customerId) {
          return {
            ...c,
            loyaltyPoints: Math.max(0, c.loyaltyPoints + netChange)
          };
        }
        return c;
      });
      syncCustomers(updatedCustomers);
      const custObj = customers.find(c => c.id === completedOrder.customerId);
      const custName = custObj ? custObj.name : completedOrder.customerName;
      pushActivityLog(
        `Loyalty points updated for ${custName}`,
        'system',
        `Earned +${earned} pts, redeemed -${redeemed} pts. New balance: ${Math.max(0, (custObj?.loyaltyPoints || 0) + netChange)} pts`
      );
    }

    // 4. Create log records
    const sumQty = completedOrder.items.reduce((sum, i) => sum + i.quantity, 0);
    pushActivityLog(
      `Completed POS checkout ${completedOrder.orderNumber}`,
      'sale',
      `Total: $${completedOrder.total.toFixed(2)} via ${completedOrder.paymentMethod} • ${sumQty} items authorized`
    );
  };

  // Refund Order handler
  const handleRefundOrder = (orderId: string) => {
    const updatedOrders = orders.map(order => {
      if (order.id === orderId) {
        return { ...order, status: 'Refunded' as const };
      }
      return order;
    });

    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;

    // 1. Refund orders status
    syncOrders(updatedOrders);

    // 2. Return product quantities to stocks Catalog
    const updatedProducts = products.map(prod => {
      const returnedItem = targetOrder.items.find(item => item.productId === prod.id);
      if (returnedItem) {
        return {
          ...prod,
          stock: prod.stock + returnedItem.quantity
        };
      }
      return prod;
    });
    syncProducts(updatedProducts);

    // 3. Reverse customer loyalty points if applicable
    if (targetOrder.customerId) {
      const earned = targetOrder.customerPointsEarned || 0;
      const redeemed = targetOrder.customerPointsRedeemed || 0;
      const reverseChange = redeemed - earned; // subtract earned, credit back redeemed

      const updatedCustomers = customers.map(c => {
        if (c.id === targetOrder.customerId) {
          return {
            ...c,
            loyaltyPoints: Math.max(0, c.loyaltyPoints + reverseChange)
          };
        }
        return c;
      });
      syncCustomers(updatedCustomers);
      const custObj = customers.find(c => c.id === targetOrder.customerId);
      pushActivityLog(
        `Loyalty points reversed for ${targetOrder.customerName || 'customer'} due to refund`,
        'system',
        `Deducted earned -${earned} pts, restored redeemed +${redeemed} pts. New balance: ${custObj ? Math.max(0, custObj.loyaltyPoints + reverseChange) : 0} pts`
      );
    }

    // 4. Log refund actions
    pushActivityLog(
      `Processed refund for order ${targetOrder.orderNumber}`,
      'refund',
      `Returned $${targetOrder.total.toFixed(2)} to client • Re-credited items to warehouse`
    );
  };

  // Add product to inventory
  const handleAddProduct = (newProduct: Product) => {
    const updatedProducts = [newProduct, ...products];
    syncProducts(updatedProducts);
    pushActivityLog(
      `Registered new product SKU: ${newProduct.name}`,
      'inventory',
      `SKU: ${newProduct.sku} | Price: $${newProduct.price.toFixed(2)} | Stock count: ${newProduct.stock}`
    );
  };

  // Update product specification in inventory
  const handleUpdateProduct = (updatedProduct: Product) => {
    const updatedProducts = products.map(p => p.id === updatedProduct.id ? updatedProduct : p);
    syncProducts(updatedProducts);
    pushActivityLog(
      `Updated specifications: ${updatedProduct.name}`,
      'inventory',
      `SKU: ${updatedProduct.sku} | Cost Basis: $${updatedProduct.cost.toFixed(2)} | Retail Price: $${updatedProduct.price.toFixed(2)}`
    );
  };

  // Delete product completely
  const handleDeleteProduct = (productId: string) => {
    const targetProd = products.find(p => p.id === productId);
    if (!targetProd) return;

    const updatedProducts = products.filter(p => p.id !== productId);
    syncProducts(updatedProducts);
    pushActivityLog(
      `Removed SKU from catalogs: ${targetProd.name}`,
      'inventory',
      `SKU: ${targetProd.sku} removed permanently`
    );
  };

  // Quick Restock shortcut
  const handleQuickRestock = (productId: string, qty: number) => {
    const updatedProducts = products.map(p => {
      if (p.id === productId) {
        return { ...p, stock: p.stock + qty };
      }
      return p;
    });
    syncProducts(updatedProducts);

    const targetProd = products.find(p => p.id === productId);
    if (!targetProd) return;

    pushActivityLog(
      `Restocked items: ${targetProd.name}`,
      'inventory',
      `Added +${qty} units. New quantity: ${targetProd.stock + qty} units`
    );
  };

  // Dynamic Category handlers
  const handleAddCategory = (newCat: Category) => {
    const updated = [...categories, newCat];
    syncCategories(updated);
    pushActivityLog(
      `Registered custom menu category: ${newCat.name}`,
      'system',
      `ID: ${newCat.id} • Slug: ${newCat.slug} • Icon: ${newCat.icon}`
    );
  };

  const handleDeleteCategory = (catId: string) => {
    const updated = categories.filter(c => c.id !== catId);
    syncCategories(updated);
    const target = categories.find(c => c.id === catId);
    if (target) {
      pushActivityLog(
        `Deleted menu category: ${target.name}`,
        'system',
        `Slug: ${target.slug} removed`
      );
    }
  };

  // Database handlers
  const handleResetSystem = () => {
    localStorage.clear();
    pushActivityLog(`Wiped terminal registry`, 'system', `All custom products, orders and configurations formatted`);
  };

  const handleClearTransactions = () => {
    syncOrders([]);
    pushActivityLog(`Cleared all transaction records`, 'system', `Order history set to empty`);
  };

  const handleSeedMockOrders = () => {
    const seeded = generateMockOrders();
    syncOrders(seeded);
    pushActivityLog(`Seeded terminal transaction records`, 'system', `Populated ${seeded.length} historical checkout events`);
  };

  return (
    <div id="application-container" className="flex h-screen w-screen bg-zinc-950 overflow-hidden font-sans">
      {/* Universal Side Navigation controls */}
      <Sidebar 
        currentTab={currentTab} 
        onTabChange={setCurrentTab} 
        activeCashier={activeCashier} 
      />

      {/* Main viewport panels switcher */}
      <main id="main-content-viewport" className="flex-1 flex flex-col min-w-0 overflow-hidden bg-zinc-50 relative">
        {currentTab === 'dashboard' && (
          <DashboardView 
            products={products} 
            orders={orders} 
            logs={logs} 
            settings={settings}
          />
        )}

        {currentTab === 'pos' && (
          <POSView 
            products={products}
            categories={categories}
            activeCashier={activeCashier}
            onCheckoutComplete={handleCheckoutComplete}
            settings={settings}
            customers={customers}
            onAddCustomer={(newCust) => syncCustomers([newCust, ...customers])}
            onUpdateCustomers={syncCustomers}
          />
        )}

        {currentTab === 'inventory' && (
          <InventoryView 
            products={products}
            categories={categories}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onQuickRestock={handleQuickRestock}
            settings={settings}
          />
        )}

        {currentTab === 'transactions' && (
          <TransactionsView 
            orders={orders}
            products={products}
            categories={categories}
            onRefundOrder={handleRefundOrder}
            settings={settings}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView 
            settings={settings}
            onUpdateSettings={syncSettings}
            categories={categories}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
            onResetSystem={handleResetSystem}
            onClearTransactions={handleClearTransactions}
            onSeedMockOrders={handleSeedMockOrders}
            customers={customers}
            onUpdateCustomers={syncCustomers}
          />
        )}
      </main>
    </div>
  );
}
