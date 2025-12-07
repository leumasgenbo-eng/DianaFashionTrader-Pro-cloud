import { supabase } from './supabaseClient';
import { Product, Sale, Customer, User } from '../types';

// Helpers to check if we are in "Cloud Mode"
export const isCloudEnabled = () => {
    return !!supabase;
};

// --- PRODUCTS ---
export const fetchProducts = async (): Promise<Product[] | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase.from('products').select('*');
    if (error) { console.error("Supabase Error:", error); return null; }
    return data as Product[];
};

export const saveProduct = async (product: Product) => {
    if (!supabase) return;
    const { error } = await supabase.from('products').upsert(product);
    if (error) console.error("Save Product Error:", error);
};

export const saveProducts = async (products: Product[]) => {
    if (!supabase) return;
    if (products.length === 0) return;
    const { error } = await supabase.from('products').upsert(products);
    if (error) console.error("Bulk Save Products Error:", error);
};

export const deleteProduct = async (id: string) => {
    if (!supabase) return;
    await supabase.from('products').delete().eq('id', id);
};

// --- SALES ---
export const fetchSales = async (): Promise<Sale[] | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase.from('sales').select('*');
    if (error) { console.error("Supabase Error:", error); return null; }
    return data as Sale[];
};

export const saveSale = async (sale: Sale) => {
    if (!supabase) return;
    const { error } = await supabase.from('sales').upsert(sale);
    if (error) console.error("Save Sale Error:", error);
};

export const saveSales = async (sales: Sale[]) => {
    if (!supabase) return;
    if (sales.length === 0) return;
    const { error } = await supabase.from('sales').upsert(sales);
    if (error) console.error("Bulk Save Sales Error:", error);
};

// --- CUSTOMERS ---
export const fetchCustomers = async (): Promise<Customer[] | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase.from('customers').select('*');
    if (error) { console.error("Supabase Error:", error); return null; }
    return data as Customer[];
};

export const saveCustomer = async (customer: Customer) => {
    if (!supabase) return;
    const { error } = await supabase.from('customers').upsert(customer);
    if (error) console.error("Save Customer Error:", error);
};

// --- STAFF ---
export const fetchStaff = async (): Promise<User[] | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase.from('staff').select('*');
    if (error) { console.error("Supabase Error:", error); return null; }
    return data as User[];
};

export const saveStaff = async (user: User) => {
    if (!supabase) return;
    const { error } = await supabase.from('staff').upsert(user);
    if (error) console.error("Save Staff Error:", error);
};
