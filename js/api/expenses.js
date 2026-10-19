import { supabase } from '../supabase.js';

export const EXPENSE_CATEGORIES = [
  'Rent', 'Salaries', 'Transport', 'Delivery', 'Fuel', 'Advertising',
  'Packaging', 'Electricity', 'Internet', 'Office supplies', 'Repairs',
  'Taxes', 'Bank fees', 'Mobile Money fees', 'Miscellaneous',
];

export async function listExpenses(businessId, opts) {
  const f = opts || {};
  let q = supabase
    .from('expenses')
    .select('id, category, amount, method, description, expense_date, created_at')
    .eq('business_id', businessId)
    .order('expense_date', { ascending: false })
    .limit(f.limit || 300);
  if (f.from) q = q.gte('expense_date', f.from);
  if (f.to) q = q.lte('expense_date', f.to);
  if (f.category) q = q.eq('category', f.category);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function createExpense(businessId, data) {
  const { data: row, error } = await supabase
    .from('expenses')
    .insert({
      business_id: businessId,
      category: data.category,
      amount: Number(data.amount),
      method: data.method || 'cash',
      description: data.description || null,
      expense_date: data.expense_date,
    })
    .select()
    .single();
  if (error) throw error;
  return row;
}

export async function deleteExpense(id, businessId) {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('business_id', businessId);
  if (error) throw error;
}
