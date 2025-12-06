
import React, { useState } from 'react';
import { Customer, Product } from '../types';
import { generateCustomerMessage } from '../services/geminiService';
import { UserPlus, MessageSquare, Loader2, Copy, ExternalLink, Award } from 'lucide-react';

interface CustomersProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  products: Product[]; // Passed to find recent/new products for AI context
}

const Customers: React.FC<CustomersProps> = ({ customers, setCustomers, products }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' });
  
  // AI Message State
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);
  const [loadingMessageFor, setLoadingMessageFor] = useState<string | null>(null);
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const customer: Customer = {
      id: crypto.randomUUID(),
      ...newCustomer,
      totalSpent: 0,
      lastPurchaseDate: new Date().toISOString(),
      preferences: []
    };
    setCustomers(prev => [customer, ...prev]);
    setShowAddForm(false);
    setNewCustomer({ name: '', phone: '', email: '' });
  };

  const handleGenerateMessage = async (customer: Customer) => {
    setLoadingMessageFor(customer.id);
    setGeneratedMessage(null);
    setActiveCustomer(customer);
    
    // Pass last 3 added products as "New Stock" context
    const recentProducts = products.slice(0, 3);
    
    const msg = await generateCustomerMessage(customer, recentProducts);
    setGeneratedMessage(msg);
    setLoadingMessageFor(null);
  };

  const getWhatsAppLink = (phone: string, text: string) => {
    // Basic cleaning of phone number to remove non-digits
    const cleanPhone = phone.replace(/\D/g, ''); 
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Customer Management</h2>
           <p className="text-slate-500 text-sm mt-1">Track loyalty and engage with customers</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className={`btn-primary flex items-center gap-2 ${showAddForm ? '!bg-slate-200 !text-slate-700 !shadow-none hover:!bg-slate-300' : ''}`}
        >
          {showAddForm ? 'Cancel' : <><UserPlus size={20} /> Add Customer</>}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddCustomer} className="card-hover p-6 animate-fade-in mb-6 border-l-4 border-l-indigo-500">
           <h3 className="font-bold text-lg mb-4 text-slate-800">New Customer Details</h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <input required placeholder="Full Name" className="input-primary" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} />
             <input required placeholder="Phone Number" className="input-primary" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} />
             <input placeholder="Email (Optional)" className="input-primary" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} />
           </div>
           <div className="flex justify-end mt-4">
               <button type="submit" className="bg-slate-800 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-900 transition shadow-lg">Save Customer</button>
           </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customers.map(customer => (
          <div key={customer.id} className="card-hover p-6 relative flex flex-col justify-between group">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-800 group-hover:text-indigo-600 transition-colors">{customer.name}</h3>
                  <p className="text-sm text-slate-500 font-medium">{customer.phone}</p>
                </div>
                <div className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                  <Award size={12} />
                  Score: {Math.floor(customer.totalSpent / 100)}
                </div>
              </div>
              
              <div className="space-y-3 text-sm text-slate-600 mb-6 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Spent</span>
                  <span className="font-bold text-slate-800">GHS {customer.totalSpent.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Last Visit</span>
                  <span className="font-medium">{new Date(customer.lastPurchaseDate).toLocaleDateString()}</span>
                </div>
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1 block">Recent Purchases</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {customer.preferences.slice(0, 4).map((pref, i) => (
                      <span key={i} className="bg-white border border-slate-200 text-slate-600 text-[11px] px-2 py-0.5 rounded-md font-medium">{pref}</span>
                    ))}
                    {customer.preferences.length === 0 && <span className="text-xs text-slate-400 italic">No data yet</span>}
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={() => handleGenerateMessage(customer)}
              disabled={loadingMessageFor === customer.id}
              className="w-full border border-emerald-200 text-emerald-700 bg-emerald-50 py-2.5 rounded-lg hover:bg-emerald-100 hover:shadow-sm transition-all flex justify-center items-center gap-2 text-sm font-bold mt-2"
            >
              {loadingMessageFor === customer.id ? <Loader2 className="animate-spin w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
              Draft WhatsApp Msg
            </button>
          </div>
        ))}
      </div>

      {/* Result Modal for AI Message */}
      {generatedMessage && activeCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl ring-1 ring-white/20">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800">
               <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                   <MessageSquare size={20} /> 
               </div>
               Draft Message for {activeCustomer.name}
            </h3>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-700 italic mb-6 text-sm leading-relaxed whitespace-pre-wrap shadow-inner">
              {generatedMessage}
            </div>
            <div className="flex flex-col gap-3">
              <a 
                href={getWhatsAppLink(activeCustomer.phone, generatedMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-[#25D366] text-white rounded-xl hover:bg-[#20bd5a] flex justify-center items-center gap-2 font-bold transition shadow-lg shadow-green-200 active:scale-95"
              >
                <ExternalLink className="w-5 h-5" /> Open in WhatsApp
              </a>
              
              <div className="flex gap-3">
                 <button 
                  onClick={() => {
                    navigator.clipboard.writeText(generatedMessage);
                    alert("Copied to clipboard!");
                  }}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 flex justify-center items-center gap-2 text-slate-600 font-semibold transition"
                >
                  <Copy className="w-4 h-4" /> Copy Text
                </button>
                <button 
                  onClick={() => setGeneratedMessage(null)} 
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 font-semibold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
