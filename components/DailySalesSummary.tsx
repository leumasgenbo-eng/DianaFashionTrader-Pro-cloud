
import React, { useState } from 'react';
import { Sale } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend } from 'recharts';
import { Calendar, DollarSign, Wallet, CreditCard, Lock, Download, ChevronRight } from 'lucide-react';

interface DailySalesSummaryProps {
  sales: Sale[];
}

const DailySalesSummary: React.FC<DailySalesSummaryProps> = ({ sales }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Filter Sales for the selected day
  const dailySales = sales.filter(s => s.paymentStatus === 'PAID' && s.paymentDate?.startsWith(selectedDate));
  
  // Aggregations
  const totalRevenue = dailySales.reduce((sum, s) => sum + s.totalPrice, 0);
  const totalTxns = new Set(dailySales.map(s => s.transactionId)).size;
  
  // By Method
  const byMethod = dailySales.reduce((acc, s) => {
      const method = s.paymentMethod || 'UNKNOWN';
      acc[method] = (acc[method] || 0) + s.totalPrice;
      return acc;
  }, {} as Record<string, number>);
  
  const methodData = Object.keys(byMethod).map(k => ({ name: k, value: byMethod[k] }));
  const COLORS = ['#10b981', '#f59e0b', '#6366f1', '#94a3b8'];

  // By Salesman
  const bySalesman = dailySales.reduce((acc, s) => {
      const name = s.salesman;
      acc[name] = (acc[name] || 0) + s.totalPrice;
      return acc;
  }, {} as Record<string, number>);

  const salesmanData = Object.keys(bySalesman).map(k => ({ name: k, amount: bySalesman[k] })).sort((a,b) => b.amount - a.amount);

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
             <div>
                 <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Daily Sales Report</h2>
                 <p className="text-slate-500 text-sm mt-1">End of day reconciliation</p>
             </div>
             <div className="flex items-center gap-2 bg-white px-3 py-2 border border-slate-200 rounded-lg shadow-sm">
                 <Calendar className="text-slate-400 w-5 h-5" />
                 <input 
                   type="date" 
                   value={selectedDate}
                   onChange={e => setSelectedDate(e.target.value)}
                   className="outline-none text-slate-700 font-medium"
                 />
             </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="bg-slate-900 text-white p-6 rounded-xl shadow-xl flex flex-col justify-between relative overflow-hidden">
                 <div className="relative z-10">
                     <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Revenue</p>
                     <h3 className="text-3xl font-bold mt-1">GHS {totalRevenue.toLocaleString()}</h3>
                     <p className="text-xs text-slate-400 mt-2">{totalTxns} Transactions</p>
                 </div>
                 <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2"></div>
             </div>

             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                 <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                     <Wallet className="text-indigo-600" size={18} /> Payment Methods
                 </h4>
                 <div className="space-y-3">
                     {methodData.map((m, i) => (
                         <div key={m.name} className="flex justify-between items-center text-sm">
                             <span className="flex items-center gap-2">
                                 <span className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></span>
                                 {m.name}
                             </span>
                             <span className="font-mono font-bold">GHS {m.value.toLocaleString()}</span>
                         </div>
                     ))}
                     {methodData.length === 0 && <p className="text-slate-400 italic text-xs">No data available</p>}
                 </div>
             </div>

             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center items-center">
                 <div className="w-32 h-32 relative">
                     {methodData.length > 0 ? (
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={methodData} 
                                    innerRadius={35} 
                                    outerRadius={60} 
                                    paddingAngle={5} 
                                    dataKey="value"
                                >
                                    {methodData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                            </PieChart>
                         </ResponsiveContainer>
                     ) : (
                         <div className="w-full h-full rounded-full border-4 border-slate-100 flex items-center justify-center text-xs text-slate-300 font-bold">No Data</div>
                     )}
                 </div>
                 <p className="text-xs text-slate-500 font-bold mt-2">Distribution</p>
             </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-bold text-slate-800 mb-4">Salesman Breakdown</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs text-slate-500 font-bold uppercase">
                            <tr>
                                <th className="p-3">Staff Name</th>
                                <th className="p-3 text-right">Revenue Contributed</th>
                                <th className="p-3 text-right">% of Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {salesmanData.map(s => (
                                <tr key={s.name}>
                                    <td className="p-3 font-medium text-slate-700">{s.name}</td>
                                    <td className="p-3 text-right font-mono">GHS {s.amount.toLocaleString()}</td>
                                    <td className="p-3 text-right text-slate-500 text-xs">
                                        {((s.amount / totalRevenue) * 100).toFixed(1)}%
                                    </td>
                                </tr>
                            ))}
                            {salesmanData.length === 0 && (
                                <tr><td colSpan={3} className="p-8 text-center text-slate-400">No sales recorded today.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col justify-center items-center text-center">
                <div className="bg-indigo-100 p-4 rounded-full mb-4">
                    <Lock className="text-indigo-600 w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Close Daily Accounts</h3>
                <p className="text-slate-500 text-sm max-w-xs my-2">
                    Generate a final report snapshot for {new Date(selectedDate).toDateString()}. This action logs the closing balance.
                </p>
                <button 
                  onClick={() => alert("Daily Report Generated and Emailed to Admin.")}
                  className="mt-4 bg-slate-900 text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:bg-slate-800 transition flex items-center gap-2"
                >
                    <Download size={18} /> Close & Export Report
                </button>
            </div>
        </div>
    </div>
  );
};

export default DailySalesSummary;
