import React, { useState, useEffect } from 'react';
import { Product, Sale, Customer, StockHistoryEntry, User } from '../types';
import { saveSale, saveSales, saveProduct, saveProducts } from '../services/dataService';
import { ShoppingCart, Calendar, RotateCcw, X, CheckCircle, TrendingUp, Percent, Award, Plus, Trash2, Receipt, Wallet, Settings, Download, Printer, Share2, Lock, ArrowRight, AlertCircle, Phone, Search, XCircle } from 'lucide-react';
import { exportPerformanceData } from '../services/excelService';

interface SalesLedgerProps {
  products: Product[];
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  customers: Customer[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  updateCustomerSpend: (customerId: string, amount: number, products: Product[]) => void;
  currentUser: User;
}

interface CartItem {
  product: Product;
  quantity: number;
  totalPrice: number;
  taxAmount: number;
}

interface ReceiptData {
  transactionId: string;
  date: string;
  customerName: string;
  salesman: string;
  items: CartItem[];
  totalAmount: number;
  totalTax: number;
}

const SalesLedger: React.FC<SalesLedgerProps> = ({ products, sales, setSales, customers, setProducts, updateCustomerSpend, currentUser }) => {
  // Form Inputs
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  
  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // View State (New: Pending Orders Tab)
  const [activeTab, setActiveTab] = useState<'LEDGER' | 'PENDING_VERIFICATION'>('LEDGER');
  
  // Filter for monthly view
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // Commission State with Persistence
  const [commissionRate, setCommissionRate] = useState(() => {
    const saved = localStorage.getItem('salesLedger_commissionRate');
    return saved ? parseFloat(saved) : 5;
  });

  // Settings Modal State
  const [showSettings, setShowSettings] = useState(false);
  const [tempCommissionRate, setTempCommissionRate] = useState('');

  useEffect(() => {
    localStorage.setItem('salesLedger_commissionRate', commissionRate.toString());
  }, [commissionRate]);

  // Return Modal State
  const [returnModal, setReturnModal] = useState<{ isOpen: boolean; sale: Sale | null }>({ isOpen: false, sale: null });
  const [returnQty, setReturnQty] = useState(1);

  // Confirmation & Receipt Modal State
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Derive selected product for UI validation
  const selectedProduct = products.find(p => p.id === selectedProductId);

  // --- Cart Logic ---

  const addToCart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    // Check if product is already in cart to validate total stock
    const existingItemIndex = cart.findIndex(item => item.product.id === selectedProduct.id);
    const currentCartQty = existingItemIndex >= 0 ? cart[existingItemIndex].quantity : 0;
    
    if (selectedProduct.stockQuantity < (currentCartQty + quantity)) {
      alert(`Insufficient stock! You have ${currentCartQty} in cart, and only ${selectedProduct.stockQuantity} available.`);
      return;
    }

    const unitPrice = selectedProduct.sellingPrice;
    const lineTotal = unitPrice * quantity;
    
    // Back-calculate Tax
    const taxRate = selectedProduct.taxRate || 0;
    const basePrice = lineTotal / (1 + (taxRate / 100));
    const lineTax = lineTotal - basePrice;

    if (existingItemIndex >= 0) {
      // Update existing line item
      const updatedCart = [...cart];
      updatedCart[existingItemIndex].quantity += quantity;
      updatedCart[existingItemIndex].totalPrice += lineTotal;
      updatedCart[existingItemIndex].taxAmount += lineTax;
      setCart(updatedCart);
    } else {
      // Add new line item
      setCart(prev => [...prev, {
        product: selectedProduct,
        quantity: quantity,
        totalPrice: lineTotal,
        taxAmount: lineTax
      }]);
    }

    // Reset input but keep customer selected for convenience
    setQuantity(1);
    setSelectedProductId('');
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    if (confirm("Are you sure you want to clear the current order?")) {
        setCart([]);
        setQuantity(1);
        setSelectedProductId('');
    }
  };

  // Calculate Cart Totals
  const cartTotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const cartTotalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // --- Checkout Logic ---

  const initiateCheckout = () => {
    if (cart.length === 0) return;
    setShowConfirmation(true);
  };

