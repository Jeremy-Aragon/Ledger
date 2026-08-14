// ============================================
// Supabase client — shared across every page
// ============================================
// 1. Go to your Supabase project → Settings → API
// 2. Copy "Project URL" and the "anon public" key
// 3. Paste them below
// ============================================

const SUPABASE_URL = 'YOUR_PROJECT_URL_HERE';       // e.g. https://orqgtbxcnzymdnwmcszc.supabase.co
const SUPABASE_ANON_KEY = 'sb_publishable_nk9J1XwjnsfItqQ8XSk5Gw_sAY0G9in';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
