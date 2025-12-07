import React, { useState, useEffect } from 'react';
import { ViewState, Product, Sale, Customer, User, Role } from './types';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import SalesLedger from './components/SalesLedger';
import Customers from './components/Customers';
import CustomerShop from './components/CustomerShop';
import CashierDashboard from './components/CashierDashboard';
import StaffManagement from './components/StaffManagement';
import OrderQueue from './components/OrderQueue';
import DailySalesSummary from './components/DailySalesSummary';
import Auth from './components/Auth';
import { exportToExcel } from './services/excelService';
import { isCloudEnabled, fetchProducts, fetchSales, fetchCustomers, fetchStaff, saveCustomer } from './services/dataService';
import { LayoutDashboard, PackageSearch, Users, ShoppingCart, Download, Menu, X, LogOut, UserCircle, Banknote, Briefcase, ClipboardList, PieChart } from 'lucide-react';

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Initialize Data State (Local Cache first)
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('products');
    return saved ? JSON.parse(saved) : [];
  });
  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('sales');
    return saved ? JSON.parse(saved) : [];
  });
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('customers');
    return saved ? JSON.parse(saved) : [];
  });

  // Initialize Staff List with Default Users
  const [staffList, setStaffList] = useState<User[]>(() => {
    const saved = localStorage.getItem('staffList');
    if (saved) return JSON.parse(saved);
    return [
      { id: '1', name: 'Administrator', username: 'admin', role: 'ADMIN', status: 'ACTIVE', password: 'password', dateHired: '2023-01-01', payroll: { baseSalary: 3500, allowances: 500, deductions: 200, paymentMethod: 'BANK', accountNumber: '123456789', bankName: 'GCB' }, email: 'admin@dsmanware.com' },
      { id: '2', name: 'Store Manager', username: 'manager', role: 'MANAGER', status: 'ACTIVE', password: 'password', dateHired: '2023-02-15', payroll: { baseSalary: 2500, allowances: 300, deductions: 150, paymentMethod: 'MOMO', accountNumber: '0244123456', bankName: 'MTN' } },
      { id: '3', name: 'Sales Rep 1', username: 'sales', role: 'SALESMAN', status: 'ACTIVE', password: 'password', dateHired: '2023-03-10' },
      { id: '4', name: 'Front Desk Cashier', username: 'cashier', role: 'CASHIER', status: 'ACTIVE', password: 'password', dateHired: '2023-04-20' },
    ];
  });

  // --- CLOUD SYNC ---
  useEffect(() => {
    const loadCloudData = async () => {
      if (isCloudEnabled()) {
        console.log("Connecting to Supabase...");
        
        const fetchedProducts = await fetchProducts();
        if (fetchedProducts) setProducts(fetchedProducts);

        const fetchedSales = await fetchSales();
        if (fetchedSales) setSales(fetchedSales);

        const fetchedCustomers = await fetchCustomers();
        if (fetchedCustomers) setCustomers(fetchedCustomers);

        const fetchedStaff = await fetchStaff();
        if (fetchedStaff && fetchedStaff.length > 0) setStaffList(fetchedStaff);
      }
    };
    loadCloudData();
  }, []);

  // Persistence Effects (Local Backup)
  useEffect(() => { localStorage.setItem('products', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('sales', JSON.stringify(sales)); }, [sales]);
  useEffect(() => { localStorage.setItem('customers', JSON.stringify(customers)); }, [customers]);
  useEffect(() => { localStorage.setItem('staffList', JSON.stringify(staffList)); }, [staffList]);
  
  // User Session Management
  useEffect(() => { 
    if (user) {
        localStorage.setItem('currentUser', JSON.stringify(user)); 
        
        // Auto-logout for Cashiers if session expired
        if (user.role === 'CASHIER' && user.sessionExpiry) {
            const now = Date.now();
            if (now > user.sessionExpiry) {
                alert("Session Expired. Please log in again.");
                handleLogout();
                return;
            }
            
            // Set timeout for remaining time
            const remaining = user.sessionExpiry - now;
            const timer = setTimeout(() => {
                alert("Session Expired. Please log in again.");
                handleLogout();
            }, remaining);
            return () => clearTimeout(timer);
        }
    } else {
        localStorage.removeItem('currentUser');
    }
  }, [user]);

  // Auth Handlers
  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    // Set default view based on role
    if (loggedInUser.role === 'CUSTOMER') {
      setView('PUBLIC_SHOP');
    } else if (loggedInUser.role === 'SALESMAN') {
      setView('SALES');
    } else if (loggedInUser.role === 'CASHIER') {
      setView('CASHIER');
    } else {
      setView('DASHBOARD');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setView('DASHBOARD');
  };

  // Helper to update customer stats when a sale happens
  const updateCustomerSpend = async (customerId: string, amount: number, purchasedProducts: Product[]) => {
    // 1. Update Local State
    let updatedCustomer: Customer | null = null;
    
    setCustomers(prev => prev.map(c => {
      if (c.id === customerId) {
        const newPreferences = new Set([...c.preferences]);
        purchasedProducts.forEach(p => newPreferences.add(`${p.type} ${p.size}`));
        
        updatedCustomer = {
          ...c,
          totalSpent: c.totalSpent + amount,
          lastPurchaseDate: new Date().toISOString(),
          preferences: Array.from(newPreferences)
        };
        return updatedCustomer;
      }
      return c;
    }));

    // 2. Sync to Cloud
    if (updatedCustomer) {
        await saveCustomer(updatedCustomer);
    }
  };

  // Define Navigation Items based on Role
  const getNavItems = (role: Role) => {
    const allItems = [
      { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER'] },
      { id: 'INVENTORY', label: 'Inventory', icon: PackageSearch, roles: ['ADMIN', 'MANAGER', 'SALESMAN'] },
      { id: 'SALES', label: 'Sales Ledger', icon: ShoppingCart, roles: ['ADMIN', 'MANAGER', 'SALESMAN'] },
      { id: 'ORDER_QUEUE', label: 'Order Queue', icon: ClipboardList, roles: ['ADMIN', 'MANAGER', 'CASHIER', 'SALESMAN'] },
      { id: 'CASHIER', label: 'Cashier Point', icon: Banknote, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
      { id: 'DAILY_SUMMARY', label: 'Daily Report', icon: PieChart, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
      { id: 'CUSTOMERS', label: 'Customers', icon: Users, roles: ['ADMIN', 'MANAGER'] },
      { id: 'STAFF', label: 'Staff Management', icon: Briefcase, roles: ['ADMIN', 'MANAGER'] },
    ];

    return allItems.filter(item => item.roles.includes(role));
  };

  // 1. If not logged in, show Auth
  if (!user) {
    return (
      <Auth 
        onLogin={handleLogin} 
        customers={customers} 
        setCustomers={setCustomers} 
        staffList={staffList}
      />
    );
  }

  // 2. If Customer, show ONLY Shop
  if (user.role === 'CUSTOMER') {
    return (
        <CustomerShop 
            products={products}
            setProducts={setProducts}
            setSales={setSales}
            onExit={handleLogout} 
            currentUser={user}
        />
    );
  }

  // 3. Staff View (Admin, Manager, Salesman, Cashier)
  const navItems = getNavItems(user.role);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
        <h1 className="text-xl font-bold tracking-tight">D's Man-Ware</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 hover:bg-slate-800 rounded-lg">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed md:sticky top-0 h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-slate-300 w-64 flex-shrink-0 flex flex-col transition-transform duration-300 z-40 shadow-xl
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 border-b border-slate-700/50">
           <h1 className="text-2xl font-bold text-white tracking-tight">D's <span className="text-indigo-400">Man-Ware</span></h1>
           <div className="flex items-center gap-2 mt-3 p-2 bg-slate-800/50 rounded-lg border border-slate-700">
              <div className="bg-indigo-500 rounded-full p-1">
                 <UserCircle size={16} className="text-white" />
              </div>
              <div className="overflow-hidden">
                  <p className="text-sm font-bold text-white truncate">{user.name}</p>
                  <p className="text-[10px] uppercase font-bold text-indigo-400">{user.role}</p>
              </div>
           </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setView(item.id as ViewState); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group ${
                view === item.id 
                  ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)]' 
                  : 'hover:bg-slate-800 hover:text-white hover:translate-x-1'
              }`}
            >
              <item.icon size={20} className={`${view === item.id ? 'text-white' : 'text-slate-400 group-hover:text-white'} transition-colors`} />
              <span className="font-medium tracking-wide">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-3">
          {(user.role === 'ADMIN' || user.role === 'MANAGER') && (
            <button 
                onClick={() => exportToExcel(products, sales, customers)}
                className="w-full flex items-center justify-center gap-2 bg-slate-800/80 hover:bg-emerald-600/90 text-white px-4 py-3 rounded-lg transition-all duration-300 border border-slate-700 hover:border-emerald-500 shadow-lg"
            >
                <Download size={18} />
                <span className="text-sm font-semibold">Export Data</span>
            </button>
          )}
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-200 px-4 py-3 rounded-lg transition-all"
          >
            <LogOut size={18} />
            <span className="text-sm font-semibold">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen bg-slate-50 scroll-smooth">
        <div className="max-w-7xl mx-auto">
          {view === 'DASHBOARD' && (user.role === 'ADMIN' || user.role === 'MANAGER') && 
            <Dashboard products={products} sales={sales} />
          }
          {view === 'INVENTORY' && 
            <Inventory products={products} setProducts={setProducts} />
          }
          {view === 'SALES' && 
            <SalesLedger 
                products={products} 
                setProducts={setProducts} 
                sales={sales} 
                setSales={setSales} 
                customers={customers} 
                updateCustomerSpend={updateCustomerSpend} 
                currentUser={user}
            />
          }
          {view === 'CASHIER' && 
             <CashierDashboard sales={sales} setSales={setSales} currentUser={user} />
          }
          {view === 'ORDER_QUEUE' && 
             <OrderQueue sales={sales} setSales={setSales} />
          }
          {view === 'DAILY_SUMMARY' && 
             <DailySalesSummary sales={sales} />
          }
          {view === 'CUSTOMERS' && (user.role === 'ADMIN' || user.role === 'MANAGER') && 
            <Customers customers={customers} setCustomers={setCustomers} products={products} />
          }
          {view === 'STAFF' && (user.role === 'ADMIN' || user.role === 'MANAGER') && 
            <StaffManagement currentUser={user} staffList={staffList} setStaffList={setStaffList} />
          }
        </div>
      </main>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}
    </div>
  );
};

export default App;