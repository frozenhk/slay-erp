import { supabase } from '../supabase.js';

export const CUSTOMER_TYPES = [
  'retail', 'wholesale', 'distributor', 'reseller', 'corporate', 'vip',
];

export async function listCustomers(businessId, opts) {
  const f = opts || {};
  let q = supabase
    .from('customers')
    .select('id, name, phone, email, city, customer_type, created_at')
    .eq('business_id', businessId)
    .order('name');
  if (f.search) q = q.ilike('name', '%' + f.search + '%');
  if (f.type) q = q.eq('customer_type', f.type);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function getCustomer(id, businessId) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .eq('business_id', businessId)
    .single();
  if (error) throw error;
  return data;
}

export async function createCustomer(businessId, data) {
  const { data: row, error } = await supabase
    .from('customers')
    .insert({
      business_id: businessId,
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      city: data.city || null,
      customer_type: data.customer_type || 'retail',
      notes: data.notes || null,
    })
    .select()
    .single();
  if (error) throw error;
  return row;
}

export async function updateCustomer(id, businessId, data) {
  const { error } = await supabase
    .from('customers')
    .update({
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      city: data.city || null,
      customer_type: data.customer_type || 'retail',
      notes: data.notes || null,
    })
    .eq('id', id)
    .eq('business_id', businessId);
  if (error) throw error;
}

export async function getCustomerStats(customerId, businessId) {
  const { data, error } = await supabase
    .from('sales')
    .select('id, total, amount_paid, balance, payment_status, sale_date, status, sale_number')
    .eq('business_id', businessId)
    .eq('customer_id', customerId)
    .eq('status', 'completed')
    .order('sale_date', { ascending: false });
  if (error) throw error;

  const rows = data || [];
  let totalSpent = 0, totalBalance = 0;
  for (const r of rows) {
    totalSpent += Number(r.total || 0);
    totalBalance += Number(r.balance || 0);
  }
  return {
    totalSpent,
    totalBalance,
    purchaseCount: rows.length,
    lastPurchase: rows[0] ? rows[0].sale_date : null,
    sales: rows,
  };
}
