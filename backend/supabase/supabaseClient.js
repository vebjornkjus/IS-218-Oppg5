import { createClient } from 'https://esm.sh/@supabase/supabase-js';

// Initialize Supabase client – replace with your actual values
const SUPABASE_URL = 'https://emefguxbwcvfxaiywmri.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtZWZndXhid2N2ZnhhaXl3bXJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4OTgxODksImV4cCI6MjA2MDQ3NDE4OX0.j5kJxREpP5kuB3XIHN382B11hVCYnpxfQaF2o4kiVRg';

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

export { supabaseClient };
