import React, { useState, useEffect, useMemo } from 'react';
import { Product, ProductType, StockHistoryEntry } from '../types';
import { saveProduct, saveProducts, deleteProduct } from '../services/dataService';
import { Plus, Trash2, Edit2, Save, X, Check, AlertTriangle, Filter, PackagePlus, Calculator, Tag, ArrowRight, Layers, RefreshCw, Settings2, Search, SlidersHorizontal, AlertCircle, History, Clock, Package, DollarSign, ChevronRight } from 'lucide-react';

interface InventoryProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
}

const Inventory: React.FC<InventoryProps> = ({ products, setProducts }) => {
  const [showForm, setShowForm] = useState(false);
  
  // Low Stock Alert State
  const [lowStockThreshold, setLowStockThreshold] = useState(10);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStock, setFilterStock] = useState<'ALL' | 'LOW' | 'OUT' | 'IN'>('ALL');
  const [filterBrand, setFilterBrand] = useState<string>('ALL');
  const [filterColor, setFilterColor] = useState<string>('ALL');
  const [filterSize, setFilterSize] = useState<string>('ALL');

  // Dynamic Filter Options
  const uniqueBrands = useMemo(() => Array.from(new Set(products.map(p => p.brand).filter(Boolean))).sort(), [products]);
  const uniqueColors = useMemo(() => Array.from(new Set(products.map(p => p.color).filter(Boolean))).sort(), [products]);
  const uniqueSizes = useMemo(() => Array.from(new Set(products.map(p => p.size).filter(Boolean))).sort(), [products]);

  // Stock Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStockQty, setEditStockQty] = useState<number>(0);
  const [editReason, setEditReason] = useState<string>('');

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Bulk Action State
  const [bulkActionType, setBulkActionType] = useState<'STOCK' | 'PRICING' | null>(null);
  const [bulkStockData, setBulkStockData] = useState<{ value: string; mode: 'ADD' | 'SET'; reason: string }>({ value: '', mode: 'ADD', reason: '' });
  const [bulkPricingData, setBulkPricingData] = useState({ margin: '', tax: '' });
  
  // Modals State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [historyModal, setHistoryModal] = useState<{ isOpen: boolean; product: Product | null }>({ isOpen: false, product: null });

  // Form State
  const [formData, setFormData] = useState<{
    brand: string;
    type: ProductType | string;
    color: string;
    model: string;
    size: string;
    costCfa: string;
    exchangeRate: string;
    serviceRate: string;
    miscRate: string;
    stockQuantity: string;
    profitMargin: string;
    taxRate: string;
  }>({
    brand: '',
    type: ProductType.KARKI,
    color: '',
    model: '',
    size: '',
    costCfa: '',
    exchangeRate: '', 
    serviceRate: '5',
    miscRate: '5',
    stockQuantity: '1',
    profitMargin: '',
    taxRate: ''
  });

  // Derived Pricing State for Preview
  const [pricingPreview, setPricingPreview] = useState({
    baseCostGhs: 0,
    serviceCharge: 0,
    miscCharge: 0,
    totalCost: 0,
    pricePreTax: 0,
    taxAmount: 0,
    finalPrice: 0
  });

  // Calculate pricing whenever relevant fields change
  useEffect(() => {
    const costCfa = parseFloat(formData.costCfa) || 0;
    const exchangeRate = parseFloat(formData.exchangeRate) || 0;
    const serviceRate = parseFloat(formData.serviceRate) || 0;
    const miscRate = parseFloat(formData.miscRate) || 0;
    const profitMargin = parseFloat(formData.profitMargin) || 0;
    const taxRate = parseFloat(formData.taxRate) || 0;

    // Exchange Rate typically quoted as GHS for 1000 CFA
    const ratePer1CFA = exchangeRate / 1000;
    
    const baseCostGhs = costCfa * ratePer1CFA;
    const serviceCharge = baseCostGhs * (serviceRate / 100);
    const miscCharge = baseCostGhs * (miscRate / 100);
    const totalCost = baseCostGhs + serviceCharge + miscCharge;
    
    const pricePreTax = totalCost + profitMargin;
    const taxAmount = pricePreTax * (taxRate / 100);
    const finalPrice = pricePreTax + taxAmount;

    setPricingPreview({
      baseCostGhs,
      serviceCharge,
      miscCharge,
      totalCost,
      pricePreTax,
      taxAmount,
      finalPrice
    });
  }, [formData.costCfa, formData.exchangeRate, formData.serviceRate, formData.miscRate, formData.profitMargin, formData.taxRate]);

  // --- Filtering Logic ---
  const lowStockItems = products.filter(p => p.stockQuantity <= lowStockThreshold && p.stockQuantity > 0);
  
  const filteredProducts = products.filter(p => {
    // 1. Text Search
    const searchString = `${p.brand} ${p.model} ${p.color} ${p.size} ${p.type}`.toLowerCase();
    const matchesSearch = searchString.includes(searchTerm.toLowerCase());

    // 2. Specific Dropdown Filters
    const matchesType = filterType === 'ALL' || p.type === filterType;
    const matchesBrand = filterBrand === 'ALL' || p.brand === filterBrand;
    const matchesColor = filterColor === 'ALL' || p.color === filterColor;
    const matchesSize = filterSize === 'ALL' || p.size === filterSize;

    // 3. Stock Status Filter
    let matchesStock = true;
    if (filterStock === 'LOW') matchesStock = p.stockQuantity <= lowStockThreshold && p.stockQuantity > 0;
    if (filterStock === 'OUT') matchesStock = p.stockQuantity === 0;
    if (filterStock === 'IN') matchesStock = p.stockQuantity > lowStockThreshold;

    return matchesSearch && matchesType && matchesBrand && matchesColor && matchesSize && matchesStock;
  });

  // Bulk Selection Handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleBulkStockUpdate = async () => {
    const val = parseFloat(bulkStockData.value);
    if (isNaN(val)) return;

    if (confirm(`Update stock for ${selectedIds.size} items?`)) {
      const productsToUpdate: Product[] = [];

      setProducts(prev => prev.map(p => {
        if (selectedIds.has(p.id)) {
          let updated = { ...p };
          if (!updated.history) updated.history = [];

          const currentStock = p.stockQuantity;
          const newStock = bulkStockData.mode === 'SET' ? val : currentStock + val;
          const finalStock = Math.max(0, Math.floor(newStock));

          const diff = finalStock - currentStock;
          if (diff !== 0) {
            updated.history = [...updated.history, {
              id: crypto.randomUUID() as string,
              date: new Date().toISOString(),
              type: 'BULK_EDIT',
              quantityChange: diff,
              newStockLevel: finalStock,
              note: bulkStockData.reason.trim() || 'Bulk Update'
            }];
          }
          updated.stockQuantity = finalStock;
          
          // Collect for Cloud Save
          productsToUpdate.push(updated);
          return updated;
        }
        return p;
      }));
      
      // Save to Cloud
      await saveProducts(productsToUpdate);

      setBulkActionType(null);
      setBulkStockData({ value: '', mode: 'ADD', reason: '' });
      setSelectedIds(new Set());
    }
  };

  const handleBulkPricingUpdate = async () => {
    const marginVal = bulkPricingData.margin ? parseFloat(bulkPricingData.margin) : null;
    const taxVal = bulkPricingData.tax ? parseFloat(bulkPricingData.tax) : null;

    if (marginVal === null && taxVal === null) {
        alert("Please enter a value for either Profit Margin or Tax Rate.");
        return;
    }

    if (confirm(`Update pricing for ${selectedIds.size} items?`)) {
      const productsToUpdate: Product[] = [];

      setProducts(prev => prev.map(p => {
        if (selectedIds.has(p.id)) {
          let updated = { ...p };
          
          if (marginVal !== null) updated.profitMargin = marginVal;
          if (taxVal !== null) updated.taxRate = taxVal;

          // Recalculate Selling Price
          const totalCost = updated.costGhsBase + updated.serviceCharge + updated.miscCharge;
          const pricePreTax = totalCost + updated.profitMargin;
          const taxAmount = pricePreTax * (updated.taxRate / 100);
          updated.sellingPrice = Math.ceil(pricePreTax + taxAmount);
          
          productsToUpdate.push(updated);
          return updated;
        }
        return p;
      }));

      // Save to Cloud
      await saveProducts(productsToUpdate);

      setBulkActionType(null);
      setBulkPricingData({ margin: '', tax: '' });
      setSelectedIds(new Set());
    }
  };

  const handleBulkDelete = () => {
    setShowDeleteConfirm(true);
  };
  
  const confirmBulkDelete = async () => {
    const idsToDelete = Array.from(selectedIds);
    setProducts(prev => prev.filter(p => !selectedIds.has(p.id)));
    
    // Delete from Cloud
    for (const id of idsToDelete) {
        await deleteProduct(id);
    }

    setSelectedIds(new Set());
    setShowDeleteConfirm(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const costCfa = parseFloat(formData.costCfa) || 0;
    const exchangeRate = parseFloat(formData.exchangeRate) || 0;
    const profitMargin = parseFloat(formData.profitMargin) || 0;
    const taxRate = parseFloat(formData.taxRate) || 0;
    const stockQuantity = parseInt(formData.stockQuantity) || 0;

    const newProduct: Product = {
      id: crypto.randomUUID() as string,
      brand: formData.brand,
      type: formData.type as ProductType,
      color: formData.color,
      model: formData.model,
      size: formData.size,
      costCfa,
      exchangeRate,
      costGhsBase: pricingPreview.baseCostGhs,
      serviceCharge: pricingPreview.serviceCharge,
      miscCharge: pricingPreview.miscCharge,
      profitMargin,
      taxRate,
      sellingPrice: Math.ceil(pricingPreview.finalPrice),
      stockQuantity,
      dateAdded: new Date().toISOString(),
      history: [{
          id: crypto.randomUUID() as string,
          date: new Date().toISOString(),
          type: 'INITIAL',
          quantityChange: stockQuantity,
          newStockLevel: stockQuantity,
          note: 'Initial Stock'
      }]
    };
    
    setProducts(prev => [newProduct, ...prev]);
    
    // Save to Cloud
    await saveProduct(newProduct);
    
    setFormData(prev => ({ 
        ...prev, 
        brand: '', 
        color: '', 
        model: '', 
        size: '', 
        costCfa: '', 
        profitMargin: '', 
        stockQuantity: '1' 
    }));
    alert("New stock added successfully!");
  };

  const handleDelete = async (id: string) => {
    if(confirm("Are you sure you want to delete this item?")) {
      setProducts(prev => prev.filter(p => p.id !== id));
      // Delete from Cloud
      await deleteProduct(id);

      const newSet = new Set(selectedIds);
      newSet.delete(id);
      setSelectedIds(newSet);
    }
  };

  // Stock Editing Handlers
  const startEditing = (product: Product) => {
    setEditingId(product.id);
    setEditStockQty(product.stockQuantity);
    setEditReason('');
  };

  const saveStockUpdate = async (id: string) => {
    let updatedProduct: Product | null = null;

    setProducts(prev => prev.map(p => {
        if (p.id === id) {
            const oldStock = p.stockQuantity;
            const diff = editStockQty - oldStock;
            
            if (diff !== 0) {
                const historyEntry: StockHistoryEntry = {
                    id: crypto.randomUUID() as string,
                    date: new Date().toISOString(),
                    type: 'MANUAL_EDIT',
                    quantityChange: diff,
                    newStockLevel: editStockQty,
                    note: editReason.trim() || 'Manual Correction'
                };
                
                updatedProduct = { 
                    ...p, 
                    stockQuantity: editStockQty,
                    history: [...(p.history || []), historyEntry]
                };
                return updatedProduct;
            }
        }
        return p;
    }));

    // Save to Cloud
    if (updatedProduct) {
        await saveProduct(updatedProduct);
    }

    setEditingId(null);
    setEditReason('');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditReason('');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('ALL');
    setFilterBrand('ALL');
    setFilterColor('ALL');
    setFilterSize('ALL');
    setFilterStock('ALL');
  };

  const isFiltersActive = searchTerm || filterType !== 'ALL' || filterBrand !== 'ALL' || filterColor !== 'ALL' || filterSize !== 'ALL' || filterStock !== 'ALL';

  const openHistory = (product: Product) => {
      setHistoryModal({ isOpen: true, product });
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Inventory Management</h2>
          <p className="text-slate-500 text-sm mt-1">Track products, costs, and stock levels</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className={`btn-primary flex items-center gap-2 justify-center w-full md:w-auto ${showForm ? '!bg-slate-200 !text-slate-700 !shadow-none hover:!bg-slate-300' : ''}`}
        >
          {showForm ? 'Close Form' : <><Plus size={20} /> Add New Item</>}
        </button>
      </div>

      {/* Robust Filter Bar */}
      <div className="card-hover p-4 animate-fade-in z-20 relative space-y-3">
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
             <div className="relative col-span-1 lg:col-span-1">
                <Search className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
                />
             </div>
             
             <div className="flex gap-2">
                <select 
                  value={filterType} 
                  onChange={(e) => setFilterType(e.target.value)}
                  className="input-primary bg-white cursor-pointer py-2 text-sm"
                >
                  <option value="ALL">All Types</option>
                  {Object.values(ProductType).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <select 
                  value={filterStock} 
                  onChange={(e) => setFilterStock(e.target.value as 'ALL' | 'LOW' | 'OUT' | 'IN')}
                  className="input-primary bg-white cursor-pointer py-2 text-sm"
                >
                  <option value="ALL">Any Stock</option>
                  <option value="IN">In Stock</option>
                  <option value="LOW">Low Stock</option>
                  <option value="OUT">Out of Stock</option>
                </select>
             </div>

             <div className="flex gap-2">
                <select 
                  value={filterBrand} 
                  onChange={(e) => setFilterBrand(e.target.value)}
                  className="input-primary bg-white cursor-pointer py-2 text-sm"
                >
                  <option value="ALL">All Brands</option>
                  {uniqueBrands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <select 
                  value={filterColor} 
                  onChange={(e) => setFilterColor(e.target.value)}
                  className="input-primary bg-white cursor-pointer py-2 text-sm"
                >
                  <option value="ALL">All Colors</option>
                  {uniqueColors.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
             </div>

             <div className="flex gap-2">
                <select 
                  value={filterSize} 
                  onChange={(e) => setFilterSize(e.target.value)}
                  className="input-primary bg-white cursor-pointer py-2 text-sm flex-1"
                >
                  <option value="ALL">All Sizes</option>
                  {uniqueSizes.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                
                {isFiltersActive && (
                 <button 
                   onClick={clearFilters}
                   className="flex items-center gap-1 text-slate-500 hover:text-red-500 px-3 py-2 rounded-lg hover:bg-red-50 transition whitespace-nowrap font-medium text-xs border border-slate-200 bg-white"
                   title="Clear All Filters"
                 >
                   <X size={14} /> Clear
                 </button>
               )}
             </div>
         </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-slate-800 text-white p-4 rounded-xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in ring-1 ring-slate-700/50">
          <div className="flex items-center gap-3 whitespace-nowrap">
            <div className="p-2 bg-indigo-500 rounded-lg">
              <Layers className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-lg">{selectedIds.size} Items Selected</span>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-3">
             <button 
               onClick={() => setBulkActionType('STOCK')}
               className="bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 px-4 py-2 rounded-lg font-bold transition flex items-center gap-2 shadow-sm"
             >
                <Package size={18} className="text-indigo-400" /> Manage Stock
             </button>

             <button 
               onClick={() => setBulkActionType('PRICING')}
               className="bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 px-4 py-2 rounded-lg font-bold transition flex items-center gap-2 shadow-sm"
             >
                <DollarSign size={18} className="text-emerald-400" /> Update Pricing
             </button>

             <div className="w-px h-8 bg-slate-600 hidden md:block mx-1"></div>

             <button 
               onClick={handleBulkDelete}
               className="bg-red-500/10 hover:bg-red-600 hover:text-white text-red-300 border border-red-500/30 px-4 py-2 rounded-lg font-bold transition flex items-center gap-2"
             >
               <Trash2 size={18} /> Delete
             </button>
          </div>

          <button onClick={() => setSelectedIds(new Set())} className="text-xs text-slate-400 hover:text-white underline decoration-dashed whitespace-nowrap">
            Cancel Selection
          </button>
        </div>
      )}

      {/* Bulk Stock Modal */}
      {bulkActionType === 'STOCK' && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
           <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 ring-1 ring-slate-200">
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                     <Package size={20} className="text-indigo-600" /> Bulk Stock Update
                  </h3>
                  <button onClick={() => setBulkActionType(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
              </div>
              <div className="space-y-4">
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button 
                         onClick={() => setBulkStockData(p => ({...p, mode: 'ADD'}))} 
                         className={`flex-1 py-2 rounded-md text-sm font-bold transition ${bulkStockData.mode === 'ADD' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                      >
                          Add to Stock
                      </button>
                      <button 
                         onClick={() => setBulkStockData(p => ({...p, mode: 'SET'}))} 
                         className={`flex-1 py-2 rounded-md text-sm font-bold transition ${bulkStockData.mode === 'SET' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                      >
                          Set Quantity
                      </button>
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Quantity</label>
                      <input 
                         type="number" 
                         autoFocus
                         placeholder="0"
                         className="w-full text-2xl font-bold border border-slate-200 rounded-xl p-3 mt-1 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                         value={bulkStockData.value}
                         onChange={e => setBulkStockData(p => ({...p, value: e.target.value}))}
                      />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Reason (History Log)</label>
                      <input 
                         type="text" 
                         placeholder="e.g. New Shipment, Audit"
                         className="w-full border border-slate-200 rounded-lg p-2.5 mt-1 outline-none focus:border-indigo-500 text-sm"
                         value={bulkStockData.reason}
                         onChange={e => setBulkStockData(p => ({...p, reason: e.target.value}))}
                      />
                  </div>
                  <button onClick={handleBulkStockUpdate} className="w-full btn-primary py-3 mt-2">
                      Apply Update to {selectedIds.size} Items
                  </button>
              </div>
           </div>
         </div>
      )}

      {/* Bulk Pricing Modal */}
      {bulkActionType === 'PRICING' && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
           <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 ring-1 ring-slate-200">
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                     <DollarSign size={20} className="text-emerald-600" /> Bulk Pricing Update
                  </h3>
                  <button onClick={() => setBulkActionType(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
              </div>
              <p className="text-sm text-slate-500 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  Enter new values below. Leave a field empty to keep the existing value for each product.
              </p>
              <div className="space-y-4">
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">New Profit Margin (GHS)</label>
                      <div className="relative mt-1">
                          <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-bold">GHS</span>
                          <input 
                             type="number" 
                             step="0.01"
                             placeholder="No Change"
                             className="w-full pl-10 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                             value={bulkPricingData.margin}
                             onChange={e => setBulkPricingData(p => ({...p, margin: e.target.value}))}
                          />
                      </div>
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">New Tax Rate (%)</label>
                      <div className="relative mt-1">
                          <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-bold">%</span>
                          <input 
                             type="number" 
                             step="0.1"
                             placeholder="No Change"
                             className="w-full pl-8 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                             value={bulkPricingData.tax}
                             onChange={e => setBulkPricingData(p => ({...p, tax: e.target.value}))}
                          />
                      </div>
                  </div>
                  <div className="text-xs text-emerald-600 bg-emerald-50 p-2 rounded flex items-start gap-2">
                      <AlertCircle size={14} className="mt-0.5 shrink-0" />
                      <span>Selling prices will be automatically recalculated based on individual product costs.</span>
                  </div>
                  <button onClick={handleBulkPricingUpdate} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl mt-2 shadow-lg shadow-emerald-600/20">
                      Update Pricing for {selectedIds.size} Items
                  </button>
              </div>
           </div>
         </div>
      )}

      {/* Low Stock Alert Banner */}
      {lowStockItems.length > 0 && filterStock !== 'LOW' && (
        <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in shadow-sm">
          <div className="flex items-center gap-3 text-amber-900">
            <div className="bg-amber-100 p-2.5 rounded-full ring-4 ring-amber-50">
              <AlertTriangle size={20} className="text-amber-600" />
            </div>
            <div>
              <span className="font-bold text-lg">{lowStockItems.length} Products</span>
              <span className="ml-1 text-amber-800">are running low (≤ {lowStockThreshold} units).</span>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white p-2 rounded-lg border border-amber-100 shadow-sm">
            <div className="flex items-center gap-2 px-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Threshold:</label>
              <input
                type="number"
                min="1"
                value={lowStockThreshold}
                onChange={e => setLowStockThreshold(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-16 border border-slate-200 focus:ring-2 focus:ring-amber-500 rounded px-2 py-1 text-center text-sm font-bold text-slate-700 outline-none bg-slate-50"
              />
            </div>
            <div className="w-px h-6 bg-slate-100"></div>
            <button
              onClick={() => setFilterStock('LOW')}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold bg-amber-500 text-white shadow-md shadow-amber-200 hover:bg-amber-600 transition"
            >
              <Filter size={16} />
              Filter Low Stock
            </button>
          </div>
        </div>
      )}

      {/* Form Area */}
      {showForm && (
        <div className="card-hover overflow-hidden animate-slide-in-top ring-1 ring-slate-200 relative z-10">
          <div className="bg-slate-50/80 backdrop-blur-sm p-4 border-b border-slate-100 flex justify-between items-center sticky top-0">
             <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
               <div className="p-1.5 bg-indigo-100 rounded text-indigo-600">
                  <PackagePlus size={18} />
               </div>
               Record New Stock Import
             </h3>
             <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-red-500 transition p-1 hover:bg-red-50 rounded">
               <X size={20} />
             </button>
          </div>
          
          <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row">
            {/* Left Side: Inputs */}
            <div className="flex-1 p-6 space-y-8 border-b lg:border-b-0 lg:border-r border-slate-100">
                
                {/* Section 1: Product Specs */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-5 flex items-center gap-2 after:content-[''] after:h-px after:flex-1 after:bg-slate-100">
                    <Tag className="w-3 h-3" /> 1. Product Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">Brand</label>
                      <input required name="brand" value={formData.brand} onChange={handleInputChange} className="input-primary" placeholder="e.g. Zara" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">Type</label>
                      <select name="type" value={formData.type} onChange={handleInputChange} className="input-primary bg-white">
                        {Object.values(ProductType).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">Model/Style</label>
                      <input required name="model" value={formData.model} onChange={handleInputChange} className="input-primary" placeholder="e.g. Slim Fit" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500">Color</label>
                          <input required name="color" value={formData.color} onChange={handleInputChange} className="input-primary" placeholder="e.g. Navy" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500">Size</label>
                          <input required name="size" value={formData.size} onChange={handleInputChange} className="input-primary" placeholder="e.g. 32" />
                        </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Financial Inputs */}
                <div>
                   <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-5 flex items-center gap-2 after:content-[''] after:h-px after:flex-1 after:bg-slate-100">
                     <Calculator className="w-3 h-3" /> 2. Costs & Pricing
                   </h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-5">
                            <div>
                                <label className="text-xs font-bold text-slate-500">Cost (CFA)</label>
                                <div className="flex items-center mt-1.5 shadow-sm rounded-lg overflow-hidden border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                                    <span className="bg-slate-100 text-slate-500 px-3 py-2.5 text-sm font-semibold border-r border-slate-200">CFA</span>
                                    <input required type="number" step="any" name="costCfa" value={formData.costCfa} onChange={handleInputChange} className="w-full p-2.5 outline-none text-slate-700 font-medium" placeholder="0.00" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500">Exchange Rate (GHS/1000 CFA)</label>
                                <div className="flex items-center mt-1.5 shadow-sm rounded-lg overflow-hidden border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                                    <span className="bg-slate-100 text-slate-500 px-3 py-2.5 text-sm font-semibold border-r border-slate-200">Rate</span>
                                    <input required type="number" step="any" name="exchangeRate" value={formData.exchangeRate} onChange={handleInputChange} className="w-full p-2.5 outline-none text-slate-700 font-medium" placeholder="e.g. 20" />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1.5 ml-1">
                                    {formData.exchangeRate ? `Current: ${formData.exchangeRate} GHS = 1,000 CFA` : 'Enter current rate'}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500">Service Charge (%)</label>
                                    <div className="flex items-center mt-1.5 shadow-sm rounded-lg overflow-hidden border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                                        <span className="bg-slate-100 text-slate-500 px-2 py-2.5 text-sm font-semibold border-r border-slate-200">%</span>
                                        <input required type="number" min="0" step="0.1" name="serviceRate" value={formData.serviceRate} onChange={handleInputChange} className="w-full p-2.5 outline-none text-slate-700 font-medium" placeholder="5" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500">Misc Charge (%)</label>
                                    <div className="flex items-center mt-1.5 shadow-sm rounded-lg overflow-hidden border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                                        <span className="bg-slate-100 text-slate-500 px-2 py-2.5 text-sm font-semibold border-r border-slate-200">%</span>
                                        <input required type="number" min="0" step="0.1" name="miscRate" value={formData.miscRate} onChange={handleInputChange} className="w-full p-2.5 outline-none text-slate-700 font-medium" placeholder="5" />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500">Tax / VAT Rate (%)</label>
                                <div className="flex items-center mt-1.5 shadow-sm rounded-lg overflow-hidden border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                                    <span className="bg-slate-100 text-slate-500 px-3 py-2.5 text-sm font-semibold border-r border-slate-200">%</span>
                                    <input required type="number" min="0" step="0.1" name="taxRate" value={formData.taxRate} onChange={handleInputChange} className="w-full p-2.5 outline-none text-slate-700 font-medium" placeholder="0" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-5">
                             <div>
                                <label className="text-xs font-bold text-slate-500">Stock Quantity</label>
                                <input required type="number" min="1" name="stockQuantity" value={formData.stockQuantity} onChange={handleInputChange} className="input-primary mt-1.5" />
                             </div>
                             <div>
                                <label className="text-xs font-bold text-slate-500">Profit Margin (GHS)</label>
                                <div className="flex items-center mt-1.5 shadow-sm rounded-lg overflow-hidden border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                                    <span className="bg-slate-100 text-slate-500 px-3 py-2.5 text-sm font-semibold border-r border-slate-200">GHS</span>
                                    <input required type="number" step="any" name="profitMargin" value={formData.profitMargin} onChange={handleInputChange} className="w-full p-2.5 outline-none text-slate-700 font-medium" placeholder="0.00" />
                                </div>
                             </div>
                        </div>
                   </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2 py-3">
                    <PackagePlus size={18} /> Add to Inventory
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 rounded-lg border border-slate-300 text-slate-600 font-medium hover:bg-slate-50 transition">
                    Cancel
                  </button>
                </div>
            </div>

            {/* Right Side: Pricing Calculator Summary */}
            <div className="w-full lg:w-96 bg-slate-50/50 p-6 border-l border-slate-200">
                <div className="sticky top-6">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <span className="bg-white border border-slate-200 p-1.5 rounded shadow-sm text-indigo-600"><Calculator size={16} /></span>
                        Pricing Summary
                    </h3>

                    <div className="bg-white rounded-xl shadow-[0_4px_15px_-3px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden mb-6">
                        <div className="p-4 border-b border-slate-50">
                             <div className="flex justify-between items-center mb-2">
                                 <span className="text-xs font-semibold text-slate-400 uppercase">Import Cost (CFA)</span>
                                 <span className="font-mono font-medium text-slate-700">{parseFloat(formData.costCfa || '0').toLocaleString()}</span>
                             </div>
                             <div className="flex justify-between items-center text-xs text-slate-400">
                                 <span>@ Rate {formData.exchangeRate || 0} / 1000</span>
                                 <ArrowRight size={12} />
                             </div>
                        </div>
                        
                        <div className="p-4 space-y-3 bg-slate-50/30">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600">Base Cost (GHS)</span>
                                <span className="font-mono text-slate-800">{pricingPreview.baseCostGhs.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Service ({formData.serviceRate || 0}%)</span>
                                <span className="font-mono text-slate-500">+{pricingPreview.serviceCharge.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Misc ({formData.miscRate || 0}%)</span>
                                <span className="font-mono text-slate-500">+{pricingPreview.miscCharge.toFixed(2)}</span>
                            </div>
                            
                            <div className="border-t border-slate-200 pt-3 mt-2 flex justify-between items-center">
                                <span className="font-bold text-sm text-indigo-900">Total Landed Cost</span>
                                <span className="font-mono font-bold text-indigo-900">{pricingPreview.totalCost.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="p-4 bg-white border-t border-slate-100 space-y-3">
                             <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">Target Profit Margin</span>
                                <span className="font-mono font-medium text-emerald-600">+{parseFloat(formData.profitMargin || '0').toFixed(2)}</span>
                             </div>
                             <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">Price (Pre-Tax)</span>
                                <span className="font-mono font-medium text-slate-600">{pricingPreview.pricePreTax.toFixed(2)}</span>
                             </div>
                             <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">Tax / VAT ({formData.taxRate || 0}%)</span>
                                <span className="font-mono font-medium text-rose-500">+{pricingPreview.taxAmount.toFixed(2)}</span>
                             </div>
                        </div>

                        <div className="bg-slate-900 p-5 text-white">
                             <span className="block text-xs uppercase text-slate-400 font-bold mb-1 tracking-wider">Final Selling Price</span>
                             <div className="flex items-baseline gap-1">
                                <span className="text-sm font-medium text-slate-300">GHS</span>
                                <span className="text-3xl font-bold tracking-tight text-white">{Math.ceil(pricingPreview.finalPrice).toFixed(2)}</span>
                             </div>
                             <p className="text-[10px] mt-2 text-slate-500">
                                *Rounded up to nearest whole number
                             </p>
                        </div>
                    </div>
                </div>
            </div>
          </form>
        </div>
      )}

      <div className="card-hover overflow-hidden ring-1 ring-slate-100">
        <div className="max-h-[600px] overflow-y-auto">
          <table className="w-full text-left border-collapse relative">
            <thead className="bg-slate-50/95 backdrop-blur-sm text-slate-500 text-xs uppercase font-semibold sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-4 w-10">
                  <input 
                    type="checkbox" 
                    checked={filteredProducts.length > 0 && selectedIds.size === filteredProducts.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                <th className="p-4">Product Details</th>
                <th className="p-4">Color/Size</th>
                <th className="p-4 text-right">Cost (CFA)</th>
                <th className="p-4 text-right">Cost (GHS)</th>
                <th className="p-4 text-right">Price (GHS)</th>
                <th className="p-4 text-center">Stock</th>
                <th className="p-4 text-center">Date Added</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredProducts.map(p => (
                <tr key={p.id} className={`group hover:bg-slate-50 transition duration-200 ${p.stockQuantity <= lowStockThreshold && p.stockQuantity > 0 ? 'bg-amber-50/40' : ''} ${p.stockQuantity === 0 ? 'bg-red-50/20' : ''} ${selectedIds.has(p.id) ? 'bg-indigo-50/60' : ''}`}>
                  <td className="p-4">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(p.id)}
                      onChange={() => toggleSelectOne(p.id)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-slate-800">{p.brand}</div>
                    <div className="text-slate-500 text-xs font-medium">{p.type} <span className="text-slate-300">•</span> {p.model}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-700 font-medium">{p.color}</span>
                      <span className="self-start bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded text-[11px] font-bold">{p.size}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right font-mono text-slate-500 text-xs">
                    {p.costCfa.toLocaleString()}
                  </td>
                  <td className="p-4 text-right font-mono text-slate-500 text-xs">
                    {p.costGhsBase.toFixed(2)}
                  </td>
                  <td className="p-4 text-right font-mono font-bold text-indigo-600">
                    {p.sellingPrice.toFixed(2)}
                  </td>
                  <td className="p-4 text-center relative">
                    {editingId === p.id ? (
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                          <div className="flex flex-col gap-1 items-center bg-white p-2 rounded-lg shadow-xl border border-indigo-100 ring-4 ring-indigo-500/10 min-w-[140px]">
                            <div className="flex items-center gap-1 w-full">
                                <input 
                                type="number" 
                                min="0"
                                className="flex-1 w-full border border-indigo-300 rounded px-1.5 py-1 text-center text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-700"
                                value={editStockQty}
                                onChange={(e) => setEditStockQty(parseInt(e.target.value) || 0)}
                                autoFocus
                                />
                                <button 
                                onClick={() => saveStockUpdate(p.id)} 
                                className="bg-emerald-100 text-emerald-700 p-1.5 rounded-md hover:bg-emerald-200 transition-colors"
                                title="Save"
                                >
                                <Check size={14} />
                                </button>
                                <button 
                                onClick={cancelEditing} 
                                className="bg-rose-100 text-rose-700 p-1.5 rounded-md hover:bg-rose-200 transition-colors"
                                title="Cancel"
                                >
                                <X size={14} />
                                </button>
                            </div>
                            <input 
                                type="text" 
                                placeholder="Reason (e.g. Damage)" 
                                value={editReason}
                                onChange={(e) => setEditReason(e.target.value)}
                                className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-indigo-400 placeholder:text-slate-400"
                            />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${p.stockQuantity > 0 ? (p.stockQuantity <= lowStockThreshold ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200') : 'bg-rose-100 text-rose-700 border-rose-200'}`}>
                          {p.stockQuantity === 0 ? 'Out of Stock' : p.stockQuantity}
                        </span>
                        <button 
                          onClick={() => startEditing(p)}
                          className="text-slate-300 hover:text-indigo-600 transition-all p-1.5 rounded-md hover:bg-slate-200 opacity-0 group-hover:opacity-100"
                          title="Edit Stock Quantity"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-center text-xs text-slate-500">
                    {new Date(p.dateAdded).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openHistory(p)} className="text-slate-300 hover:text-indigo-500 transition p-2 hover:bg-indigo-50 rounded-full" title="Stock History">
                            <History size={18} />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="text-slate-300 hover:text-red-500 transition p-2 hover:bg-red-50 rounded-full" title="Delete Item">
                            <Trash2 size={18} />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-16 text-center">
                     <div className="flex flex-col items-center justify-center text-slate-400 gap-4">
                       <div className="bg-slate-50 p-6 rounded-full ring-1 ring-slate-100">
                          <Search className="w-10 h-10 text-slate-300" />
                       </div>
                       <div>
                         <p className="font-semibold text-slate-600">No items found</p>
                         <p className="text-sm mt-1">Try adjusting your search or filters.</p>
                       </div>
                       <button onClick={clearFilters} className="text-indigo-600 text-sm font-medium hover:underline hover:text-indigo-700 transition">Clear all filters</button>
                     </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 ring-1 ring-slate-200">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 ring-8 ring-red-50/50">
                <Trash2 className="text-red-500 w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Delete {selectedIds.size} Items?</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Are you sure you want to permanently delete these items? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition active:scale-95"
              >
                Cancel
              </button>
              <button 
                onClick={confirmBulkDelete}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition shadow-lg shadow-red-500/30 active:scale-95"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModal.isOpen && historyModal.product && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col max-h-[80vh] overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <div>
                          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                             <Clock size={18} className="text-slate-500" /> Stock History
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                             {historyModal.product.brand} {historyModal.product.type} - {historyModal.product.color}
                          </p>
                      </div>
                      <button onClick={() => setHistoryModal({isOpen: false, product: null})} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <div className="overflow-y-auto p-0">
                      {(!historyModal.product.history || historyModal.product.history.length === 0) ? (
                          <div className="p-12 text-center text-slate-400 italic">No history available for this product.</div>
                      ) : (
                          <table className="w-full text-sm text-left">
                              <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold sticky top-0 z-10">
                                  <tr>
                                      <th className="px-5 py-3">Date</th>
                                      <th className="px-5 py-3">Action</th>
                                      <th className="px-5 py-3 text-right">Change</th>
                                      <th className="px-5 py-3 text-right">Balance</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                  {[...historyModal.product.history].reverse().map(entry => (
                                      <tr key={entry.id} className="hover:bg-slate-50/50">
                                          <td className="px-5 py-3 text-slate-600 whitespace-nowrap">
                                              <div className="font-medium">{new Date(entry.date).toLocaleDateString()}</div>
                                              <div className="text-[10px] text-slate-400">{new Date(entry.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                          </td>
                                          <td className="px-5 py-3">
                                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                                                  entry.type === 'SALE' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                                  entry.type === 'RETURN' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                                  entry.type === 'INITIAL' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                                                  'bg-emerald-50 text-emerald-700 border-emerald-100'
                                              }`}>
                                                  {entry.type.replace('_', ' ')}
                                              </span>
                                              {entry.note && <div className="text-[10px] text-slate-400 mt-0.5 max-w-[120px] truncate" title={entry.note}>{entry.note}</div>}
                                          </td>
                                          <td className={`px-5 py-3 text-right font-bold ${entry.quantityChange > 0 ? 'text-emerald-600' : entry.quantityChange < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                                              {entry.quantityChange > 0 ? '+' : ''}{entry.quantityChange}
                                          </td>
                                          <td className="px-5 py-3 text-right font-mono text-slate-600">
                                              {entry.newStockLevel}
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Inventory;