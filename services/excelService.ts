import * as XLSX from 'xlsx';
import { Product, Sale, Customer, User } from '../types';

export const exportToExcel = (
  products: Product[],
  sales: Sale[],
  customers: Customer[]
) => {
  const workbook = XLSX.utils.book_new();

  // 1. Inventory Sheet
  const inventoryData = products.map(p => ({
    ID: p.id,
    Brand: p.brand,
    Type: p.type,
    Color: p.color,
    Size: p.size,
    'Cost (CFA)': p.costCfa,
    'Exchange Rate': p.exchangeRate,
    'Cost (GHS)': p.costGhsBase,
    'Service (5%)': p.serviceCharge,
    'Misc (5%)': p.miscCharge,
    'Margin': p.profitMargin,
    'Tax Rate (%)': p.taxRate || 0,
    'Selling Price': p.sellingPrice,
    'Stock Qty': p.stockQuantity,
    'Date Added': new Date(p.dateAdded).toLocaleDateString()
  }));
  const inventorySheet = XLSX.utils.json_to_sheet(inventoryData);
  XLSX.utils.book_append_sheet(workbook, inventorySheet, "Inventory");

  // 2. Sales Ledger Sheet
  const salesData = sales.map(s => ({
    ID: s.id,
    Date: new Date(s.date).toLocaleDateString(),
    Time: new Date(s.date).toLocaleTimeString(),
    Product: s.productName,
    Quantity: s.quantity,
    'Total Price': s.totalPrice,
    'Tax Amount': s.taxAmount ? s.taxAmount.toFixed(2) : '0.00',
    Salesman: s.salesman,
    Customer: s.customerName
  }));
  const salesSheet = XLSX.utils.json_to_sheet(salesData);
  XLSX.utils.book_append_sheet(workbook, salesSheet, "Sales Ledger");

  // 3. Customers Sheet
  const customerData = customers.map(c => ({
    Name: c.name,
    Phone: c.phone,
    'Total Spent': c.totalSpent,
    'Last Purchase': new Date(c.lastPurchaseDate).toLocaleDateString(),
    Preferences: c.preferences.join(", ")
  }));
  const customerSheet = XLSX.utils.json_to_sheet(customerData);
  XLSX.utils.book_append_sheet(workbook, customerSheet, "Customers");

  // Write file
  XLSX.writeFile(workbook, `TrouserTrader_Data_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportPerformanceData = (
  data: { name: string; revenue: number; count: number; commission?: number }[],
  fileName: string
) => {
  const worksheet = XLSX.utils.json_to_sheet(data.map(d => ({
    Salesman: d.name,
    'Total Revenue (GHS)': d.revenue,
    'Transactions': d.count,
    ...(d.commission !== undefined ? { 'Commission (GHS)': d.commission } : {})
  })));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Performance");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

export const exportStaffData = (staff: User[]) => {
  const data = staff.map(s => ({
    Name: s.name,
    Username: s.username,
    Role: s.role,
    Status: s.status || 'ACTIVE',
    'Date Hired': s.dateHired ? new Date(s.dateHired).toLocaleDateString() : '-'
  }));
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Staff_Directory");
  XLSX.writeFile(workbook, `Staff_Directory_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportPayrollRun = (staff: User[]) => {
  const activeStaff = staff.filter(s => s.status === 'ACTIVE' && s.payroll);
  
  const data = activeStaff.map(s => {
      const p = s.payroll!;
      const netPay = p.baseSalary + p.allowances - p.deductions;
      return {
          'Staff ID': s.id,
          'Name': s.name,
          'Role': s.role,
          'Bank/MoMo': p.bankName || 'N/A',
          'Account No': p.accountNumber,
          'Base Salary': p.baseSalary,
          'Allowances': p.allowances,
          'Deductions': p.deductions,
          'NET PAYABLE': netPay
      };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Payroll_Schedule");
  XLSX.writeFile(workbook, `Payroll_Run_${new Date().toISOString().split('T')[0]}.xlsx`);
};
