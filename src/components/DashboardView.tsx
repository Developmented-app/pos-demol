import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Coins, 
  ShoppingBag, 
  Percent, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Layers,
  Sparkles,
  DollarSign,
  Award,
  Trophy
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Product, Order, ActivityLog, SalesByDate, SystemSettings } from '../types';

interface DashboardViewProps {
  products: Product[];
  orders: Order[];
  logs: ActivityLog[];
  settings?: SystemSettings;
}

export default function DashboardView({ products, orders, logs, settings }: DashboardViewProps) {
  const [timeRange, setTimeRange] = useState<'7days' | 'all'>('7days');
  const [chartType, setChartType] = useState<'line' | 'area'>('line');

  // Compute stats
  const dashboardStats = useMemo(() => {
    const completedOrders = orders.filter(o => o.status === 'Completed');
    const refundedOrders = orders.filter(o => o.status === 'Refunded');

    const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
    const totalRefunded = refundedOrders.reduce((sum, o) => sum + o.total, 0);
    const netRevenue = totalRevenue - totalRefunded;

    const totalOrders = completedOrders.length;
    const avgOrderValue = totalOrders > 0 ? (netRevenue / totalOrders) : 0;

    // Calculate cost of goods sold (COGS) and profit
    let totalCost = 0;
    completedOrders.forEach(order => {
      order.items.forEach(item => {
        const prodDetails = products.find(p => p.id === item.productId);
        const costBasis = prodDetails ? prodDetails.cost : (item.price * 0.25); // fallback cost basis 25%
        totalCost += (costBasis * item.quantity);
      });
    });

    const netProfit = Math.max(0, netRevenue - totalCost);
    const profitMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

    // Stock notifications (dynamic limit configured in Settings)
    const lowStockLimit = settings?.catalogLowStockLimit ?? 15;
    const lowStockCount = products.filter(p => p.stock <= lowStockLimit).length;

    // Detect today's string cleanly
    const systemToday = new Date().toISOString().split('T')[0];
    const todayStr = orders.some(o => o.timestamp.startsWith(systemToday)) ? systemToday : '2026-06-10';

    const completedOrdersToday = completedOrders.filter(o => o.timestamp.startsWith(todayStr));
    const totalRevenueToday = completedOrdersToday.reduce((sum, o) => sum + o.total, 0);
    const transactionsTodayCount = completedOrdersToday.length;

    // Top Selling Category by Revenue
    const categorySalesMap: { [slug: string]: number } = {};
    completedOrders.forEach(order => {
      order.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const categorySlug = product ? product.category : 'coffee';
        categorySalesMap[categorySlug] = (categorySalesMap[categorySlug] || 0) + (item.price * item.quantity);
      });
    });

    let topCategorySlug = 'coffee';
    let topCategoryRevVal = 0;
    Object.entries(categorySalesMap).forEach(([slug, rev]) => {
      if (rev > topCategoryRevVal) {
        topCategoryRevVal = rev;
        topCategorySlug = slug;
      }
    });

    const categoryNames: { [slug: string]: string } = {
      coffee: 'Coffee & Espresso',
      beverages: 'Cold Beverages',
      food: 'Hot Kitchen & Food',
      dessert: 'Bakery & Dessert',
      merch: 'Beans & Merch'
    };
    const topCategoryName = categoryNames[topCategorySlug] || (topCategorySlug ? topCategorySlug.charAt(0).toUpperCase() + topCategorySlug.slice(1) : 'No Category');

    return {
      netRevenue,
      totalOrders,
      avgOrderValue,
      grossProfit: netProfit,
      profitMargin,
      lowStockCount,
      totalRevenueToday,
      transactionsTodayCount,
      topCategoryName,
      topCategoryRev: topCategoryRevVal
    };
  }, [orders, products]);

  // Compute 7-day projection metrics based on average daily metrics in the last 7 calendar days
  const projectionStats = useMemo(() => {
    const systemToday = new Date().toISOString().split('T')[0];
    const todayStr = orders.some(o => o.timestamp.startsWith(systemToday)) ? systemToday : '2026-06-10';

    const dailyMap7: { [key: string]: { sales: number; count: number } } = {};
    const historyDates7: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStr + 'T12:00:00Z');
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dailyMap7[dateStr] = { sales: 0, count: 0 };
      historyDates7.push(dateStr);
    }

    orders.forEach(order => {
      const dbDate = order.timestamp.split('T')[0];
      if (historyDates7.includes(dbDate)) {
        if (order.status === 'Completed') {
          dailyMap7[dbDate].sales += order.total;
          dailyMap7[dbDate].count += 1;
        } else if (order.status === 'Refunded') {
          dailyMap7[dbDate].sales -= order.total;
        }
      }
    });

    const list = Object.values(dailyMap7);
    const totalSales7Days = list.reduce((sum, item) => sum + item.sales, 0);
    const totalCount7Days = list.reduce((sum, item) => sum + item.count, 0);
    
    const avgDailySales = totalSales7Days / 7;
    const avgDailyCount = totalCount7Days / 7;
    
    const projectedRevenueNext7Days = avgDailySales * 7;
    const projectedCountNext7Days = Math.round(avgDailyCount * 7);

    return {
      totalSales7Days,
      totalCount7Days,
      avgDailySales,
      avgDailyCount,
      projectedRevenueNext7Days,
      projectedCountNext7Days
    };
  }, [orders]);

  // Aggregate daily history for chart
  const salesHistoryData = useMemo(() => {
    const dailyMap: { [key: string]: { sales: number; profit: number; cost: number; count: number } } = {};

    // Generate last 7 dates statically or read from orders
    const historyDates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date('2026-06-10T12:00:00Z');
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dailyMap[dateStr] = { sales: 0, profit: 0, cost: 0, count: 0 };
      historyDates.push(dateStr);
    }

    orders.forEach(order => {
      const dbDate = order.timestamp.split('T')[0];
      
      // If within our history range or we want list of all
      if (order.status === 'Completed') {
        if (!dailyMap[dbDate]) {
          dailyMap[dbDate] = { sales: 0, profit: 0, cost: 0, count: 0 };
        }
        
        let orderCost = 0;
        order.items.forEach(item => {
          const pInstance = products.find(p => p.id === item.productId);
          orderCost += (pInstance ? pInstance.cost : item.price * 0.25) * item.quantity;
        });

        dailyMap[dbDate].sales += order.total;
        dailyMap[dbDate].cost += orderCost;
        dailyMap[dbDate].count += 1;
      } else if (order.status === 'Refunded') {
        if (!dailyMap[dbDate]) {
          dailyMap[dbDate] = { sales: 0, profit: 0, cost: 0, count: 0 };
        }
        dailyMap[dbDate].sales -= order.total;
        dailyMap[dbDate].count += 1;
      }
    });

    // Format for chart: sort dates
    const formatted = Object.keys(dailyMap)
      .sort()
      .map(dateKey => {
        const item = dailyMap[dateKey];
        const profit = Math.max(0, item.sales - item.cost);
        const dateObj = new Date(dateKey + 'T12:00:00Z');
        const label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        return {
          rawDate: dateKey,
          date: label,
          sales: parseFloat(item.sales.toFixed(2)),
          profit: parseFloat(profit.toFixed(2)),
          orders: item.count
        };
      });

    return timeRange === '7days' ? formatted.slice(-7) : formatted;
  }, [orders, products, timeRange]);

  // Top Products computation
  const topProducts = useMemo(() => {
    const countsMap: { [productId: string]: { name: string; quantity: number; revenue: number; category: string } } = {};

    orders.forEach(order => {
      if (order.status === 'Completed') {
        order.items.forEach(item => {
          if (!countsMap[item.productId]) {
            const pInstance = products.find(p => p.id === item.productId);
            countsMap[item.productId] = {
              name: item.name,
              quantity: 0,
              revenue: 0,
              category: pInstance ? pInstance.category : 'General'
            };
          }
          countsMap[item.productId].quantity += item.quantity;
          countsMap[item.productId].revenue += item.price * item.quantity;
        });
      }
    });

    return Object.values(countsMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [orders, products]);

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-50 p-6 md:p-8 space-y-6">
      
      {/* Upper Welcome and Date Picker Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-sans text-zinc-900 tracking-tight">Analytics Executive Center</h2>
          <p className="text-zinc-500 text-xs mt-0.5 font-sans">Business intelligence overview & system logs computed in real-time.</p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="text-zinc-400 text-xs font-medium flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" /> Date Filter:
          </span>
          <div className="bg-white p-1 rounded-xl shadow-xs border border-zinc-200 inline-flex">
            <button 
              onClick={() => setTimeRange('7days')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${timeRange === '7days' ? 'bg-amber-500 text-zinc-950 font-bold' : 'text-zinc-600 hover:bg-zinc-100'}`}
            >
              Last 7 Days
            </button>
            <button 
              onClick={() => setTimeRange('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${timeRange === 'all' ? 'bg-amber-500 text-zinc-950 font-bold' : 'text-zinc-600 hover:bg-zinc-100'}`}
            >
              All Time
            </button>
          </div>
        </div>
      </div>

      {/* Daily Operations Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-daily-highlights">
        {/* Total Revenue Today */}
        <div id="card-total-revenue-today" className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-5 rounded-2xl shadow-xs border border-amber-500/25 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-start justify-between relative z-10">
            <div>
              <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider font-sans">Business Today Focus</span>
              <h4 className="text-zinc-800 text-xs font-bold font-sans mt-0.5">Total Revenue Today</h4>
            </div>
            <div className="p-2 bg-amber-500 text-zinc-950 rounded-xl shadow-xs">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 relative z-10">
            <span className="text-3xl font-black font-sans text-zinc-900 tracking-tight">
              ${dashboardStats.totalRevenueToday.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <p className="text-[10px] text-zinc-500 font-medium font-sans mt-1">
              Derived from <span className="text-zinc-900 font-bold">{dashboardStats.transactionsTodayCount}</span> completed POS cash-outs today
            </p>
          </div>
        </div>

        {/* Total Transactions */}
        <div id="card-total-transactions" className="bg-white p-5 rounded-2xl shadow-xs border border-zinc-200 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-zinc-400 text-[10px] font-black uppercase tracking-wider font-sans">Ledger History</span>
              <h4 className="text-zinc-800 text-xs font-bold font-sans mt-0.5">Total Transactions</h4>
            </div>
            <div className="p-2 bg-zinc-900 text-white rounded-xl shadow-xs">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black font-sans text-zinc-900 tracking-tight">
              {dashboardStats.totalOrders} <span className="text-zinc-400 font-semibold text-sm">sales</span>
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-emerald-600 text-[10px] font-bold">
              <span className="px-1.5 py-0.5 bg-emerald-55/15 rounded text-[9px] font-mono">+{dashboardStats.transactionsTodayCount} today</span>
              <span className="text-zinc-400 font-normal">registered logs</span>
            </div>
          </div>
        </div>

        {/* Top Selling Category */}
        <div id="card-top-selling-category" className="bg-white p-5 rounded-2xl shadow-xs border border-zinc-200 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-zinc-400 text-[10px] font-black uppercase tracking-wider font-sans font-medium">Market Share Leaders</span>
              <h4 className="text-zinc-800 text-xs font-bold font-sans mt-0.5">Top Selling Category</h4>
            </div>
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shadow-xs">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-lg md:text-xl font-bold font-sans text-zinc-900 tracking-tight line-clamp-1">
              {dashboardStats.topCategoryName || 'No Orders Yet'}
            </span>
            <p className="text-[10px] text-zinc-500 font-medium font-sans mt-1">
              Leading category generating <span className="text-zinc-900 font-bold">${dashboardStats.topCategoryRev.toFixed(2)}</span> in sales
            </p>
          </div>
        </div>

        {/* 7-Day Revenue Projection */}
        <div id="card-sales-projection" className="bg-white p-5 rounded-2xl shadow-xs border border-zinc-200 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-zinc-400 text-[10px] font-black uppercase tracking-wider font-sans font-medium">Forward Outlook</span>
              <h4 className="text-zinc-800 text-xs font-bold font-sans mt-0.5">7-Day Revenue Projection</h4>
            </div>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl shadow-xs">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black font-sans text-zinc-900 tracking-tight block">
              ${projectionStats.projectedRevenueNext7Days.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <div className="mt-1 space-y-0.5 border-t border-zinc-100 pt-1">
              <div className="flex justify-between items-center text-[9px] text-zinc-500 font-sans">
                <span>7-Day Run-Rate:</span>
                <span className="font-mono font-bold text-zinc-800">${projectionStats.avgDailySales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/day</span>
              </div>
              <div className="flex justify-between items-center text-[9px] text-zinc-500 font-sans">
                <span>Expected Orders:</span>
                <span className="font-mono font-bold text-zinc-800">~{projectionStats.projectedCountNext7Days} txs</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI Net Revenue */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-zinc-200 flex flex-col justify-between col-span-2 lg:col-span-1">
          <div className="flex items-start justify-between">
            <span className="text-zinc-500 text-xs font-medium font-sans">Net Sales Revenue</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold font-sans text-zinc-900 tracking-tight">
              ${dashboardStats.netRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <div className="flex items-center gap-1 mt-1 text-emerald-600 text-[10px] font-bold">
              <span className="px-1.5 py-0.5 bg-emerald-50 rounded font-mono">+12.4%</span>
              <span className="text-zinc-400 font-normal">vs last week</span>
            </div>
          </div>
        </div>

        {/* KPI Total Orders */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-zinc-200 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-zinc-500 text-xs font-medium font-sans">Sales Volume</span>
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold font-sans text-zinc-900 tracking-tight">
              {dashboardStats.totalOrders} <span className="text-zinc-400 font-normal text-xs">txs</span>
            </span>
            <div className="flex items-center gap-1 mt-1 text-blue-600 text-[10px] font-bold">
              <span className="px-1.5 py-0.5 bg-blue-50 rounded font-mono">+8.7%</span>
              <span className="text-zinc-400 font-normal">vs last week</span>
            </div>
          </div>
        </div>

        {/* KPI Average Order Value */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-zinc-200 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-zinc-500 text-xs font-medium font-sans font-sans">Avg Ticket Value</span>
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold font-sans text-zinc-900 tracking-tight">
              ${dashboardStats.avgOrderValue.toFixed(2)}
            </span>
            <div className="flex items-center gap-1 mt-1 text-amber-600 text-[10px] font-bold font-sans">
              <span className="px-1.5 py-0.5 bg-amber-50 rounded font-mono">+3.2%</span>
              <span className="text-zinc-400 text-[9px] font-normal font-sans">ticket size upward</span>
            </div>
          </div>
        </div>

        {/* KPI Profit Margin */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-zinc-200 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-zinc-500 text-xs font-medium font-sans">Gross Profit</span>
            <div className="p-2 bg-purple-50 rounded-xl text-purple-600">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold font-sans text-emerald-600 tracking-tight">
              {dashboardStats.profitMargin.toFixed(1)}%
            </span>
            <div className="text-[11px] text-zinc-500 mt-1 font-mono font-medium truncate">
              Net Profit: ${dashboardStats.grossProfit.toFixed(2)}
            </div>
          </div>
        </div>

        {/* KPI Alerts */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-zinc-200 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-zinc-500 text-xs font-medium font-sans">Low Inventory Items</span>
            <div className={`p-2 rounded-xl ${dashboardStats.lowStockCount > 0 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-zinc-100 text-zinc-500'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className={`text-2xl font-bold font-sans tracking-tight ${dashboardStats.lowStockCount > 0 ? 'text-red-500' : 'text-zinc-900'}`}>
              {dashboardStats.lowStockCount} <span className="text-zinc-400 font-normal text-xs">SKUs</span>
            </span>
            <div className="text-[10px] text-zinc-400 mt-1 font-sans">
              {dashboardStats.lowStockCount > 0 ? 'Restock immediately' : 'Inventory healthy'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Graph Panel */}
      <div className="bg-white p-5 rounded-3xl shadow-xs border border-zinc-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-sm font-bold font-sans text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>Financial Growth Curves</span>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full font-sans uppercase">Live Feed</span>
            </h3>
            <p className="text-zinc-500 text-xs font-sans mt-0.5 animate-fade-in">Comparing gross revenue trends to absolute cost profit margins.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-zinc-100 p-0.5 rounded-lg inline-flex border border-zinc-200" id="chart-visual-toggle">
              <button
                onClick={() => setChartType('line')}
                className={`px-3 py-1 rounded-md text-[10px] font-bold font-sans transition-all cursor-pointer ${
                  chartType === 'line' 
                    ? 'bg-white text-zinc-950 shadow-xs' 
                    : 'text-zinc-500 hover:text-zinc-850'
                }`}
                id="btn-chart-type-line"
              >
                Line Trend
              </button>
              <button
                onClick={() => setChartType('area')}
                className={`px-3 py-1 rounded-md text-[10px] font-bold font-sans transition-all cursor-pointer ${
                  chartType === 'area' 
                    ? 'bg-white text-zinc-950 shadow-xs' 
                    : 'text-zinc-500 hover:text-zinc-850'
                }`}
                id="btn-chart-type-area"
              >
                Area Volume
              </button>
            </div>

            <div className="flex items-center gap-3.5 text-[10px] font-mono font-bold border-l pl-3.5 border-zinc-200">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 block"></span>
                <span className="text-zinc-500">Revenue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-zinc-950 block"></span>
                <span className="text-zinc-700">Gross Profit</span>
              </div>
            </div>
          </div>
        </div>

        <div className="h-80 w-full" id="sales-growth-chart-container">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
              <LineChart data={salesHistoryData} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f4" />
                <XAxis dataKey="date" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e4e4e7', fontSize: '11px', fontFamily: 'monospace' }}
                  formatter={(value: any, name: any) => [`$${value}`, name === 'sales' ? 'Revenue' : 'Profit']}
                />
                <Line 
                  type="monotone" 
                  dataKey="sales" 
                  name="sales" 
                  stroke="#f59e0b" 
                  strokeWidth={3.5} 
                  dot={{ r: 4, strokeWidth: 2, fill: '#ffffff' }} 
                  activeDot={{ r: 6, strokeWidth: 0 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  name="profit" 
                  stroke="#09090b" 
                  strokeWidth={2.5} 
                  dot={{ r: 3, strokeWidth: 1.5, fill: '#ffffff' }} 
                  activeDot={{ r: 5, strokeWidth: 0 }} 
                />
              </LineChart>
            ) : (
              <AreaChart data={salesHistoryData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#09090b" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#09090b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f4" />
                <XAxis dataKey="date" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e4e4e7', fontSize: '11px', fontFamily: 'monospace' }}
                  formatter={(value: any, name: any) => [`$${value}`, name === 'sales' ? 'Revenue' : 'Profit']}
                />
                <Area type="monotone" dataKey="sales" name="sales" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="profit" name="profit" stroke="#09090b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Column Grid: Top Selling and Recent Activity Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div id="top-selling-panel" className="bg-white p-5 rounded-3xl shadow-xs border border-zinc-200">
          <div className="flex items-center justify-between mb-4 border-b border-zinc-100 pb-3">
            <h3 className="text-xs font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2 font-sans">
              <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" /> Best Selling Products
            </h3>
            <span className="text-zinc-500 text-[10px] font-mono leading-none">Completed sales basis</span>
          </div>

          <div className="space-y-4">
            {topProducts.length === 0 ? (
              <div className="text-center py-10 text-zinc-400 font-sans text-xs">
                No orders processed yet today. Launch the POS terminal to start!
              </div>
            ) : (
              topProducts.map((p, index) => {
                const colors = ['bg-amber-500', 'bg-zinc-800', 'bg-zinc-600', 'bg-zinc-400', 'bg-zinc-300'];
                return (
                  <div key={index} className="flex items-center gap-4">
                    <span className="font-mono text-xs font-bold text-zinc-400 w-4">#{index + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between items-center text-xs font-sans text-zinc-800 font-semibold mb-1">
                        <span>{p.name}</span>
                        <div className="font-mono text-[11px] text-zinc-500 flex gap-2">
                          <span>{p.quantity} sold</span>
                          <span className="text-zinc-900 font-bold">${p.revenue.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${colors[index] || 'bg-amber-400'} rounded-full`}
                          style={{ width: `${Math.min(100, (p.quantity / (topProducts[0]?.quantity || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Live POS Activity Feed */}
        <div id="activity-log-panel" className="bg-white p-5 rounded-3xl shadow-xs border border-zinc-200 flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-zinc-100 pb-3">
            <h3 className="text-xs font-black text-zinc-900 uppercase tracking-widest font-sans">
              Operations Control Ledger
            </h3>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[240px] pr-1">
            {logs.map((log) => {
              const badgeColors = {
                sale: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                inventory: 'bg-amber-50 text-amber-700 border-amber-100',
                system: 'bg-zinc-150 text-zinc-700 border-zinc-250',
                refund: 'bg-red-50 text-red-700 border-red-100'
              }[log.type];

              return (
                <div key={log.id} className="p-3 bg-zinc-50 rounded-xl border border-zinc-150 flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${badgeColors}`}>
                        {log.type}
                      </span>
                      <span className="font-sans font-semibold text-[11px] text-zinc-800">{log.action}</span>
                    </div>
                    {log.details && (
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{log.details}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-[9px] text-zinc-400 flex items-center gap-1">
                      {new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span className="text-[9px] text-zinc-500 font-sans block">{log.user}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