  const confirmTransaction = async () => {
    try {
        const transactionId = crypto.randomUUID();
        const shortId = transactionId.slice(0, 8).toUpperCase();
        const date = new Date().toISOString();
        const customer = customers.find(c => c.id === selectedCustomerId);
        const customerName = customer ? customer.name : 'Walk-in Customer';
        // Use the logged-in user's name
        const finalSalesman = currentUser.name || 'Staff'; 

        const newSales: Sale[] = [];
        const productsToUpdate = new Map<string, number>(); // productId -> qty sold
        const updatedProductList: Product[] = [];

        // 1. Prepare Sales Records - INITIALLY PENDING
        cart.forEach(item => {
        newSales.push({
            id: crypto.randomUUID(),
            transactionId: shortId,
            productId: item.product.id,
            productName: `${item.product.brand} ${item.product.type} (${item.product.color})`,
            quantity: item.quantity,
            totalPrice: item.totalPrice,
            taxAmount: item.taxAmount,
            salesman: finalSalesman,
            customerId: selectedCustomerId || null,
            customerName: customerName,
            date: date,
            returnedQuantity: 0,
            paymentStatus: 'PENDING', // Sent to Cashier
            fulfillmentStatus: 'NEW'
        });
        productsToUpdate.set(item.product.id, item.quantity);
        });

        // 2. Update Sales State
        setSales(prev => [...newSales, ...prev]);
        
        // SAVE SALES TO CLOUD
        await saveSales(newSales);

        // 3. Update Product Stock (Deduct immediately to reserve items)
        setProducts(prev => prev.map(p => {
        if (productsToUpdate.has(p.id)) {
            const soldQty = productsToUpdate.get(p.id)!;
            const newStock = p.stockQuantity - soldQty;
            
            // Add History Log
            const historyEntry: StockHistoryEntry = {
                id: crypto.randomUUID(),
                date: date,
                type: 'SALE',
                quantityChange: -soldQty,
                newStockLevel: newStock,
                note: `Order ${shortId} (Pending Payment)`
            };

            const updatedP = { 
                ...p, 
                stockQuantity: newStock,
                history: [...(p.history || []), historyEntry]
            };
            updatedProductList.push(updatedP);
            return updatedP;
        }
        return p;
        }));
        
        // SAVE PRODUCTS TO CLOUD
        await saveProducts(updatedProductList);

        // 4. Generate Receipt Data (Used as Payment Ticket)
        setLastReceipt({
        transactionId: shortId,
        date: date,
        customerName: customerName,
        salesman: finalSalesman,
        items: [...cart],
        totalAmount: cartTotal,
        totalTax: cart.reduce((acc, item) => acc + item.taxAmount, 0)
        });

        // 5. Reset UI & Show Receipt
        setShowConfirmation(false);
        setCart([]);
        setQuantity(1);
        setSelectedProductId('');
        setShowReceiptModal(true);
    } catch (error) {
        console.error("Transaction Error:", error);
        alert("An error occurred while processing the order. Please try again.");
    }
  };

  // Receipt Actions
  const handlePrintReceipt = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    if (!lastReceipt) return;
    
    let message = `*PAYMENT TICKET - D's Man-Ware*\n`;
    message += `------------------------\n`;
    message += `Ticket ID: *${lastReceipt.transactionId}*\n\n`;
    message += `Please pay at Cashier or MoMo: 0243504091\n\n`;
    message += `Date: ${new Date(lastReceipt.date).toLocaleString()}\n`;
    message += `Salesman: ${lastReceipt.salesman}\n`;
    message += `Customer: ${lastReceipt.customerName}\n\n`;
    message += `*TOTAL DUE: GHS ${lastReceipt.totalAmount.toFixed(2)}*`;

    const encodedMessage = encodeURIComponent(message);
    const targetNumber = '233243504091'; // Shop number
    const url = `https://wa.me/${targetNumber}?text=${encodedMessage}`;
      
