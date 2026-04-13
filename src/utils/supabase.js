import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Tılsım Solitaire — Supabase
const SUPABASE_URL = 'https://levaibmnnwxqvuodcdxb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_XDUIGm7AMqOdOteMBxtekw_9q0px2tn';

let supabase = null;

try {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
} catch (e) {
  // Supabase not configured yet
}

export default supabase;
