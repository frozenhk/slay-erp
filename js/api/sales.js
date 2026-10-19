import { supabase } from '../supabase.js';

export const SALE_CHANNELS = [
  'in_store', 'whatsapp', 'facebook', 'instagram', 'website', 'wholesale', 'other',
];
export const PAYMENT_METHODS = [
  'cash', 'mtn_momo', 'orange_money', 'bank_transfer', 'card', 'other',
];

export async function searchVariants(businessId, query, limit) {
  const lim = limit || 500;
  const { data, error } = await supabase
    .from('product_variants')
    .select(`
      id, name, sku, barcode, cost_price, selling_price, is_active,
      products!inner(id, name, tax_rate, track_stock, is_active, reorder_level)
    `)
    .eq('business_id', businessId)
    .eq('is_active', true)
    .eq('products.is_active', true)
    .limit(lim);
  if (error) throw error;
  const q = (query || '').trim().toLowerCase();
  const rows = data || [];
  if (!q) return rows.slice(0, 30);
  return rows.filter((v) => {
    const pn = (v.products && v.products.name) || '';
    const hay = (pn + ' ' + (v.name || '') + ' ' + (v.sku || '') + ' ' + (v.barcode || '')).toLowerCase();
    return hay.includes(q);
  }).slice(0, 30);
}

export async function createSale(businessId, payload) {
  const { data, error } = await supabase.rpc('create_sale', {
    p_business: businessId,
    p_location: payload.location_id,
    p_customer: payload.customer_id || null,
    p_items: payload.items,
    p_discount: Number(payload.discount) || 0,
    p_delivery_fee: Number(payload.delivery_fee) || 0,
    p_channel: payload.channel || 'in_store',
    p_payment_method: payload.payment_method || 'cash',
    p_amount_paid: Number(payload.amount_paid) || 0,
  });
  if (error) throw error;

  // Attach due_date if provided (create_sale does not take it yet).
  if (payload.due_date) {
    const { error: dueErr } = await supabase
      .from('sales')
      .update({ due_date: payload.due_date })
      .eq('id', data)
      .eq('business_id', businessId);
    if (dueErr) throw dueErr;
  }
  return data;
}

export async function updateSaleDueDate(saleId, businessId, dueDate) {
  const { error } = await supabase
    .from('sales')
    .update({ due_date: dueDate || null })
    .eq('id', saleId)
    .eq('business_id', businessId);
  if (error) throw error;
}

export async function listSales(businessId, opts) {
  const f = opts || {};
  let q = supabase
    .from('sales')
    .select(`
      id, sale_number, sale_date, due_date, status, channel, total, amount_paid, balance,
      payment_status, customer_id, customers(name)
    `)
    .eq('business_id', businessId)
    .order('sale_date', { ascending: false })
    .limit(f.limit || 200);
  if (f.status) q = q.eq('status', f.status);
  if (f.payment_status) q = q.eq('payment_status', f.payment_status);
  if (f.channel) q = q.eq('channel', f.channel);
  if (f.from) q = q.gte('sale_date', f.from);
  if (f.to) q = q.lte('sale_date', f.to);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function getSale(saleId, businessId) {
  const { data, error } = await supabase
    .from('sales')
    .select(`
      id, sale_number, sale_date, due_date, status, channel,
      subtotal, discount, tax, delivery_fee, total,
      amount_paid, balance, payment_status, customer_id, location_id,
      customers(id, name, phone, email, customer_type),
      locations(id, name)
    `)
    .eq('id', saleId)
    .eq('business_id', businessId)
    .single();
  if (error) throw error;
  return data;
}

export async function getSaleItems(saleId) {
  const { data, error } = await supabase
    .from('sale_items')
    .select('id, product_name, quantity, unit_price, unit_cost, line_total, variant_id')
    .eq('sale_id', saleId);
  if (error) throw error;
  return data || [];
}

export async function getSalePayments(saleId) {
  const { data, error } = await supabase
    .from('payments')
    .select('id, amount, method, reference, paid_at')
    .eq('sale_id', saleId)
    .order('paid_at');
  if (error) throw error;
  return data || [];
}

export async function recordPayment(businessId, saleId, amount, method, reference) {
  const { error } = await supabase.rpc('record_payment', {
    p_business: businessId,
    p_sale: saleId,
    p_amount: Number(amount),
    p_method: method || 'cash',
    p_reference: reference || null,
  });
  if (error) throw error;
}

export async function cancelSale(businessId, saleId) {
  const { error } = await supabase.rpc('cancel_sale', {
    p_business: businessId, p_sale: saleId,
  });
  if (error) throw error;
}

export async function cancelPayment(businessId, paymentId) {
  const { error } = await supabase.rpc('cancel_payment', {
    p_business: businessId, p_payment: paymentId,
  });
  if (error) throw error;
}

export async function listPayments(businessId, opts) {
  const f = opts || {};
  let q = supabase
    .from('payments')
    .select(`id, amount, method, reference, paid_at, sales(sale_number, id), customers(name)`)
    .eq('business_id', businessId)
    .order('paid_at', { ascending: false })
    .limit(f.limit || 200);
  if (f.method) q = q.eq('method', f.method);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function listOutstandingSales(businessId) {
  const { data, error } = await supabase
    .from('sales')
    .select('id, sale_number, sale_date, due_date, total, amount_paid, balance, customer_id, customers(name, phone)')
    .eq('business_id', businessId)
    .eq('status', 'completed')
    .gt('balance', 0)
    .order('due_date', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data || [];
}
