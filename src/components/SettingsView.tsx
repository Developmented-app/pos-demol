import React, { useState } from 'react';
import { 
  Store, 
  Percent, 
  AlertTriangle, 
  Database, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Check, 
  Sparkles,
  Sliders,
  FileText,
  Bookmark,
  Coffee,
  CupSoda,
  Utensils,
  CakeSlice,
  Package,
  Clock,
  Sun,
  Moon,
  User,
  Phone,
  Mail
} from 'lucide-react';
import { Category, SystemSettings, Customer } from '../types';

interface SettingsViewProps {
  settings: SystemSettings;
  onUpdateSettings: (s: SystemSettings) => void;
  categories: Category[];
  onAddCategory: (category: Category) => void;
  onDeleteCategory: (catId: string) => void;
  onResetSystem: () => void;
  onClearTransactions: () => void;
  onSeedMockOrders: () => void;
  customers: Customer[];
  onUpdateCustomers: (customers: Customer[]) => void;
}

const AVAILABLE_ICONS = [
  { id: 'Coffee', label: 'Coffee Cup', icon: Coffee },
  { id: 'CupSoda', label: 'Cold Drink', icon: CupSoda },
  { id: 'Utensils', label: 'Hot Food/Kitchen', icon: Utensils },
  { id: 'CakeSlice', label: 'Cake & Dessert', icon: CakeSlice },
  { id: 'Package', label: 'Retail Bag/Goods', icon: Package },
];

