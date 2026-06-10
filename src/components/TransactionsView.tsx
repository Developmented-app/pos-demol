import React, { useState, useMemo } from 'react';
import { 
  ReceiptText, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  RotateCcw, 
  Calendar, 
  CreditCard, 
  DollarSign, 
  Smartphone, 
  User, 
  Hash,
  AlertCircle,
  FileText,
  Printer
} from 'lucide-react';
import { Order, PaymentMethod, OrderStatus, Product, Category, SystemSettings } from '../types';

interface TransactionsViewProps {
  orders: Order[];
  products: Product[];
  categories: Category[];
  onRefundOrder: (orderId: string) => void;
  settings?: SystemSettings;
}

export default function TransactionsView({ orders, products, categories, onRefundOrder, settings }: TransactionsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Completed' | 'Refunded'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | PaymentMethod>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Stats summaries
  const txnStats = useMemo(() => {
    const totalCount = orders.length;
    const completed = orders.filter(o => o.status === 'Completed');
    const refunded = orders.filter(o => o.status === 'Refunded');
    
    const grossSum = completed.reduce((sum, o) => sum + o.total, 0);
    const refundSum = refunded.reduce((sum, o) => sum + o.total, 0);
    const avgTicket = completed.length > 0 ? (grossSum / completed.length) : 0;

    return {
      totalCount,
      completedCount: completed.length,
      refundedCount: refunded.length,
      grossRevenue: grossSum,
      refundedVolume: refundSum,
      avgTicket
    };
  }, [orders]);

  // Toggle rows accordion
  const toggleRow = (orderId: string) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  };

  // Filter systems
  const filteredOrders = useMemo(() => {
    return orders.filter(ord => {
      const matchesSearch = ord.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (ord.customerName && ord.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            ord.cashierName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || ord.status === statusFilter;
      const matchesPayment = paymentFilter === 'all' || ord.paymentMethod === paymentFilter;

      let matchesCategory = true;
      if (categoryFilter !== 'all') {
        matchesCategory = ord.items.some(item => {
          const prod = products.find(p => p.id === item.productId);
          return prod && prod.category === categoryFilter;
        });
      }

      return matchesSearch && matchesStatus && matchesPayment && matchesCategory;
    });
  }, [orders, searchQuery, statusFilter, paymentFilter, categoryFilter, products]);

  // Print receipt handler using lightweight thermal style framing
  const handlePrintReceipt = (order: Order) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const formattedDate = new Date(order.timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });

    const itemsRows = order.items.map(item => {
      const netPrice = item.price * (1 - item.discountPercent / 150);
      return `
        <tr>
          <td style="padding: 6px 0; text-align: left; vertical-align: top;">
            <div style="font-weight: bold; color: #000;">${item.name}</div>
            ${item.discountPercent > 0 ? `<div style="font-size: 9px; color: #16a34a; font-weight: bold;">Discount: ${item.discountPercent}%</div>` : ''}
          </td>
          <td style="padding: 6px 0; text-align: center; vertical-align: top; color: #000;">${item.quantity}</td>
          <td style="padding: 6px 0; text-align: right; vertical-align: top; color: #000;">$${item.price.toFixed(2)}</td>
          <td style="padding: 6px 0; text-align: right; vertical-align: top; font-weight: bold; color: #000;">$${(netPrice * item.quantity).toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    const discountRow = order.discountAmount > 0 
      ? `
        <div style="display: flex; justify-content: space-between; padding: 2px 0; color: #16a34a; font-weight: bold;">
          <span>Promo Discount:</span>
          <span>-$${order.discountAmount.toFixed(2)}</span>
        </div>`
      : '';

    const isRefunded = order.status === 'Refunded';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${order.orderNumber}</title>
        <style>
          @media print {
            body { margin: 0; padding: 10px; }
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 74mm;
            margin: 0 auto;
            padding: 15px;
            font-size: 11px;
            line-height: 1.4;
            color: #000;
          }
          .text-center { text-align: center; }
          .header { margin-bottom: 12px; }
          .store-name { font-size: 16px; font-weight: bold; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.5px; }
          .store-subtitle { font-size: 10px; margin-bottom: 4px; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .meta-info { font-size: 10px; margin-bottom: 12px; }
          .meta-row { display: flex; justify-content: space-between; padding: 1px 0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
          th { border-bottom: 1px dashed #000; padding: 5px 0; text-align: left; font-size: 10px; text-transform: uppercase; }
          .totals-section { font-size: 11px; padding: 4px 0; }
          .totals-row { display: flex; justify-content: space-between; padding: 2px 0; }
          .grand-total { font-size: 13px; font-weight: bold; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 5px 0; margin-top: 4px; }
          .footer { margin-top: 20px; font-size: 10px; line-height: 1.3; }
          .badge {
            display: inline-block;
            border: 1px solid #000;
            padding: 2px 6px;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 10px;
            margin: 5px 0;
            letter-spacing: 1px;
          }
        </style>
      </head>
      <body>
        <div class="text-center header">
          <div class="store-name">${(settings?.storeName ?? 'BREW & BITE CAFE').toUpperCase()}</div>
          <div class="store-subtitle">POS Registry Terminal #3</div>
          <div style="font-size: 9px;">${settings?.storeAddress ?? '100 Espresso Drive, Coffee City'}</div>
          <div style="font-size: 9px;">Tel: ${settings?.storeTelephone ?? '(555) 767-2233'}</div>
          ${isRefunded ? '<div class="badge">** REFUNDED TRANSACTION **</div>' : '<div class="badge">OFFICIAL SALES RECEIPT</div>'}
        </div>

        <div class="divider"></div>

        <div class="meta-info">
          <div class="meta-row">
            <span>RECEIPT NO:</span>
            <span style="font-weight: bold;">${order.orderNumber}</span>
          </div>
          <div class="meta-row">
            <span>DATE/TIME:</span>
            <span>${formattedDate}</span>
          </div>
          <div class="meta-row">
            <span>CASHIER:</span>
            <span>${order.cashierName}</span>
          </div>
          <div class="meta-row">
            <span>TABLE / SOURCE:</span>
            <span>${order.tableNumber || 'Takeaway'}</span>
          </div>
          <div class="meta-row">
            <span>PAYMENT METHOD:</span>
            <span>${order.paymentMethod}</span>
          </div>
        </div>

        <table style="font-size: 11px;">
          <thead>
            <tr>
              <th style="width: 50%;">ITEM</th>
              <th style="width: 10%; text-align: center;">QTY</th>
              <th style="width: 20%; text-align: right;">PRICE</th>
              <th style="width: 20%; text-align: right;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div class="divider"></div>

        <div class="totals-section">
          <div class="totals-row">
            <span>Subtotal:</span>
            <span>$${order.subtotal.toFixed(2)}</span>
          </div>
          ${discountRow}
          <div class="totals-row">
            <span>Tax (${(settings?.taxRatePercent ?? 8.0).toFixed(1)}%):</span>
            <span>$${order.tax.toFixed(2)}</span>
          </div>
          <div class="totals-row grand-total">
            <span>${isRefunded ? 'TOTAL REFUNDED:' : 'AMOUNT PAID:'}</span>
            <span>$${order.total.toFixed(2)}</span>
          </div>
        </div>

        <div class="divider"></div>

        <div class="text-center footer">
          <div style="font-weight: bold; margin-bottom: 2px;">THANK YOU FOR YOUR PATRONAGE!</div>
          <div style="font-size: 9px;">Please retain this customer copy.</div>
          <div style="font-size: 8px; margin-top: 8px; color: #555;">Brew & Bite POS v2.4.1</div>
        </div>

        <script>
          setTimeout(() => {
            window.focus();
            window.print();
          }, 250);
        </script>
      </body>
      </html>
    `;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 60000);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-50 p-6 md:p-8 space-y-6" id="transactions-ledger-panel">
      {/* Header */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold font-sans text-zinc-900 tracking-tight flex items-center gap-2">
          <ReceiptText className="w-6 h-6 text-amber-500" /> Administrative Invoice Ledger
        </h2>
        <p className="text-zinc-500 text-xs font-sans mt-0.5">Audit transaction sessions, search active receipts, and issue cash drawer refunds.</p>
      </div>

      {/* Stats summaries */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-zinc-200">
          <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-zinc-400 block">Gross Invoiced Receipts</span>
          <div className="text-xl font-bold text-zinc-900 font-mono mt-1">${txnStats.grossRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          <span className="text-[10px] text-zinc-500 font-sans mt-0.5 block">From {txnStats.completedCount} processed checks</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-zinc-200">
          <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-red-400 block">Total Capital Refunded</span>
          <div className="text-xl font-bold text-red-600 font-mono mt-1">-${txnStats.refundedVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          <span className="text-[10px] text-zinc-500 font-sans mt-0.5 block">Approved from {txnStats.refundedCount} invoices</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-zinc-200">
          <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-zinc-400 block">AOP (Avg Check size)</span>
          <div className="text-xl font-bold text-zinc-900 font-mono mt-1">${txnStats.avgTicket.toFixed(2)}</div>
          <span className="text-[10px] text-zinc-500 font-sans mt-0.5 block">Completed status basis</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-zinc-200">
          <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-zinc-400 block">Central Sales Ledger</span>
          <div className="text-xl font-bold text-amber-600 font-sans mt-1">{txnStats.totalCount} <span className="text-zinc-400 text-xs font-normal">Invoices</span></div>
          <span className="text-[10px] text-emerald-600 font-sans mt-0.5 font-bold block">100% cloud backup locked</span>
        </div>
      </div>

      {/* Filter and control bars */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200 flex flex-col xl:flex-row justify-between gap-4">
        <div className="flex-1 flex flex-col md:flex-row gap-3">
          {/* Query Filter */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-zinc-400" />
            </span>
            <input
              type="text"
              placeholder="Search via TX number, cashier alias, customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-sans text-zinc-800 focus:outline-none focus:border-amber-500/80"
            />
          </div>

          {/* Product Category Filter */}
          <div className="md:w-48 shrink-0">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-sans text-zinc-700 focus:outline-none cursor-pointer"
              id="filter-transactions-category"
            >
              <option value="all">All Category Sections</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.slug}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="md:w-44 shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-sans text-zinc-700 focus:outline-none"
            >
              <option value="all">All statuses</option>
              <option value="Completed">Completed bills</option>
              <option value="Refunded">Refunded tickets</option>
            </select>
          </div>

          {/* Payment Method filter */}
          <div className="md:w-44 shrink-0">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-sans text-zinc-700 focus:outline-none"
            >
              <option value="all">All Pay Gateways</option>
              <option value="Cash">Cash register</option>
              <option value="Card">Terminal Card</option>
              <option value="Mobile Pay">Mobile NFC</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table grid accordion listing */}
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-mono uppercase text-zinc-400 tracking-wider">
                <th className="py-4 px-6 w-10"></th>
                <th className="py-4 px-4">TX ID</th>
                <th className="py-4 px-4">Timestamp</th>
                <th className="py-4 px-4">Source / Table</th>
                <th className="py-4 px-4">Payment</th>
                <th className="py-4 px-4 text-center">Status</th>
                <th className="py-4 px-6 text-right">Invoiced Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-150 text-xs font-sans text-zinc-800">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400 font-sans">
                    No matching invoices recorded in system logs.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isExpanded = expandedOrderId === order.id;
                  const isRefunded = order.status === 'Refunded';

                  // Select payment method icon helper
                  const PaymentIcon = {
                    Cash: DollarSign,
                    Card: CreditCard,
                    'Mobile Pay': Smartphone,
                    'Split': CreditCard
                  }[order.paymentMethod] || FileText;

                  return (
                    <React.Fragment key={order.id}>
                      {/* Standard Table Row info */}
                      <tr 
                        onClick={() => toggleRow(order.id)}
                        className={`hover:bg-zinc-50/50 cursor-pointer transition-colors ${isExpanded ? 'bg-zinc-50/30' : ''}`}
                      >
                        <td className="py-4 px-6 text-center select-none">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-zinc-400 hover:text-zinc-700" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-zinc-400 hover:text-zinc-700" />
                          )}
                        </td>

                        {/* Transaction ID */}
                        <td className="py-4 px-4 font-mono text-[11px] font-semibold text-zinc-900 uppercase">
                          {order.orderNumber}
                        </td>

                        {/* Date stamp */}
                        <td className="py-4 px-4 text-zinc-500 font-sans font-medium">
                          {new Date(order.timestamp).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </td>

                        {/* Customer details / Table */}
                        <td className="py-4 px-4">
                          <div className="font-semibold text-zinc-800">{order.tableNumber || 'Takeaway'}</div>
                          {order.customerName && (
                            <div className="text-[10px] text-zinc-400 mt-0.5">{order.customerName}</div>
                          )}
                        </td>

                        {/* Payment */}
                        <td className="py-4 px-4">
                          <span className="flex items-center gap-1.5 text-zinc-650 font-medium font-sans">
                            <PaymentIcon className="w-4 h-4 text-zinc-450 shrink-0" />
                            {order.paymentMethod}
                          </span>
                        </td>

                        {/* Status badge */}
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            isRefunded 
                              ? 'bg-red-50 text-red-600 border border-red-150' 
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-150'
                          }`}>
                            {order.status}
                          </span>
                        </td>

                        {/* Total receipt total */}
                        <td className="py-4 px-6 text-right font-mono font-bold text-[13px] text-zinc-900">
                          {isRefunded ? '-' : ''}${order.total.toFixed(2)}
                        </td>
                      </tr>

                      {/* Expandable Accordion Specific details */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="bg-zinc-50 px-8 py-5 border-t border-b border-zinc-150">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 leading-normal font-sans text-xs">
                              
                              {/* Left specs detail list: items */}
                              <div className="lg:col-span-8 space-y-3">
                                <h4 className="font-sans font-bold text-zinc-800 text-[11px] uppercase tracking-wider block mb-2">Itemized purchase details</h4>
                                <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden divide-y divide-zinc-100">
                                  {order.items.map((item, idx) => {
                                    const netPrice = item.price * (1 - item.discountPercent / 150);
                                    return (
                                      <div key={idx} className="p-3 flex justify-between items-center bg-white">
                                        <div>
                                          <span className="font-bold text-zinc-900">{item.quantity}x {item.name}</span>
                                          {item.discountPercent > 0 && (
                                            <span className="ml-2 inline-block px-1.5 py-0.5 bg-emerald-50 text-emerald-700 font-mono text-[9px] rounded font-bold">
                                              {item.discountPercent}% off item
                                            </span>
                                          )}
                                        </div>
                                        <div className="font-mono text-zinc-700 font-semibold">
                                          ${(netPrice * item.quantity).toFixed(2)}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Right specs detail list: finance breakdown and cash actions */}
                              <div className="lg:col-span-4 bg-white p-4 rounded-2xl border border-zinc-200 flex flex-col justify-between">
                                <div className="space-y-2">
                                  <h4 className="font-black text-zinc-800 text-[10px] uppercase tracking-wider block mb-1">Financial Receipt Invoice</h4>
                                  <div className="space-y-1.5 font-sans text-zinc-600 text-[11px]">
                                    <div className="flex justify-between">
                                      <span>Check Subtotal:</span>
                                      <span className="font-mono">${order.subtotal.toFixed(2)}</span>
                                    </div>
                                    {order.discountAmount > 0 && (
                                      <div className="flex justify-between text-emerald-600">
                                        <span>Corporate promo savings:</span>
                                        <span className="font-mono">-${order.discountAmount.toFixed(2)}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between">
                                      <span>VAT / Service Tax (${(settings?.taxRatePercent ?? 8.0).toFixed(1)}%):</span>
                                      <span className="font-mono">${order.tax.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-zinc-90 w-full border-t border-zinc-150 pt-2 font-bold text-xs text-zinc-900">
                                      <span>Authorized Total:</span>
                                      <span className="font-mono">${order.total.toFixed(2)}</span>
                                    </div>
                                  </div>

                                  <div className="border-t border-dashed border-zinc-300 pt-2 font-mono text-[10px] text-zinc-400 space-y-0.5">
                                    <div>Served by Cashier: {order.cashierName}</div>
                                    <div>Log timestamp: {order.timestamp}</div>
                                  </div>
                                </div>

                                {/* Print & refund action button layout */}
                                <div className="pt-4 border-t border-zinc-150 mt-4 space-y-2">
                                  <button
                                    onClick={() => handlePrintReceipt(order)}
                                    className="w-full flex items-center justify-center gap-2 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold font-sans rounded-xl shadow-xs transition-all cursor-pointer"
                                    id={`btn-print-receipt-${order.id}`}
                                    title="Triggers thermal printable format copy"
                                  >
                                    <Printer className="w-3.5 h-3.5" /> Print Thermal Receipt
                                  </button>

                                  {!isRefunded && (
                                    <button
                                      onClick={() => {
                                        if (confirm(`Approve Cash drawer Refund request for Invoice ${order.orderNumber}? Item stocks of quantity will be re-credited to inventory catalogs immediately.`)) {
                                          onRefundOrder(order.id);
                                        }
                                      }}
                                      className="w-full flex items-center justify-center gap-2 py-2 bg-red-50 hover:bg-red-100 border border-red-150 text-red-700 text-xs font-bold font-sans rounded-xl transition-all cursor-pointer"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" /> Issue Drawer Refund
                                    </button>
                                  )}
                                </div>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
