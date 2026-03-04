// src/lib/supabase.ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Project URL and Anon Key from Supabase Dashboard
const SUPABASE_URL = 'https://kjbwscpvmkxqwpccmord.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqYndzY3B2bWt4cXdwY2Ntb3JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNDIzMDEsImV4cCI6MjA4NDgxODMwMX0.XVDcLdCTeRXkTSom3Y09mY6Ub2ai1uFyCEQjwermtwM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage, // This saves the user's session on the phone
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});