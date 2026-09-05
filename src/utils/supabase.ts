import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("⚠️ [Supabase Configuration Error]: VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY is missing in your .env file! Please check your .env file and restart your Vite development server (npm run dev).");
}

// Check if remember_me is not explicitly set to 'false', default to 'true' (localStorage)
const rememberMe = localStorage.getItem('remember_me') !== 'false';

// Caching the instance on the global window object to survive Vite HMR in development
declare global {
  interface Window {
    __supabaseInstance?: SupabaseClient;
  }
}

let supabaseInstance: SupabaseClient;

if (window.__supabaseInstance) {
  supabaseInstance = window.__supabaseInstance;
} else {
  supabaseInstance = createClient(
    supabaseUrl || "https://placeholder.supabase.co",
    supabaseKey || "placeholder-key",
    {
      auth: {
        persistSession: true,
        storage: rememberMe ? window.localStorage : window.sessionStorage,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      }
    }
  );
  window.__supabaseInstance = supabaseInstance;
}

export const supabase = supabaseInstance;
