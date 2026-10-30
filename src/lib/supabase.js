import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// supabase is null when env vars are missing — app degrades gracefully
const supabase = (url && key && url.startsWith('http')) ? createClient(url, key) : null;

export default supabase;
