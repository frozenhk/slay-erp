import { supabase } from '../supabase.js';

export async function listMembers(businessId) {
  const { data: memberships, error: mErr } = await supabase
    .from('memberships')
    .select('id, user_id, role, created_at')
    .eq('business_id', businessId)
    .order('created_at');
  if (mErr) throw mErr;

  const rows = memberships || [];
  if (!rows.length) return [];

  const userIds = rows.map((r) => r.user_id);
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, full_name, phone')
    .in('id', userIds);
  if (pErr) throw pErr;

  const byId = {};
  for (const p of profiles || []) byId[p.id] = p;

  return rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    role: r.role,
    created_at: r.created_at,
    profiles: byId[r.user_id] || { id: r.user_id, full_name: '', phone: null },
  }));
}

export async function updateMemberRole(membershipId, businessId, role) {
  const { error } = await supabase
    .from('memberships')
    .update({ role })
    .eq('id', membershipId)
    .eq('business_id', businessId);
  if (error) throw error;
}

export async function removeMember(membershipId, businessId) {
  const { error } = await supabase
    .from('memberships')
    .delete()
    .eq('id', membershipId)
    .eq('business_id', businessId);
  if (error) throw error;
}

export async function listInvitations(businessId) {
  const { data, error } = await supabase
    .from('invitations')
    .select('id, email, role, created_at')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createInvitation(businessId, email, role) {
  const clean = (email || '').trim().toLowerCase();
  const { data, error } = await supabase
    .from('invitations')
    .insert({ business_id: businessId, email: clean, role })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function cancelInvitation(id, businessId) {
  const { error } = await supabase
    .from('invitations')
    .delete()
    .eq('id', id)
    .eq('business_id', businessId);
  if (error) throw error;
}
