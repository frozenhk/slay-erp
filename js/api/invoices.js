import { supabase } from '../supabase.js';

export async function listInvoices(businessId, opts) {
  const f = opts || {};
  let q = supabase
    .from('invoices')
    .select(`
      id, invoice_number, issued_at, sale_id,
      sales(sale_number, total, payment_status, status, sale_date, customers(name))
    `)
    .eq('business_id', businessId)
    .order('issued_at', { ascending: false })
    .limit(f.limit || 200);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function getInvoiceForSale(saleId, businessId) {
  const { data, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, issued_at')
    .eq('sale_id', saleId)
    .eq('business_id', businessId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
