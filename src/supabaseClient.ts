
import { createClient } from '@supabase/supabase-js';

// Project URL
const SUPABASE_URL = 'https://imixnekvqhfezpkuhzaw.supabase.co';

// API Key
const SUPABASE_ANON_KEY = 'sb_publishable_ivWM3P2kt9J7BGhjK0cBqg_ntL2jotL';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
