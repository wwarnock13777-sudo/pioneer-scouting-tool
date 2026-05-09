import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://hdleibcspdwcuzogdlmu.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkbGVpYmNzcGR3Y3V6b2dkbG11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyODQ3MDUsImV4cCI6MjA5Mzg2MDcwNX0.KTMD1ElmNxpkhgymLOc0NK6xN10JCTQZ85bkzkxLTTs'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
