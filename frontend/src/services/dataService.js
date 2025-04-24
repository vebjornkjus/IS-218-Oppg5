import { supabase } from './supabaseClient.js';

export async function fetchZones() {
  // Fetch flood zones from Supabase
  const { data: flomdata, error } = await supabase
    .from('Flomdata — Flomareal')
    .select('*');

  if (error) {
    console.error('Error fetching flood zones:', error);
    return [];
  }

  return flomdata || [];
}