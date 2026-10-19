import { supabase } from '../supabase.js';

export async function createBusiness({ name, type, country, currency }) {
  const { data, error } = await supabase.rpc('create_business', {
    p_name: name,
    p_type: type,
    p_country: country,
    p_currency: currency || 'XAF',
  });
  if (error) throw error;
  return data;
}

export async function updateBusiness(id, patch) {
  const { data, error } = await supabase
    .from('businesses')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function uploadLogo(businessId, file) {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = businessId + '/logo.' + ext;
  const { error: upErr } = await supabase.storage
    .from('public-assets')
    .upload(path, file, { upsert: true, cacheControl: '3600' });
  if (upErr) throw upErr;
  const { data } = supabase.storage.from('public-assets').getPublicUrl(path);
  return data.publicUrl;
}
