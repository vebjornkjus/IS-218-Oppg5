import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js';

// Initialize Supabase client – replace with your actual values
const supabaseUrl = 'https://emefguxbwcvfxaiywmri.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtZWZndXhid2N2ZnhhaXl3bXJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4OTgxODksImV4cCI6MjA2MDQ3NDE4OX0.j5kJxREpP5kuB3XIHN382B11hVCYnpxfQaF2o4kiVRg';

export const supabase = createClient(supabaseUrl, supabaseKey);
