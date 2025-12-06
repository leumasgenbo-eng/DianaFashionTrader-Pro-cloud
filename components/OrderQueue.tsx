
import React, { useState, useEffect } from 'react';
import { Sale } from '../types';
import { ClipboardList, Clock, CheckCircle, Package, ArrowRight } from 'lucide-react';

interface OrderQueueProps {
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
}

interface OrderCardProps {
    group: Sale[];
    status: string;
    onUpdateStatus: (transactionId: string, status: 'READY' | 'COMPLETED') => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ group, status, onUpdateStatus }) => {
      const first = group[0];
      const itemCount = group.reduce((acc, item) => acc + item.quantity, 0);
      const total = group.reduce((acc, item) => acc + item.totalPrice, 0);

      return (
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-3 hover:shadow-md transition flex-shrink-0">
              <div className="flex justify-between items-start mb-2">
                  <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-1 rounded">#{first.transactionId?.slice(0,8)}</span>
                  <span className="text-[10px] text-slate-400 font-medium">{new Date(first.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
              </div>
              <h4 className="font-bold text-slate-800">{first.customerName}</h4>
              <p className="text-xs text-slate-500 mb-2">{itemCount} items • {first.salesman}</p>
              
              <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded mb-3 border border-slate-100 max-h-32 overflow-y-auto custom-scrollbar">
                  {group.map((item, i) => (
                      <div key={i} className="flex justify-between mb-1 last:mb-0">
                          <span className="truncate pr-2">{item.quantity}x {item.productName}</span>
                      </div>
                  ))}
              </div>

              {status === 'PROCESSING' && (
                  <button 
                    onClick={() => onUpdateStatus(first.transactionId!, 'READY')}
                    className="w-full bg-indigo-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                  >
                      Mark Ready <Package size={14} />
                  </button>
              )}
              {status === 'READY' && (
                  <button 
                    onClick={() => onUpdateStatus(first.transactionId!, 'COMPLETED')}
                    className="w-full bg-emerald-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 transition flex items-center justify-center gap-2"
                  >
                      Complete <CheckCircle size={14} />
                  </button>
              )}
              {status === 'PENDING' && (
                  <div className="text-center text-xs text-orange-500 font-bold bg-orange-50 py-2 rounded border border-orange-100">
                      Waiting for Payment
                  </div>
              )}
          </div>
      );
};

const OrderQueue: React.FC<OrderQueueProps> = ({ sales, setSales }) => {
  // Group sales by Transaction ID for the view
  const groupSales = (salesData: Sale[]) => {
    const groups: Record<string, Sale[]> = {};
    salesData.forEach(s => {
      const key = s.transactionId || 'UNKNOWN';
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return Object.values(groups).sort((a, b) => new Date(b[0].date).getTime() - new Date(a[0].date).getTime());
  };

  const pending = groupSales(sales.filter(s => s.paymentStatus === 'PENDING'));
  const processing = groupSales(sales.filter(s => s.paymentStatus === 'PAID' && s.fulfillmentStatus === 'PROCESSING'));
  const ready = groupSales(sales.filter(s => s.paymentStatus === 'PAID' && s.fulfillmentStatus === 'READY'));
  const completed = groupSales(sales.filter(s => s.paymentStatus === 'PAID' && s.fulfillmentStatus === 'COMPLETED')).slice(0, 20); // Show last 20

  const updateStatus = (transactionId: string, status: 'READY' | 'COMPLETED') => {
      setSales(prev => prev.map(s => {
          if (s.transactionId === transactionId) {
              return { ...s, fulfillmentStatus: status };
          }
          return s;
      }));
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col overflow-hidden bg-slate-50 p-1">
        <div className="mb-4 flex-shrink-0">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                <ClipboardList className="text-indigo-600" /> Order Fulfillment Queue
            </h2>
            <p className="text-sm text-slate-500">Track orders from payment to handover.</p>
        </div>
        
        {/* Kanban Board Container */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 overflow-hidden min-h-0 pb-2">
            
            {/* Column 1: New / Pending Payment */}
            <div className="flex flex-col bg-slate-100/70 rounded-xl border border-slate-200 h-full overflow-hidden">
                <div className="p-3 border-b border-slate-200 bg-slate-100 flex-shrink-0">
                    <h3 className="font-bold text-slate-600 flex items-center gap-2 text-sm uppercase">
                        <span className="w-2 h-2 rounded-full bg-orange-500"></span> Pending Payment
                        <span className="ml-auto bg-white text-slate-600 px-2 py-0.5 rounded-full text-xs border border-slate-200 shadow-sm">{pending.length}</span>
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                    {pending.map(g => <OrderCard key={g[0].transactionId} group={g} status="PENDING" onUpdateStatus={updateStatus} />)}
                    {pending.length === 0 && <div className="text-center text-xs text-slate-400 italic mt-4">No pending orders</div>}
                </div>
            </div>

            {/* Column 2: Processing (Paid) */}
            <div className="flex flex-col bg-indigo-50/60 rounded-xl border border-indigo-100 h-full overflow-hidden">
                <div className="p-3 border-b border-indigo-100 bg-indigo-50 flex-shrink-0">
                    <h3 className="font-bold text-indigo-900 flex items-center gap-2 text-sm uppercase">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Processing
                        <span className="ml-auto bg-white text-indigo-800 px-2 py-0.5 rounded-full text-xs border border-indigo-100 shadow-sm">{processing.length}</span>
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                     {processing.map(g => <OrderCard key={g[0].transactionId} group={g} status="PROCESSING" onUpdateStatus={updateStatus} />)}
                     {processing.length === 0 && <div className="text-center text-xs text-indigo-300 italic mt-4">Queue empty</div>}
                </div>
            </div>

            {/* Column 3: Ready for Pickup */}
            <div className="flex flex-col bg-emerald-50/60 rounded-xl border border-emerald-100 h-full overflow-hidden">
                <div className="p-3 border-b border-emerald-100 bg-emerald-50 flex-shrink-0">
                    <h3 className="font-bold text-emerald-900 flex items-center gap-2 text-sm uppercase">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Ready for Pickup
                        <span className="ml-auto bg-white text-emerald-800 px-2 py-0.5 rounded-full text-xs border border-emerald-100 shadow-sm">{ready.length}</span>
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                     {ready.map(g => <OrderCard key={g[0].transactionId} group={g} status="READY" onUpdateStatus={updateStatus} />)}
                     {ready.length === 0 && <div className="text-center text-xs text-emerald-300 italic mt-4">Nothing ready</div>}
                </div>
            </div>

             {/* Column 4: Completed */}
             <div className="flex flex-col bg-slate-50 rounded-xl border border-slate-200 h-full overflow-hidden">
                <div className="p-3 border-b border-slate-200 bg-slate-50 flex-shrink-0">
                    <h3 className="font-bold text-slate-500 flex items-center gap-2 text-sm uppercase">
                        <span className="w-2 h-2 rounded-full bg-slate-400"></span> Recently Completed
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar opacity-75 hover:opacity-100 transition-opacity">
                     {completed.map(g => <OrderCard key={g[0].transactionId} group={g} status="COMPLETED" onUpdateStatus={updateStatus} />)}
                     {completed.length === 0 && <div className="text-center text-xs text-slate-300 italic mt-4">History empty</div>}
                </div>
            </div>
        </div>

        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(0,0,0,0.05);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: rgba(156, 163, 175, 0.4);
            border-radius: 20px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background-color: rgba(156, 163, 175, 0.7);
          }
        `}</style>
    </div>
  );
};

export default OrderQueue;
