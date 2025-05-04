import { createClient } from 'https://esm.sh/@supabase/supabase-js';

// Initialize Supabase client – replace with your actual values
const SUPABASE_URL = 'https://emefguxbwcvfxaiywmri.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtZWZndXhid2N2ZnhhaXl3bXJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4OTgxODksImV4cCI6MjA2MDQ3NDE4OX0.j5kJxREpP5kuB3XIHN382B11hVCYnpxfQaF2o4kiVRg';

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

export { supabaseClient };

// Fallback for browser: guard process.env
const _env = (typeof process !== 'undefined' && process.env) ? process.env : {};

// NVE Flomvarsel API Configuration
export const BASE_URL = _env.API_BASE_URL || 'https://api01.nve.no/hydrology/forecast/flood/v1.0.8/api';
export const LANG = parseInt(_env.API_LANG, 10) || 1; // 1 = Norsk
export const AGDER_ID = parseInt(_env.API_AGDER_ID, 10) || 42;
export const START_DATE = _env.START_DATE || '';
export const END_DATE = _env.END_DATE || '';
