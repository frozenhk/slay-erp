import { supabase } from '../supabase.js';

export async function listLocations(businessId) {
  const { data, error } = await supabase
    .from('locations')
    .select('id, name, address, created_at')
    .eq('business_id', businessId)
    .order('created_at');
  if (error) throw error;
  return data || [];
}

export async function createLocation(businessId, name, address) {
  const { data, error } = await supabase
    .from('locations')
    .insert({ business_id: businessId, name: name.trim(), address: address || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateLocation(locationId, businessId, patch) {
  const { error } = await supabase
    .from('locations')
    .update(patch)
    .eq('id', locationId)
    .eq('business_id', businessId);
  if (error) throw error;
}
