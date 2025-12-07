import { createClient } from '@supabase/supabase-js';

// Safely access env to prevent crash if import.meta.env is undefined
const metaEnv = (import.meta as any).env || {};
const supabaseUrl = metaEnv.VITE_SUPABASE_URL;
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY;

// Only create the client if keys are present
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// Helpers to check if we are in "Cloud Mode"
export const isCloudEnabled = () => {
    return !!supabase;
};