import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ulgbshgzwmnytejfutsb.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsZ2JzaGd6d21ueXRlamZ1dHNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NDYwNTgsImV4cCI6MjA4NjUyMjA1OH0.kPP9z55fCaKdd4jzI05x-K_xJzPoND0OQx8VFkl7Nvw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
    }
});

export const isSupabaseMode = import.meta.env.VITE_BACKEND_TYPE === 'supabase';

export default supabase;
