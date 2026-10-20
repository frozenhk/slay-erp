import { supabase } from '../supabase.js';
export async function listMyInvites() {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];
  const email = userData.user.email.toLowerCase();
  const { data, error } = await supabase.from('invitations').select('id, role, created_at, businesses(name)').eq('email', email).eq('status', 'pending');
  if (error) return [];
  return data || [];
}
export async function acceptInvite(id) {
  const { error } = await supabase.rpc('accept_invitation', { p_invite: id });
  if (error) throw error;
}
export async function declineInvite(id) {
  const { error } = await supabase.rpc('decline_invitation', { p_invite: id });
  if (error) throw error;
}