    window.open(url, '_blank');
  };

  // --- Remote Payment Verification (Salesman confirms payment) ---
  const verifyPayment = async (transactionId: string) => {
      if(confirm(`Confirm that you have verified payment for Order #${transactionId}?`)) {
          const now = new Date().toISOString();
          let updatedSale: Sale | null = null;

          setSales(prev => prev.map(s => {
              if (s.transactionId === transactionId) {
                  updatedSale = {
                      ...s,
                      paymentStatus: 'PAID',
                      paymentMethod: 'MOMO', // Assumed if remote verification
                      paymentDate: now,
                      fulfillmentStatus: 'PROCESSING'
                  };
                  return updatedSale;
              }
              return s;
          }));
          
          if (updatedSale) {
              await saveSale(updatedSale);
          }

          alert("Order marked as PAID. Moved to Order Queue.");
      }
  };

  // --- Cancel Pending Transaction (Restock) ---
  const cancelPendingTransaction = async (transactionId: string) => {
      if(!confirm("Are you sure you want to cancel this pending order? This will restore the stock.")) return;

      const salesToCancel = sales.filter(s => s.transactionId === transactionId);
      const productsToSave: Product[] = [];
      const salesToSave: Sale[] = [];
      
      // 1. Restore Stock
      const productsToRestore = new Map<string, number>();
      salesToCancel.forEach(s => {
          const current = productsToRestore.get(s.productId) || 0;
          productsToRestore.set(s.productId, current + s.quantity);
      });

      setProducts(prev => prev.map(p => {
          if (productsToRestore.has(p.id)) {
              const qtyToRestore = productsToRestore.get(p.id)!;
              const newStock = p.stockQuantity + qtyToRestore;
              
              const historyEntry: StockHistoryEntry = {
                  id: crypto.randomUUID(),
                  date: new Date().toISOString(),
                  type: 'CANCELLATION',
                  quantityChange: qtyToRestore,
                  newStockLevel: newStock,
                  note: `Cancelled Order ${transactionId}`
              };

              const updatedP = { ...p, stockQuantity: newStock, history: [...(p.history || []), historyEntry] };
              productsToSave.push(updatedP);
              return updatedP;
          }
          return p;
      }));

      // 2. Mark Sales as Cancelled
      setSales(prev => prev.map(s => {
          if (s.transactionId === transactionId) {
              const updatedS = { ...s, paymentStatus: 'CANCELLED' as const };
              salesToSave.push(updatedS);
              return updatedS;
          }
          return s;
      }));

      // Save Changes to Cloud
      await saveProducts(productsToSave);
      await saveSales(salesToSave);
  };

  // --- Return Logic ---
  const openReturnModal = (sale: Sale) => {
    setReturnModal({ isOpen: true, sale });
    setReturnQty(1);
  };

  const handleReturnSubmit = async () => {
    const saleToReturn = returnModal.sale;
    if (!saleToReturn) return;

    const originalQty = saleToReturn.quantity;
    const alreadyReturned = saleToReturn.returnedQuantity || 0;
    const remainingQty = originalQty - alreadyReturned;

    if (returnQty > remainingQty) {
        alert("Cannot return more items than were sold or are remaining.");
        return;
    }
    if (returnQty <= 0) return;

    const pricePerUnit = saleToReturn.totalPrice / originalQty;
    const taxPerUnit = (saleToReturn.taxAmount || 0) / originalQty;
    const refundAmount = pricePerUnit * returnQty;
    const refundTax = taxPerUnit * returnQty;
    const date = new Date().toISOString();

    const refundTransaction: Sale = {
      id: crypto.randomUUID(),
      transactionId: saleToReturn.transactionId,
      productId: saleToReturn.productId,
      productName: `RETURN: ${saleToReturn.productName}`,
      quantity: -returnQty,
      totalPrice: -refundAmount,
      taxAmount: -refundTax,
      salesman: saleToReturn.salesman,
      customerId: saleToReturn.customerId,
      customerName: saleToReturn.customerName,
      date: date,
      returnedQuantity: 0,
      paymentStatus: 'PAID', // Refunds are immediate usually
      paymentMethod: 'CASH',
      fulfillmentStatus: 'COMPLETED'
    };

    let updatedOriginalSale: Sale | null = null;
    let updatedProduct: Product | null = null;

    setSales(prev => {
      const updatedSales = prev.map(s => {
        if (s.id === saleToReturn.id) {
            updatedOriginalSale = { ...s, returnedQuantity: (s.returnedQuantity || 0) + returnQty };
            return updatedOriginalSale;
        }
        return s;
      });
      return [refundTransaction, ...updatedSales];
    });

    setProducts(prev => prev.map(p => {
        if (p.id === saleToReturn.productId) {
            const newStock = p.stockQuantity + returnQty;
            const historyEntry: StockHistoryEntry = {
                id: crypto.randomUUID(),
                date: date,
                type: 'RETURN',
                quantityChange: returnQty,
                newStockLevel: newStock,
                note: `Return from ${saleToReturn.customerName}`
            };
            updatedProduct = { 
                ...p, 
                stockQuantity: newStock,
                history: [...(p.history || []), historyEntry]
            };
            return updatedProduct;
        }
        return p;
    }));

    if (saleToReturn.customerId && saleToReturn.paymentStatus === 'PAID') {
      updateCustomerSpend(saleToReturn.customerId, -refundAmount, []);
    }

    // Save to Cloud
    if (updatedOriginalSale) await saveSale(updatedOriginalSale);
    await saveSale(refundTransaction);
    if (updatedProduct) await saveProduct(updatedProduct);

    setReturnModal({ isOpen: false, sale: null });
  };

  // Logic to only show PAID sales for commissions
  const filteredSales = sales.filter(s => s.date.startsWith(filterMonth));
  // Only count PAID sales for stats
  const paidSales = filteredSales.filter(s => s.paymentStatus === 'PAID');
  
  // Pending Sales for Verification
  const pendingSales = sales.filter(s => s.paymentStatus === 'PENDING');
  // Group Pending by Transaction ID
  const pendingGroups: Sale[][] = (Object.values(pendingSales.reduce((acc, s) => {
      const key = s.transactionId || 'UNKNOWN';
      if (!acc[key]) acc[key] = [];
      acc[key].push(s);
      return acc;
  }, {} as Record<string, Sale[]>)) as Sale[][]).sort((a,b) => new Date(b[0].date).getTime() - new Date(a[0].date).getTime());

  const monthlyTotal = paidSales.reduce((sum, s) => sum + s.totalPrice, 0);

  const salesmanStats = paidSales.reduce((acc, sale) => {
    const name = sale.salesman.trim() || 'Unknown';
    if (!acc[name]) {
      acc[name] = { name, revenue: 0, count: 0 };
    }
    acc[name].revenue += sale.totalPrice;
    acc[name].count += 1;
    return acc;
  }, {} as Record<string, { name: string; revenue: number; count: number }>);

  const sortedSalesmen = (Object.values(salesmanStats) as { name: string; revenue: number; count: number }[]).sort((a, b) => b.revenue - a.revenue);
  
  const handleExportPerformance = () => {
    const exportData = sortedSalesmen.map(s => ({
        ...s,
        commission: s.revenue * (commissionRate / 100)
    }));
    exportPerformanceData(exportData, `Salesman_Performance_${filterMonth}`);
  };

  const openSettings = () => {
      setTempCommissionRate(commissionRate.toString());
      setShowSettings(true);
  };

  const saveSettings = () => {
      const rate = parseFloat(tempCommissionRate);
      setCommissionRate(isNaN(rate) ? 0 : rate);
      setShowSettings(false);
  };

  const canEditSettings = currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
      {/* POS / Cart Section */}
      <div className="lg:col-span-1 space-y-4">
        {/* Adjusted height to fit viewport and enable proper scrolling */}
        <div className="card-hover p-5 sticky top-4 flex flex-col h-[calc(100vh-2rem)] max-h-[850px]">
          <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2 flex-shrink-0">
            <span className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600"><ShoppingCart className="w-5 h-5" /></span>
            Order Booking
          </h3>
          
          <form onSubmit={addToCart} className="space-y-4 border-b border-slate-100 pb-4 flex-shrink-0">
            <div>
               <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Salesman & Customer</label>
               <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 font-medium">
                      <Lock size={12} className="text-slate-400" />
                      {currentUser.name}
                  </div>
                  <select className="input-primary bg-white text-sm cursor-pointer" value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}>
                    <option value="">Walk-in</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
               </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Add Product</label>
              <select 
                required 
                className="input-primary mt-1 cursor-pointer bg-white text-sm" 
                value={selectedProductId} 
                onChange={e => {
                    setSelectedProductId(e.target.value);
                    setQuantity(1);
                }}
              >
                <option value="">-- Choose Item --</option>
                {products.filter(p => p.stockQuantity > 0).map(p => (
                  <option key={p.id} value={p.id}>
                    {p.brand} {p.type} - {p.color} ({p.size})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
               <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Qty</label>
                    {selectedProduct && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${selectedProduct.stockQuantity < 5 ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}>
                            Stock: {selectedProduct.stockQuantity}
                        </span>
                    )}
                  </div>
                  <input 
                    required 
                    type="number" 
                    min="1" 
                    max={selectedProduct?.stockQuantity}
                    className="input-primary mt-1" 
                    value={quantity} 
                    onChange={e => setQuantity(parseInt(e.target.value) || 1)} 
                  />
               </div>
               <button 
                type="submit"
                disabled={!selectedProductId}
                className="bg-slate-800 text-white p-2.5 rounded-lg hover:bg-slate-900 transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 mb-[1px]"
               >
                 <Plus size={20} />
               </button>
            </div>
          </form>

          {/* Scrollable Cart List with min-h-0 to ensure flex container works properly */}
          <div className="flex-1 overflow-y-auto min-h-0 space-y-2 py-2 pr-1 my-2">
             {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                   <ShoppingCart size={40} className="mb-2" />
                   <p className="text-sm">No items in order</p>
                </div>
             ) : (
                cart.map((item, idx) => (
                   <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex justify-between items-center group">
                      <div className="overflow-hidden">
                         <p className="font-bold text-slate-700 text-sm truncate">{item.product.brand} {item.product.type}</p>
                         <div className="text-xs text-indigo-600 font-mono mt-0.5">
                            {item.quantity} x {item.product.sellingPrice.toFixed(2)}
                         </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                         <span className="font-bold text-slate-800 text-sm">{(item.totalPrice).toFixed(2)}</span>
                         <button onClick={() => removeFromCart(idx)} className="text-rose-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded">
                           <Trash2 size={14} />
                         </button>
                      </div>
                   </div>
                ))
             )}
          </div>

          <div className="border-t border-slate-200 pt-4 mt-auto flex-shrink-0">
             <div className="flex justify-between items-center mb-4">
                <span className="text-slate-500 font-bold uppercase text-xs tracking-wider">Total ({cartTotalItems} items)</span>
                <span className="text-2xl font-bold text-indigo-700 tracking-tight">GHS {cartTotal.toFixed(2)}</span>
             </div>
             <div className="flex gap-2">
                <button 
                  onClick={clearCart}
                  disabled={cart.length === 0}
                  className="px-4 py-3 border border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg font-bold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
                <button 
                  onClick={initiateCheckout}
                  disabled={cart.length === 0}
                  className="flex-1 btn-primary py-3.5 text-base shadow-indigo-200 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18} /> Confirm Order
                </button>
             </div>
          </div>
        </div>
      </div>

      {/* Sales Ledger / Pending Table */}
      <div className="lg:col-span-2 space-y-6">
        <div className="card-hover p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div className="flex gap-4">
                <button 
                  onClick={() => setActiveTab('LEDGER')}
                  className={`text-xl font-bold tracking-tight transition ${activeTab === 'LEDGER' ? 'text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Sales Ledger
                </button>
                <button 
                  onClick={() => setActiveTab('PENDING_VERIFICATION')}
                  className={`text-xl font-bold tracking-tight transition flex items-center gap-2 ${activeTab === 'PENDING_VERIFICATION' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Pending Verification
                    {pendingGroups.length > 0 && <span className="text-xs bg-red-500 text-white px-1.5 rounded-full">{pendingGroups.length}</span>}
                </button>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-slate-200 rounded-lg shadow-sm">
                <Calendar className="w-4 h-4 text-slate-400" />
                <input 
                  type="month" 
                  value={filterMonth} 
                  onChange={e => setFilterMonth(e.target.value)}
                  className="text-sm outline-none text-slate-700 font-medium bg-transparent"
                />
              </div>
              {canEditSettings && (
                  <button onClick={openSettings} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-slate-200" title="Ledger Settings">
                    <Settings size={18} />
                  </button>
              )}
            </div>
          </div>

          {activeTab === 'LEDGER' ? (
              <>
                {/* Totals Banner (Paid Only) */}
                <div className="bg-gradient-to-r from-emerald-50 to-white p-5 rounded-xl mb-8 grid grid-cols-1 md:grid-cols-2 gap-6 border border-emerald-100 shadow-sm">
                    <div className="flex flex-col justify-center">
                        <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">Confirmed Revenue</span>
                        <span className="text-3xl font-bold text-emerald-900">GHS {monthlyTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col justify-center md:border-l md:border-emerald-100 md:pl-6">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Pending Payment</span>
                        <span className="text-xl font-bold text-orange-500">
                            GHS {pendingSales.reduce((sum, s) => sum + s.totalPrice, 0).toLocaleString()}
                        </span>
                    </div>
                </div>

                {/* Salesman Performance */}
                {filteredSales.length > 0 && (
                    <div className="mb-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <TrendingUp size={16} className="text-slate-400" /> Salesman Performance (Paid Only)
                        </h4>
                        <div className="flex items-center gap-4 flex-wrap">
                            <button onClick={handleExportPerformance} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition-colors text-xs font-medium">
                                <Download size={14} /> Export CSV
                            </button>
                            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                <span className="text-slate-500 font-medium text-xs">Commission Rate: {commissionRate}%</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {sortedSalesmen.map((stat, idx) => {
                        const commission = stat.revenue * (commissionRate / 100);
                        return (
                            <div key={stat.name} className="bg-white p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all duration-300 group">
                            <div className="flex justify-between items-start mb-3">
                                <span className="font-bold text-slate-800 truncate text-sm" title={stat.name}>{stat.name}</span>
                                {idx === 0 && <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-sm"><Award size={10} /> Top</span>}
                            </div>
                            <div className="flex flex-col space-y-1.5">
                                <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Revenue</span>
                                <span className="text-slate-900 font-semibold">GHS {stat.revenue.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-xs pt-2 border-t border-slate-50 mt-1">
                                <span className="text-indigo-500 font-medium">Comm.</span>
                                <span className="text-indigo-600 font-bold bg-indigo-50 px-1.5 rounded">GHS {commission.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                                </div>
                            </div>
                            </div>
                        );
                        })}
                    </div>
                    </div>
                )}

                {/* Transaction Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/80 text-slate-500 text-xs uppercase font-semibold">
                        <tr>
                        <th className="p-4">Status</th>
                        <th className="p-4">Date</th>
                        <th className="p-4">Product</th>
                        <th className="p-4 text-right">Total</th>
                        <th className="p-4">Salesman</th>
                        <th className="p-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {filteredSales.length > 0 ? (
                        filteredSales.map(sale => {
                            const isRefund = sale.quantity < 0;
                            const status = sale.paymentStatus || 'PAID';

                            return (
                            <tr key={sale.id} className={`hover:bg-slate-50 transition duration-150 ${isRefund ? 'bg-rose-50/30' : ''}`}>
                                <td className="p-4">
                                    {status === 'PAID' ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                                            <CheckCircle size={10} /> Paid
                                        </span>
                                    ) : status === 'PENDING' ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold border border-orange-200">
                                            <AlertCircle size={10} /> Pending
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                                            Cancelled
                                        </span>
                                    )}
                                </td>
                                <td className="p-4 text-slate-600">
                                <div className="font-medium">{new Date(sale.date).toLocaleDateString()}</div>
                                <div className="text-[10px] text-slate-400">#{sale.transactionId?.slice(0,8)}</div>
                                </td>
                                <td className="p-4 font-medium text-slate-800 max-w-[150px] truncate">
                                {isRefund && <span className="text-rose-500 font-bold mr-1 text-xs px-1 border border-rose-200 rounded bg-rose-50">REFUND</span>}
                                {sale.productName}
                                </td>
                                <td className={`p-4 text-right font-bold ${isRefund ? 'text-rose-600' : 'text-slate-700'}`}>{(sale.totalPrice).toFixed(2)}</td>
                                <td className="p-4 text-slate-500 text-xs">{sale.salesman}</td>
                                <td className="p-4 text-center">
                                {status === 'PAID' && !isRefund && (
                                    <button onClick={() => openReturnModal(sale)} className="text-slate-300 hover:text-orange-500 p-1.5" title="Return">
                                    <RotateCcw size={16} />
                                    </button>
                                )}
                                </td>
                            </tr>
                            );
                        })
                        ) : (
                        <tr><td colSpan={7} className="p-12 text-center text-slate-400 italic">No sales found.</td></tr>
                        )}
                    </tbody>
                    </table>
                </div>
              </>
          ) : (
              // PENDING VERIFICATION TAB
              <div className="space-y-4">
                  <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 text-sm text-indigo-800 flex items-start gap-2">
                      <Phone className="w-5 h-5 shrink-0" />
                      <div>
                          <p className="font-bold">Follow-up Call Verification</p>
                          <p>If you call a customer and confirm they have sent payment (MoMo), ask for the Transaction ID. Verify it here to release the order to the Queue.</p>
                      </div>
                  </div>

                  {pendingGroups.length === 0 ? (
                      <div className="p-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
                          <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-20" />
                          <p>No orders pending payment.</p>
                      </div>
                  ) : (
                      <div className="grid grid-cols-1 gap-4">
                          {pendingGroups.map(group => {
                              const first = group[0];
                              const total = group.reduce((sum, s) => sum + s.totalPrice, 0);
                              
                              return (
                                  <div key={first.transactionId} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                      <div className="flex justify-between items-start mb-3">
                                          <div>
                                              <span className="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-xs">#{first.transactionId?.slice(0,8)}</span>
                                              <h4 className="font-bold text-slate-800 mt-1">{first.customerName}</h4>
                                              <p className="text-xs text-slate-500">Salesman: {first.salesman}</p>
                                          </div>
                                          <div className="text-right">
                                              <p className="font-bold text-lg text-indigo-700">GHS {total.toFixed(2)}</p>
                                              <p className="text-xs text-orange-500 font-bold uppercase">Unpaid</p>
                                          </div>
                                      </div>
                                      
                                      <div className="bg-slate-50 p-3 rounded border border-slate-100 text-xs text-slate-600 mb-4">
                                          {group.map((item, i) => (
                                              <div key={i} className="flex justify-between">
                                                  <span>{item.quantity}x {item.productName}</span>
                                              </div>
                                          ))}
                                      </div>

                                      <div className="flex gap-2">
                                          <button 
                                            onClick={() => verifyPayment(first.transactionId!)}
                                            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm transition shadow-md shadow-indigo-100 flex items-center justify-center gap-2"
                                          >
                                              <CheckCircle size={16} /> Verify Payment
                                          </button>
                                          <button 
                                            onClick={() => cancelPendingTransaction(first.transactionId!)}
                                            className="px-4 py-2.5 bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg font-bold text-sm transition flex items-center justify-center gap-2"
                                            title="Cancel Order"
                                          >
                                              <XCircle size={16} /> Cancel
                                          </button>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  )}
              </div>
          )}
        </div>
      </div>

      {/* Sale Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden ring-1 ring-white/20">
            <div className="bg-slate-800 p-5 flex justify-between items-center text-white">
              <h3 className="text-lg font-bold flex items-center gap-2">
                 Book Order
              </h3>
              <button onClick={() => setShowConfirmation(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                 <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Customer</span>
                    <span className="font-bold text-slate-700">{customers.find(c => c.id === selectedCustomerId)?.name || 'Walk-in'}</span>
                 </div>
                 <div className="mt-3 pt-3 flex justify-between items-center">
                    <span className="font-bold text-slate-600">Total Due</span>
                    <span className="font-bold text-xl text-indigo-600">GHS {cartTotal.toFixed(2)}</span>
                 </div>
                 <p className="text-xs text-orange-600 mt-2 text-center bg-orange-50 p-2 rounded">
                    Order will be sent to Cashier as PENDING.
                 </p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowConfirmation(false)} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
                <button onClick={confirmTransaction} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/30">Confirm & Send</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Post-Sale Ticket Modal */}
      {showReceiptModal && lastReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
           <div id="receipt-content" className="bg-white w-full max-w-sm mx-auto shadow-2xl rounded-xl overflow-hidden print:shadow-none print:w-full">
              <div className="bg-slate-900 text-white p-6 text-center print:bg-white print:text-black">
                  <h2 className="text-2xl font-bold tracking-tight">PAYMENT TICKET</h2>
                  <p className="text-xs text-slate-400 mt-1 uppercase print:text-black">Take to Cashier</p>
              </div>

              <div className="p-6 bg-white space-y-4 print:p-0">
                  <div className="bg-slate-100 p-4 rounded-xl text-center border border-slate-200">
                      <p className="text-xs font-bold text-slate-500 uppercase">Transaction Code</p>
                      <p className="text-3xl font-mono font-bold text-slate-800 tracking-wider mt-1">{lastReceipt.transactionId}</p>
                  </div>

                  <div className="text-center space-y-1">
                      <p className="text-sm text-slate-600"><span className="font-bold">Date:</span> {new Date(lastReceipt.date).toLocaleString()}</p>
                      <p className="text-sm text-slate-600"><span className="font-bold">Customer:</span> {lastReceipt.customerName}</p>
                  </div>
                  
                  <div className="flex justify-between text-xl font-bold text-slate-900 pt-4 border-t border-slate-100">
                       <span>TOTAL</span>
                       <span>GHS {lastReceipt.totalAmount.toFixed(2)}</span>
                  </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-3 no-print">
                  <div className="flex gap-3">
                      <button onClick={handleShareWhatsApp} className="flex-1 bg-[#25D366] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm">
                         <Share2 size={18} /> WhatsApp
                      </button>
                      <button onClick={handlePrintReceipt} className="flex-1 bg-slate-800 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm">
                         <Printer size={18} /> Print
                      </button>
                  </div>
                  <button onClick={() => setShowReceiptModal(false)} className="w-full py-3 border border-slate-200 bg-white text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition">
                     Close
                  </button>
              </div>
           </div>
      </div>
      )}

      {/* Return Item Modal */}
      {returnModal.isOpen && returnModal.sale && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
                <div className="bg-amber-50 p-5 border-b border-amber-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-amber-900 flex items-center gap-2">Process Return</h3>
                    <button onClick={() => setReturnModal({isOpen: false, sale: null})} className="text-slate-400"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-5">
                    <p className="text-sm text-slate-600">Returns are processed as cancellations/refunds.</p>
                    <input 
                        type="number" min="1" max={returnModal.sale.quantity - (returnModal.sale.returnedQuantity || 0)}
                        value={returnQty} onChange={(e) => setReturnQty(parseInt(e.target.value) || 1)}
                        className="w-full border border-slate-300 rounded-lg p-3 text-center font-bold text-2xl text-slate-800"
                    />
                    <button onClick={handleReturnSubmit} className="w-full py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition">Confirm Return</button>
                </div>
             </div>
         </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
             <div className="bg-slate-50 p-5 border-b border-slate-100 flex justify-between items-center">
                 <h3 className="text-lg font-bold text-slate-800">Settings</h3>
                 <button onClick={() => setShowSettings(false)} className="text-slate-400"><X size={20} /></button>
             </div>
             <div className="p-6 space-y-4">
                <label className="text-sm font-bold text-slate-700">Commission Rate (%)</label>
                <input type="number" value={tempCommissionRate} onChange={(e) => setTempCommissionRate(e.target.value)} className="input-primary" />
                <button onClick={saveSettings} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold">Save</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesLedger;