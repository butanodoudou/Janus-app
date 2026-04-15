import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SB_URL
const key = import.meta.env.VITE_SB_KEY

export const supabase = createClient(url, key)
