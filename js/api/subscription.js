import { supabase } from '../supabase.js';

export async function listPlans() {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('id, code, name, description, monthly_price, annual_price, currency, trial_days, display_order')
    .eq('is_active', true)
    .eq('is_public', true)
    .order('display_order');
  if (error) throw error;
  return data || [];
}

export async function listPlanFeatures(planId) {
  const { data, error } = await supabase
    .from('plan_features')
    .select('feature_code, enabled, access_level, usage_limit')
    .eq('plan_id', planId);
  if (error) throw error;
  return data || [];
}

export async function checkFeature(businessId, feature) {
  const { data, error } = await supabase.rpc('can_business_do', {
    p_business: businessId,
    p_feature: feature,
  });
  if (error) throw error;
  return data;
}

export async function isPlatformAdmin() {
  const { data, error } = await supabase.rpc('is_platform_admin');
  if (error) return false;
  return !!data;
}

export async function adminListBusinesses() {
  const { data, error } = await supabase.rpc('admin_list_businesses');
  if (error) throw error;
  return data || [];
}

export async function adminChangePlan(businessId, planCode, reason) {
  const { error } = await supabase.rpc('admin_change_plan', {
    p_business: businessId,
    p_plan_code: planCode,
    p_reason: reason || null,
  });
  if (error) throw error;
}

export async function adminExtendTrial(businessId, days, reason) {
  const { error } = await supabase.rpc('admin_extend_trial', {
    p_business: businessId,
    p_days: Number(days),
    p_reason: reason || null,
  });
  if (error) throw error;
}
