import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Coffee, 
  CupSoda, 
  Utensils, 
  CakeSlice, 
  Package, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Percent, 
  ShoppingBag, 
  Printer, 
  X, 
  Check, 
  User, 
  Hash,
  Sparkles,
  DollarSign,
  CreditCard,
  Smartphone,
  Layers,
  ChevronRight,
  AlertCircle,
  Keyboard
} from 'lucide-react';
import { Product, Category, CartItem, Order, PaymentMethod, SystemSettings, Customer } from '../types';
import { getProductImageUrl } from '../utils/imageHelper';

interface POSViewProps {
  products: Product[];
  categories: Category[];
  activeCashier: string;
  onCheckoutComplete: (order: Order) => void;
  settings: SystemSettings;
  customers: Customer[];
  onAddCustomer: (newCustomer: Customer) => void;
  onUpdateCustomers: (customers: Customer[]) => void;
}

// Icon dictionary to map strings in category data to real components
const IconMap: { [key: string]: React.ComponentType<any> } = {
  Coffee: Coffee,
  CupSoda: CupSoda,
  Utensils: Utensils,
  CakeSlice: CakeSlice,
  Package: Package,
};

export default function POSView({ 
  products, 
  categories, 
  activeCashier, 
  onCheckoutComplete, 
  settings, 
  customers, 
  onAddCustomer, 
  onUpdateCustomers 
}: POSViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [globalScanEnabled, setGlobalScanEnabled] = useState<boolean>(true);
  const scanBufferRef = useRef<{ char: string; time: number }[]>([]);
  const [scannerStatus, setScannerStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState<number>(0);
  const [customerName, setCustomerName] = useState<string>('');
  const [tableNumber, setTableNumber] = useState<string>('');

  // Loyalty and Customer states
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [showAddNewCustomer, setShowAddNewCustomer] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustEmail, setNewCustEmail] = useState<string>('');
  const [newCustPhone, setNewCustPhone] = useState<string>('');
  const [redeemPoints, setRedeemPoints] = useState<boolean>(false);

  const handleBarcodeScan = (e: React.FormEvent) => {
    e.preventDefault();
    const sku = barcodeInput.trim();
    if (!sku) return;

    const matchedProduct = products.find(
      p => p.sku.toLowerCase() === sku.toLowerCase()
    );

    if (matchedProduct) {
      if (matchedProduct.stock <= 0) {
        addToast(`Scanned product "${matchedProduct.name}" is completely out of stock and cannot be added.`, 'warning');
        setScannerStatus('error');
        setTimeout(() => setScannerStatus('idle'), 1000);
        setBarcodeInput('');
        return;
      }
      addToCart(matchedProduct);
      addToast(`Scanned successfully: "${matchedProduct.name}" (SKU: ${matchedProduct.sku})`, 'info');
      setScannerStatus('success');
      setTimeout(() => setScannerStatus('idle'), 800);
    } else {
      addToast(`No SKU code found matching "${sku}" in the physical inventory catalog.`, 'warning');
      setScannerStatus('error');
      setTimeout(() => setScannerStatus('idle'), 1000);
    }
    setBarcodeInput('');
  };
  
  // Checkout flow states
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Card');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [paymentApproved, setPaymentApproved] = useState<boolean>(false);
  
  // Post-checkout receipt states
  const [finishedOrder, setFinishedOrder] = useState<Order | null>(null);

  // Low stock toasts state
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'warning' | 'info' }[]>([]);

  const addToast = (message: string, type: 'warning' | 'info' = 'warning') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // Sync ref helper to avoid stale-closures of addToCart in key listener
  const addToCartRef = useRef<(product: Product) => void>(() => {});
  useEffect(() => {
    addToCartRef.current = addToCart;
  });

  // Global Hardware Scanner Listener Hook
  useEffect(() => {
    if (!globalScanEnabled) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Identify active inputs to avoid hijacking user type fields
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      // If user is editing some fields (except the dedicated scanner input box), let's skip global captures
      if (isInput && target.id !== 'pos-barcode-scanner') {
        return;
      }

      const key = e.key;

      if (key === 'Enter') {
        const buffer = scanBufferRef.current;
        if (buffer.length > 0) {
          const now = Date.now();
          // Filter characters registered in the last 2 seconds
          const validKeys = buffer.filter(item => now - item.time < 2000);

          if (validKeys.length >= 2) {
            const firstTime = validKeys[0].time;
            const lastTime = validKeys[validKeys.length - 1].time;
            const overallDuration = lastTime - firstTime;
            const averageKeyDelay = overallDuration / validKeys.length;
            const isDedicatedInput = target && target.id === 'pos-barcode-scanner';

            // Hardware barcode scanners trigger sequential inputs extremely rapidly (<45ms/char)
            // Or if they explicitly typed and hit enter in the dedicated scanner box, we allow slow inputs.
            if (isDedicatedInput || averageKeyDelay < 45 || overallDuration < 400) {
              const codeScanned = validKeys.map(item => item.char).join('').trim();
              
              if (codeScanned.length >= 2) {
                e.preventDefault();

                const productFound = products.find(
                  p => p.sku.toLowerCase() === codeScanned.toLowerCase()
                );

                if (productFound) {
                  if (productFound.stock <= 0) {
                    addToast(`Scanned product "${productFound.name}" is completely out of stock.`, 'warning');
                    setScannerStatus('error');
                    setTimeout(() => setScannerStatus('idle'), 1000);
                  } else {
                    addToCartRef.current(productFound);
                    addToast(`Hardware Scanned: "${productFound.name}" (SKU: ${productFound.sku})`, 'info');
                    setScannerStatus('success');
                    setTimeout(() => setScannerStatus('idle'), 800);
                  }
                } else {
                  addToast(`No Product SKU match found for scan code: "${codeScanned}"`, 'warning');
                  setScannerStatus('error');
                  setTimeout(() => setScannerStatus('idle'), 1000);
                }

                // Flush/Clean the text box in either event
                setBarcodeInput('');
              }
            }
          }
        }
        // Flush buffer
        scanBufferRef.current = [];
      } else if (key.length === 1) {
        // Collect single print characters with timestamp
        scanBufferRef.current.push({ char: key, time: Date.now() });

        // Cap buffer depth
        if (scanBufferRef.current.length > 50) {
          scanBufferRef.current.shift();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [products, globalScanEnabled]);

  // Filter products based on search & category
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = selectedCategory === 'all' || 
                              (selectedCategory === 'popular' && p.isPopular) ||
                              p.category === selectedCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Customer Loyalty look-up filter
  const searchedCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return [];
    const query = customerSearchQuery.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(query) ||
      (c.phone && c.phone.includes(query)) ||
      (c.email && c.email.toLowerCase().includes(query))
    );
  }, [customers, customerSearchQuery]);

  // Quick Customer custom registration
  const handleRegisterCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      alert('Please provide a valid customer name.');
      return;
    }
    const newCust: Customer = {
      id: `c-${Date.now()}`,
      name: newCustName.trim(),
      email: newCustEmail.trim(),
      phone: newCustPhone.trim(),
      loyaltyPoints: 0,
      createdAt: new Date().toISOString()
    };
    onAddCustomer(newCust);
    setSelectedCustomerId(newCust.id);
    
    // Clear registration state
    setNewCustName('');
    setNewCustEmail('');
    setNewCustPhone('');
    setShowAddNewCustomer(false);
    setCustomerSearchQuery('');
  };

  // Cart helper functions
  const addToCart = (product: Product) => {
    // Check if available stock has been depleted
    const existingItem = cart.find(item => item.product.id === product.id);
    const currentQtyInCart = existingItem ? existingItem.quantity : 0;

    if (currentQtyInCart >= product.stock) {
      alert(`Unable to add item. Maximum available stock (${product.stock} ${product.unit}) is already in the shopping cart.`);
      return;
    }

    const newQty = currentQtyInCart + 1;
    const remainingStock = product.stock - newQty;

    if (remainingStock < settings.lowStockThreshold) {
      addToast(`Low Stock Alert: Only ${remainingStock} ${product.unit} left of "${product.name}"!`, 'warning');
    }

    if (existingItem) {
      setCart(cart.map(item => 
        item.product.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1, discountPercent: 0 }]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    const item = cart.find(i => i.product.id === productId);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQty > item.product.stock) {
      alert(`Limit exceeded. Only ${item.product.stock} of ${item.product.name} are available in stock.`);
      return;
    }

    if (delta > 0) {
      const remainingStock = item.product.stock - newQty;
      if (remainingStock < settings.lowStockThreshold) {
        addToast(`Low Stock Alert: Only ${remainingStock} ${item.product.unit} left of "${item.product.name}"!`, 'warning');
      }
    }

    setCart(cart.map(i => i.product.id === productId ? { ...i, quantity: newQty } : i));
  };

  const updateItemDiscount = (productId: string, discount: number) => {
    const cleanDiscount = Math.max(0, Math.min(100, discount));
    setCart(cart.map(i => i.product.id === productId ? { ...i, discountPercent: cleanDiscount } : i));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setGlobalDiscountPercent(0);
    setCustomerName('');
    setTableNumber('');
    setSelectedCustomerId('');
    setCustomerSearchQuery('');
    setRedeemPoints(false);
    setNewCustName('');
    setNewCustEmail('');
    setNewCustPhone('');
    setShowAddNewCustomer(false);
  };

  // Financial calculations
  const cartFinancials = useMemo(() => {
    let subtotal = 0;
    let itemDiscounts = 0;

    cart.forEach(item => {
      const rawTotal = item.product.price * item.quantity;
      subtotal += rawTotal;
      itemDiscounts += (rawTotal * item.discountPercent) / 100;
    });

    const netAfterItemDiscounts = subtotal - itemDiscounts;
    const globalDiscountAmount = (netAfterItemDiscounts * globalDiscountPercent) / 100;
    const totalDiscount = itemDiscounts + globalDiscountAmount;
    
    const taxableAmount = Math.max(0, subtotal - totalDiscount);
    const tax = parseFloat((taxableAmount * (settings.taxRatePercent / 100)).toFixed(2));
    const baseTotal = parseFloat((taxableAmount + tax).toFixed(2));

    // Loyalty points deduction
    const activeCustomer = customers.find(c => c.id === selectedCustomerId);
    let pointsDiscount = 0;
    let pointsRedeemed = 0;
    if (redeemPoints && activeCustomer && activeCustomer.loyaltyPoints > 0) {
      // 10 points = $1.00
      const maxDiscountFromPoints = activeCustomer.loyaltyPoints * 0.10;
      // We can cover up to the baseTotal
      const actualDiscount = Math.min(maxDiscountFromPoints, baseTotal);
      pointsDiscount = parseFloat(actualDiscount.toFixed(2));
      pointsRedeemed = Math.ceil(pointsDiscount / 0.10);
    }

    const finalTotal = parseFloat((baseTotal - pointsDiscount).toFixed(2));

    // Points earned on current order (1 point per whole $1 of finalTotal spent)
    const pointsEarned = Math.floor(finalTotal);

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      discount: parseFloat((totalDiscount + pointsDiscount).toFixed(2)),
      pointsDiscount,
      pointsRedeemed,
      pointsEarned,
      tax,
      total: finalTotal
    };
  }, [cart, globalDiscountPercent, selectedCustomerId, redeemPoints, customers, settings.taxRatePercent]);

  // Payment Cash recommendation
  const quickCashOptions = useMemo(() => {
    const total = cartFinancials.total;
    if (total <= 0) return [];
    
    const exact = total;
    const next5 = Math.ceil(total / 5) * 5;
    const next10 = Math.ceil(total / 10) * 10;
    const next20 = Math.ceil(total / 20) * 20;
    const next50 = Math.ceil(total / 50) * 50;

    const unique = Array.from(new Set([exact, next5, next10, next20, next50]))
      .sort((a, b) => a - b)
      .slice(0, 4);

    return unique;
  }, [cartFinancials.total]);

  // Handle Checkout submission
  const startCheckoutFlow = () => {
    if (cart.length === 0) return;
    setCashReceived(cartFinancials.total.toString());
    setPaymentApproved(false);
    setIsProcessingPayment(false);
    setIsCheckoutModalOpen(true);
  };

  const submitCashPayment = () => {
    const cash = parseFloat(cashReceived);
    if (isNaN(cash) || cash < cartFinancials.total) {
      alert('Error: Cash received amount is insufficient to cover transaction total.');
      return;
    }

    processOrderFinalization();
  };

  const simulateCardPayment = () => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      setIsProcessingPayment(false);
      setPaymentApproved(true);
    }, 1500); // simulate 1.5 second terminal authorization delay
  };

  const processOrderFinalization = () => {
    // Generate order sequence
    const randomSeq = Math.floor(10000 + Math.random() * 90000);
    const activeCustomer = customers.find(c => c.id === selectedCustomerId);

    const finalOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber: `TX-${randomSeq}`,
      items: cart.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        discountPercent: item.discountPercent
      })),
      subtotal: cartFinancials.subtotal,
      tax: cartFinancials.tax,
      discountAmount: cartFinancials.discount,
      total: cartFinancials.total,
      paymentMethod: paymentMethod,
      status: 'Completed',
      timestamp: new Date().toISOString(),
      customerName: activeCustomer ? activeCustomer.name : (customerName.trim() || undefined),
      customerId: activeCustomer ? activeCustomer.id : undefined,
      customerPointsEarned: activeCustomer ? cartFinancials.pointsEarned : undefined,
      customerPointsRedeemed: activeCustomer ? cartFinancials.pointsRedeemed : undefined,
      tableNumber: tableNumber.trim() || undefined,
      cashierName: activeCashier
    };

    setFinishedOrder(finalOrder);
    onCheckoutComplete(finalOrder);
  };

  const finishTransactionReset = () => {
    setIsCheckoutModalOpen(false);
    setFinishedOrder(null);
    clearCart();
    setSelectedCustomerId('');
    setRedeemPoints(false);
  };

  // Compute change cash due
  const cashChangeDue = useMemo(() => {
    const rcv = parseFloat(cashReceived);
    if (isNaN(rcv)) return 0;
    return Math.max(0, rcv - cartFinancials.total);
  }, [cashReceived, cartFinancials.total]);

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-zinc-100 overflow-hidden" id="pos-billing-terminal">
      {/* Left Column: Products Directory */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto">
        {/* Search & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 shrink-0">
          <div>
            <h2 className="text-xl font-bold font-sans text-zinc-900 tracking-tight flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-500" /> POS Checkout Terminal
            </h2>
            <p className="text-zinc-500 text-xs font-sans mt-0.5">Quick select items, apply discounts, and complete customer tables.</p>
          </div>
          {/* Controls: Search and Barcode Scanner */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Global Hardware Scanner Active Toggle */}
            <button
              type="button"
              onClick={() => {
                setGlobalScanEnabled(!globalScanEnabled);
                addToast(
                  !globalScanEnabled 
                    ? "Global hardware scanner listener is now active. Scan barcodes from anywhere!" 
                    : "Global hardware scanner listener is now disabled. Manual input only.",
                  "info"
                );
              }}
              className={`px-3 py-2.5 rounded-xl border flex items-center gap-2 text-xs font-semibold font-sans transition-all cursor-pointer shadow-4xs shrink-0 select-none ${
                globalScanEnabled 
                  ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 border-amber-500/30' 
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-500 border-zinc-200'
              }`}
              title={globalScanEnabled ? "Click to disable background global scan listener (active)" : "Click to enable background global scan listener (inactive)"}
            >
              <Keyboard className="w-3.5 h-3.5 shrink-0" />
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  {globalScanEnabled && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${globalScanEnabled ? 'bg-emerald-500' : 'bg-zinc-400'}`}></span>
                </span>
                <span className="leading-none">Auto-Scan</span>
              </div>
            </button>

            {/* Barcode scanner input */}
            <form onSubmit={handleBarcodeScan} className="relative w-auto sm:w-64" id="barcode-scanner-form">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                <Hash className={`h-4 w-4 transition-colors duration-250 ${
                  scannerStatus === 'success' ? 'text-emerald-500 scale-110' :
                  scannerStatus === 'error' ? 'text-red-500' :
                  'text-amber-500'
                }`} />
              </span>
              <input
                type="text"
                placeholder="Scan barcode/SKU..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className={`w-full pl-10 pr-12 py-2.5 bg-white border rounded-xl text-xs font-sans text-zinc-850 placeholder-zinc-400 focus:outline-none focus:ring-1 transition-all duration-200 shadow-xs ${
                  scannerStatus === 'success' ? 'border-emerald-500 focus:ring-emerald-500 ring-2 ring-emerald-500 bg-emerald-50/20 font-bold' :
                  scannerStatus === 'error' ? 'border-red-500 focus:ring-red-500 ring-2 ring-red-500 bg-red-50/20 font-bold' :
                  'border-zinc-200 focus:border-amber-500 focus:ring-amber-500'
                }`}
                title="Use physical barcode reader or enter SKU and press enter"
                id="pos-barcode-scanner"
                autoComplete="off"
              />
              <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1">
                {barcodeInput ? (
                  <button
                    type="button"
                    onClick={() => setBarcodeInput('')}
                    className="p-1 text-zinc-400 hover:text-zinc-650 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className="text-[8px] font-mono font-bold bg-amber-50 border border-amber-200 text-amber-700 px-1 py-0.5 rounded-md tracking-wider">
                    SCAN
                  </span>
                )}
              </div>
            </form>

            {/* Search bar */}
            <div className="relative w-auto sm:w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                <Search className="h-4 w-4 text-zinc-400" />
              </span>
              <input
                type="text"
                placeholder="Search catalog titles/SKUs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 bg-white border border-zinc-200 rounded-xl text-xs font-sans text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-amber-500 shadow-xs"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-650 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Categories Carousel */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-2 scrollbar-none shrink-0" id="pos-category-tabs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border shadow-xs transition-all ${
              selectedCategory === 'all'
                ? 'bg-zinc-900 text-white border-zinc-900'
                : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            All Products
          </button>
          
          <button
            onClick={() => setSelectedCategory('popular')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border shadow-xs transition-all ${
              selectedCategory === 'popular'
                ? 'bg-amber-500 text-zinc-950 border-amber-500 font-bold'
                : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            Popular Items
          </button>

          {categories.map((cat) => {
            const IconComponent = IconMap[cat.icon] || Coffee;
            const isSelected = selectedCategory === cat.slug;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.slug)}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border shadow-xs transition-all shrink-0 ${
                  isSelected
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                <IconComponent className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 flex-1 overflow-y-auto" id="pos-products-grid">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
              <div className="p-4 bg-zinc-200 rounded-full text-zinc-500 mb-2">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="font-sans font-bold text-sm text-zinc-700">No Match Found</h4>
              <p className="text-zinc-500 text-xs mt-1">Adjust filters or search parameters to discover other models.</p>
            </div>
          ) : (
            filteredProducts.map((p) => {
              const isOutOfStock = p.stock <= 0;
              const isLowStock = p.stock > 0 && p.stock <= 15;
              
              // Calculate custom discount visual tag
              const isTopSeller = p.isPopular;

              return (
                <button
                  key={p.id}
                  disabled={isOutOfStock}
                  onClick={() => addToCart(p)}
                  className={`relative group bg-white text-left p-3 rounded-2xl border transition-all flex flex-col justify-between shadow-xs h-full ${
                    isOutOfStock 
                      ? 'opacity-65 saturate-50 cursor-not-allowed border-zinc-200' 
                      : 'border-zinc-200 hover:border-amber-500 hover:shadow-sm cursor-pointer'
                  }`}
                >
                  <div className="w-full">
                    {/* Product Image cover with security headers & fallback */}
                    <div className="w-full h-24 bg-zinc-50 rounded-xl overflow-hidden border border-zinc-150 relative mb-2.5 group-hover:shadow-3xs transition-shadow">
                      <img 
                        src={getProductImageUrl(p)} 
                        alt={p.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-250 group-hover:scale-105"
                      />
                      
                      {/* Floating Indicator Badges over modern image */}
                      <div className="absolute top-1.5 right-1.5 flex flex-col gap-1 items-end z-10">
                        {isTopSeller && (
                          <span className="bg-amber-500 text-zinc-950 text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded-md uppercase shadow-xs">
                            PROMO
                          </span>
                        )}
                        {isOutOfStock ? (
                          <span className="bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
                            DEPLETED
                          </span>
                        ) : isLowStock ? (
                          <span className="bg-white/95 text-amber-850 border border-amber-200 text-[8px] font-bold px-1.5 py-0.5 rounded-md shadow-2xs">
                            {p.stock} left
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Product Details Layout */}
                    <div>
                      <span className="text-[9px] text-zinc-400 font-mono tracking-wider block uppercase">{p.sku}</span>
                      <h4 className="font-sans font-bold text-xs text-zinc-800 tracking-tight leading-snug mt-0.5 group-hover:text-amber-605 transition-colors line-clamp-1">
                        {p.name}
                      </h4>
                    </div>
                  </div>
                  
                  <div className="pt-2 mt-2.5 border-t border-zinc-100 flex items-end justify-between w-full">
                    <div>
                      <span className="text-zinc-400 text-[8px] font-sans block uppercase font-semibold">Unit Price</span>
                      <span className="text-xs font-black text-zinc-950 font-sans tracking-tight">
                        ${p.price.toFixed(2)}
                      </span>
                    </div>
                    <div className="w-6 h-6 rounded-lg group-hover:bg-amber-500 group-hover:text-zinc-905 bg-zinc-100 border border-zinc-200/50 flex items-center justify-center text-zinc-600 transition-colors shadow-4xs">
                      <Plus className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: POS Active Cart Drawer */}
      <div className="w-full md:w-96 bg-white border-l border-zinc-200 shadow-xl flex flex-col shrink-0" id="pos-billing-sidebar">
        {/* Dynamic Cart Info Header */}
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block"></span>
            <h3 className="font-sans font-bold text-xs text-zinc-800 uppercase tracking-wider">Current Bill</h3>
            <span className="bg-zinc-100 text-zinc-600 font-mono text-[9px] px-1.5 py-0.5 rounded-md font-bold">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} items
            </span>
          </div>
          {cart.length > 0 && (
            <button 
              onClick={clearCart} 
              className="text-zinc-400 hover:text-zinc-600 transition-colors text-xs font-semibold flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear Cart
            </button>
          )}
        </div>

        {/* Customer / Loyalty & Table Input Block */}
        <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-100 shrink-0 space-y-2.5">
          {/* Active Loyalty Customer Card or Search Bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">
                Loyalty Customer
              </label>
              {!selectedCustomerId && !showAddNewCustomer && (
                <button
                  type="button"
                  onClick={() => setShowAddNewCustomer(true)}
                  className="text-[9px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-2.5 h-2.5" /> Register Member
                </button>
              )}
            </div>

            {selectedCustomerId ? (
              // Active Customer selected card
              (() => {
                const activeCust = customers.find(c => c.id === selectedCustomerId);
                if (!activeCust) return null;
                return (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-[11px] font-sans">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-amber-950 flex items-center gap-1">
                          <span>👑 {activeCust.name}</span>
                          <span className="text-[9px] font-medium text-amber-700/80 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/10">
                            Member
                          </span>
                        </div>
                        {activeCust.phone && (
                          <div className="text-[9px] text-zinc-500 font-mono mt-0.5">{activeCust.phone}</div>
                        )}
                        <div className="mt-1.5 flex items-center gap-1.5 font-sans font-medium text-zinc-700">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-current" />
                          <span>
                            Points balance: <strong className="text-zinc-950 font-black">{activeCust.loyaltyPoints}</strong> pts 
                            <span className="text-[9px] text-zinc-400 font-normal"> (${(activeCust.loyaltyPoints * 0.10).toFixed(2)} savings)</span>
                          </span>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomerId('');
                          setRedeemPoints(false);
                        }}
                        className="text-[10px] text-zinc-400 hover:text-zinc-650 bg-white hover:bg-zinc-100 border border-zinc-200 p-1 rounded-lg cursor-pointer transition-colors shadow-3xs"
                        title="Deselect Member"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Redeem controls */}
                    {activeCust.loyaltyPoints > 0 ? (
                      <div className="mt-2.5 pt-2.5 border-t border-amber-500/10 flex items-center justify-between">
                        <label className="flex items-center gap-1.5 cursor-pointer text-zinc-700 select-none">
                          <input
                            type="checkbox"
                            checked={redeemPoints}
                            onChange={(e) => setRedeemPoints(e.target.checked)}
                            className="w-3 h-3 rounded text-amber-500 border-zinc-350 focus:ring-amber-500 cursor-pointer"
                          />
                          <span className="font-semibold text-[10px]">Use points for discount?</span>
                        </label>
                        {redeemPoints && (
                          <span className="text-[10px] font-bold text-emerald-600 font-mono">
                            Redeeming {cartFinancials.pointsRedeemed} pts (-${cartFinancials.pointsDiscount.toFixed(2)})
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="mt-1.5 text-[9px] text-zinc-400 italic">
                        Earns +{cartFinancials.pointsEarned} pts on this sale. 
                      </div>
                    )}
                  </div>
                );
              })()
            ) : showAddNewCustomer ? (
              // Registration form with fields
              <form onSubmit={handleRegisterCustomer} className="bg-zinc-100 border border-zinc-200 p-2.5 rounded-xl space-y-2 relative">
                <button
                  type="button"
                  onClick={() => setShowAddNewCustomer(false)}
                  className="absolute top-1.5 right-1.5 text-zinc-400 hover:text-zinc-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="text-[10px] font-bold text-zinc-700 uppercase tracking-wide">Register New Loyalty Guest</div>
                
                <div className="space-y-1.5">
                  <input
                    type="text"
                    required
                    placeholder="Full Name *"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-zinc-200 rounded text-[10px] outline-none focus:border-amber-500 font-sans"
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={newCustEmail}
                      onChange={(e) => setNewCustEmail(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-zinc-200 rounded text-[10px] outline-none focus:border-amber-500 font-sans"
                    />
                    <input
                      type="text"
                      placeholder="Phone #"
                      value={newCustPhone}
                      onChange={(e) => setNewCustPhone(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-zinc-200 rounded text-[10px] outline-none focus:border-amber-500 font-sans"
                    />
                  </div>
                </div>

                <div className="flex gap-1.5 pt-1">
                  <button
                    type="submit"
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold py-1 px-2 rounded text-[9px] transition-all text-center cursor-pointer"
                  >
                    Register & Select
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddNewCustomer(false)}
                    className="bg-zinc-200 hover:bg-zinc-300 border border-zinc-300 text-zinc-700 py-1 px-2 rounded text-[9px] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              // Search field with float suggestions
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none">
                  <Search className="w-3 h-3 text-zinc-400" />
                </span>
                <input
                  type="text"
                  placeholder="Search member by name, email, or phone..."
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-7 py-1.5 bg-white border border-zinc-200 rounded-xl text-[10px] font-sans text-zinc-750 placeholder-zinc-400 focus:outline-none focus:border-amber-500 text-ellipsis"
                />
                {customerSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setCustomerSearchQuery('')}
                    className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-zinc-400 hover:text-zinc-650 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}

                {/* Autocomplete suggestion drop listing */}
                {customerSearchQuery && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg max-h-36 overflow-y-auto z-50 text-[10px] divide-y divide-zinc-50">
                    {searchedCustomers.length > 0 ? (
                      searchedCustomers.map((cust) => (
                        <button
                          key={cust.id}
                          type="button"
                          onClick={() => {
                            setSelectedCustomerId(cust.id);
                            setCustomerSearchQuery('');
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-amber-50/50 flex items-center justify-between cursor-pointer transition-colors"
                        >
                          <div>
                            <div className="font-bold text-zinc-800">{cust.name}</div>
                            <div className="text-[9px] text-zinc-400">{cust.phone || cust.email || 'No contact info'}</div>
                          </div>
                          <span className="bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded text-[8px]">
                            {cust.loyaltyPoints} pts
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-zinc-400 italic text-center">
                        No loyalty member found matching search details.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Table / Zone Details Override */}
          <div className="pt-2 border-t border-zinc-150 grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">
                Guest tag (Walk-in)
              </label>
              <input
                type="text"
                placeholder={selectedCustomerId ? "Member Checked-in" : "Walk-in Guest"}
                disabled={!!selectedCustomerId}
                value={selectedCustomerId ? "" : customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-2 py-1.5 bg-white border border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-450 rounded-lg text-[10px] font-sans text-zinc-700 placeholder-zinc-400 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">
                Table / Zone
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-2">
                  <Hash className="w-3 h-3 text-zinc-400" />
                </span>
                <input
                  type="text"
                  placeholder="Takeaway"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full pl-6 pr-2 py-1.5 bg-white border border-zinc-200 rounded-lg text-[10px] font-sans text-zinc-700 placeholder-zinc-400 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Cart Line items display */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3" id="pos-cart-items-list">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center text-zinc-400">
              <Coffee className="w-8 h-8 opacity-25 mb-2 rotate-12" />
              <p className="text-xs font-sans font-semibold">Your bill grid is vacant.</p>
              <p className="text-[10px] mt-0.5">Click any catalog model item to start checkout operations.</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={item.product.id} className="flex gap-3 pb-3 border-b border-zinc-100 last:border-b-0">
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-sans font-bold text-xs text-zinc-800 leading-tight">{item.product.name}</h5>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] text-zinc-400 font-mono tracking-wider">{item.product.sku}</span>
                        {(item.product.stock - item.quantity) < settings.lowStockThreshold && (
                          <span className="inline-flex items-center gap-0.5 bg-amber-50 text-amber-700 text-[8px] font-bold px-1 py-0.2 rounded border border-amber-200 animate-pulse">
                            <AlertCircle className="w-2.5 h-2.5" /> High Demand: {item.product.stock - item.quantity} left
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-mono text-[11px] font-black text-zinc-950">
                      ${((item.product.price * (1 - item.discountPercent / 100)) * item.quantity).toFixed(2)}
                    </span>
                  </div>

                  {/* Quantity and Custom Item Discount Modifiers */}
                  <div className="flex items-center justify-between mt-2.5">
                    <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-150">
                      <button 
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="p-1 text-zinc-500 hover:text-zinc-800 hover:bg-white rounded-md transition-all shrink-0"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono text-xs font-bold w-7 text-center text-zinc-800">
                        {item.quantity}
                      </span>
                      <button 
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="p-1 text-zinc-500 hover:text-zinc-800 hover:bg-white rounded-md transition-all shrink-0"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Single Item Discount input input */}
                    <div className="flex items-center gap-1 bg-zinc-50 px-2 py-0.5 rounded-lg border border-zinc-150">
                      <Percent className="w-3 h-3 text-zinc-400 shrink-0" />
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        max="100"
                        value={item.discountPercent || ''}
                        onChange={(e) => updateItemDiscount(item.product.id, parseInt(e.target.value) || 0)}
                        className="w-10 text-center bg-transparent border-none text-[10px] font-mono text-zinc-700 outline-none p-0"
                      />
                      <span className="text-[9px] text-zinc-400 font-mono">% disc</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Global Summary & Checkout Actions Bar */}
        <div className="border-t border-zinc-100 p-4 bg-zinc-50/50 space-y-3 shrink-0">
          <div className="space-y-1.5 text-xs font-sans">
            {/* Subtotal */}
            <div className="flex justify-between text-zinc-500">
              <span>Subtotal:</span>
              <span className="font-mono">${cartFinancials.subtotal.toFixed(2)}</span>
            </div>
            {/* Promo Global Discount */}
            <div className="flex justify-between items-center text-zinc-500">
              <span className="flex items-center gap-1 text-[11px]">
                <Percent className="w-3.5 h-3.5 text-zinc-400" /> Apply Promo Code (Gbl Disc %):
              </span>
              <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-zinc-200">
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={globalDiscountPercent || ''}
                  onChange={(e) => setGlobalDiscountPercent(Math.min(50, parseInt(e.target.value) || 0))}
                  placeholder="0"
                  className="w-8 text-center bg-transparent border-none text-[10px] font-mono outline-none text-zinc-700"
                />
                <span className="text-[9px] text-zinc-400 font-mono">%</span>
              </div>
            </div>
            {/* Real computed discount block */}
            {cartFinancials.discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Calculated savings:</span>
                <span className="font-mono">-${cartFinancials.discount.toFixed(2)}</span>
              </div>
            )}
            {/* Taxes */}
            <div className="flex justify-between text-zinc-500">
              <span>VAT / Service Tax (8%):</span>
              <span className="font-mono">${cartFinancials.tax.toFixed(2)}</span>
            </div>
            {/* Final checkout amount */}
            <div className="flex justify-between text-zinc-900 border-t border-zinc-150 pt-2 font-bold text-sm">
              <span>Payable Total:</span>
              <span className="font-mono text-base font-black text-zinc-950">${cartFinancials.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Checkout CTA */}
          <button
            onClick={startCheckoutFlow}
            disabled={cart.length === 0}
            className={`w-full py-3.5 rounded-2xl font-bold font-sans text-xs flex items-center justify-center gap-2 shadow-md transition-all ${
              cart.length === 0
                ? 'bg-zinc-200 text-zinc-400 shadow-none cursor-not-allowed'
                : 'bg-zinc-950 cursor-pointer text-white hover:bg-zinc-800'
            }`}
          >
            <span>Finalize Bill Checkout</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Checkout Payment Slip Modal */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 bg-zinc-950/80 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl p-6 border border-zinc-150 overflow-hidden flex flex-col relative animate-in fade-in-50 zoom-in-95 duration-200">
            
            {/* If order is completed & receipt needs displaying */}
            {finishedOrder ? (
              <div className="flex flex-col">
                <div className="text-center pb-4 border-b border-dashed border-zinc-300">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full text-emerald-600 flex items-center justify-center mx-auto mb-2.5">
                    <Check className="w-6 h-6 stroke-[3]" />
                  </div>
                  <h3 className="font-sans font-bold text-base text-zinc-900">Transaction Complete</h3>
                  <p className="text-zinc-500 text-[10px] font-mono uppercase mt-0.5">{finishedOrder.orderNumber}</p>
                </div>

                {/* Thermal Printable Receipt Design layout */}
                <div className="bg-zinc-50 p-4 border rounded-2xl border-zinc-200 my-4 font-mono text-[10px] text-zinc-700 leading-normal overflow-y-auto max-h-80">
                  <div className="text-center text-[11px] font-bold uppercase text-zinc-900 tracking-wider">{settings.storeName}</div>
                  <div className="text-center text-[9px] text-zinc-400 mt-0.5">{settings.storeAddress} • {settings.storeTelephone}</div>
                  <div className="border-b border-zinc-200 my-2"></div>
                  
                  <div className="space-y-0.5 text-[9px]">
                    <div className="flex justify-between">
                      <span>DATE: {new Date(finishedOrder.timestamp).toLocaleDateString()}</span>
                      <span>TIME: {new Date(finishedOrder.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>CASHIER: {finishedOrder.cashierName}</span>
                      <span>TABLE: {finishedOrder.tableNumber || 'Takeaway'}</span>
                    </div>
                    {finishedOrder.customerName && (
                      <div className="text-zinc-800 font-bold">CLIENT: {finishedOrder.customerName}</div>
                    )}
                  </div>

                  <div className="border-b border-zinc-200 my-2"></div>
                  <div className="space-y-1">
                    {finishedOrder.items.map((item, id) => (
                      <div key={id} className="flex justify-between items-start text-[9.5px]">
                        <span className="text-zinc-800 font-bold pr-4 truncate">
                          {item.quantity}x {item.name}
                        </span>
                        <span className="shrink-0 font-bold">
                          ${((item.price * (1 - item.discountPercent / 100)) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-b border-dashed border-zinc-300 my-2.5"></div>
                  
                  <div className="space-y-0.5 text-[9.5px]">
                    <div className="flex justify-between">
                      <span>Subtotal basis:</span>
                      <span>${finishedOrder.subtotal.toFixed(2)}</span>
                    </div>
                    {finishedOrder.discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Corporate promo disc:</span>
                        <span>-${finishedOrder.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>VAT Tax ({settings.taxRatePercent.toFixed(1)}%):</span>
                      <span>${finishedOrder.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-zinc-900 font-black pt-1">
                      <span>GRAND BILL TOTAL:</span>
                      <span>${finishedOrder.total.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="border-b border-zinc-200 my-2.5"></div>
                  
                  <div className="text-center text-[9px]">
                    <div className="uppercase font-bold text-zinc-800">Payment: {finishedOrder.paymentMethod}</div>
                    {finishedOrder.paymentMethod === 'Cash' && (
                      <div className="text-zinc-500 mt-0.5">
                        Cash Tendered: ${parseFloat(cashReceived).toFixed(2)} | Change: ${cashChangeDue.toFixed(2)}
                      </div>
                    )}
                    <div className="text-zinc-400 mt-3 italic font-sans">Thank you for dining with us!</div>
                  </div>
                </div>

                {/* Print button click simulator */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      alert('Simulating receipt printing... Thermal print commands dispatched to hardware register port.');
                    }}
                    className="flex-1 py-3 bg-zinc-200 hover:bg-zinc-300 rounded-xl text-zinc-800 font-bold text-xs font-sans flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Printer className="w-4 h-4" /> Print Thermal Ticket
                  </button>
                  <button
                    onClick={finishTransactionReset}
                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-xl text-xs font-sans flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    Next Customer <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            ) : (
              /* Core payment selector layout */
              <div className="flex flex-col">
                <div className="flex justify-between items-center pb-4 border-b border-zinc-150">
                  <div>
                    <h3 className="font-sans font-bold text-sm text-zinc-900">Payment Authorization</h3>
                    <p className="text-zinc-400 text-[10px] font-sans">Assign payment gateway and tender receipts.</p>
                  </div>
                  <button 
                    onClick={() => setIsCheckoutModalOpen(false)}
                    className="p-1 px-1.5 rounded-lg border hover:bg-zinc-50 text-zinc-400 hover:text-zinc-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="my-5 text-center bg-zinc-50 p-4 rounded-xl border border-zinc-150">
                  <span className="text-zinc-500 text-xs font-sans">Payment Due</span>
                  <div className="text-2xl font-black font-sans text-zinc-950 tracking-tight mt-0.5">
                    ${cartFinancials.total.toFixed(2)}
                  </div>
                </div>

                {/* Method selector tabs */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {[
                    { id: 'Card', label: 'Credit Card', icon: CreditCard },
                    { id: 'Cash', label: 'Cash Drawer', icon: DollarSign },
                    { id: 'Mobile Pay', label: 'Mobile NFC', icon: Smartphone }
                  ].map((method) => {
                    const IconComp = method.icon;
                    const isSelected = paymentMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        onClick={() => {
                          setPaymentMethod(method.id as PaymentMethod);
                          if (method.id !== 'Cash') setCashReceived('');
                        }}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-center transition-all ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10 text-amber-900 font-bold'
                            : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                        }`}
                      >
                        <IconComp className={`w-5 h-5 ${isSelected ? 'text-amber-600' : 'text-zinc-400'}`} />
                        <span className="text-[9px] font-sans font-semibold leading-none">{method.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Cash Options specifics */}
                {paymentMethod === 'Cash' && (
                  <div className="space-y-4 animate-in slide-in-from-bottom-5 duration-150">
                    <div>
                      <label className="text-[10px] text-zinc-400 font-bold uppercase block mb-1.5">Tender Amount Received</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 font-bold text-sm">$</span>
                        <input
                          type="text"
                          value={cashReceived}
                          onChange={(e) => setCashReceived(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-7 pr-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-sans font-bold text-zinc-800 placeholder-zinc-300 focus:outline-none focus:border-amber-500 text-right"
                        />
                      </div>
                    </div>

                    {/* Quick tender recommendation pills */}
                    <div className="grid grid-cols-4 gap-1.5 pb-2">
                      {quickCashOptions.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => setCashReceived(opt.toFixed(2))}
                          className="py-1.5 px-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[10px] font-mono font-bold rounded-lg border text-center"
                        >
                          ${opt.toFixed(2)}
                        </button>
                      ))}
                    </div>

                    {/* Financial balance displays */}
                    {parseFloat(cashReceived) >= cartFinancials.total && (
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex justify-between items-center text-xs text-emerald-800 font-bold">
                        <span>Change Cash Due:</span>
                        <span className="font-mono text-sm font-black">${cashChangeDue.toFixed(2)}</span>
                      </div>
                    )}

                    <button
                      onClick={submitCashPayment}
                      disabled={parseFloat(cashReceived) < cartFinancials.total || isNaN(parseFloat(cashReceived))}
                      className={`w-full py-3 rounded-xl font-bold text-xs font-sans text-center transition-all ${
                        parseFloat(cashReceived) < cartFinancials.total || isNaN(parseFloat(cashReceived))
                          ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                          : 'bg-zinc-950 text-white hover:bg-zinc-800 cursor-pointer'
                      }`}
                    >
                      Complete Cash Transaction
                    </button>
                  </div>
                )}

                {/* Card or Mobile pay terminal simulation layouts */}
                {(paymentMethod === 'Card' || paymentMethod === 'Mobile Pay') && (
                  <div className="space-y-4 text-center">
                    {!paymentApproved ? (
                      <div className="p-6 border border-zinc-150 rounded-2xl flex flex-col items-center justify-center bg-zinc-50">
                        {isProcessingPayment ? (
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full border-3 border-amber-500 border-t-transparent animate-spin mb-3"></div>
                            <span className="text-xs font-mono font-bold text-zinc-700">Awaiting POS Terminal Connection...</span>
                            <span className="text-[10px] text-zinc-400 mt-1">Please tap card or swipe device now.</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <Smartphone className="w-8 h-8 text-zinc-400 mb-2 animate-bounce" />
                            <span className="text-xs font-semibold text-zinc-700">Integrative Terminal Setup Ideal</span>
                            <p className="text-[10px] text-zinc-500 mt-1 max-w-xs px-2">Ready to simulate external machine handshakes.</p>
                            <button
                              onClick={simulateCardPayment}
                              className="mt-4 px-5 py-2.5 bg-amber-500 text-zinc-950 font-bold hover:bg-amber-600 rounded-xl text-xs font-sans transition-all cursor-pointer shadow-xs"
                            >
                              Tap Device card / Scan QR code
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-6 border border-emerald-200 rounded-2xl flex flex-col items-center justify-center bg-emerald-50">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-2 font-black">
                          <Check className="w-5 h-5 stroke-[3]" />
                        </div>
                        <span className="text-xs font-sans font-bold text-emerald-800">Terminal Code Authorized</span>
                        <p className="text-[10px] text-emerald-600 mt-1">Transaction recorded on centralized bank ledger.</p>
                        
                        <button
                          onClick={processOrderFinalization}
                          className="mt-4 w-full py-3 bg-zinc-950 text-white rounded-xl text-xs font-sans font-bold hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                          Generate Invoice Receipt
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast Notification Container */}
      <div className="absolute bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none" id="pos-low-stock-toasts">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-zinc-900 border border-amber-500/30 text-white rounded-2xl shadow-xl p-4 flex gap-3 items-start duration-200"
            role="alert"
          >
            <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold font-sans text-amber-400">Low Stock Alert</div>
              <p className="text-[11px] text-zinc-200 font-sans mt-0.5 leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="p-1 text-zinc-500 hover:text-white rounded-lg transition-colors cursor-pointer shrink-0"
              aria-label="Dismiss alert"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
