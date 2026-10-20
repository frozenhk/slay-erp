import { supabase } from './supabase.js';
import { navigate } from './router.js';
import { state, setUser, setProfile, setBusinesses, setCurrentBusiness } from './state.js';

export async function loadSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session || null;
}

export async function loadUserData() {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const user = userData.user;
  if (!user) return null;

  setUser(user);

  const [profileRes, membershipsRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, phone').eq('id', user.id).maybeSingle(),
    supabase.from('memberships').select(`id, role, business_id, businesses(id, name, currency, logo_url, business_type, phone, email, address, invoice_prefix, invoice_footer, plan_code, subscription_status, trial_ends_at, current_period_start, current_period_end)`).order('created_at', { ascending: true })
  ]);

  setProfile(profileRes.data || { id: user.id, full_name: '', phone: null });

  const rawList = (membershipsRes.data || []).map((m) => ({
    membershipId: m.id,
    businessId: m.business_id,
    role: m.role,
    business: m.businesses || { id: m.business_id, name: 'Business' },
  }));

  // DEDUPLICATE: If you have multiple roles for the same business, keep the highest one (owner > manager > others)
  const roleWeight = { owner: 4, manager: 3, sales_agent: 2, warehouse: 1, accountant: 1 };
  const uniqueMap = new Map();
  for (const m of rawList) {
    if (!uniqueMap.has(m.businessId) || (roleWeight[m.role] || 0) > (roleWeight[uniqueMap.get(m.businessId).role] || 0)) {
      uniqueMap.set(m.businessId, m);
    }
  }
  const list = Array.from(uniqueMap.values());

  setBusinesses(list);
  return { user, profile: profileRes.data, memberships: list };
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email, password, options: { data: { full_name: fullName || '' } },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function sendReset(email) {
  const redirectTo = window.location.origin + '/';
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function routeAfterAuth() {
  const list = state.businesses || [];
  if (list.length === 0) { navigate('onboarding'); return; }
  if (list.length === 1) {
    setCurrentBusiness(list[0].business, list[0].role);
    navigate('dashboard');
    return;
  }
  navigate('switcher');
}
