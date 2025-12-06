
import React, { useState } from 'react';
import { User, Role, StaffStatus, StaffPolicy } from '../types';
import { Users, UserPlus, FileText, Download, CheckCircle, XCircle, AlertTriangle, Shield, UploadCloud, Trash2, Banknote, CreditCard, PenLine, Save, X, Wallet, Building2, Calculator, Paperclip, MessageSquare, Calendar, Mail } from 'lucide-react';
import { exportStaffData, exportPayrollRun } from '../services/excelService';

interface StaffManagementProps {
  currentUser: User;
  staffList: User[];
  setStaffList: React.Dispatch<React.SetStateAction<User[]>>;
}

const StaffManagement: React.FC<StaffManagementProps> = ({ currentUser, staffList, setStaffList }) => {
  const [policies, setPolicies] = useState<StaffPolicy[]>([
    { id: '1', title: 'Employee Conduct Policy', uploadDate: '2023-10-01', size: '1.2 MB', type: 'PDF' },
    { id: '2', title: 'Sales Procedure Manual', uploadDate: '2023-11-15', size: '2.4 MB', type: 'PDF' },
  ]);

  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'RECRUITMENT' | 'PAYROLL' | 'POLICIES'>('DIRECTORY');
  
  // Recruitment Form State
  const [newStaff, setNewStaff] = useState({ name: '', username: '', role: 'SALESMAN' as Role, password: '' });

  // Submission Justification State (For Managers)
  const [justificationModal, setJustificationModal] = useState<{ isOpen: boolean; type: 'RECRUIT' | 'DISMISS'; targetId?: string; payload?: any }>({ isOpen: false, type: 'RECRUIT' });
  const [submissionData, setSubmissionData] = useState({ reason: '', documents: null as File | null });

  // Approval Modal State (For Admins)
  const [approvalModal, setApprovalModal] = useState<{ isOpen: boolean; staffId: string | null }>({ isOpen: false, staffId: null });
  const [commencementDate, setCommencementDate] = useState('');

  // Payroll Editing State
  const [editingPayrollId, setEditingPayrollId] = useState<string | null>(null);
  const [payrollForm, setPayrollForm] = useState({ baseSalary: 0, allowances: 0, deductions: 0, accountNumber: '', bankName: '', paymentMethod: 'BANK' as 'BANK'|'MOMO'|'CASH' });

  // -- Logic Handlers --

  const handlePreRecruit = (e: React.FormEvent) => {
      e.preventDefault();
      // If Admin and specific roles, bypass justification
      const isSoleMandateRole = newStaff.role === 'CASHIER' || newStaff.role === 'MANAGER';
      const isAdmin = currentUser.role === 'ADMIN';

      if (isAdmin && isSoleMandateRole) {
          // Admin creating manager/cashier directly
          submitRecruitment(true); 
      } else {
          // Open Justification Modal
          setJustificationModal({ isOpen: true, type: 'RECRUIT', payload: newStaff });
      }
  };

  const submitRecruitment = (instantApprove: boolean = false) => {
    let initialStatus: StaffStatus = instantApprove ? 'ACTIVE' : 'PENDING_APPROVAL';
    
    const docName = submissionData.documents ? submissionData.documents.name : '';
    const today = new Date().toISOString().split('T')[0];

    const newUser: User = {
        id: crypto.randomUUID(),
        name: newStaff.name,
        username: newStaff.username,
        role: newStaff.role,
        status: initialStatus,
        dateHired: instantApprove ? today : undefined,
        nominatedBy: currentUser.name,
        password: newStaff.password,
        justification: submissionData.reason,
        attachment: docName
    };

    // If instant approve (Admin sole mandate), create empty payroll immediately
    if (instantApprove) {
         newUser.payroll = {
             baseSalary: 0,
             allowances: 0,
             deductions: 0,
             paymentMethod: 'CASH',
             accountNumber: '',
             bankName: ''
         };
    }

    setStaffList(prev => [...prev, newUser]);
    setNewStaff({ name: '', username: '', role: 'SALESMAN', password: '' });
    setSubmissionData({ reason: '', documents: null });
    setJustificationModal({ isOpen: false, type: 'RECRUIT' });
    
    if (initialStatus === 'ACTIVE') {
        alert(`Staff added successfully. Welcome email sent to ${newStaff.username} via leumasgenbo@gmail.com.`);
    } else {
        alert("Recruitment nomination submitted. Visible to Administrator for approval.");
    }
  };

  const openApprovalModal = (id: string) => {
      setApprovalModal({ isOpen: true, staffId: id });
      setCommencementDate(''); // Reset date
  };

  const submitApproval = () => {
    if (!approvalModal.staffId || !commencementDate) {
        alert("Please select a commencement date.");
        return;
    }

    setStaffList(prev => prev.map(s => {
        if (s.id === approvalModal.staffId) {
            // Create Default Payroll Record
            const defaultPayroll = {
                baseSalary: 0,
                allowances: 0,
                deductions: 0,
                paymentMethod: 'BANK' as const,
                accountNumber: '',
                bankName: ''
            };

            return { 
                ...s, 
                status: 'ACTIVE',
                dateHired: commencementDate,
                payroll: defaultPayroll // Automatically add to payroll
            };
        }
        return s;
    }));

    // Retrieve staff name for alert
    const staff = staffList.find(s => s.id === approvalModal.staffId);
    
    alert(`
      ✅ Staff Approved!
      
      📧 Email sent to: ${staff?.name}
      📅 Commencement Date: ${commencementDate}
      💰 Added to Payroll (Pending Configuration)
      
      Sent from: leumasgenbo@gmail.com
    `);

    setApprovalModal({ isOpen: false, staffId: null });
  };

  const handleInitiateDismissal = (id: string) => {
     // Open Justification Modal
     setJustificationModal({ isOpen: true, type: 'DISMISS', targetId: id });
  };

  const submitDismissal = () => {
      if (!justificationModal.targetId) return;
      const id = justificationModal.targetId;

      setStaffList(prev => prev.map(s => {
         if (s.id === id) {
             return { 
                 ...s, 
                 status: 'PENDING_DISMISSAL' as StaffStatus, 
                 nominatedBy: currentUser.name,
                 justification: submissionData.reason,
                 attachment: submissionData.documents ? submissionData.documents.name : ''
             };
         }
         return s;
      }));

      setJustificationModal({ isOpen: false, type: 'DISMISS' });
      setSubmissionData({ reason: '', documents: null });
      alert("Dismissal initiated. Pending Administrator Approval.");
  };

  const handleConfirmDismissal = (id: string) => {
      setStaffList(prev => prev.map(s => s.id === id ? { ...s, status: 'DISMISSED' } : s));
  };

  const handleRejectAction = (id: string) => {
      setStaffList(prev => prev.map(s => s.id === id ? { ...s, status: 'ACTIVE' } : s));
  };

  const handleUploadPolicy = () => {
      const title = prompt("Enter Policy Title:");
      if (title) {
          const newPolicy: StaffPolicy = {
              id: crypto.randomUUID(),
              title,
              uploadDate: new Date().toISOString(),
              size: '0.5 MB',
              type: 'DOC'
          };
          setPolicies(prev => [newPolicy, ...prev]);
      }
  };

  // --- PAYROLL HANDLERS ---
  const startEditingPayroll = (user: User) => {
    setEditingPayrollId(user.id);
    if (user.payroll) {
        setPayrollForm({
            baseSalary: user.payroll.baseSalary,
            allowances: user.payroll.allowances,
            deductions: user.payroll.deductions,
            accountNumber: user.payroll.accountNumber,
            bankName: user.payroll.bankName || '',
            paymentMethod: user.payroll.paymentMethod
        });
    } else {
        setPayrollForm({ baseSalary: 0, allowances: 0, deductions: 0, accountNumber: '', bankName: '', paymentMethod: 'BANK' });
    }
  };

  const savePayroll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayrollId) return;
    
    setStaffList(prev => prev.map(s => {
        if (s.id === editingPayrollId) {
            return {
                ...s,
                payroll: {
                    baseSalary: Number(payrollForm.baseSalary),
                    allowances: Number(payrollForm.allowances),
                    deductions: Number(payrollForm.deductions),
                    paymentMethod: payrollForm.paymentMethod,
                    accountNumber: payrollForm.accountNumber,
                    bankName: payrollForm.bankName,
                    lastPaidDate: s.payroll?.lastPaidDate
                }
            };
        }
        return s;
    }));
    setEditingPayrollId(null);
  };

  const handleRunPayroll = () => {
      if(confirm("Generate Payroll Schedule for all ACTIVE staff?")) {
          exportPayrollRun(staffList);
          const today = new Date().toISOString();
          setStaffList(prev => prev.map(s => {
              if (s.status === 'ACTIVE' && s.payroll) {
                  return { ...s, payroll: { ...s.payroll, lastPaidDate: today } };
              }
              return s;
          }));
          alert("Payroll schedule downloaded. Staff marked as PAID for today.");
      }
  };

  const pendingApprovals = staffList.filter(s => s.status === 'PENDING_APPROVAL');
  const pendingDismissals = staffList.filter(s => s.status === 'PENDING_DISMISSAL');
  const activeStaff = staffList.filter(s => s.status === 'ACTIVE');

  // Filter staff directory based on role
  // Managers can see Active staff and Pending staff they nominated
  const directoryList = staffList.filter(s => {
      if (s.status === 'DISMISSED') return false;
      if (currentUser.role === 'ADMIN') return true;
      if (s.status === 'PENDING_APPROVAL' && s.nominatedBy === currentUser.name) return true;
      if (s.status === 'ACTIVE') return true;
      return false;
  });

  const totalWageBill = activeStaff.reduce((sum, s) => {
      const p = s.payroll;
      if (!p) return sum;
      return sum + (p.baseSalary + p.allowances);
  }, 0);

  const editingUser = staffList.find(s => s.id === editingPayrollId);

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Staff Management</h2>
          <p className="text-slate-500 text-sm mt-1">HR, Recruitment, Payroll and Policy Administration</p>
        </div>
        <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
             <button 
               onClick={() => setActiveTab('DIRECTORY')}
               className={`px-4 py-2 rounded-md text-sm font-bold transition whitespace-nowrap ${activeTab === 'DIRECTORY' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
             >
                 Directory
             </button>
             {currentUser.role === 'ADMIN' && (
                 <button 
                 onClick={() => setActiveTab('RECRUITMENT')}
                 className={`px-4 py-2 rounded-md text-sm font-bold transition whitespace-nowrap flex items-center gap-2 ${activeTab === 'RECRUITMENT' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                     Approvals {(pendingApprovals.length + pendingDismissals.length) > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{pendingApprovals.length + pendingDismissals.length}</span>}
                 </button>
             )}
             <button 
               onClick={() => setActiveTab('PAYROLL')}
               className={`px-4 py-2 rounded-md text-sm font-bold transition whitespace-nowrap flex items-center gap-2 ${activeTab === 'PAYROLL' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
             >
                 Payroll
             </button>
             <button 
               onClick={() => setActiveTab('POLICIES')}
               className={`px-4 py-2 rounded-md text-sm font-bold transition whitespace-nowrap ${activeTab === 'POLICIES' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
             >
                 Policies
             </button>
        </div>
      </div>

      {/* --- DIRECTORY TAB (Also handles Recruitment Start for Managers) --- */}
      {activeTab === 'DIRECTORY' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recruitment Form - Moved to Sidebar in Directory */}
              <div className="lg:col-span-1">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                      <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                          <UserPlus size={20} className="text-indigo-600" /> New Recruitment
                      </h3>
                      <p className="text-xs text-slate-500 mb-4 bg-indigo-50 p-2 rounded border border-indigo-100">
                          {currentUser.role === 'MANAGER' ? 'Submissions require Administrator approval. Please attach justification.' : 'Direct add for Salesmen. Cashier/Manager requires sole mandate.'}
                      </p>
                      <form onSubmit={handlePreRecruit} className="space-y-4">
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                              <input required value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} className="input-primary mt-1" placeholder="John Doe" />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">Username / ID</label>
                              <input required value={newStaff.username} onChange={e => setNewStaff({...newStaff, username: e.target.value})} className="input-primary mt-1" placeholder="johnd" />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">Role Assignment</label>
                              <select value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value as Role})} className="input-primary mt-1 bg-white">
                                  <option value="SALESMAN">Salesman</option>
                                  <option value="CASHIER">Cashier</option>
                                  <option value="MANAGER">Manager</option>
                              </select>
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">Temp Password</label>
                              <input required type="password" value={newStaff.password} onChange={e => setNewStaff({...newStaff, password: e.target.value})} className="input-primary mt-1" placeholder="****" />
                          </div>
                          <button className="btn-primary w-full py-2.5 mt-2">Nominate Staff</button>
                      </form>
                  </div>
              </div>

              {/* Staff Cards */}
              <div className="lg:col-span-2 space-y-4">
                   <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                       <h3 className="font-bold text-slate-700">Staff List</h3>
                       <button onClick={() => exportStaffData(staffList)} className="text-indigo-600 text-xs font-bold flex items-center gap-1 hover:underline">
                          <Download size={14} /> Export CSV
                       </button>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {directoryList.map(staff => (
                          <div key={staff.id} className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition group">
                              <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3">
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${staff.role === 'ADMIN' ? 'bg-slate-800' : staff.role === 'MANAGER' ? 'bg-indigo-600' : 'bg-emerald-500'}`}>
                                          {staff.name.charAt(0)}
                                      </div>
                                      <div>
                                          <h3 className="font-bold text-slate-800 text-sm">{staff.name}</h3>
                                          <p className="text-[10px] text-slate-500 uppercase font-bold">{staff.role}</p>
                                      </div>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${staff.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : staff.status === 'PENDING_APPROVAL' ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                      {staff.status?.replace('_', ' ')}
                                  </span>
                              </div>
                              
                              {/* Manager Actions */}
                              {staff.id !== currentUser.id && staff.status === 'ACTIVE' && (
                                  <button 
                                    onClick={() => handleInitiateDismissal(staff.id)}
                                    className="w-full mt-4 py-2 border border-rose-100 text-rose-500 bg-rose-50 rounded-lg text-xs font-bold opacity-0 group-hover:opacity-100 transition"
                                  >
                                      Initiate Dismissal
                                  </button>
                              )}
                          </div>
                      ))}
                   </div>
              </div>
          </div>
      )}

      {/* --- PAYROLL TAB --- */}
      {activeTab === 'PAYROLL' && (
          <div className="space-y-6">
              {/* Payroll Summary Card */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-center gap-6">
                  <div>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Monthly Wage Bill (Gross)</p>
                      <h3 className="text-3xl font-bold">GHS {totalWageBill.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                      <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                          <CheckCircle size={12} className="text-emerald-400" /> Based on {activeStaff.filter(s => s.payroll).length} Active Payroll profiles
                      </p>
                  </div>
                  <button 
                    onClick={handleRunPayroll}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition active:scale-95"
                  >
                      <Banknote size={20} /> Run Payroll & Export
                  </button>
              </div>

              {/* Payroll List */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                            <tr>
                                <th className="p-4">Staff Name</th>
                                <th className="p-4">Role</th>
                                <th className="p-4 text-right">Base Salary</th>
                                <th className="p-4 text-right">Allowances</th>
                                <th className="p-4 text-right">Deductions</th>
                                <th className="p-4 text-right bg-indigo-50/50">Net Pay</th>
                                <th className="p-4">Payment Info</th>
                                <th className="p-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {activeStaff.map(staff => {
                                const p = staff.payroll;
                                const netPay = p ? (p.baseSalary + p.allowances - p.deductions) : 0;
                                
                                return (
                                    <tr key={staff.id} className="hover:bg-slate-50 group">
                                        <td className="p-4 font-bold text-slate-700">{staff.name}</td>
                                        <td className="p-4 text-slate-500 text-xs font-bold">{staff.role}</td>
                                        
                                        <td className="p-4 text-right font-mono">{p?.baseSalary.toFixed(2) || '-'}</td>
                                        <td className="p-4 text-right font-mono text-emerald-600">{p ? `+${p.allowances.toFixed(2)}` : '-'}</td>
                                        <td className="p-4 text-right font-mono text-rose-500">{p ? `-${p.deductions.toFixed(2)}` : '-'}</td>
                                        <td className="p-4 text-right font-mono font-bold text-indigo-700 bg-indigo-50/50">{netPay.toFixed(2)}</td>
                                        <td className="p-4 text-xs">
                                            {p ? (
                                                <div className="flex flex-col">
                                                    <span className="font-bold flex items-center gap-1">
                                                        {p.paymentMethod === 'BANK' ? <Building2 size={10} /> : <Wallet size={10} />}
                                                        {p.paymentMethod}
                                                    </span>
                                                    <span className="text-slate-500 truncate max-w-[150px]">{p.bankName} - {p.accountNumber}</span>
                                                </div>
                                            ) : <span className="text-slate-400 italic">Pending Config</span>}
                                        </td>
                                        <td className="p-4 text-center">
                                            <button onClick={() => startEditingPayroll(staff)} className="text-slate-400 hover:text-indigo-600 p-2 rounded-lg hover:bg-slate-100 transition">
                                                <PenLine size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                  </div>
              </div>
          </div>
      )}

      {/* --- APPROVALS TAB (ADMIN ONLY) --- */}
      {activeTab === 'RECRUITMENT' && (
          <div className="space-y-6">
                  {/* Pending Hires */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                          <h4 className="font-bold text-slate-700">Pending Recruitment</h4>
                          <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{pendingApprovals.length}</span>
                      </div>
                      <div className="divide-y divide-slate-100">
                          {pendingApprovals.length === 0 ? (
                              <p className="p-8 text-center text-slate-400 text-sm italic">No pending recruitment approvals.</p>
                          ) : (
                              pendingApprovals.map(s => (
                                  <div key={s.id} className="p-4 flex flex-col gap-3">
                                      <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-slate-800 flex items-center gap-2">
                                                {s.name} <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-normal">@{s.username}</span>
                                            </p>
                                            <p className="text-xs text-slate-500 mt-0.5">Role: <span className="font-bold">{s.role}</span> • Nominated by: <span className="font-bold">{s.nominatedBy}</span></p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => openApprovalModal(s.id)} className="flex items-center gap-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-xs font-bold transition">
                                                <CheckCircle size={14} /> Approve & Onboard
                                            </button>
                                            <button onClick={() => handleConfirmDismissal(s.id)} className="flex items-center gap-1 bg-slate-50 text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-bold transition">
                                                <XCircle size={14} /> Reject
                                            </button>
                                        </div>
                                      </div>
                                      
                                      {/* Justification Details */}
                                      <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-100 text-sm">
                                          <p className="text-xs font-bold text-amber-800 uppercase mb-1">Manager Justification:</p>
                                          <p className="text-slate-700 italic">"{s.justification || 'No justification provided.'}"</p>
                                          {s.attachment && (
                                              <div className="mt-2 flex items-center gap-2 text-indigo-600 font-bold text-xs bg-white px-2 py-1 rounded border border-indigo-100 w-fit">
                                                  <Paperclip size={12} /> {s.attachment}
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              ))
                          )}
                      </div>
                  </div>

                  {/* Pending Dismissals */}
                  <div className="bg-white rounded-xl border border-rose-100 overflow-hidden">
                      <div className="bg-rose-50 p-4 border-b border-rose-100 flex justify-between items-center">
                          <h4 className="font-bold text-rose-800 flex items-center gap-2">
                              <AlertTriangle size={16} /> Pending Dismissals
                          </h4>
                          <span className="bg-white text-rose-600 border border-rose-200 text-xs font-bold px-2 py-0.5 rounded-full">{pendingDismissals.length}</span>
                      </div>
                      <div className="divide-y divide-rose-50">
                          {pendingDismissals.length === 0 ? (
                              <p className="p-8 text-center text-slate-400 text-sm italic">No pending dismissals.</p>
                          ) : (
                              pendingDismissals.map(s => (
                                  <div key={s.id} className="p-4 flex flex-col gap-3 bg-rose-50/10">
                                      <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-slate-800">{s.name}</p>
                                            <p className="text-xs text-slate-500">Role: {s.role} • Initiated by: {s.nominatedBy}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleConfirmDismissal(s.id)} className="flex items-center gap-1 bg-rose-600 text-white hover:bg-rose-700 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm">
                                                <Trash2 size={14} /> Confirm Fire
                                            </button>
                                            <button onClick={() => handleRejectAction(s.id)} className="flex items-center gap-1 bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 px-3 py-1.5 rounded-lg text-xs font-bold transition">
                                                Cancel
                                            </button>
                                        </div>
                                      </div>
                                      
                                      {/* Justification Details */}
                                      <div className="bg-rose-50 p-3 rounded-lg border border-rose-100 text-sm">
                                          <p className="text-xs font-bold text-rose-800 uppercase mb-1">Dismissal Reason:</p>
                                          <p className="text-slate-700 italic">"{s.justification || 'No specific reason provided.'}"</p>
                                          {s.attachment && (
                                              <div className="mt-2 flex items-center gap-2 text-indigo-600 font-bold text-xs bg-white px-2 py-1 rounded border border-indigo-100 w-fit">
                                                  <Paperclip size={12} /> {s.attachment}
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              ))
                          )}
                      </div>
                  </div>
          </div>
      )}

      {/* --- POLICIES TAB --- */}
      {activeTab === 'POLICIES' && (
          <div className="space-y-6">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                      <h3 className="font-bold text-indigo-900 text-lg">Staff Policy Documents</h3>
                      <p className="text-indigo-700/70 text-sm">Upload contracts, code of conduct, and operational manuals.</p>
                  </div>
                  <button onClick={handleUploadPolicy} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition">
                      <UploadCloud size={18} /> Upload New Policy
                  </button>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <table className="w-full text-left">
                      <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                          <tr>
                              <th className="p-4">Document Title</th>
                              <th className="p-4">Type</th>
                              <th className="p-4">Size</th>
                              <th className="p-4">Date Uploaded</th>
                              <th className="p-4 text-right">Action</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                          {policies.map(policy => (
                              <tr key={policy.id} className="hover:bg-slate-50 transition">
                                  <td className="p-4 font-bold text-slate-700 flex items-center gap-3">
                                      <FileText className="text-slate-400" size={18} />
                                      {policy.title}
                                  </td>
                                  <td className="p-4">
                                      <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded">{policy.type}</span>
                                  </td>
                                  <td className="p-4 text-slate-500 font-mono">{policy.size}</td>
                                  <td className="p-4 text-slate-500">{new Date(policy.uploadDate).toLocaleDateString()}</td>
                                  <td className="p-4 text-right">
                                      <button className="text-indigo-600 hover:text-indigo-800 font-bold text-xs flex items-center gap-1 justify-end ml-auto">
                                          <Download size={14} /> Download
                                      </button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* --- JUSTIFICATION MODAL --- */}
      {justificationModal.isOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                  <div className="flex items-center gap-3 mb-4">
                      <div className={`p-2 rounded-lg ${justificationModal.type === 'RECRUIT' ? 'bg-indigo-100 text-indigo-600' : 'bg-rose-100 text-rose-600'}`}>
                          {justificationModal.type === 'RECRUIT' ? <UserPlus size={24} /> : <AlertTriangle size={24} />}
                      </div>
                      <div>
                          <h3 className="font-bold text-lg text-slate-800">
                              {justificationModal.type === 'RECRUIT' ? 'Justify Nomination' : 'Justify Dismissal'}
                          </h3>
                          <p className="text-xs text-slate-500">Provide details for Admin approval.</p>
                      </div>
                  </div>

                  <div className="space-y-4">
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Reason / Justification</label>
                          <textarea 
                             className="w-full mt-1 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                             placeholder={justificationModal.type === 'RECRUIT' ? "Explain why this role is needed or candidate qualifications..." : "Explain the violation or reason for termination..."}
                             value={submissionData.reason}
                             onChange={e => setSubmissionData({...submissionData, reason: e.target.value})}
                          ></textarea>
                      </div>
                      
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Attach Particulars</label>
                          <div className="mt-1 border border-dashed border-slate-300 rounded-lg p-4 bg-slate-50 text-center cursor-pointer hover:bg-slate-100 transition relative">
                              <input 
                                type="file" 
                                className="absolute inset-0 opacity-0 cursor-pointer" 
                                onChange={e => setSubmissionData({...submissionData, documents: e.target.files ? e.target.files[0] : null})}
                              />
                              <div className="flex flex-col items-center gap-2 text-slate-400">
                                  <UploadCloud size={24} />
                                  <span className="text-xs font-bold">{submissionData.documents ? submissionData.documents.name : "Click to upload evidence/CV"}</span>
                              </div>
                          </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                          <button 
                             onClick={() => setJustificationModal({isOpen: false, type: 'RECRUIT'})}
                             className="flex-1 py-2.5 border border-slate-200 rounded-lg font-bold text-slate-500 text-sm"
                          >
                              Cancel
                          </button>
                          <button 
                             onClick={justificationModal.type === 'RECRUIT' ? () => submitRecruitment(false) : submitDismissal}
                             disabled={!submissionData.reason}
                             className="flex-1 py-2.5 bg-slate-900 text-white rounded-lg font-bold text-sm disabled:opacity-50"
                          >
                              Submit for Approval
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
      
      {/* --- APPROVAL & COMMENCEMENT MODAL --- */}
      {approvalModal.isOpen && (
           <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                  <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                          <CheckCircle size={24} />
                      </div>
                      <div>
                          <h3 className="font-bold text-lg text-slate-800">Approve & Onboard</h3>
                          <p className="text-xs text-slate-500">Set start date and trigger welcome email.</p>
                      </div>
                  </div>

                  <div className="space-y-4">
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Commencement Date</label>
                          <div className="relative mt-1">
                            <Calendar className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                            <input 
                              type="date"
                              required
                              value={commencementDate}
                              onChange={e => setCommencementDate(e.target.value)}
                              className="w-full pl-9 border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">Used in welcome email and payroll start.</p>
                      </div>
                      
                      <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg flex items-start gap-2">
                          <Mail size={16} className="text-indigo-600 mt-0.5" />
                          <div>
                              <p className="text-xs font-bold text-indigo-900">Email Notification</p>
                              <p className="text-[10px] text-indigo-700">A welcome message with login credentials and start date will be sent from <span className="font-bold">leumasgenbo@gmail.com</span>.</p>
                          </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                          <button 
                             onClick={() => setApprovalModal({isOpen: false, staffId: null})}
                             className="flex-1 py-2.5 border border-slate-200 rounded-lg font-bold text-slate-500 text-sm"
                          >
                              Cancel
                          </button>
                          <button 
                             onClick={submitApproval}
                             disabled={!commencementDate}
                             className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg font-bold text-sm disabled:opacity-50"
                          >
                              Confirm
                          </button>
                      </div>
                  </div>
              </div>
           </div>
      )}

      {/* --- PAYROLL CONFIGURATION MODAL --- */}
      {editingPayrollId && editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                           <Calculator className="text-indigo-400" /> Payroll Configuration
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                            Setting up payment for <span className="text-white font-bold">{editingUser.name}</span> ({editingUser.role})
                        </p>
                    </div>
                    <button onClick={() => setEditingPayrollId(null)} className="text-slate-400 hover:text-white transition">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={savePayroll} className="overflow-y-auto p-6 space-y-6">
                    {/* Section 1: Earnings */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
                            Earnings
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-600">Base Salary (GHS)</label>
                                <input 
                                    required type="number" min="0" 
                                    value={payrollForm.baseSalary} 
                                    onChange={e => setPayrollForm({...payrollForm, baseSalary: Number(e.target.value)})}
                                    className="input-primary mt-1 font-mono"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-600">Allowances (GHS)</label>
                                <input 
                                    type="number" min="0" 
                                    value={payrollForm.allowances} 
                                    onChange={e => setPayrollForm({...payrollForm, allowances: Number(e.target.value)})}
                                    className="input-primary mt-1 font-mono text-emerald-600"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Deductions */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
                            Deductions
                        </h4>
                        <div>
                            <label className="text-xs font-bold text-slate-600">Tax / SSNIT / Loans (GHS)</label>
                            <input 
                                type="number" min="0" 
                                value={payrollForm.deductions} 
                                onChange={e => setPayrollForm({...payrollForm, deductions: Number(e.target.value)})}
                                className="input-primary mt-1 font-mono text-rose-500"
                            />
                        </div>
                    </div>

                    {/* Net Pay Preview */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                        <span className="font-bold text-slate-600">Net Payable</span>
                        <span className="text-xl font-bold text-indigo-700">
                            GHS {(Number(payrollForm.baseSalary) + Number(payrollForm.allowances) - Number(payrollForm.deductions)).toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </span>
                    </div>

                    {/* Section 3: Payment Details */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
                            Payment Details
                        </h4>
                        <div>
                            <label className="text-xs font-bold text-slate-600">Payment Method</label>
                            <div className="grid grid-cols-3 gap-3 mt-1">
                                {['BANK', 'MOMO', 'CASH'].map(m => (
                                    <div 
                                        key={m}
                                        onClick={() => setPayrollForm({...payrollForm, paymentMethod: m as any})}
                                        className={`cursor-pointer border rounded-lg p-3 text-center text-xs font-bold transition ${payrollForm.paymentMethod === m ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                                    >
                                        {m}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-600">{payrollForm.paymentMethod === 'BANK' ? 'Bank Name' : 'Network Provider'}</label>
                                <input 
                                    required={payrollForm.paymentMethod !== 'CASH'}
                                    disabled={payrollForm.paymentMethod === 'CASH'}
                                    placeholder={payrollForm.paymentMethod === 'BANK' ? "e.g. GCB" : "e.g. MTN"}
                                    value={payrollForm.bankName} 
                                    onChange={e => setPayrollForm({...payrollForm, bankName: e.target.value})}
                                    className="input-primary mt-1 disabled:bg-slate-100 disabled:text-slate-400"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-600">Account Number</label>
                                <input 
                                    required={payrollForm.paymentMethod !== 'CASH'}
                                    disabled={payrollForm.paymentMethod === 'CASH'}
                                    placeholder="0000000000"
                                    value={payrollForm.accountNumber} 
                                    onChange={e => setPayrollForm({...payrollForm, accountNumber: e.target.value})}
                                    className="input-primary mt-1 disabled:bg-slate-100 disabled:text-slate-400"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setEditingPayrollId(null)} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition">
                            Cancel
                        </button>
                        <button type="submit" className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition">
                            Save Configuration
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;
