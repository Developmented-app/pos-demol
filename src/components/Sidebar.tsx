import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Boxes, 
  ReceiptText, 
  Coffee,
  Clock,
  UserCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  EyeOff
} from 'lucide-react';

interface SidebarProps {
  currentTab: 'dashboard' | 'pos' | 'inventory' | 'transactions' | 'settings';
  onTabChange: (tab: 'dashboard' | 'pos' | 'inventory' | 'transactions' | 'settings') => void;
  activeCashier: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onHideSidebar: () => void;
}

export default function Sidebar({ 
  currentTab, 
  onTabChange, 
  activeCashier,
  isCollapsed,
  onToggleCollapse,
  onHideSidebar
}: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', name: 'Analytics Dashboard', icon: LayoutDashboard },
    { id: 'pos', name: 'POS Terminal', icon: ShoppingBag },
    { id: 'inventory', name: 'Inventory & Catalog', icon: Boxes },
    { id: 'transactions', name: 'Order Logs', icon: ReceiptText },
    { id: 'settings', name: 'System Settings', icon: Settings },
  ] as const;

  return (
    <aside 
      id="sidebar-navigation" 
      className={`bg-zinc-900 border-r border-zinc-800 text-zinc-100 flex flex-col z-40 shrink-0 transition-all duration-300 ease-out ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className={`p-4 border-b border-zinc-800 flex items-center ${isCollapsed ? 'flex-col gap-3 justify-center' : 'justify-between gap-3'}`}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-zinc-950 font-bold shrink-0 shadow-amber-500/20 shadow-md">
            <Coffee className="w-6 h-6 stroke-[2.5]" />
          </div>
          {!isCollapsed && (
            <div className="animate-fade-in">
              <h1 className="font-sans font-bold text-base tracking-tight text-white leading-tight">Gourmet POS</h1>
              <span className="text-[10px] text-zinc-400 font-mono tracking-wider leading-none">v4.0 ADMIN</span>
            </div>
          )}
        </div>

        <div className={`flex items-center gap-1 ${isCollapsed ? 'flex-col' : ''}`}>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
            title={isCollapsed ? "Expand Menu" : "Collapse Menu"}
          >
            {isCollapsed ? <ChevronRight className="w-4.5 h-4.5" /> : <ChevronLeft className="w-4.5 h-4.5" />}
          </button>
          
          <button
            type="button"
            onClick={onHideSidebar}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
            title="Hide Sidebar Menu (Alt+M)"
          >
            <EyeOff className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Active Session Cashier Bar */}
      {isCollapsed ? (
        <div className="my-4 flex justify-center">
          <div 
            className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs tracking-tight border border-amber-500/30 cursor-help"
            title={`Active Cashier: ${activeCashier}`}
          >
            {activeCashier.charAt(0)}
          </div>
        </div>
      ) : (
        <div className="mx-4 my-4 p-3 bg-zinc-800/60 rounded-xl border border-zinc-700/40 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm tracking-tight border border-amber-500/30 shrink-0">
            {activeCashier.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <div className="text-[10px] text-zinc-400 uppercase font-mono tracking-widest leading-none">Active Cashier</div>
            <div className="font-sans font-medium text-xs text-white truncate flex items-center gap-1 mt-0.5">
              <UserCheck className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate">{activeCashier}</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <nav className={`flex-1 px-3 py-2 space-y-1 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              id={`sidebar-tab-${item.id}`}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center rounded-xl text-xs font-semibold transition-all cursor-pointer relative group ${
                isCollapsed 
                  ? 'justify-center w-12 h-12' 
                  : 'w-full gap-3 px-4 py-3'
              } ${
                isActive
                  ? 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/10 font-bold'
                  : 'text-zinc-400 hover:bg-zinc-800/80 hover:text-white'
              }`}
              title={isCollapsed ? item.name : undefined}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'stroke-[2.25]' : 'text-zinc-400'}`} />
              {!isCollapsed && <span>{item.name}</span>}
              
              {isActive && !isCollapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-zinc-950" />
              )}
              {isActive && isCollapsed && (
                <div className="absolute right-1 w-1.5 h-3 rounded-full bg-zinc-950" />
              )}

              {/* Floating Tooltip during collapsed hover */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-zinc-950 text-white text-[10px] font-bold font-sans rounded-lg shadow-xl border border-zinc-800 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-250 pointer-events-none z-50">
                  {item.name}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer Metrics */}
      {isCollapsed ? (
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/40 flex flex-col items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 cursor-help" title={`System Time: 08:55 UTC`}>
            <Clock className="w-4 h-4" />
          </div>
        </div>
      ) : (
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/40 font-mono text-[10px] text-zinc-500 space-y-2">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> System UTC</span>
            <span className="text-zinc-400 font-medium">08:55</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Target Env</span>
            <span className="text-emerald-500/80 font-bold uppercase text-[9px]">Vite Real-time</span>
          </div>
          <div className="pt-2 border-t border-zinc-800/50 text-center text-zinc-650 text-[9px]">
            Press <kbd className="bg-zinc-800 px-1 py-0.5 rounded text-[8px]">Alt+M</kbd> to hide
          </div>
        </div>
      )}
    </aside>
  );
}
