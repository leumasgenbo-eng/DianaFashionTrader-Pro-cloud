
import React, { useState } from 'react';
import { User, Role, Customer } from '../types';
import { Lock, User as UserIcon, Store, ArrowRight, ShieldCheck, Smartphone, Wallet, KeyRound, Timer } from 'lucide-react';

interface AuthProps {
  onLogin: (user: User) => void;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  staffList: User[];
}

const Auth: React.FC<AuthProps> = ({ onLogin, customers, setCustomers, staffList }) => {
  const [mode, setMode] = useState<'STAFF' | 'CUSTOMER'>('STAFF');
  const [isSignUp, setIsSignUp] = useState(false);

  // Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState(''); 
  
  // OTP States for Cashier
  const [authStep, setAuthStep] = useState<'CREDENTIALS' | 'OTP'>('CREDENTIALS');
  const [otpSent, setOtpSent] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [pendingCashier, setPendingCashier] = useState<User | null>(null);
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const handleStaffLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Find user in the passed staffList
    // Note: In a real app, passwords would be hashed.
    const detectedUser = staffList.find(
        u => u.username === username && u.password === password && u.status === 'ACTIVE'
    );

    if (detectedUser) {
        if (detectedUser.role === 'CASHIER') {
           // Cashier flow triggers OTP
           const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
           setOtpSent(generatedOtp);
           setPendingCashier(detectedUser);
           setAuthStep('OTP');
           
           // SIMULATE EMAIL SENDING
           setTimeout(() => {
               alert(`[SIMULATED EMAIL]\nFrom: leumasgenbo@gmail.com\n\nAuthentication Code for Cashier Login: ${generatedOtp}`);
           }, 500);
        } else {
            // Direct Login for others
            onLogin(detectedUser);
        }
    } else {
      alert('Invalid credentials or account is not active.');
    }
  };

  const handleOtpVerify = (e: React.FormEvent) => {
      e.preventDefault();
      if (otpInput === otpSent && pendingCashier) {
          // 3 Hour Expiry Calculation
          const sessionDuration = 3 * 60 * 60 * 1000; // 3 hours in ms
          const expiryTime = Date.now() + sessionDuration;

          const cashierUser: User = { 
              ...pendingCashier,
              sessionExpiry: expiryTime
          };
          onLogin(cashierUser);
      } else {
          alert("Invalid Code. Please check your email.");
      }
  };

  const handleCustomerAuth = (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanPhone = customerPhone.replace(/\D/g, '');
    
    if (cleanPhone.length < 9) {
      alert("Please enter a valid phone number");
      return;
    }

    const existingCustomer = customers.find(c => c.phone.replace(/\D/g, '') === cleanPhone);

    if (isSignUp) {
      if (existingCustomer) {
        alert("This phone number is already registered. Please sign in.");
        setIsSignUp(false);
        return;
      }
      const newCust: Customer = {
        id: crypto.randomUUID(),
        name: customerName,
        phone: customerPhone,
        totalSpent: 0,
        lastPurchaseDate: new Date().toISOString(),
        preferences: []
      };
      setCustomers(prev => [...prev, newCust]);
      onLogin({ id: newCust.id, name: newCust.name, username: newCust.phone, role: 'CUSTOMER' });
    } else {
      if (existingCustomer) {
        onLogin({ id: existingCustomer.id, name: existingCustomer.name, username: existingCustomer.phone, role: 'CUSTOMER' });
      } else {
        if(confirm("Customer not found. Would you like to sign up?")) {
            setIsSignUp(true);
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Brand & Toggle */}
        <div className="md:w-5/12 bg-indigo-600 p-8 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
             <h1 className="text-3xl font-bold tracking-tight mb-2">D's <span className="text-indigo-200">Man-Ware</span></h1>
             <p className="text-indigo-100 text-sm">Professional inventory & sales management.</p>
          </div>

          <div className="relative z-10 space-y-4">
             <div 
               onClick={() => { setMode('STAFF'); setAuthStep('CREDENTIALS'); }}
               className={`cursor-pointer p-4 rounded-xl border transition-all flex items-center gap-3 ${mode === 'STAFF' ? 'bg-white text-indigo-900 border-white shadow-lg' : 'border-indigo-400 text-indigo-100 hover:bg-indigo-700'}`}
             >
                <ShieldCheck size={24} />
                <div>
                  <h3 className="font-bold">Staff Portal</h3>
                  <p className="text-xs opacity-80">Admin, Sales & Cashiers</p>
                </div>
             </div>

             <div 
               onClick={() => setMode('CUSTOMER')}
               className={`cursor-pointer p-4 rounded-xl border transition-all flex items-center gap-3 ${mode === 'CUSTOMER' ? 'bg-white text-indigo-900 border-white shadow-lg' : 'border-indigo-400 text-indigo-100 hover:bg-indigo-700'}`}
             >
                <Store size={24} />
                <div>
                  <h3 className="font-bold">Customer Shop</h3>
                  <p className="text-xs opacity-80">Browse Catalog & Order</p>
                </div>
             </div>
          </div>
          
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-800 rounded-full mix-blend-multiply filter blur-3xl opacity-50 translate-y-1/2 -translate-x-1/2"></div>
        </div>

        {/* Right Side: Forms */}
        <div className="md:w-7/12 p-8 md:p-12 bg-slate-50 flex flex-col justify-center">
          
          {mode === 'STAFF' ? (
            <div className="animate-fade-in">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-800">
                    {authStep === 'CREDENTIALS' ? 'Staff Login' : 'Cashier Authentication'}
                </h2>
                <p className="text-slate-500 text-sm">
                    {authStep === 'CREDENTIALS' ? 'Access the management dashboard.' : 'Enter the code sent to your email.'}
                </p>
              </div>

              {authStep === 'CREDENTIALS' ? (
                  <form onSubmit={handleStaffLogin} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Username</label>
                      <div className="relative mt-1">
                        <UserIcon className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                        <input 
                          type="text" 
                          value={username}
                          onChange={e => setUsername(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                          placeholder="e.g. admin or cashier"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                        <input 
                          type="password" 
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                    <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-indigo-200 transition mt-2 flex justify-center items-center gap-2">
                      Sign In <ArrowRight size={18} />
                    </button>
                  </form>
              ) : (
                  <form onSubmit={handleOtpVerify} className="space-y-4">
                      <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg flex items-start gap-3">
                          <Timer className="text-amber-500 w-5 h-5 mt-0.5" />
                          <div>
                              <p className="text-sm text-amber-900 font-medium">Session Security</p>
                              <p className="text-xs text-amber-700 mt-1">Cashier sessions are valid for 3 hours. Please verify your identity.</p>
                          </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Verification Code</label>
                        <div className="relative mt-1">
                            <KeyRound className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                            <input 
                            type="text" 
                            autoFocus
                            value={otpInput}
                            onChange={e => setOtpInput(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-lg tracking-widest font-mono"
                            placeholder="0000"
                            />
                        </div>
                      </div>
                      <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-indigo-200 transition mt-2 flex justify-center items-center gap-2">
                         Verify & Launch POS <Wallet size={18} />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setAuthStep('CREDENTIALS')} 
                        className="w-full text-slate-400 text-sm hover:text-slate-600"
                      >
                          Back to Login
                      </button>
                  </form>
              )}

              {authStep === 'CREDENTIALS' && (
                  <div className="mt-6 text-xs text-center text-slate-400">
                    <p>Default Logins:</p>
                    <p>admin / password</p>
                    <p>cashier / password</p>
                  </div>
              )}
            </div>
          ) : (
            <div className="animate-fade-in">
              {/* Customer Form (Unchanged) */}
               <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-800">{isSignUp ? 'Join Our Shop' : 'Customer Sign In'}</h2>
                <p className="text-slate-500 text-sm">{isSignUp ? 'Register to start booking orders.' : 'Welcome back! Enter your details.'}</p>
              </div>
              <form onSubmit={handleCustomerAuth} className="space-y-4">
                {isSignUp && (
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                    <div className="relative mt-1">
                      <UserIcon className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                      <input 
                        type="text" 
                        required={isSignUp}
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                        placeholder="Jane Doe"
                      />
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Phone Number</label>
                  <div className="relative mt-1">
                    <Smartphone className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                    <input 
                      type="tel" 
                      required
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                      placeholder="024 XXX XXXX"
                    />
                  </div>
                </div>
                <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-emerald-200 transition mt-2 flex justify-center items-center gap-2">
                  {isSignUp ? 'Create Account' : 'Enter Shop'} <ArrowRight size={18} />
                </button>
              </form>
              <div className="mt-6 text-center">
                 <button 
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-sm text-indigo-600 font-bold hover:underline"
                 >
                    {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                 </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Auth;
