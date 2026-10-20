import { supabase } from '../supabase.js';

export async function getRecoveryCandidates(businessId, days = 30) {
  const { data, error } = await supabase.rpc('recovery_get_candidates', { p_business: businessId, p_days_inactive: days });
  if (error) throw error;
  return data || [];
}

export async function createRecoveryRecord(businessId, customerId, reason) {
  const { data, error } = await supabase.from('recovery_records').insert({ business_id: businessId, customer_id: customerId, reason, status: 'new' }).select().single();
  if (error) throw error;
  return data;
}

export async function listRecoveryRecords(businessId) {
  const { data, error } = await supabase.from('recovery_records').select('*, customers(name, phone)').eq('business_id', businessId).neq('status', 'recovered').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
