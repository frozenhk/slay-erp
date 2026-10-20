import { supabase } from '../supabase.js';

export async function generateInvoice(businessId, planCode, interval) {
  const { data, error } = await supabase.rpc('generate_subscription_invoice', {
    p_business: businessId, p_plan_code: planCode, p_interval: interval
  });
  if (error) throw error;
  return data;
}

export async function submitPayment(invoiceId, businessId, amount, method, reference) {
  const { error } = await supabase.from('subscription_payments').insert({
    invoice_id: invoiceId, business_id: businessId, amount, method, reference, status: 'pending'
  });
  if (error) throw error;
}

export async function listPendingPayments() {
  const { data, error } = await supabase.from('subscription_payments')
    .select('*, subscription_invoices(invoice_number, plan_code, billing_interval, businesses(name))')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function adminVerifyPayment(paymentId) {
  const { error } = await supabase.rpc('admin_verify_payment', { p_payment: paymentId });
  if (error) throw error;
}
