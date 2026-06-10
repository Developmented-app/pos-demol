import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Boxes, 
  ReceiptText, 
  Coffee,
  Clock,
  UserCheck,
  Settings
} from 'lucide-react';

interface SidebarProps {
  currentTab: 'dashboard' | 'pos' | 'inventory' | 'transactions' | 'settings';
  onTabChange: (tab: 'dashboard' | 'pos' | 'inventory' | 'transactions' | 'settings') => void;
  activeCashier: string;
}

export default function Sidebar({ currentTab, onTabChange, activeCashier }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', name: 'Analytics Dashboard', icon: LayoutDashboard },
    { id: 'pos', name: 'POS Terminal', icon: ShoppingBag },
    { id: 'inventory', name: 'Inventory & Catalog', icon: Boxes },
    { id: 'transactions', name: 'Order Logs', icon: ReceiptText },
    { id: 'settings', name: 'System Settings', icon: Settings },
  ] as const;

  return (
    <aside id="sidebar-navigation" className="w-64 bg-zinc-900 text-zinc-100 flex flex-col border-r border-zinc-800 z-10 shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-zinc-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-zinc-950 font-bold text-shadow-sm shadow-amber-500/20 shadow-md">
          <Coffee className="w-6 h-6 stroke-[2.5]" />
        </div>
        <div>
          <h1 className="font-sans font-bold text-base tracking-tight text-white leading-tight">Gourmet POS</h1>
          <span className="text-[10px] text-zinc-400 font-mono tracking-wider">v4.0.0 ADMIN / CORE</span>
        </div>
      </div>

      {/* Active Session Cashier Bar */}
      <div className="mx-4 my-4 p-3 bg-zinc-800/60 rounded-xl border border-zinc-700/40 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm tracking-tight border border-amber-500/30">
          {activeCashier.charAt(0)}
        </div>
        <div className="overflow-hidden">
          <div className="text-[11px] text-zinc-400 uppercase font-mono tracking-widest leading-none">Active Cashier</div>
          <div className="font-sans font-medium text-xs text-white truncate flex items-center gap-1 mt-0.5">
            <UserCheck className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="truncate">{activeCashier}</span>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              id={`sidebar-tab-${item.id}`}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/10 font-semibold'
                  : 'text-zinc-400 hover:bg-zinc-800/80 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.25]' : 'text-zinc-400'}`} />
              <span>{item.name}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-zinc-950" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer Metrics */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-950/40 font-mono text-[10px] text-zinc-500 space-y-2">
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> System UTC</span>
          <span className="text-zinc-400 font-medium">08:55</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Target Environment</span>
          <span className="text-emerald-500/80 font-bold uppercase">React Runtime</span>
        </div>
        <div className="pt-2 border-t border-zinc-800/50 text-center text-zinc-600 text-[9px]">
          Secure POS • Built for Speed
        </div>
      </div>
    </aside>
  );
}
