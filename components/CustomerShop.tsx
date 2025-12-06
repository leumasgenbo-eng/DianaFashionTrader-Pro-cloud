
import React, { useState, useMemo, useEffect } from 'react';
import { Product, ProductType, User, Sale, StockHistoryEntry } from '../types';
import { ShoppingBag, Search, Calendar, CreditCard, Send, X, Plus, Minus, ArrowLeft, CheckCircle, CheckSquare, Square, Loader2, Heart, Trash2, ShoppingCart } from 'lucide-react';

interface CustomerShopProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  onExit: () => void;
  currentUser: User;
}

interface ShopCartItem {
  product: Product;
  quantity: number;
}

const CustomerShop: React.FC<CustomerShopProps> = ({ products, setProducts, setSales, onExit, currentUser }) => {
  const [cart, setCart] = useState<ShopCartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  
  // Wishlist State
  const [wishlist, setWishlist] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('customer_wishlist');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [showWishlist, setShowWishlist] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Booking Form State - Pre-fill with user data
  const [bookingData, setBookingData] = useState({
    name: currentUser.name || '',
    phone: currentUser.username || '', // Username is phone for customers
    date: '',
    depositCode: ''
  });

  // Ensure user data persists if props change
  useEffect(() => {
    setBookingData(prev => ({
        ...prev,
        name: currentUser.name || prev.name,
        phone: currentUser.username || prev.phone
    }));
  }, [currentUser]);

  // Persist Wishlist
  useEffect(() => {
    localStorage.setItem('customer_wishlist', JSON.stringify(Array.from(wishlist)));
  }, [wishlist]);

  // Calculate Minimum Date (Today + 2 Days)
  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  }, []);

  // Filter Products
  const filteredProducts = products.filter(p => {
    const matchesSearch = `${p.brand} ${p.type} ${p.color}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'ALL' || p.type === filterType;
    return matchesSearch && matchesType && p.stockQuantity > 0;
  });

  const wishlistedProducts = products.filter(p => wishlist.has(p.id));

  // Wishlist Logic
  const toggleWishlist = (productId: string) => {
    const newSet = new Set(wishlist);
    if (newSet.has(productId)) {
        newSet.delete(productId);
    } else {
        newSet.add(productId);
    }
    setWishlist(newSet);
  };

  const moveWishlistToCart = (product: Product) => {
      addToCart(product);
      const newSet = new Set(wishlist);
      newSet.delete(product.id);
      setWishlist(newSet);
  };

  // Cart Logic
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stockQuantity) return prev; // Limit to stock
        return prev.map(item => 
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  // Bulk Add Logic
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
        newSet.delete(id);
    } else {
        newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const addSelectedToCart = () => {
    setCart(prev => {
      const newCart = [...prev];
      selectedIds.forEach(id => {
         const product = products.find(p => p.id === id);
         if (!product) return;
         
         const existingIndex = newCart.findIndex(item => item.product.id === id);
         if (existingIndex >= 0) {
             // Increment quantity if within stock limits
             if (newCart[existingIndex].quantity < product.stockQuantity) {
                 newCart[existingIndex] = {
                     ...newCart[existingIndex],
                     quantity: newCart[existingIndex].quantity + 1
                 };
             }
         } else {
             newCart.push({ product, quantity: 1 });
         }
      });
      return newCart;
    });
    setSelectedIds(new Set());
    setShowCart(true);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        if (newQty > item.product.stockQuantity) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean) as ShopCartItem[]);
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.sellingPrice * item.quantity), 0);

  // Submit Booking
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setIsSubmitting(true);

    try {
        const transactionId = crypto.randomUUID();
        const date = new Date().toISOString();
        const shortCode = transactionId.slice(0, 8).toUpperCase();

        const newSales: Sale[] = [];
        const productsToUpdate = new Map<string, number>();

        cart.forEach(item => {
            const lineTotal = item.product.sellingPrice * item.quantity;
            const taxRate = item.product.taxRate || 0;
            const basePrice = lineTotal / (1 + (taxRate / 100));
            const lineTax = lineTotal - basePrice;

            newSales.push({
                id: crypto.randomUUID(),
                transactionId: shortCode,
                productId: item.product.id,
                productName: `${item.product.brand} ${item.product.type} (${item.product.color})`,
                quantity: item.quantity,
                totalPrice: lineTotal,
                taxAmount: lineTax,
                salesman: 'Online Shop',
                customerId: currentUser.id,
                customerName: bookingData.name,
                date: date,
                returnedQuantity: 0,
                paymentStatus: 'PENDING', // Important for Cashier Queue
                fulfillmentStatus: 'NEW'
            });
            productsToUpdate.set(item.product.id, item.quantity);
        });

        // 1. Update Sales State (Puts it in Queue/Cashier Dashboard)
        setSales(prev => [...newSales, ...prev]);

        // 2. Update Stock (Reserve Items)
        setProducts(prev => prev.map(p => {
            if (productsToUpdate.has(p.id)) {
                const soldQty = productsToUpdate.get(p.id)!;
                const newStock = p.stockQuantity - soldQty;
                
                const historyEntry: StockHistoryEntry = {
                    id: crypto.randomUUID(),
                    date: date,
                    type: 'SALE',
                    quantityChange: -soldQty,
                    newStockLevel: newStock,
                    note: `Online Order ${shortCode}`
                };

                return { 
                    ...p, 
                    stockQuantity: newStock,
                    history: [...(p.history || []), historyEntry]
                };
            }
            return p;
        }));

        // 3. Construct WhatsApp Message
        let message = `*NEW ORDER BOOKING*\n`;
        message += `------------------\n`;
        message += `*Order ID:* ${shortCode}\n`;
        message += `*Customer:* ${bookingData.name}\n`;
        message += `*Phone:* ${bookingData.phone}\n`;
        message += `*Required Date:* ${bookingData.date}\n`;
        message += `*Deposit Code:* ${bookingData.depositCode}\n\n`;
        
        message += `*Order Details:*\n`;
        cart.forEach(item => {
        message += `• ${item.quantity}x ${item.product.brand} ${item.product.type} (${item.product.color}, Size ${item.product.size})\n`;
        });
        
        message += `\n*Total Est: GHS ${cartTotal.toFixed(2)}*`;

        // Reset Cart
        setCart([]);
        setShowCart(false);
        setIsSubmitting(false);

        // Open WhatsApp
        const targetNumber = '233243504091'; // Country code + 0243504091 drop leading zero
        const url = `https://wa.me/${targetNumber}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
        
        alert("Order placed successfully! It is now waiting at the Cashier for confirmation.");

    } catch (error) {
        console.error("Booking error:", error);
        alert("Failed to process booking.");
        setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 relative">
      {/* Header */}
      <div className="bg-slate-900 text-white sticky top-0 z-30 shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <button onClick={onExit} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white" title="Sign Out">
                <ArrowLeft size={24} />
             </button>
             <div>
                <h1 className="text-xl font-bold tracking-tight">D's Man-Ware Shop</h1>
                <p className="text-xs text-slate-400">Welcome, {currentUser.name}</p>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowWishlist(true)}
                className="relative p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition"
              >
                <Heart size={24} className={wishlist.size > 0 ? "text-rose-500 fill-rose-500" : "text-white"} />
                {wishlist.size > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-900">
                    {wishlist.size}
                  </span>
                )}
              </button>

              <button 
                onClick={() => setShowCart(true)}
                className="relative p-2 bg-indigo-600 rounded-full hover:bg-indigo-500 transition"
              >
                <ShoppingBag size={24} />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-900">
                    {cart.reduce((a, b) => a + b.quantity, 0)}
                  </span>
                )}
              </button>
          </div>
        </div>
        
        {/* Search & Filter Bar */}
        <div className="px-4 pb-4 max-w-3xl mx-auto space-y-3">
           <div className="relative">
             <Search className="absolute left-3 top-2.5 text-slate-400 w-5 h-5" />
             <input 
               type="text" 
               placeholder="Search brands, colors..." 
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800 border-none text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none"
             />
           </div>
           <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button 
                onClick={() => setFilterType('ALL')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${filterType === 'ALL' ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-400'}`}
              >
                All Items
              </button>
              {Object.values(ProductType).map(t => (
                <button 
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${filterType === t ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-400'}`}
                >
                  {t}
                </button>
              ))}
           </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="max-w-3xl mx-auto p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
        {filteredProducts.map(p => (
          <div key={p.id} className={`bg-white rounded-xl overflow-hidden shadow-sm border transition-all ${selectedIds.has(p.id) ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-100'} flex flex-col relative group`}>
             <div className="h-32 bg-slate-100 flex items-center justify-center relative">
                <span className="text-4xl">👖</span>
                
                {/* Selection Checkbox (Top Left) */}
                <button 
                  onClick={() => toggleSelection(p.id)}
                  className="absolute top-2 left-2 z-10 bg-white/90 p-1.5 rounded-lg shadow-sm hover:bg-white transition"
                >
                    {selectedIds.has(p.id) ? (
                        <CheckSquare size={18} className="text-indigo-600" />
                    ) : (
                        <Square size={18} className="text-slate-400" />
                    )}
                </button>

                {/* Wishlist Toggle (Top Right) */}
                <button 
                  onClick={() => toggleWishlist(p.id)}
                  className="absolute top-2 right-2 z-10 bg-white/90 p-1.5 rounded-full shadow-sm hover:bg-white transition"
                >
                    <Heart size={16} className={wishlist.has(p.id) ? "text-rose-500 fill-rose-500" : "text-slate-400"} />
                </button>

                {/* Size Badge (Bottom Right overlay) */}
                <span className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
                  Size {p.size}
                </span>
             </div>
             <div className="p-3 flex-1 flex flex-col">
                <h3 className="font-bold text-slate-800 text-sm truncate">{p.brand} {p.type}</h3>
                <p className="text-xs text-slate-500 mb-2">{p.color} - {p.model}</p>
                <div className="mt-auto flex justify-between items-center">
                   <span className="font-bold text-indigo-600">GHS {p.sellingPrice}</span>
                   <button 
                     onClick={() => addToCart(p)}
                     className="p-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 active:scale-95 transition"
                   >
                     <Plus size={16} />
                   </button>
                </div>
             </div>
          </div>
        ))}
        {filteredProducts.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400">
             <p>No products found matching your search.</p>
          </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-0 right-0 px-4 flex justify-center z-40 animate-slide-in-top">
            <div className="bg-slate-900 text-white rounded-full shadow-2xl px-6 py-3 flex items-center gap-4 border border-slate-700">
                <div className="flex items-center gap-2">
                    <CheckCircle size={18} className="text-emerald-400" />
                    <span className="font-bold whitespace-nowrap text-sm">{selectedIds.size} Selected</span>
                </div>
                <div className="w-px h-5 bg-slate-700"></div>
                <button 
                    onClick={addSelectedToCart} 
                    className="font-bold text-indigo-400 hover:text-white flex items-center gap-2 text-sm whitespace-nowrap"
                >
                    Add to Order <Plus size={16} />
                </button>
                <button 
                    onClick={() => setSelectedIds(new Set())} 
                    className="ml-2 text-slate-500 hover:text-slate-300 p-1"
                >
                    <X size={18} />
                </button>
            </div>
        </div>
      )}

      {/* Wishlist Drawer */}
      {showWishlist && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex justify-end backdrop-blur-sm animate-fade-in">
           <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                 <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                   <Heart className="text-rose-500 fill-rose-500" size={20} /> Your Wishlist
                 </h2>
                 <button onClick={() => setShowWishlist(false)} className="p-1 hover:bg-slate-200 rounded-full text-slate-500">
                   <X size={24} />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                 {wishlistedProducts.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                        <Heart size={48} className="opacity-20" />
                        <p className="text-sm">Your wishlist is empty.</p>
                        <button onClick={() => setShowWishlist(false)} className="text-indigo-600 font-bold text-sm">Browse Products</button>
                     </div>
                 ) : (
                     wishlistedProducts.map(p => (
                         <div key={p.id} className="flex gap-3 items-center bg-white border border-slate-100 p-3 rounded-xl shadow-sm">
                            <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-2xl">👖</div>
                            <div className="flex-1">
                                <p className="font-bold text-sm text-slate-800">{p.brand} {p.type}</p>
                                <p className="text-xs text-slate-500">{p.color} | Size: {p.size}</p>
                                <p className="text-sm font-bold text-indigo-600 mt-1">GHS {p.sellingPrice}</p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <button 
                                    onClick={() => moveWishlistToCart(p)}
                                    className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg transition"
                                    title="Move to Cart"
                                >
                                    <ShoppingCart size={16} />
                                </button>
                                <button 
                                    onClick={() => toggleWishlist(p.id)}
                                    className="p-2 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition"
                                    title="Remove"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                         </div>
                     ))
                 )}
              </div>
              
              {wishlistedProducts.length > 0 && (
                  <div className="p-4 border-t border-slate-200 bg-white">
                      <button 
                        onClick={() => setWishlist(new Set())}
                        className="w-full py-3 border border-slate-200 text-slate-500 rounded-xl font-bold hover:bg-slate-50 hover:text-red-500 transition"
                      >
                          Clear Wishlist
                      </button>
                  </div>
              )}
           </div>
        </div>
      )}

      {/* Cart Drawer / Booking Modal */}
      {showCart && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex justify-end backdrop-blur-sm animate-fade-in">
           <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                 <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                   <ShoppingBag size={20} /> Your Order
                 </h2>
                 <button onClick={() => setShowCart(false)} className="p-1 hover:bg-slate-200 rounded-full text-slate-500">
                   <X size={24} />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                 {/* Cart Items */}
                 <div className="space-y-3">
                   {cart.length === 0 ? (
                     <p className="text-center text-slate-400 py-8 italic">Your cart is empty.</p>
                   ) : (
                     cart.map((item, idx) => (
                       <div key={idx} className="flex gap-3 items-center bg-white border border-slate-100 p-3 rounded-xl shadow-sm">
                          <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-xl">👖</div>
                          <div className="flex-1">
                             <p className="font-bold text-sm text-slate-800">{item.product.brand} {item.product.type}</p>
                             <p className="text-xs text-slate-500">Size: {item.product.size} | {item.product.color}</p>
                             <p className="text-xs font-bold text-indigo-600 mt-1">GHS {item.product.sellingPrice}</p>
                          </div>
                          <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1">
                             <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1 hover:bg-white rounded shadow-sm text-slate-500"><Minus size={14} /></button>
                             <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                             <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 hover:bg-white rounded shadow-sm text-slate-500"><Plus size={14} /></button>
                          </div>
                       </div>
                     ))
                   )}
                 </div>
                 
                 {cart.length > 0 && (
                   <form id="booking-form" onSubmit={handleSubmitBooking} className="space-y-4 pt-4 border-t border-slate-100">
                      <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                         <h3 className="font-bold text-indigo-900 text-sm mb-3 flex items-center gap-2">
                            <CheckCircle size={16} /> Booking Details
                         </h3>
                         
                         <div className="space-y-3">
                           <div>
                              <label className="text-xs font-bold text-indigo-700/70 uppercase">Your Name</label>
                              <input 
                                required
                                type="text" 
                                placeholder="John Doe"
                                value={bookingData.name}
                                onChange={e => setBookingData({...bookingData, name: e.target.value})}
                                className="w-full mt-1 px-3 py-2 rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                              />
                           </div>
                           <div>
                              <label className="text-xs font-bold text-indigo-700/70 uppercase">Phone Number</label>
                              <input 
                                required
                                type="tel" 
                                placeholder="024 XXX XXXX"
                                value={bookingData.phone}
                                onChange={e => setBookingData({...bookingData, phone: e.target.value})}
                                className="w-full mt-1 px-3 py-2 rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                              />
                           </div>
                           <div>
                              <label className="text-xs font-bold text-indigo-700/70 uppercase flex justify-between">
                                 Required Date 
                                 <span className="text-[10px] bg-white px-1 rounded border border-indigo-200 text-indigo-500">Min 2 Days Advance</span>
                              </label>
                              <div className="relative mt-1">
                                <Calendar className="absolute left-3 top-2.5 text-indigo-300 w-4 h-4" />
                                <input 
                                    required
                                    type="date" 
                                    min={minDate}
                                    value={bookingData.date}
                                    onChange={e => setBookingData({...bookingData, date: e.target.value})}
                                    className="w-full pl-9 px-3 py-2 rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-slate-700"
                                />
                              </div>
                           </div>
                           <div>
                              <label className="text-xs font-bold text-indigo-700/70 uppercase">Deposit Transaction Code</label>
                              <div className="relative mt-1">
                                <CreditCard className="absolute left-3 top-2.5 text-indigo-300 w-4 h-4" />
                                <input 
                                    required
                                    type="text" 
                                    placeholder="e.g. TRX-998877"
                                    value={bookingData.depositCode}
                                    onChange={e => setBookingData({...bookingData, depositCode: e.target.value})}
                                    className="w-full pl-9 px-3 py-2 rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono uppercase"
                                />
                              </div>
                              <p className="text-[10px] text-indigo-400 mt-1">Please make deposit to <span className="font-bold">0243504091</span> before booking.</p>
                           </div>
                         </div>
                      </div>
                   </form>
                 )}
              </div>

              <div className="p-4 border-t border-slate-200 bg-white">
                 <div className="flex justify-between items-center mb-4">
                    <span className="text-slate-500 font-bold">Total Estimate</span>
                    <span className="text-2xl font-bold text-slate-800">GHS {cartTotal.toFixed(2)}</span>
                 </div>
                 <button 
                   type="submit"
                   form="booking-form"
                   disabled={cart.length === 0 || isSubmitting}
                   className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white py-3.5 rounded-xl font-bold shadow-lg shadow-green-200 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                 >
                   {isSubmitting ? <Loader2 className="animate-spin" /> : <Send size={18} />} 
                   {isSubmitting ? 'Processing...' : 'Place Order & Send WhatsApp'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default CustomerShop;