export default function SettingsView({
  settings,
  onUpdateSettings,
  categories,
  onAddCategory,
  onDeleteCategory,
  onResetSystem,
  onClearTransactions,
  onSeedMockOrders,
  customers,
  onUpdateCustomers
}: SettingsViewProps) {
  // Store details forms state
  const [storeName, setStoreName] = useState(settings.storeName);
  const [storeTelephone, setStoreTelephone] = useState(settings.storeTelephone);
  const [storeAddress, setStoreAddress] = useState(settings.storeAddress);

  // Operational thresholds state
  const [taxRatePercent, setTaxRatePercent] = useState(settings.taxRatePercent);
  const [lowStockThreshold, setLowStockThreshold] = useState(settings.lowStockThreshold);
  const [catalogLowStockLimit, setCatalogLowStockLimit] = useState(settings.catalogLowStockLimit);
  const [theme, setTheme] = useState(settings.theme ?? 'light');

  // Dynamic category creator state
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Coffee');
  const [catError, setCatError] = useState('');

  // Customer Management states
  const [settingsCustSearch, setSettingsCustSearch] = useState('');
  const [addCustName, setAddCustName] = useState('');
  const [addCustEmail, setAddCustEmail] = useState('');
  const [addCustPhone, setAddCustPhone] = useState('');
  const [addCustPoints, setAddCustPoints] = useState<number>(0);
  const [addCustError, setAddCustError] = useState('');

  // Status message state
  const [successMsg, setSuccessMsg] = useState('');

  const triggerSuccessMsg = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleAdjustPoints = (custId: string, delta: number) => {
    const updated = customers.map(c => {
      if (c.id === custId) {
        return {
          ...c,
          loyaltyPoints: Math.max(0, c.loyaltyPoints + delta)
        };
      }
      return c;
    });
    onUpdateCustomers(updated);
    triggerSuccessMsg('Loyalty customer points adjusted successfully.');
  };

  const handleDeleteCustomer = (custId: string, name: string) => {
    if (confirm(`Are you sure you wish to permanently delete the profile of loyalty customer "${name}"? This action is irreversible.`)) {
      onUpdateCustomers(customers.filter(c => c.id !== custId));
      triggerSuccessMsg(`Customer account "${name}" has been permanently removed.`);
    }
  };

  const handleAddCustomerSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setAddCustError('');
    if (!addCustName.trim()) {
      setAddCustError('Name is required.');
      return;
    }
    const newCust: Customer = {
      id: `c-${Date.now()}`,
      name: addCustName.trim(),
      email: addCustEmail.trim(),
      phone: addCustPhone.trim(),
      loyaltyPoints: Number(addCustPoints) || 0,
      createdAt: new Date().toISOString()
    };
    onUpdateCustomers([newCust, ...customers]);
    setAddCustName('');
    setAddCustEmail('');
    setAddCustPhone('');
    setAddCustPoints(0);
    triggerSuccessMsg(`Loyalty customer account "${newCust.name}" has been successfully initialized.`);
  };

  const handleSaveStoreAndThresholds = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      storeName,
      storeTelephone,
      storeAddress,
      taxRatePercent: Number(taxRatePercent),
      lowStockThreshold: Number(lowStockThreshold),
      catalogLowStockLimit: Number(catalogLowStockLimit),
      theme,
    });
    triggerSuccessMsg('System configurations successfully synchronized across all pos frameworks.');
  };

  const handleToggleTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    onUpdateSettings({
      storeName,
      storeTelephone,
      storeAddress,
      taxRatePercent: Number(taxRatePercent),
      lowStockThreshold: Number(lowStockThreshold),
      catalogLowStockLimit: Number(catalogLowStockLimit),
      theme: newTheme,
    });
    triggerSuccessMsg(`Switched display layout to ${newTheme === 'dark' ? 'Dark Mode' : 'Light Canvas'} mode.`);
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setCatError('');

    if (!newCatName.trim()) {
      setCatError('Category display name is required.');
      return;
    }

    const slug = newCatSlug.trim().toLowerCase() || newCatName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!slug) {
      setCatError('Invalid or empty layout slug.');
      return;
    }

    // Check if category slug already exists
    if (categories.some(c => c.slug === slug)) {
      setCatError(`Category with code '${slug}' already exists.`);
      return;
    }

    const newCategory: Category = {
      id: `cat-${Date.now()}`,
      name: newCatName.trim(),
      slug,
      icon: newCatIcon
    };

    onAddCategory(newCategory);
    setNewCatName('');
    setNewCatSlug('');
    setNewCatIcon('Coffee');
    triggerSuccessMsg(`Added dynamic POS section "${newCategory.name}" to POS terminal context menu.`);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-50 p-6 md:p-8 space-y-6" id="settings-control-frame">
      {/* Header and alerts */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
            System Admin Panel
          </span>
          <h2 className="text-2xl font-black font-sans text-zinc-900 tracking-tight mt-1 flex items-center gap-2">
            <Sliders className="w-6 h-6 text-zinc-700" /> Operational Parameters
          </h2>
          <p className="text-xs text-zinc-500 font-sans mt-0.5">
            Configure system rules, tax weights, custom store coordinates, catalog segments, and database state.
          </p>
        </div>

        {/* Global Success Indicator */}
        {successMsg && (
          <div className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-sans font-bold rounded-xl shadow-xs animate-fade-in" id="settings-success-alert">
            <Check className="w-4 h-4 text-emerald-600 animate-bounce" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Col 1: Store profile & thresholds */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSaveStoreAndThresholds} className="bg-white rounded-2xl shadow-xs border border-zinc-200 p-6 space-y-6" id="form-system-rules">
            <div className="flex items-center gap-2.5 border-b border-zinc-100 pb-3">
              <Store className="w-5 h-5 text-amber-500" />
              <h3 className="font-sans font-bold text-sm text-zinc-800">Store Profile & Receipt Metadata</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-wider font-sans">Establishment Name</label>
                <input 
                  type="text" 
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-sans text-zinc-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-wider font-sans">Store Hotline / Tel</label>
                <input 
                  type="text" 
                  value={storeTelephone}
                  onChange={(e) => setStoreTelephone(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-sans text-zinc-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-wider font-sans">Physical Address</label>
                <input 
                  type="text" 
                  value={storeAddress}
                  onChange={(e) => setStoreAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-sans text-zinc-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5 border-b border-zinc-100 pb-3 pt-2">
              <Percent className="w-5 h-5 text-amber-500" />
              <h3 className="font-sans font-bold text-sm text-zinc-800">Operational Weight Factors & Limits</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-wider font-sans flex items-center gap-1">
                  Sales Tax weight (%)
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  max="100"
                  value={taxRatePercent}
                  onChange={(e) => setTaxRatePercent(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-sans font-mono text-zinc-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
                <p className="text-[9px] text-zinc-400 font-sans">Applied during customer checkouts</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-wider font-sans">
                  Critical Stock Warn
                </label>
                <input 
                  type="number"
                  min="1"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-sans font-mono text-zinc-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
                <p className="text-[9px] text-zinc-400 font-sans">POS low stock toast limit</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-wider font-sans">
                  Analytics Low stock limit
                </label>
                <input 
                  type="number" 
                  min="1"
                  value={catalogLowStockLimit}
                  onChange={(e) => setCatalogLowStockLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-sans font-mono text-zinc-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
                <p className="text-[9px] text-zinc-400 font-sans">Highlighted count on dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 border-b border-zinc-100 pb-3 pt-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h3 className="font-sans font-bold text-sm text-zinc-800">System Theme & Appearance</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-wider font-sans">
                  Default Display Mode
                </label>
                <div className="grid grid-cols-2 gap-2" id="theme-selector-group">
                  <button
                    type="button"
                    onClick={() => handleToggleTheme('light')}
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      theme === 'light' 
                        ? 'bg-amber-500 border-amber-600 text-zinc-950 font-black shadow-sm' 
                        : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                    }`}
                    id="btn-theme-light"
                  >
                    <Sun className="w-4 h-4" /> Light Canvas
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleTheme('dark')}
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      theme === 'dark' 
                        ? 'bg-zinc-950 border-zinc-800 text-white font-black shadow-lg' 
                        : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                    }`}
                    id="btn-theme-dark"
                  >
                    <Moon className="w-4 h-4" /> Dark Mode
                  </button>
                </div>
                <p className="text-[9px] text-zinc-400 font-sans">Overrule system styles on all terminal devices instantly.</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button 
                type="submit"
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold font-sans text-xs rounded-xl shadow-md shadow-amber-500/15 transition-all cursor-pointer flex items-center gap-1.5"
                id="btn-save-operational-settings"
              >
                <Check className="w-4 h-4 stroke-[2.5]" /> Synchronize Parameters
              </button>
            </div>
          </form>

          {/* Dynamic POS Section Creator */}
          <div className="bg-white rounded-2xl shadow-xs border border-zinc-200 p-6 space-y-6">
            <div className="flex items-center gap-2.5 border-b border-zinc-100 pb-3">
              <Bookmark className="w-5 h-5 text-amber-500" />
              <div className="flex-1">
                <h3 className="font-sans font-bold text-sm text-zinc-800">Dynamic Menu Category Sections</h3>
                <p className="text-[10px] text-zinc-400 font-sans">Active product groupings controlling POS menu filtering and stock layouts.</p>
              </div>
            </div>

            {/* List Active Sections */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {categories.map((cat) => {
                return (
                  <div 
                    key={cat.id} 
                    className="p-3 bg-zinc-50 border border-zinc-150 rounded-xl flex items-center justify-between gap-2 text-xs font-sans text-zinc-700"
                  >
                    <span className="font-semibold truncate">{cat.name}</span>
                    
                    {/* User-added category can be deleted; initial categories are protected */}
                    {!['coffee', 'beverages', 'food', 'dessert', 'merch'].includes(cat.slug) ? (
                      <button 
                        onClick={() => {
                          if (confirm(`Remove the custom menu category "${cat.name}"? Products grouped under this category will no longer be filterable easily until reassigned.`)) {
                            onDeleteCategory(cat.id);
                            triggerSuccessMsg(`Deleted custom category section "${cat.name}".`);
                          }
                        }}
                        className="text-zinc-400 hover:text-red-500 p-1 rounded-md transition-colors cursor-pointer"
                        title="Delete custom category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="text-[8px] font-mono text-zinc-400 uppercase font-bold tracking-wider bg-zinc-100 px-1.5 py-0.5 rounded">Core</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add Dynamic Category Form */}
            <form onSubmit={handleCreateCategory} className="bg-zinc-50/50 p-4 rounded-xl border border-dashed border-zinc-200 space-y-4" id="form-create-category">
              <h4 className="text-xs font-bold text-zinc-700 font-sans flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-amber-500" /> Initialize Dynamic Category Section
              </h4>

              {catError && (
                <div className="p-2 bg-red-50 border border-red-150 text-red-700 text-[10px] font-bold rounded-lg flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> {catError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Display Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Seasonal Specials"
                    value={newCatName}
                    onChange={(e) => {
                      setNewCatName(e.target.value);
                      setNewCatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                    }}
                    className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-sans text-zinc-800 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Storage Identifier Code</label>
                  <input 
                    type="text" 
                    placeholder="e.g. seasonal"
                    value={newCatSlug}
                    onChange={(e) => setNewCatSlug(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-mono text-zinc-800 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Layout Icon Match</label>
                  <select 
                    value={newCatIcon}
                    onChange={(e) => setNewCatIcon(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-sans text-zinc-800 focus:outline-none cursor-pointer"
                  >
                    {AVAILABLE_ICONS.map(i => (
                      <option key={i.id} value={i.id}>{i.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Icon Visual Grid Preview */}
              <div className="flex items-center gap-4 text-xs font-sans text-zinc-650 pt-1">
                <span className="text-[9px] uppercase font-black tracking-wider text-zinc-400">Section Icon Preview:</span>
                <div className="flex items-center gap-1 bg-white border border-zinc-150 px-2.5 py-1 rounded-lg">
                  {React.createElement(AVAILABLE_ICONS.find(i => i.id === newCatIcon)?.icon || Coffee, { className: 'w-4 h-4 text-amber-500' })}
                  <span className="text-[11px] font-bold text-zinc-700">{AVAILABLE_ICONS.find(i => i.id === newCatIcon)?.label}</span>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button 
                  type="submit"
                  className="px-4 py-2 bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-bold font-sans rounded-xl transition-all cursor-pointer flex items-center gap-1"
                  id="btn-add-custom-category"
                >
                  <Plus className="w-3.5 h-3.5" /> Inject POS Section
                </button>
              </div>
            </form>
          </div>

          {/* Customer Loyalty Directory and Manager Card */}
          <div className="bg-white rounded-2xl shadow-xs border border-zinc-200 p-6 space-y-6">
            <div className="flex items-center gap-2.5 border-b border-zinc-100 pb-3 justify-between">
              <div className="flex items-center gap-2.5">
                <User className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="font-sans font-bold text-sm text-zinc-800">Loyalty Members Directory</h3>
                  <p className="text-[10px] text-zinc-400 font-sans">Manage customer points balances, registrations, contact lists, and rewards.</p>
                </div>
              </div>
              <span className="text-[10px] bg-amber-100 text-amber-900 font-mono font-bold px-2 py-0.5 rounded-full">
                {customers.length} Accounts
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-2">
              {/* Left pane: Add Member form (4/12 cols) */}
              <div className="lg:col-span-4 bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-3 h-fit">
                <h4 className="text-xs font-bold text-zinc-850 font-sans flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5 text-amber-500" /> Register Loyalty Member
                </h4>

                {addCustError && (
                  <div className="p-2 bg-red-50 border border-red-150 text-red-700 text-[10px] font-bold rounded-lg flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3" /> {addCustError}
                  </div>
                )}

                <form onSubmit={handleAddCustomerSettings} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Full Name *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Rachel Adams"
                      value={addCustName}
                      onChange={(e) => setAddCustName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-sans text-zinc-800 outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Email Address</label>
                    <input 
                      type="email" 
                      placeholder="rachel.adams@example.com"
                      value={addCustEmail}
                      onChange={(e) => setAddCustEmail(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-sans text-zinc-800 outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Hotline / Phone</label>
                    <input 
                      type="text" 
                      placeholder="555-019-2834"
                      value={addCustPhone}
                      onChange={(e) => setAddCustPhone(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-sans text-zinc-800 outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Starting Points Adjust</label>
                    <input 
                      type="number" 
                      min="0"
                      value={addCustPoints}
                      onChange={(e) => setAddCustPoints(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-mono text-zinc-800 outline-none focus:border-amber-500"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-2 bg-zinc-950 hover:bg-zinc-850 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Create Account
                  </button>
                </form>
              </div>

              {/* Right pane: Search & List (8/12 cols) */}
              <div className="lg:col-span-8 flex flex-col space-y-3">
                {/* Search box */}
                <div className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="Filter members by name, phone, email..."
                    value={settingsCustSearch}
                    onChange={(e) => setSettingsCustSearch(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-sans pl-3 focus:outline-none"
                  />
                  {settingsCustSearch && (
                    <button
                      onClick={() => setSettingsCustSearch('')}
                      className="px-3 bg-zinc-150 hover:bg-zinc-200 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-650 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* List container */}
                <div className="border border-zinc-150 rounded-xl divide-y divide-zinc-100 max-h-[350px] overflow-y-auto bg-white shadow-3xs">
                  {(() => {
                    const filtered = customers.filter(c => {
                      if (!settingsCustSearch.trim()) return true;
                      const q = settingsCustSearch.toLowerCase();
                      return c.name.toLowerCase().includes(q) ||
                             (c.email && c.email.toLowerCase().includes(q)) ||
                             (c.phone && c.phone.includes(q));
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="p-8 text-center text-zinc-400 text-xs italic font-sans">
                          No loyalty members match the filtration rules.
                        </div>
                      );
                    }

                    return filtered.map((cust) => (
                      <div key={cust.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-50/50 transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-zinc-850">{cust.name}</span>
                            <span className="bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider">
                              {cust.loyaltyPoints} pts
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-zinc-400">
                            {cust.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-zinc-400" /> {cust.email}
                              </div>
                            )}
                            {cust.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-zinc-400" /> {cust.phone}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Point adjusting & delete controls */}
                        <div className="flex items-center gap-2">
                          <div className="flex border border-zinc-200 rounded-lg bg-zinc-50 overflow-hidden shadow-4xs">
                            <button
                              onClick={() => handleAdjustPoints(cust.id, -10)}
                              className="px-2 py-1 text-[9px] hover:bg-zinc-150 border-r border-zinc-200 text-zinc-650 transition-colors cursor-pointer font-bold font-mono"
                              title="Deduct 10 points"
                            >
                              -10
                            </button>
                            <button
                              onClick={() => handleAdjustPoints(cust.id, 10)}
                              className="px-2 py-1 text-[9px] hover:bg-zinc-150 border-r border-zinc-200 text-emerald-700 transition-colors cursor-pointer font-bold font-mono"
                              title="Add 10 points"
                            >
                              +10
                            </button>
                            <button
                              onClick={() => handleAdjustPoints(cust.id, 100)}
                              className="px-2 py-1 text-[9px] hover:bg-zinc-150 text-amber-700 transition-colors cursor-pointer font-bold font-mono"
                              title="Add 100 points"
                            >
                              +100
                            </button>
                          </div>

                          <button
                            onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                            className="p-1.5 rounded-lg border border-red-100 hover:border-red-200 bg-red-50 text-red-500 hover:bg-red-100 transition-all cursor-pointer"
                            title="Delete custom customer account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Col 2: System actions & controls */}
        <div className="space-y-6">
          {/* Cashier profile card selector */}
          <div className="bg-white rounded-2xl shadow-xs border border-zinc-200 p-6 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-zinc-100 pb-3">
              <Clock className="w-5 h-5 text-amber-500" />
              <h3 className="font-sans font-bold text-sm text-zinc-800">Operational Session Profile</h3>
            </div>
            
            <div className="p-3 bg-zinc-50 border border-zinc-150 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500">
                <span>SECURITY CONTEXT</span>
                <span className="text-emerald-600 font-bold">POS OK</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center font-black text-sm border border-amber-600/20">
                  {settings.storeName ? settings.storeName.charAt(0) : 'B'}
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-800 font-sans">{settings.storeName}</div>
                  <div className="text-[9px] text-zinc-400 font-mono">Location: Active terminal #3</div>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-zinc-500 font-sans leading-relaxed">
              These details shape client interactions, receipt layouts, logs, and billing calculations cleanly.
            </div>
          </div>

          {/* Database & Terminal State control panel */}
          <div className="bg-white rounded-2xl shadow-xs border border-zinc-200 p-6 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-zinc-100 pb-3">
              <Database className="w-5 h-5 text-amber-500" />
              <h3 className="font-sans font-bold text-sm text-zinc-800">Terminal Database Maintenance</h3>
            </div>

            <p className="text-[11px] text-zinc-500 font-sans leading-relaxed">
              Maintain checkout histories, inventory listings, and system states. Changes write directly into local persistent registers.
            </p>

            <div className="space-y-2 pt-2" id="db-commands-container">
              {/* Clear orders ledger */}
              <button
                onClick={() => {
                  if (confirm('CRITICAL ACTION: Are you sure you wish to wipe the entire transactions order ledger of this terminal? All historical revenue metrics will be set to zero.')) {
                    onClearTransactions();
                    triggerSuccessMsg('Transaction registry files set to zero logs.');
                  }
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-xs font-bold font-sans rounded-xl border border-zinc-200 transition-colors cursor-pointer text-left"
                id="btn-clear-all-orders"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-zinc-500" /> Clear Order Ledger
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">Wipe Logs</span>
              </button>

              {/* Seed Demo Sales */}
              <button
                onClick={() => {
                  if (confirm('Perform simulation seeding: Generate 20+ past mock customer receipt ledger operations across recent calendar cycles? This will populates analytics.')) {
                    onSeedMockOrders();
                    triggerSuccessMsg('Seeded past pos transactions records into ledger.');
                  }
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-xs font-bold font-sans rounded-xl border border-zinc-200 transition-colors cursor-pointer text-left"
                id="btn-seed-simulated-sales"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" /> Seed Simulator Transactions
                </span>
                <span className="text-[10px] text-emerald-600 font-mono font-bold">+Mock Logs</span>
              </button>

              {/* Factory Reset App */}
              <button
                onClick={() => {
                  if (confirm('FACTORY RESET: Wipe catalog configurations, custom categories, transaction history, and completely reset terminal to original settings?')) {
                    onResetSystem();
                    // Hard reload to sync states nicely
                    window.location.reload();
                  }
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold font-sans rounded-xl border border-red-100 transition-colors cursor-pointer text-left"
                id="btn-terminal-hard-reset"
              >
                <span className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-red-600" /> Full Factory Reset
                </span>
                <span className="text-[10px] text-red-650 font-mono font-bold">WIPE STATIONS</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
