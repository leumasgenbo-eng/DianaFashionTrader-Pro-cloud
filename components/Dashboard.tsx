
import React from 'react';
import { Product, Sale } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ComposedChart, Legend } from 'recharts';
import { TrendingUp, Package, DollarSign, Calendar, Award, Download } from 'lucide-react';
import { exportPerformanceData } from '../services/excelService';

interface DashboardProps {
  products: Product[];
  sales: Sale[];
}

const Dashboard: React.FC<DashboardProps> = ({ products, sales }) => {
  // Only count confirmed payments for dashboard stats
  const paidSales = sales.filter(s => s.paymentStatus === 'PAID');

  // Calculate Totals
  const totalStockValue = products.reduce((acc, p) => acc + (p.sellingPrice * p.stockQuantity), 0);
  const totalSalesRevenue = paidSales.reduce((acc, s) => acc + s.totalPrice, 0);
  const totalItemsSold = paidSales.reduce((acc, s) => acc + s.quantity, 0);

  // Prepare Chart Data (Last 7 days sales)
  const getLast7DaysData = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      
      const salesForDay = paidSales.filter(s => s.date.startsWith(dayStr));
      const total = salesForDay.reduce((acc, s) => acc + s.totalPrice, 0);
      
      days.push({
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        sales: total
      });
    }
    return days;
  };

  const chartData = getLast7DaysData();

  // Calculate Salesman Performance
  const salesmanStats = paidSales.reduce((acc, curr) => {
    const name = curr.salesman.trim() || 'Unknown';
    if (!acc[name]) {
      acc[name] = { name, revenue: 0, count: 0 };
    }
    acc[name].revenue += curr.totalPrice;
    acc[name].count += 1;
    return acc;
  }, {} as Record<string, { name: string; revenue: number; count: number }>);

  const salesmanData = (Object.values(salesmanStats) as { name: string; revenue: number; count: number }[]).sort((a, b) => b.revenue - a.revenue);

  const handleExportPerformance = () => {
    exportPerformanceData(salesmanData, `Salesman_Performance_AllTime_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="card-hover p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Total Revenue (Paid)</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-1">GHS {totalSalesRevenue.toLocaleString()}</h3>
            </div>
            <div className="p-4 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl shadow-inner">
              <TrendingUp className="w-7 h-7 text-green-700" />
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="card-hover p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Inventory Value</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-1">GHS {totalStockValue.toLocaleString()}</h3>
            </div>
            <div className="p-4 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl shadow-inner">
              <DollarSign className="w-7 h-7 text-blue-700" />
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="card-hover p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Items Sold</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-1">{totalItemsSold}</h3>
            </div>
            <div className="p-4 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl shadow-inner">
              <Package className="w-7 h-7 text-purple-700" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-hover p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600"><TrendingUp className="w-4 h-4" /></span>
            Sales Trend (Last 7 Days)
          </h3>
          <div className="w-full" style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{stroke: '#e2e8f0', strokeWidth: 2}}
                />
                <Line type="monotone" dataKey="sales" stroke="#4f46e5" strokeWidth={4} dot={{r: 4, strokeWidth: 2, fill: '#fff'}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-hover p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="p-1.5 bg-orange-100 rounded-lg text-orange-600"><Award className="w-4 h-4" /></span>
              Salesman Performance
            </h3>
            {salesmanData.length > 0 && (
              <button 
                onClick={handleExportPerformance}
                className="text-slate-400 hover:text-indigo-600 p-1.5 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Export Performance Data"
              >
                <Download size={18} />
              </button>
            )}
          </div>
          <div className="w-full" style={{ height: 300 }}>
             {salesmanData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                  <p>No confirmed sales data.</p>
                </div>
             ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={salesmanData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} interval={0} axisLine={false} tickLine={false} dy={10} />
                  <YAxis yAxisId="left" orientation="left" stroke="#4f46e5" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#f97316" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    cursor={{fill: '#f8fafc'}}
                  />
                  <Legend wrapperStyle={{paddingTop: '20px'}} />
                  <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={24} />
                  <Line yAxisId="right" type="monotone" dataKey="count" name="Txns" stroke="#f97316" strokeWidth={3} dot={{r: 4, fill: '#fff', strokeWidth: 2}} />
                </ComposedChart>
              </ResponsiveContainer>
             )}
          </div>
        </div>
      </div>

      <div className="card-hover p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
             <span className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600"><Calendar className="w-4 h-4" /></span>
            Recent Confirmed Transactions
          </h3>
          <div className="overflow-x-auto rounded-lg border border-slate-100">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 font-semibold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Item</th>
                  <th className="px-6 py-4">Salesman</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...paidSales].reverse().slice(0, 8).map((sale) => (
                  <tr key={sale.id} className="bg-white hover:bg-slate-50/80 transition-colors duration-150">
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap font-medium">{new Date(sale.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">{sale.productName}</td>
                    <td className="px-6 py-4 text-slate-500">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        {sale.salesman}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-emerald-600 font-bold text-right tracking-tight">GHS {sale.totalPrice.toFixed(2)}</td>
                  </tr>
                ))}
                {paidSales.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">No confirmed sales yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
    </div>
  );
};

export default Dashboard;
