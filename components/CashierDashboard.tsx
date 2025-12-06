
import React, { useState } from 'react';
import { Product, Sale, PaymentMethod, User } from '../types';
import { Search, CreditCard, Banknote, Calendar, CheckCircle, XCircle, Clock, Receipt, RefreshCcw, Smartphone, ShoppingCart, ArrowRight, Printer, PackageCheck } from 'lucide-react';

interface CashierDashboardProps {
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  currentUser: User;
}

const CashierDashboard: React.FC<CashierDashboardProps> = ({ sales, setSales, currentUser }) => {
  const [searchCode, setSearchCode] = useState('');
  const [activeTab, setActiveTab] = useState<'PENDING' | 'PICKUP' | 'LOGS'>('PENDING');
  const [processingTransactionId, setProcessingTransactionId] = useState<string | null>(null);
  const [showReceipt, setShowReceipt] = useState<string | null>(null); // Transaction ID for receipt modal
  
  // Helper to group sales by transaction ID
  const groupSales = (salesData: Sale[]) => {
    const groups: Record<string, Sale[]> = {};
    salesData.forEach(s => {
      const key = s.transactionId || 'UNKNOWN';
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return Object.values(groups).sort((a, b) => new Date(b[0].date).getTime() - new Date(a[0].date).getTime());
  };

  // Group Pending Payments
  const pendingGroups = groupSales(sales.filter(s => s.paymentStatus === 'PENDING'));
  
  // Group Pickup Ready (Paid but not Completed)
  const pickupGroups = groupSales(sales.filter(s => s.paymentStatus === 'PAID' && s.fulfillmentStatus !== 'COMPLETED'));
  
  // Group History
  const logGroups = groupSales(sales.filter(s => s.paymentStatus === 'PAID' && s.fulfillmentStatus === 'COMPLETED'));
  
  // Filter Logic
  const filteredPending = pendingGroups.filter(group => group[0].transactionId?.toUpperCase().includes(searchCode.toUpperCase()));
  const filteredPickup = pickupGroups.filter(group => group[0].transactionId?.toUpperCase().includes(searchCode.toUpperCase()));
  const filteredLogs = logGroups.filter(group => group[0].transactionId?.toUpperCase().includes(searchCode.toUpperCase()));

  const handlePayment = (transactionId: string | undefined, method: PaymentMethod) => {
      if (!transactionId) return;
      
      if(confirm(`Confirm payment via ${method}?`)) {
          const now = new Date().toISOString();
          setSales(prev => prev.map(s => {
              if (s.transactionId === transactionId) {
                  return {
                      ...s,
                      paymentStatus: 'PAID',
                      paymentMethod: method,
                      paymentDate: now,
                      cashierName: currentUser.name,
                      fulfillmentStatus: 'PROCESSING' // Move to Queue
                  };
              }
              return s;
          }));
          setProcessingTransactionId(null);
          setSearchCode('');
          setShowReceipt(transactionId); // Show pickup receipt
      }
  };

  const handlePickup = (transactionId: string | undefined) => {
      if (!transactionId) return;
      if (confirm("Confirm customer has picked up order?")) {
          setSales(prev => prev.map(s => {
              if (s.transactionId === transactionId) {
                  return { ...s, fulfillmentStatus: 'COMPLETED' };
              }
              return s;
          }));
          alert("Order marked as Completed.");
      }
  };

  const cancelOrder = (transactionId: string | undefined) => {
      if (!transactionId) return;
      if (confirm("Are you sure you want to CANCEL this order? Stock will need to be manually adjusted.")) {
           setSales(prev => prev.map(s => {
              if (s.transactionId === transactionId) {
                  return { ...s, paymentStatus: 'CANCELLED' };
              }
              return s;
          }));
      }
  };

  // Receipt Modal Logic
  const receiptGroup = showReceipt ? sales.filter(s => s.transactionId === showReceipt) : null;

  return (
    <div className="space-y-6 animate-fade-in">
       {/* Header */}
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
           <div>
               <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                   <Banknote className="text-emerald-600" /> Cashier Point
               </h1>
               <p className="text-slate-500 text-sm mt-1">
                   Session active. Logged in as <span className="font-bold text-slate-700">{currentUser.name}</span>
               </p>
           </div>
           
           <div className="w-full md:w-auto flex gap-2">
               <div className="relative flex-1 md:w-64">
                   <Search className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                   <input 
                     type="text" 
                     placeholder="Scan Transaction Code"
                     className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none font-mono uppercase"
                     value={searchCode}
                     onChange={e => setSearchCode(e.target.value)}
                   />
               </div>
           </div>
       </div>

       {/* Tabs */}
       <div className="flex gap-4 border-b border-slate-200 overflow-x-auto">
           <button 
             onClick={() => setActiveTab('PENDING')}
             className={`pb-3 px-4 text-sm font-bold transition border-b-2 whitespace-nowrap ${activeTab === 'PENDING' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
           >
               Pending Payments ({pendingGroups.length})
           </button>
           <button 
             onClick={() => setActiveTab('PICKUP')}
             className={`pb-3 px-4 text-sm font-bold transition border-b-2 whitespace-nowrap ${activeTab === 'PICKUP' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
           >
               Ready for Pickup ({pickupGroups.length})
           </button>
           <button 
             onClick={() => setActiveTab('LOGS')}
             className={`pb-3 px-4 text-sm font-bold transition border-b-2 whitespace-nowrap ${activeTab === 'LOGS' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
           >
               Completed Log
           </button>
       </div>

       {/* Pending Content */}
       {activeTab === 'PENDING' && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {filteredPending.map((group, idx) => {
                   const total = group.reduce((sum, item) => sum + item.totalPrice, 0);
                   const firstItem = group[0];
                   const itemCount = group.reduce((acc, item) => acc + item.quantity, 0);
                   
                   return (
                       <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition group">
                           <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                               <span className="font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 text-xs">
                                   #{firstItem.transactionId?.slice(0,8)}
                               </span>
                               <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                   <Clock size={12} /> {new Date(firstItem.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                               </span>
                           </div>
                           <div className="p-4 space-y-3">
                               <div className="flex justify-between items-start">
                                   <div>
                                       <p className="font-bold text-slate-800">{firstItem.customerName}</p>
                                       <p className="text-xs text-slate-500">Ref: {firstItem.salesman}</p>
                                   </div>
                                   <div className="text-right">
                                       <p className="text-2xl font-bold text-slate-800">GHS {total.toFixed(2)}</p>
                                       <p className="text-xs text-orange-500 font-bold uppercase">Pending</p>
                                   </div>
                               </div>
                               
                               <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm space-y-2">
                                   <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                        <ShoppingCart size={12} /> Cart Items ({itemCount})
                                   </div>
                                   {group.map((item, i) => (
                                       <div key={i} className="flex justify-between text-slate-600 text-xs border-b border-slate-200/50 pb-1 last:border-0 last:pb-0">
                                           <span className="truncate w-2/3"><span className="font-bold">{item.quantity}x</span> {item.productName}</span>
                                           <span className="font-mono">{item.totalPrice.toFixed(2)}</span>
                                       </div>
                                   ))}
                               </div>

                               {processingTransactionId === firstItem.transactionId ? (
                                   <div className="grid grid-cols-2 gap-2 mt-4 animate-fade-in">
                                       <button onClick={() => handlePayment(firstItem.transactionId, 'CASH')} className="flex items-center justify-center gap-2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm">
                                           <Banknote size={16} /> Cash
                                       </button>
                                       <button onClick={() => handlePayment(firstItem.transactionId, 'MOMO')} className="flex items-center justify-center gap-2 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-bold text-sm">
                                           <Smartphone size={16} /> MoMo
                                       </button>
                                       <button onClick={() => setProcessingTransactionId(null)} className="col-span-2 py-2 text-slate-500 text-xs hover:text-slate-700">Cancel Selection</button>
                                   </div>
                               ) : (
                                   <div className="flex gap-2 mt-2">
                                       <button 
                                         onClick={() => setProcessingTransactionId(firstItem.transactionId!)}
                                         className="flex-1 bg-slate-900 text-white py-2.5 rounded-lg font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-200 text-sm flex items-center justify-center gap-2"
                                       >
                                           Accept Payment <ArrowRight size={16} />
                                       </button>
                                       <button 
                                          onClick={() => cancelOrder(firstItem.transactionId)}
                                          className="px-3 rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50 transition"
                                          title="Cancel Order"
                                       >
                                           <XCircle size={18} />
                                       </button>
                                   </div>
                               )}
                           </div>
                       </div>
                   );
               })}
               {filteredPending.length === 0 && (
                   <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                       <Receipt size={48} className="mx-auto mb-3 opacity-20" />
                       <p>No pending payments found.</p>
                       <p className="text-sm">Scan a transaction code to get started.</p>
                   </div>
               )}
           </div>
       )}

       {/* Pickup Content */}
       {activeTab === 'PICKUP' && (
           <div className="space-y-4">
              <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex items-start gap-3">
                  <PackageCheck className="text-orange-500 w-5 h-5 mt-0.5" />
                  <div>
                      <h4 className="font-bold text-orange-800 text-sm">Pickup Verification</h4>
                      <p className="text-xs text-orange-700 mt-1">
                          When a customer arrives, ask for their Transaction Code. Verify it matches below, check their ID/Receipt, then mark as Picked Up.
                      </p>
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredPickup.map(group => {
                      const first = group[0];
                      return (
                          <div key={first.transactionId} className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center shadow-sm">
                              <div>
                                  <span className="font-mono font-bold text-lg text-slate-800">#{first.transactionId?.slice(0,8)}</span>
                                  <p className="text-sm font-bold text-slate-600">{first.customerName}</p>
                                  <p className="text-xs text-slate-400">Status: {first.fulfillmentStatus}</p>
                              </div>
                              <div className="flex gap-2">
                                  <button onClick={() => setShowReceipt(first.transactionId!)} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500">
                                      <Printer size={18} />
                                  </button>
                                  <button 
                                    onClick={() => handlePickup(first.transactionId)}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm shadow-sm"
                                  >
                                      Confirm Pickup
                                  </button>
                              </div>
                          </div>
                      )
                  })}
                  {filteredPickup.length === 0 && <p className="text-slate-400 p-8 text-center col-span-full">No orders waiting for pickup.</p>}
              </div>
           </div>
       )}

       {/* Logs Content */}
       {activeTab === 'LOGS' && (
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-4">Transaction ID</th>
                            <th className="p-4">Date Paid</th>
                            <th className="p-4">Customer</th>
                            <th className="p-4">Method</th>
                            <th className="p-4">Cashier</th>
                            <th className="p-4 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredLogs.map((group, idx) => {
                            const total = group.reduce((sum, item) => sum + item.totalPrice, 0);
                            const first = group[0];
                            return (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="p-4 font-mono text-slate-600">#{first.transactionId?.slice(0,8)}</td>
                                    <td className="p-4 text-slate-600">
                                        {first.paymentDate ? new Date(first.paymentDate).toLocaleString() : '-'}
                                    </td>
                                    <td className="p-4 font-bold text-slate-700">{first.customerName}</td>
                                    <td className="p-4">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 border border-slate-200">
                                            {first.paymentMethod}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-500">{first.cashierName || 'System'}</td>
                                    <td className="p-4 text-right font-bold text-emerald-600">GHS {total.toFixed(2)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filteredLogs.length === 0 && (
                    <div className="p-8 text-center text-slate-400">No payment history found.</div>
                )}
           </div>
       )}

       {/* Receipt Modal (Shared Logic for printing pickup slips) */}
       {showReceipt && receiptGroup && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div id="receipt-content" className="bg-white w-full max-w-sm mx-auto shadow-2xl rounded-xl overflow-hidden print:shadow-none print:w-full">
                    <div className="bg-emerald-600 text-white p-6 text-center print:bg-white print:text-black print:border-b print:border-black">
                        <h2 className="text-2xl font-bold tracking-tight">PICKUP SLIP</h2>
                        <p className="text-xs text-emerald-100 mt-1 uppercase print:text-black">D's Man-Ware</p>
                    </div>

                    <div className="p-6 bg-white space-y-4 print:p-0 print:pt-4">
                        <div className="text-center">
                            <p className="text-3xl font-mono font-bold text-slate-800 tracking-wider">#{receiptGroup[0].transactionId?.slice(0,8)}</p>
                            <p className="text-xs text-slate-400 mt-1">Transaction ID</p>
                        </div>

                        <div className="space-y-1 text-sm border-t border-b border-slate-100 py-4 my-4">
                            <p><span className="font-bold">Customer:</span> {receiptGroup[0].customerName}</p>
                            <p><span className="font-bold">Paid Via:</span> {receiptGroup[0].paymentMethod}</p>
                            <p><span className="font-bold">Date:</span> {new Date().toLocaleString()}</p>
                        </div>
                        
                        <div className="space-y-2">
                             <p className="text-xs font-bold uppercase text-slate-400">Items to Collect:</p>
                             {receiptGroup.map((item, i) => (
                                 <div key={i} className="flex justify-between text-sm">
                                     <span>{item.quantity}x {item.productName}</span>
                                 </div>
                             ))}
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-3 no-print">
                        <button onClick={() => window.print()} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm">
                            <Printer size={18} /> Print Slip
                        </button>
                        <button onClick={() => setShowReceipt(null)} className="w-full py-3 border border-slate-200 bg-white text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition">
                            Close
                        </button>
                    </div>
                </div>
            </div>
       )}
    </div>
  );
};

export default CashierDashboard;
