import { supabase } from '../supabase.js';

export async function getOrCreateTicket(businessId, userId, subject) {
  const { data: existing } = await supabase.from('support_tickets').select('id').eq('business_id', businessId).eq('user_id', userId).neq('status', 'closed').order('created_at', { ascending: false }).limit(1).single();
  if (existing) return existing.id;
  const { data, error } = await supabase.from('support_tickets').insert({ business_id: businessId, user_id: userId, subject: subject || 'Support Request' }).select().single();
  if (error) throw error;
  return data.id;
}

export async function getMessages(ticketId) {
  const { data, error } = await supabase.from('support_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function sendMessage(ticketId, senderId, senderType, message) {
  const { error } = await supabase.from('support_messages').insert({ ticket_id: ticketId, sender_id: senderId, sender_type: senderType, message });
  if (error) throw error;
}

export async function listAllTickets() {
  // Fetch tickets WITHOUT profiles
  const { data: tickets, error } = await supabase.from('support_tickets')
    .select('*, businesses(name)')
    .order('updated_at', { ascending: false });
    
  if (error) throw error;
  if (!tickets || !tickets.length) return [];

  // Fetch profiles manually
  const userIds = [...new Set(tickets.map(t => t.user_id))];
  const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
  
  const profileMap = {};
  for (const p of profiles || []) profileMap[p.id] = p;

  // Merge
  return tickets.map(t => ({
    ...t,
    profiles: profileMap[t.user_id] || null
  }));
}
