import { createClient } from '@supabase/supabase-js'

// The one connection to our Supabase project. Import `supabase` from this
// file anywhere you need data, e.g.:
//   import { supabase } from '../lib/supabaseClient.js'
//   const { data, error } = await supabase.from('caches').select('*')
//
// The URL and key come from frontend/.env.local (copy .env.example to make it).
// Vite only exposes variables that start with VITE_.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Fail loudly instead of making confusing network errors later.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase keys. Copy frontend/.env.example to frontend/.env.local and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart npm run dev.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
