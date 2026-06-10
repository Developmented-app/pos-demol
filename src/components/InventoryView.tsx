import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  Check, 
  X, 
  Layers, 
  Package,
  TrendingDown,
  DollarSign,
  Download,
  Truck,
  Printer,
  ClipboardList,
  FileText
} from 'lucide-react';
import { Product, Category, SystemSettings } from '../types';
import { getProductImageUrl } from '../utils/imageHelper';
import { Sparkles, Image as ImageIcon } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const CHART_COLORS = ['#d97706', '#059669', '#2563eb', '#db2777', '#7c3aed', '#0891b2', '#e11d48', '#4b5563'];

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-zinc-950 text-white rounded-xl p-3 shadow-lg border border-zinc-800 text-[11px] font-sans z-50">
        <div className="font-bold text-xs text-amber-400 font-sans tracking-tight mb-1">{data.name}</div>
        <div className="space-y-0.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-zinc-400">Inventory Cost Value:</span>
            <span className="font-mono font-bold">${data.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-zinc-400">Total Items in Stock:</span>
            <span className="font-mono font-bold">{data.stockQty.toLocaleString()} {data.unit || 'units'}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-zinc-400">Retail Revenue:</span>
            <span className="font-mono font-bold text-emerald-400">${data.retailValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-zinc-400">Share of Inventory:</span>
            <span className="font-mono font-bold text-amber-500">{data.percentage}%</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};


interface InventoryViewProps {
  products: Product[];
  categories: Category[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onQuickRestock: (productId: string, qty: number) => void;
  settings?: SystemSettings;
}

export default function InventoryView({ 
  products, 
  categories, 
  onAddProduct, 
  onUpdateProduct, 
  onDeleteProduct,
  onQuickRestock,
  settings
}: InventoryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockSelector, setStockFilter] = useState<'all' | 'low'>('all');

  // Add / Edit modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Procurement & reorder list states
  const [reorderCart, setReorderCart] = useState<Array<{ product: Product; quantity: number }>>(() => {
    try {
      const saved = localStorage.getItem('gourmet_pos_reorder_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showReorderDrawer, setShowReorderDrawer] = useState(false);
  const [reorderSupplier, setReorderSupplier] = useState('Standard Wholesale Foods Ltd.');
  const [reorderNotes, setReorderNotes] = useState('');
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);

  const saveReorderCart = (newCart: Array<{ product: Product; quantity: number }>) => {
    setReorderCart(newCart);
    localStorage.setItem('gourmet_pos_reorder_cart', JSON.stringify(newCart));
  };

  const handleAddToReorder = (product: Product, quantity?: number) => {
    const defaultQty = quantity ?? Math.max(20, (lowStockLimit * 2) - product.stock);
    const existingIndex = reorderCart.findIndex(item => item.product.id === product.id);
    
    let updated = [...reorderCart];
    if (existingIndex > -1) {
      updated[existingIndex].quantity += defaultQty;
    } else {
      updated.push({ product, quantity: defaultQty });
    }
    
    saveReorderCart(updated);
    setShowReorderDrawer(true);
  };

  const handleUpdateReorderQty = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      const updated = reorderCart.filter(item => item.product.id !== productId);
      saveReorderCart(updated);
    } else {
      const updated = reorderCart.map(item => 
        item.product.id === productId ? { ...item, quantity: newQty } : item
      );
      saveReorderCart(updated);
    }
  };

  const handleRemoveFromReorder = (productId: string) => {
    const updated = reorderCart.filter(item => item.product.id !== productId);
    saveReorderCart(updated);
  };

  const handleAutoCompileLowStock = () => {
    let updated = [...reorderCart];
    let addedCount = 0;
    
    products.forEach(p => {
      if (p.stock <= lowStockLimit) {
        const defaultQty = Math.max(20, (lowStockLimit * 2) - p.stock);
        const existingIndex = updated.findIndex(item => item.product.id === p.id);
        if (existingIndex === -1) {
          updated.push({ product: p, quantity: defaultQty });
          addedCount++;
        }
      }
    });

    if (addedCount > 0) {
      saveReorderCart(updated);
      setShowReorderDrawer(true);
      alert(`Auto-compiled ${addedCount} low-stock SKUs into the active procurement reorder draft.`);
    } else {
      alert('All products in system catalogs currently maintain stock volumes exceeding low stock thresholds.');
    }
  };

  const handleCommitRestock = () => {
    if (reorderCart.length === 0) return;
    
    // Commit to app state via loop
    reorderCart.forEach(item => {
      onQuickRestock(item.product.id, item.quantity);
    });

    // Clear cart
    saveReorderCart([]);
    setShowReorderDrawer(false);
    setIsPOModalOpen(false);
    alert('Procurement draft successfully committed! Catalog items restocked in real-time inventories.');
  };

  // Form states
  const [prodName, setProdName] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodCost, setProdCost] = useState('');
  const [prodCategory, setProdCategory] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodUnit, setProdUnit] = useState('pcs');
  const [prodIsPopular, setProdIsPopular] = useState(false);
  const [prodImageUrl, setProdImageUrl] = useState('');

  // Stock limit to color code or filter
  const lowStockLimit = settings?.catalogLowStockLimit ?? 15;

  // Image Generation randomizer handler
  const handleGeneratePlaceholderImg = () => {
    if (!prodName.trim()) {
      alert('Error: Please type an Item Title first to generate a contextual theme-based placeholder.');
      return;
    }
    // Formulate a thematic category tag for Picsum seed
    let thematicTag = 'coffee';
    const cat = prodCategory?.toLowerCase() || '';
    if (cat.includes('bev') || cat.includes('drink')) {
      thematicTag = 'cold-beverage-ice-tea';
    } else if (cat.includes('food') || cat.includes('kitchen')) {
      thematicTag = 'croissant-toast';
    } else if (cat.includes('dessert') || cat.includes('bake')) {
      thematicTag = 'cookie-muffin-cake';
    } else if (cat.includes('merch') || cat.includes('bean')) {
      thematicTag = 'coffee-bag-mug';
    }

    const nameSlug = prodName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const randomSeed = `${thematicTag}-${nameSlug}`;
    const generatedUrl = `https://picsum.photos/seed/${randomSeed}/300/225`;
    setProdImageUrl(generatedUrl);
  };

  // Compute metrics
  const inventoryStats = useMemo(() => {
    const totalItems = products.length;
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    const lowStockCount = products.filter(p => p.stock <= lowStockLimit).length;
    const totalAssetVal = products.reduce((sum, p) => sum + p.stock * p.cost, 0);
    const totalRetailVal = products.reduce((sum, p) => sum + p.stock * p.price, 0);

    return {
      totalItems,
      totalStock,
      lowStockCount,
      totalAssetVal,
      potentialRevenue: totalRetailVal - totalAssetVal
    };
  }, [products, lowStockLimit]);

  // Compute category inventory valuation data for the Pie chart
  const categoryValueData = useMemo(() => {
    const map = new Map<string, { costVal: number; retailVal: number; stockQty: number; count: number; unit: string }>();
    
    // Initialize map with all categories
    categories.forEach(cat => {
      map.set(cat.slug, { costVal: 0, retailVal: 0, stockQty: 0, count: 0, unit: 'pcs' });
    });

    products.forEach(p => {
      const stats = map.get(p.category) || { costVal: 0, retailVal: 0, stockQty: 0, count: 0, unit: p.unit || 'pcs' };
      const itemCostVal = p.stock * p.cost;
      const itemRetailVal = p.stock * p.price;
      
      map.set(p.category, {
        costVal: stats.costVal + itemCostVal,
        retailVal: stats.retailVal + itemRetailVal,
        stockQty: stats.stockQty + p.stock,
        count: stats.count + 1,
        unit: p.unit || stats.unit
      });
    });

    const data = Array.from(map.entries())
      .map(([slug, stats]) => {
        const catName = categories.find(c => c.slug === slug)?.name || slug;
        return {
          name: catName,
          slug,
          value: parseFloat(stats.costVal.toFixed(2)),
          retailValue: parseFloat(stats.retailVal.toFixed(2)),
          stockQty: stats.stockQty,
          itemCount: stats.count,
          unit: stats.unit
        };
      })
      .filter(item => item.value > 0 || item.stockQty > 0)
      .sort((a, b) => b.value - a.value);

    const totalValueSum = data.reduce((sum, item) => sum + item.value, 0);

    return data.map(item => ({
      ...item,
      percentage: totalValueSum > 0 ? parseFloat(((item.value / totalValueSum) * 100).toFixed(1)) : 0
    }));
  }, [products, categories]);

  // Open modal for adding
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setProdName('');
    setProdSku(`SKU-${Math.floor(100000 + Math.random() * 900000)}`);
    setProdPrice('');
    setProdCost('');
    setProdCategory(categories[0]?.slug || 'coffee');
    setProdStock('');
    setProdUnit('pcs');
    setProdIsPopular(false);
    setProdImageUrl('');
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setProdName(product.name);
    setProdSku(product.sku);
    setProdPrice(product.price.toString());
    setProdCost(product.cost.toString());
    setProdCategory(product.category);
    setProdStock(product.stock.toString());
    setProdUnit(product.unit);
    setProdIsPopular(!!product.isPopular);
    setProdImageUrl(product.imageUrl || '');
    setIsModalOpen(true);
  };

  // Save changes
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();

    if (!prodName || !prodPrice || !prodCost || !prodStock) {
      alert('Error: Please specify complete values for Name, Price, Cost, and Stock values.');
      return;
    }

    const priceNum = parseFloat(prodPrice);
    const costNum = parseFloat(prodCost);
    const stockNum = parseInt(prodStock);

    if (isNaN(priceNum) || isNaN(costNum) || isNaN(stockNum)) {
      alert('Error: Price, Wholesale Cost, and Stock balances must carry real numeric values.');
      return;
    }

    const payload: Product = {
      id: editingProduct ? editingProduct.id : `p-${Date.now()}`,
      name: prodName.trim(),
      sku: prodSku.trim() || `SKU-${Date.now()}`,
      price: priceNum,
      cost: costNum,
      category: prodCategory,
      stock: stockNum,
      unit: prodUnit,
      isPopular: prodIsPopular,
      imageUrl: prodImageUrl.trim() || undefined
    };

    if (editingProduct) {
      onUpdateProduct(payload);
    } else {
      onAddProduct(payload);
    }

    setIsModalOpen(false);
  };

  // Filter lists
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      const matchesStock = stockSelector === 'all' || p.stock <= lowStockLimit;
      
      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, searchQuery, selectedCategory, stockSelector]);

  // Export CSV handler
  const handleExportCSV = () => {
    // Escapes double quotes and commas in fields for a valid CSV 
    const escapeCSV = (val: string | number | undefined | null) => {
      const stringified = String(val === null || val === undefined ? '' : val);
      if (stringified.includes(',') || stringified.includes('"') || stringified.includes('\n')) {
        return `"${stringified.replace(/"/g, '""')}"`;
      }
      return stringified;
    };

    const headers = ['SKU', 'Name', 'Category', 'Stock Level', 'Unit', 'Wholesale Cost ($)', 'Retail Price ($)', 'Margin (%)', 'Status'];
    const rows = filteredProducts.map(p => {
      const categoryName = categories.find(c => c.slug === p.category)?.name || p.category;
      let status = 'In Stock';
      if (p.stock === 0) status = 'DEPLETED';
      else if (p.stock < (settings?.lowStockThreshold ?? 5)) status = 'CRITICAL';
      else if (p.stock <= lowStockLimit) status = 'LOW STOCK';

      const margin = p.price > 0 ? (((p.price - p.cost) / p.price) * 100).toFixed(1) : '0';

      return [
        p.sku,
        p.name,
        categoryName,
        p.stock,
        p.unit,
        p.cost,
        p.price,
        `${margin}%`,
        status
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const dateStr = new Date().toISOString().slice(0, 10);
    let fileName = `inventory-export_${dateStr}.csv`;
    if (selectedCategory !== 'all') {
      fileName = `inventory-export_${selectedCategory}_${dateStr}.csv`;
    }
    
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-50 p-6 md:p-8 space-y-6" id="inventory-ledger-panel">
      {/* Upper header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-sans text-zinc-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-500" /> Catalog & Warehouse Assets
          </h2>
          <p className="text-zinc-500 text-xs font-sans mt-0.5">Control wholesale margins, audit item quantities, and list menu items.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 self-start md:self-auto w-full md:w-auto">
          {/* Top Search Input */}
          <div className="relative w-full sm:w-64 md:w-72">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-zinc-400" />
            </span>
            <input
              type="text"
              id="inventory-top-search"
              placeholder="Search by name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-white border border-zinc-200 rounded-xl text-xs font-sans text-zinc-800 focus:outline-none focus:border-amber-500 shadow-xs"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-650"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={handleAutoCompileLowStock}
            className="px-4 py-3 bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-bold font-sans rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0 border border-amber-600"
            title="Auto-detect all low stock items and queue them for wholesale procurement"
            id="btn-inventory-autocompile-reorder"
          >
            <ClipboardList className="w-4 h-4" /> Procure Low Stock
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-3 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs font-bold font-sans rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0 hover:border-zinc-300"
            title="Download CSV of filtered products"
            id="btn-inventory-export-csv"
          >
            <Download className="w-4 h-4 text-zinc-500" /> Export CSV
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-5 py-3 bg-zinc-950 text-white hover:bg-zinc-800 text-xs font-bold font-sans rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0"
            id="btn-inventory-add-sku"
          >
            <Plus className="w-4 h-4" /> Add Catalog SKU
          </button>
        </div>
      </div>

      {/* Asset values widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-zinc-250/60 shadow-xs">
          <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-zinc-400">Total Unique SKUs</span>
          <div className="text-2xl font-black text-zinc-900 mt-1 font-sans">{inventoryStats.totalItems}</div>
          <span className="text-[9.5px] text-zinc-500 font-sans mt-0.5 block">{inventoryStats.totalStock} units total in stock</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-zinc-250/60 shadow-xs">
          <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-zinc-400">Inventory Liquidity cost</span>
          <div className="text-2xl font-black text-zinc-900 mt-1 font-mono">${inventoryStats.totalAssetVal.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
          <span className="text-[9.5px] text-emerald-600 font-sans mt-0.5 font-bold block">Wholesale capital locked</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-zinc-250/60 shadow-xs">
          <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-zinc-400">Yield Pipeline Profit</span>
          <div className="text-2xl font-black text-emerald-600 mt-1 font-mono">${inventoryStats.potentialRevenue.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
          <span className="text-[9.5px] text-zinc-500 font-sans mt-0.5 block">Estimated margins upon retail sale</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-zinc-250/60 shadow-xs">
          <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-zinc-450 text-red-500">Stock Reorder Warnings</span>
          <div className={`text-2xl font-black mt-1 font-sans ${inventoryStats.lowStockCount > 0 ? 'text-red-500' : 'text-zinc-650'}`}>
            {inventoryStats.lowStockCount} SKUs
          </div>
          <span className="text-[9.5px] text-zinc-500 font-sans mt-0.5 block">Threshold limit set to {lowStockLimit} units</span>
        </div>
      </div>

      {/* Category Value Distribution Chart Section */}
      <div className="bg-white rounded-3xl border border-zinc-200 p-5 md:p-6 shadow-xs" id="inventory-recharts-analytics-section">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-100 pb-4 mb-5 gap-3">
          <div>
            <h3 className="font-sans font-bold text-sm text-zinc-900 flex items-center gap-2">
              <span className="p-1 rounded-lg bg-amber-500/10 text-amber-600 block shadow-3xs">
                <Layers className="w-4 h-4" />
              </span>
              <span>Inventory Capital Distribution</span>
            </h3>
            <p className="text-[10.5px] text-zinc-400 font-sans mt-0.5">Analyzing the allocation of wholesale liquid asset values and retail revenue potential across menu categories.</p>
          </div>
          
          <div className="text-[10px] bg-zinc-100 border border-zinc-200 text-zinc-650 font-mono font-bold px-2.5 py-1 rounded-xl shadow-4xs self-start md:self-auto">
            CURRENT ASSET TOTAL: <span className="text-zinc-950 font-black font-sans text-xs">${inventoryStats.totalAssetVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Recharts Pie Chart Container */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative min-h-[340px] border border-zinc-100 rounded-2xl bg-zinc-50/40 p-4">
            <div className="absolute top-3 left-3 text-[9px] uppercase font-mono font-black tracking-wider text-zinc-400">
              Value Breakdown (Pie)
            </div>
            
            {categoryValueData.length === 0 ? (
              <div className="text-zinc-400 text-xs italic font-sans py-24">
                No active inventory asset items detected.
              </div>
            ) : (
              <div className="w-full h-[300px] relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryValueData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={4}
                      className="cursor-pointer"
                    >
                      {categoryValueData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="#ffffff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Center visual summary callout badge */}
                <div className="absolute top-[50%] left-[50%] transform -translate-x-[50%] -translate-y-[50%] text-center pointer-events-none select-none">
                  <span className="text-[10px] uppercase font-mono font-black text-zinc-400 block tracking-wide">Total Value</span>
                  <span className="text-base font-black text-zinc-900 font-sans tracking-tight">
                    ${inventoryStats.totalAssetVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-[9px] text-zinc-400 font-sans block mt-0.5">{inventoryStats.totalStock} units</span>
                </div>
              </div>
            )}
          </div>

          {/* Categorical Listing distribution stats list */}
          <div className="lg:col-span-7 space-y-3 font-sans">
            <div className="text-[10px] uppercase font-mono font-black tracking-widest text-zinc-400 block mb-2 px-1">
              Category Distribution Ledger
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[340px] overflow-y-auto pr-1">
              {categoryValueData.map((item, idx) => {
                const color = CHART_COLORS[idx % CHART_COLORS.length];
                return (
                  <div 
                    key={item.slug} 
                    className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl flex flex-col justify-between hover:bg-zinc-100/50 hover:shadow-3xs transition-all pointer-events-none"
                  >
                    <div>
                      {/* Color indicator and title */}
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0 shadow-5xs" style={{ backgroundColor: color }} />
                        <h4 className="font-sans font-bold text-xs text-zinc-850 tracking-tight leading-snug line-clamp-1">
                          {item.name}
                        </h4>
                        <span className="text-[9px] bg-zinc-200/60 text-zinc-500 font-semibold px-2 py-0.5 rounded-full uppercase ml-auto tracking-wide font-sans">
                          {item.percentage}%
                        </span>
                      </div>
                      
                      {/* Metric info lines */}
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 mt-3 pt-2.5 border-t border-zinc-200/50 text-[10.5px] font-sans text-zinc-600">
                        <div>
                          <span className="text-[8.5px] uppercase text-zinc-400 block font-semibold font-sans">Wholesale Cost</span>
                          <strong className="font-mono font-bold text-zinc-900">${item.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                        </div>
                        <div>
                          <span className="text-[8.5px] uppercase text-zinc-400 block font-semibold font-sans">In Stock</span>
                          <strong className="font-sans text-zinc-850 font-black">{item.stockQty.toLocaleString()} units</strong>
                        </div>
                        <div>
                          <span className="text-[8.5px] uppercase text-zinc-400 block font-semibold font-sans">Retail Revenue</span>
                          <strong className="font-mono font-bold text-emerald-650 font-black">${item.retailValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                        </div>
                        <div>
                          <span className="text-[8.5px] uppercase text-zinc-400 block font-semibold font-sans">Menu Varieties</span>
                          <strong className="font-sans font-medium text-zinc-500">{item.itemCount} menu SKUs</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Audit control filters */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        {/* Categorical select dropdown */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-md">
          <span className="text-zinc-400 text-xs font-sans shrink-0">Categorical Section:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-sans text-zinc-700 focus:outline-none focus:border-amber-500/80 cursor-pointer"
          >
            <option value="all">All Category Sections</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.slug}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Health filters */}
        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
          <span className="text-zinc-400 font-sans shrink-0">Warehouse State:</span>
          <div className="bg-zinc-100 p-1 rounded-xl border border-zinc-200 inline-flex shadow-xs shrink-0">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${stockSelector === 'all' ? 'bg-white text-zinc-800 shadow-xs' : 'text-zinc-500 hover:text-zinc-800'}`}
            >
              Entire Fleet
            </button>
            <button
              onClick={() => setStockFilter('low')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${stockSelector === 'low' ? 'bg-red-500 text-white font-bold' : 'text-zinc-500 hover:text-red-500'}`}
            >
              Low Stock ({inventoryStats.lowStockCount})
            </button>
          </div>
        </div>
      </div>

      {/* Main inventory table ledger */}
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-mono uppercase text-zinc-400 tracking-wider">
                <th className="py-4 px-6">SKU SKU / Barcode</th>
                <th className="py-4 px-4">Item Name & Category</th>
                <th className="py-4 px-4 text-right">Price ($)</th>
                <th className="py-4 px-4 text-right">Wholesale Cost ($)</th>
                <th className="py-4 px-4 text-center">Current Stock</th>
                <th className="py-4 px-6 text-center">Control Shortcuts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-150 text-xs font-sans text-zinc-800">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400 font-sans">
                    No matching products found. Clear your query or list a new catalog item.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLow = p.stock <= lowStockLimit;
                  const isCritical = p.stock < (settings?.lowStockThreshold ?? 5);
                  const categoryName = categories.find(c => c.slug === p.category)?.name || p.category;
                  
                  return (
                    <tr 
                      key={p.id} 
                      className={`transition-colors duration-150 ${
                        isCritical 
                          ? 'bg-red-50/20 hover:bg-red-50/40' 
                          : 'hover:bg-zinc-50/50'
                      }`}
                    >
                      {/* SKU */}
                      <td className={`py-4 px-6 font-mono text-[10.5px] font-semibold uppercase ${
                        isCritical 
                          ? 'text-red-650 border-l-[3px] border-l-red-500 pl-5' 
                          : 'text-zinc-500'
                      }`}>{p.sku}</td>
                      
                      {/* Title & Category badge */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {/* Image Thumbnail with security requirements & fallback */}
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100 shrink-0 shadow-xs relative">
                            <img 
                              src={getProductImageUrl(p)} 
                              alt={p.name} 
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <div className="font-sans font-bold text-zinc-900">{p.name}</div>
                              {isCritical && (
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping shrink-0" />
                              )}
                            </div>
                            <span className="inline-block mt-0.5 px-2 py-0.5 bg-zinc-105 border border-zinc-200 text-zinc-500 font-mono text-[9px] rounded-md font-medium uppercase">
                              {categoryName}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Selling price */}
                      <td className="py-4 px-4 text-right font-mono font-medium text-zinc-900">${p.price.toFixed(2)}</td>

                      {/* Wholesale Cost */}
                      <td className="py-4 px-4 text-right font-mono text-zinc-500">${p.cost.toFixed(2)}</td>

                      {/* Stock units balance */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col items-center justify-center">
                          <div className={`px-2 py-1 rounded-lg text-center ${isCritical ? 'bg-red-50 border border-red-150/80 font-sans' : ''}`}>
                            <span className={`font-mono font-black text-sm leading-none ${
                              p.stock === 0 
                                ? 'text-red-700' 
                                : isCritical 
                                  ? 'text-red-600' 
                                  : isLow 
                                    ? 'text-amber-600 font-bold' 
                                    : 'text-zinc-850'
                            }`}>
                              {p.stock}
                            </span>
                            <span className="text-[9px] text-zinc-400 mt-0.5 block">{p.unit}s bulk</span>
                          </div>
                          
                          {/* Stock warning tag */}
                          {p.stock === 0 ? (
                            <span className="mt-1 text-[8px] bg-red-600 text-white px-2 py-0.5 rounded font-black uppercase tracking-wider flex items-center gap-0.5 shadow-xs"><AlertTriangle className="w-2.5 h-2.5 text-white" /> DEPLETED</span>
                          ) : isCritical ? (
                            <span className="mt-1 text-[8px] bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded font-black uppercase tracking-wider flex items-center gap-0.5 shadow-xs animate-pulse"><AlertTriangle className="w-2.5 h-2.5 text-red-600" /> CRITICAL</span>
                          ) : isLow ? (
                            <span className="mt-1 text-[8px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase flex items-center gap-0.5"><AlertTriangle className="w-2.5 h-2.5" /> REORDER</span>
                          ) : null}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 col-span-1">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleAddToReorder(p)}
                            className={`text-[10px] font-bold font-sans py-1.5 px-2.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                              isLow 
                                ? 'bg-amber-500 hover:bg-amber-600 text-zinc-950 border-amber-600 font-extrabold shadow-sm' 
                                : 'bg-zinc-105 hover:bg-zinc-150/60 text-zinc-750 border-zinc-200'
                            }`}
                            title={`Add standard replenishment units for "${p.name}" to procurement draft`}
                          >
                            <Truck className="w-3 h-3" /> Reorder
                          </button>

                          <button
                            onClick={() => onQuickRestock(p.id, 10)}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold font-sans py-1.5 px-2 flex items-center gap-0.5 rounded-lg border border-emerald-100 transition-colors cursor-pointer shrink-0"
                          >
                            <span>+10</span>
                          </button>
                          
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="p-2 text-zinc-650 hover:text-amber-800 bg-zinc-100 hover:bg-amber-100/50 rounded-lg border border-zinc-200/60 transition-colors cursor-pointer shrink-0"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              if (confirm(`Confirm audit removal: Eliminate ${p.name} (${p.sku}) permanently from system catalogs? This cannot be undone.`)) {
                                onDeleteProduct(p.id);
                              }
                            }}
                            className="p-2 text-zinc-400 hover:text-red-700 bg-zinc-150 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Add Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-zinc-950/80 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 border border-zinc-150 overflow-hidden flex flex-col animate-in fade-in-50 zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-150 shrink-0">
              <div>
                <h3 className="font-sans font-bold text-sm text-zinc-900">
                  {editingProduct ? 'Modify Menu Catalog Spec' : 'Register New Vendor SKU'}
                </h3>
                <p className="text-zinc-500 text-[10px] font-sans">Ensure correct VAT prices are listed.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveProduct} className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Product Name */}
                <div className="col-span-2">
                  <label className="text-[10px] text-zinc-400 uppercase font-black block mb-1">Item Title / Name</label>
                  <input
                    type="text"
                    required
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    placeholder="e.g. Double shot Flat White"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs font-sans placeholder-zinc-300 focus:outline-none focus:border-amber-550"
                  />
                </div>

                {/* SKU Code */}
                <div>
                  <label className="text-[10px] text-zinc-400 uppercase font-black block mb-1">SKU identifier</label>
                  <input
                    type="text"
                    required
                    value={prodSku}
                    onChange={(e) => setProdSku(e.target.value)}
                    placeholder="COF-FLT-11"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs font-sans placeholder-zinc-300 focus:outline-none focus:border-amber-550"
                  />
                </div>

                {/* Category selector */}
                <div>
                  <label className="text-[10px] text-zinc-400 uppercase font-black block mb-1">Assigned Section</label>
                  <select
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="w-full px-2 py-2 border border-zinc-200 rounded-xl text-xs font-sans focus:outline-none"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.slug}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* Selling Price */}
                <div>
                  <label className="text-[10px] text-zinc-400 uppercase font-black block mb-1">Retail price ($)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-zinc-400 text-xs font-bold font-sans">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={prodPrice}
                      onChange={(e) => setProdPrice(e.target.value)}
                      placeholder="5.20"
                      className="w-full pl-6 pr-3 py-2 border border-zinc-200 rounded-xl text-xs font-sans focus:outline-none focus:border-amber-550"
                    />
                  </div>
                </div>

                {/* Wholesale Cost */}
                <div>
                  <label className="text-[10px] text-zinc-400 uppercase font-black block mb-1">Wholesale Cost ($)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-zinc-400 text-xs font-bold font-sans">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={prodCost}
                      onChange={(e) => setProdCost(e.target.value)}
                      placeholder="1.20"
                      className="w-full pl-6 pr-3 py-2 border border-zinc-200 rounded-xl text-xs font-sans focus:outline-none focus:border-amber-550"
                    />
                  </div>
                </div>

                {/* Initial Stock */}
                <div>
                  <label className="text-[10px] text-zinc-400 uppercase font-black block mb-1">Current Stock qty</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={prodStock}
                    onChange={(e) => setProdStock(e.target.value)}
                    placeholder="100"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs font-sans focus:outline-none focus:border-amber-550"
                  />
                </div>

                {/* Stock Unit metric */}
                <div>
                  <label className="text-[10px] text-zinc-400 uppercase font-black block mb-1">Stock Unit type</label>
                  <select
                    value={prodUnit}
                    onChange={(e) => setProdUnit(e.target.value)}
                    className="w-full px-2 py-2 border border-zinc-200 rounded-xl text-xs font-sans focus:outline-none"
                  >
                    <option value="pcs">pieces (pcs)</option>
                    <option value="cup">cups (cup)</option>
                    <option value="slice">slice (slice)</option>
                    <option value="bottle">bottles</option>
                    <option value="can">can</option>
                    <option value="bag">bags (bag)</option>
                    <option value="kg">kilograms (kg)</option>
                  </select>
                </div>

                {/* Thumbnail Image URL with AI Generator Button */}
                <div className="col-span-2 pt-2 border-t border-zinc-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] text-zinc-400 uppercase font-black block">Thumbnail Image URL</label>
                    <button
                      type="button"
                      onClick={handleGeneratePlaceholderImg}
                      className="text-[10px] font-bold text-amber-700 hover:text-amber-800 font-sans cursor-pointer flex items-center gap-1 bg-amber-50 hover:bg-amber-100/80 px-2 py-1 rounded-lg border border-amber-200 transition-all shadow-3xs"
                      title="Generate a beautiful contextual placeholder with the Image Generation system"
                    >
                      <Sparkles className="w-3 h-3 text-amber-600 fill-current" />
                      <span>AI Generate Placeholder</span>
                    </button>
                  </div>
                  
                  <div className="flex gap-2 items-center">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={prodImageUrl}
                        onChange={(e) => setProdImageUrl(e.target.value)}
                        placeholder="https://example.com/image.jpg (or empty for auto-generation)"
                        className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs font-sans placeholder-zinc-350 focus:outline-none focus:border-amber-550"
                      />
                    </div>
                    {prodImageUrl.trim() ? (
                      <div className="w-9 h-9 rounded-lg overflow-hidden border border-zinc-200 shadow-2xs shrink-0 bg-zinc-50 relative">
                        <img 
                          src={prodImageUrl} 
                          alt="Thumbnail preview" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-lg border border-dashed border-zinc-300 flex items-center justify-center shrink-0 bg-zinc-50 text-zinc-400">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <p className="text-[9px] text-zinc-400 font-sans mt-1 leading-normal">
                    Provide a custom image URL or click <strong className="text-amber-700 font-bold">AI Generate</strong> to create a deterministic theme placeholder. Leave empty to automatically generate randomized mock images at runtime.
                  </p>
                </div>
              </div>

              {/* Popular item boolean toggle */}
              <div className="flex items-center gap-2 pt-2 pb-1 border-t border-zinc-150">
                <input
                  type="checkbox"
                  id="prod-popular-flag"
                  checked={prodIsPopular}
                  onChange={(e) => setProdIsPopular(e.target.checked)}
                  className="w-4 h-4 text-amber-500 rounded border-zinc-300 focus:ring-amber-500"
                />
                <label htmlFor="prod-popular-flag" className="text-xs font-bold text-zinc-700 cursor-pointer user-select-none font-sans">
                  List this as a featured product?
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-150 size-full shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 hover:bg-zinc-50 rounded-xl text-xs font-bold text-zinc-650 font-sans cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs font-sans rounded-xl shadow-md cursor-pointer transition-colors"
                >
                  Save Specification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Reorder/Procurement Tray Button */}
      {reorderCart.length > 0 && !showReorderDrawer && (
        <button
          onClick={() => setShowReorderDrawer(true)}
          className="fixed bottom-6 right-6 z-40 bg-zinc-950 text-white hover:bg-zinc-800 px-5 py-3.5 rounded-full shadow-2xl flex items-center gap-2.5 cursor-pointer border border-zinc-800 transition-all duration-200 uppercase text-[10px] tracking-wider font-bold animate-pulse"
          id="btn-floating-reorder-desk-collapsed"
        >
          <Truck className="w-4 h-4 text-amber-500" />
          <span>Procurement Desk ({reorderCart.length} SKUs pending)</span>
        </button>
      )}

      {/* Sliding Procurement Drawer */}
      {reorderCart.length > 0 && showReorderDrawer && (
        <div className="fixed bottom-6 right-6 z-40 bg-white rounded-2xl shadow-3xl border border-zinc-200 w-96 overflow-hidden flex flex-col max-h-[520px] animate-in slide-in-from-bottom duration-250 font-sans shadow-amber-500/5">
          {/* Drawer Header */}
          <div className="bg-zinc-950 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-black uppercase tracking-wider">Procurement Draft Center</h4>
            </div>
            <button
              onClick={() => setShowReorderDrawer(false)}
              className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-zinc-50 border-b border-zinc-150">
            <span className="text-[9px] uppercase font-mono tracking-widest text-zinc-400 font-bold block">Draft Line Items</span>
            
            <div className="space-y-2 border-y border-zinc-200/60 py-2.5 max-h-48 overflow-y-auto">
              {reorderCart.map((item) => (
                <div key={item.product.id} className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-zinc-200 gap-2">
                  <div className="flex-1 min-w-0">
                    <h5 className="text-[11px] font-bold text-zinc-900 truncate">{item.product.name}</h5>
                    <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[9px] text-zinc-450">
                      <span>{item.product.sku}</span>
                      <span>•</span>
                      <span>Stock: {item.product.stock} {item.product.unit} left</span>
                    </div>
                  </div>

                  {/* Quantity Editing Widget */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
                      <button
                        type="button"
                        onClick={() => handleUpdateReorderQty(item.product.id, item.quantity - 5)}
                        className="px-2 py-0.5 text-xs text-zinc-500 hover:text-zinc-900 cursor-pointer text-center"
                        title="Reduce by 5"
                      >
                        -5
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateReorderQty(item.product.id, parseInt(e.target.value) || 1)}
                        className="w-12 bg-transparent text-center font-mono font-bold text-zinc-850 text-xs focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateReorderQty(item.product.id, item.quantity + 5)}
                        className="px-2 py-0.5 text-xs text-zinc-500 hover:text-zinc-900 cursor-pointer text-center"
                        title="Increase by 5"
                      >
                        +5
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveFromReorder(item.product.id)}
                      className="p-1.5 text-zinc-400 hover:text-red-700 bg-zinc-100 hover:bg-red-50 border border-zinc-200 rounded-lg cursor-pointer"
                      title="Delete from draft"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Supplier inputs */}
            <div className="grid grid-cols-1 gap-2.5 pt-1">
              <div>
                <label className="text-[9px] font-bold font-mono uppercase text-zinc-400 block mb-1">Target Supplier</label>
                <input
                  type="text"
                  placeholder="e.g. Specialty Roasters Ltd."
                  value={reorderSupplier}
                  onChange={(e) => setReorderSupplier(e.target.value)}
                  className="w-full px-3 py-1.5 border border-zinc-200 rounded-xl bg-white text-xs font-sans text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold font-mono uppercase text-zinc-400 block mb-1 font-sans">Procurement Remarks (Optional)</label>
                <textarea
                  placeholder="Insert custom delivery notes or urgent request info..."
                  value={reorderNotes}
                  onChange={(e) => setReorderNotes(e.target.value)}
                  className="w-full px-3 py-1.5 border border-zinc-200 rounded-xl bg-white text-xs font-sans text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-amber-500 resize-none h-12"
                />
              </div>
            </div>
          </div>

          {/* Drawer Footer Actions */}
          <div className="p-4 bg-zinc-50 space-y-2 border-t border-zinc-200 shrink-0">
            {/* Cost Summary */}
            <div className="flex items-center justify-between text-xs font-sans pb-2 border-b border-zinc-200/60">
              <span className="text-zinc-500">Lines: <strong>{reorderCart.length}</strong> • Total Items: <strong>{reorderCart.reduce((sum, item) => sum + item.quantity, 0)}</strong> units</span>
              <span className="font-mono text-zinc-950 font-black">
                Est. Cost: ${reorderCart.reduce((sum, item) => sum + (item.quantity * item.product.cost), 0).toFixed(2)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => saveReorderCart([])}
                className="py-2.5 border border-zinc-200 bg-white hover:bg-zinc-100 rounded-xl text-zinc-650 hover:text-zinc-850 text-xs font-bold text-center cursor-pointer transition-all"
              >
                Clear Drawers
              </button>
              
              <button
                type="button"
                onClick={() => setIsPOModalOpen(true)}
                className="py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold text-center cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" /> Create PO Draft
              </button>
            </div>

            <button
              type="button"
              onClick={handleCommitRestock}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold text-center cursor-pointer transition-all flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" /> Force Deliver & Restock Now
            </button>
          </div>
        </div>
      )}

      {/* A4 Purchase Order Modal */}
      {isPOModalOpen && (
        <div className="fixed inset-0 bg-zinc-950/85 flex items-center justify-center z-50 p-4 backdrop-blur-xs font-sans overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 relative my-auto">
            {/* Modal Header bar */}
            <div className="bg-zinc-950 text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" />
                <span className="text-xs font-mono font-bold tracking-widest uppercase">Purchase Order Form Draft</span>
              </div>
              <button
                onClick={() => setIsPOModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* A4 Document Area - styled for digital review and printing */}
            <div className="flex-1 overflow-y-auto p-8 bg-zinc-50 po-print-container">
              <div className="bg-white p-8 border border-zinc-200 rounded-2xl shadow-sm text-zinc-800 font-sans leading-relaxed text-xs">
                
                {/* Printable Header */}
                <div className="flex items-start justify-between gap-4 pb-6 border-b border-zinc-200">
                  <div>
                    <h1 className="text-lg font-black tracking-tight text-zinc-900 uppercase">
                      {settings?.storeName ?? 'Brew & Bite Cafe'}
                    </h1>
                    <p className="text-[10px] text-zinc-500 font-semibold">{settings?.storeAddress ?? '100 Espresso Drive, Coffee City'}</p>
                    <p className="text-[9px] text-zinc-400">Tel: {settings?.storeTelephone ?? '(555) 767-2233'}</p>
                  </div>

                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 bg-amber-500 text-zinc-950 font-mono text-[9px] font-black rounded-md tracking-wider mb-2">
                      OFFICIAL PROCUREMENT DOCUMENT
                    </span>
                    <h2 className="text-md font-bold text-zinc-900">PO SPECIFICATION DRAFT</h2>
                    <p className="font-mono text-[10px] text-zinc-500">Ref: PO-2026-{String(Date.now()).slice(-6)}</p>
                    <p className="text-[10px] text-zinc-400 mt-1">Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>

                {/* Profiles Column */}
                <div className="grid grid-cols-2 gap-6 py-6 border-b border-zinc-200">
                  <div>
                    <span className="text-[9px] uppercase font-mono font-bold text-zinc-400 tracking-wider">Buyer (Ship to)</span>
                    <div className="mt-1 space-y-0.5">
                      <p className="font-black text-zinc-900">{settings?.storeName ?? 'Brew & Bite Cafe'}</p>
                      <p className="text-zinc-500 text-[10px]">{settings?.storeAddress ?? '100 Espresso Drive, Coffee City'}</p>
                      <p className="text-zinc-405 text-[10px]">Contact: Alex (Shift Mgr)</p>
                      <p className="text-zinc-450 text-[9px] font-mono">Terminal ID: #3 SYSTEM_LEDGER</p>
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] uppercase font-mono font-bold text-zinc-400 tracking-wider">Wholesale Vendor (Supplier)</span>
                    <div className="mt-1 space-y-0.5">
                      <p className="font-black text-zinc-900">{reorderSupplier || 'Standard Wholesale Foods Ltd.'}</p>
                      <p className="text-zinc-500 text-[10px]">Primary Registered Distributor</p>
                      <p className="text-zinc-405 text-[9px]">Custom notes: {reorderNotes || 'No custom delivery notes provided.'}</p>
                    </div>
                  </div>
                </div>

                {/* Main purchase table */}
                <div className="py-6 space-y-4">
                  <span className="text-[9px] uppercase font-mono font-bold text-zinc-400 tracking-wider block">Ordered Items Specification</span>
                  
                  <table className="w-full text-left border-collapse border border-zinc-150">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200 font-mono text-[9px] text-zinc-550 uppercase">
                        <th className="py-2.5 px-3">SKU Identifier</th>
                        <th className="py-2.5 px-3">Stock Description</th>
                        <th className="py-2.5 px-3 text-right">Wholesale Cost ($)</th>
                        <th className="py-2.5 px-3 text-center">Order Qty</th>
                        <th className="py-2.5 px-3 text-right">Line Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-150 text-[10.5px] font-sans">
                      {reorderCart.map((item) => {
                        const lineSub = item.quantity * item.product.cost;
                        return (
                          <tr key={item.product.id} className="hover:bg-zinc-50/50">
                            <td className="py-2.5 px-3 font-mono text-zinc-500 uppercase">{item.product.sku}</td>
                            <td className="py-2.5 px-3">
                              <p className="font-bold text-zinc-900">{item.product.name}</p>
                              <span className="text-[9px] text-zinc-400">Section: {item.product.category}</span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-zinc-650">${item.product.cost.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-zinc-800">{item.quantity} {item.product.unit}s</td>
                            <td className="py-2.5 px-3 text-right font-mono font-black text-zinc-900">${lineSub.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Subtotals breakdown */}
                <div className="flex justify-end pt-4 border-t border-zinc-200/80">
                  <div className="w-64 space-y-1.5 text-right">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-500">Total Unique SKUs:</span>
                      <span className="font-mono text-zinc-900 font-semibold">{reorderCart.length}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-500">Consolidated Bulk Items:</span>
                      <span className="font-mono text-zinc-900 font-semibold">{reorderCart.reduce((sum, i) => sum + i.quantity, 0)} units</span>
                    </div>
                    <div className="flex justify-between text-[12px] font-bold border-t border-zinc-200 pt-1.5">
                      <span className="text-zinc-900 uppercase tracking-wide">Grand Est. Wholesale Cost:</span>
                      <span className="font-mono text-emerald-700 text-sm font-black">
                        ${reorderCart.reduce((sum, item) => sum + (item.quantity * item.product.cost), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Signature placeholders */}
                <div className="grid grid-cols-2 gap-8 pt-12 text-zinc-400 text-[9.5px]">
                  <div>
                    <div className="border-t border-dashed border-zinc-300 pt-1.5">
                      <span>Authorized Buyer Signature</span>
                      <p className="text-zinc-900 font-bold mt-0.5 font-sans">Alex, terminal operator #3</p>
                    </div>
                  </div>
                  <div>
                    <div className="border-t border-dashed border-zinc-300 pt-1.5">
                      <span>Wholesale Vendor Acknowledgment</span>
                      <p className="text-zinc-500 italic mt-0.5">{reorderSupplier || '__________________________'}</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Bottom control buttons */}
            <div className="p-4 bg-zinc-90 border-t border-zinc-200 flex flex-wrap gap-2 justify-between shrink-0">
              <span className="text-[10px] text-zinc-450 self-center hidden sm:inline-block">Note: Clicking deliver will instantly update stock balances.</span>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPOModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 hover:bg-zinc-50 rounded-xl text-xs font-bold text-zinc-650 cursor-pointer"
                >
                  Close Draft
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const printStyles = document.createElement('style');
                    printStyles.innerHTML = `
                      @media print {
                        body * { visibility: hidden; }
                        .po-print-container, .po-print-container * { visibility: visible; }
                        .po-print-container { position: absolute; left: 0; top: 0; width: 100%; height: auto; }
                      }
                    `;
                    document.head.appendChild(printStyles);
                    window.print();
                    document.head.removeChild(printStyles);
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 rounded-xl text-xs font-extrabold cursor-pointer border border-amber-600 flex items-center gap-1.5 shadow-sm"
                  title="Print this purchase order using the browser print layout"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Draft Specification
                </button>

                <button
                  type="button"
                  onClick={handleCommitRestock}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  <Check className="w-4 h-4" /> Confirm Restock & Clear
                </button>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
