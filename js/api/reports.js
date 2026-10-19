import { supabase } from '../supabase.js';

export async function buildSalesReport(businessId, fromISO, toISO) {
  const { data, error } = await supabase
    .from('sales')
    .select('id, sale_date, total, channel, customer_id, customers(name)')
    .eq('business_id', businessId)
    .eq('status', 'completed')
    .gte('sale_date', fromISO)
    .lte('sale_date', toISO);
  if (error) throw error;

  const byDay = {};
  const byChannel = {};
  let grand = 0;

  for (const s of data || []) {
    const day = (s.sale_date || '').slice(0, 10);
    const total = Number(s.total || 0);
    grand += total;

    if (!byDay[day]) byDay[day] = { date: day, orders: 0, revenue: 0 };
    byDay[day].orders += 1;
    byDay[day].revenue += total;

    const ch = s.channel || 'in_store';
    if (!byChannel[ch]) byChannel[ch] = { channel: ch, orders: 0, revenue: 0 };
    byChannel[ch].orders += 1;
    byChannel[ch].revenue += total;
  }

  return {
    total: grand,
    count: (data || []).length,
    byDay: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
    byChannel: Object.values(byChannel).sort((a, b) => b.revenue - a.revenue),
  };
}

export async function buildProductsReport(businessId, fromISO, toISO) {
  const { data: sales, error: sErr } = await supabase
    .from('sales').select('id')
    .eq('business_id', businessId).eq('status', 'completed')
    .gte('sale_date', fromISO).lte('sale_date', toISO);
  if (sErr) throw sErr;
  const ids = (sales || []).map((s) => s.id);
  if (!ids.length) return { rows: [], totalRevenue: 0, totalQty: 0 };

  const { data, error } = await supabase
    .from('sale_items')
    .select('product_name, quantity, unit_cost, line_total')
    .in('sale_id', ids);
  if (error) throw error;

  const map = {};
  let totalRevenue = 0, totalQty = 0, totalCost = 0;
  for (const it of data || []) {
    const key = it.product_name || 'Unknown';
    if (!map[key]) map[key] = { name: key, qty: 0, revenue: 0, cost: 0, profit: 0 };
    const q = Number(it.quantity || 0);
    const rev = Number(it.line_total || 0);
    const cost = Number(it.unit_cost || 0) * q;
    map[key].qty += q; map[key].revenue += rev; map[key].cost += cost;
    map[key].profit += (rev - cost);
    totalRevenue += rev; totalQty += q; totalCost += cost;
  }

  return {
    rows: Object.values(map).sort((a, b) => b.revenue - a.revenue),
    totalRevenue, totalQty, totalCost,
  };
}

export async function buildCustomersReport(businessId, fromISO, toISO) {
  const { data, error } = await supabase
    .from('sales')
    .select('customer_id, total, customers(name)')
    .eq('business_id', businessId).eq('status', 'completed')
    .gte('sale_date', fromISO).lte('sale_date', toISO);
  if (error) throw error;

  const map = {};
  for (const s of data || []) {
    const key = s.customer_id || 'walkin';
    const name = (s.customers && s.customers.name) || 'Walk-in';
    if (!map[key]) map[key] = { name, orders: 0, revenue: 0 };
    map[key].orders += 1;
    map[key].revenue += Number(s.total || 0);
  }
  return { rows: Object.values(map).sort((a, b) => b.revenue - a.revenue) };
}

export async function buildProfitReport(businessId, fromISO, toISO) {
  const sales = await buildSalesReport(businessId, fromISO, toISO);
  const products = await buildProductsReport(businessId, fromISO, toISO);
  const { data: expData, error: eErr } = await supabase
    .from('expenses')
    .select('amount, category')
    .eq('business_id', businessId)
    .gte('expense_date', fromISO.slice(0, 10))
    .lte('expense_date', toISO.slice(0, 10));
  if (eErr) throw eErr;

  let expenses = 0;
  const expByCat = {};
  for (const e of expData || []) {
    const amt = Number(e.amount || 0);
    expenses += amt;
    expByCat[e.category] = (expByCat[e.category] || 0) + amt;
  }

  const revenue = sales.total;
  const cogs = products.totalCost || 0;
  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - expenses;

  return {
    revenue, cogs, grossProfit, expenses, netProfit,
    expenseByCategory: Object.keys(expByCat).map((k) => ({ category: k, amount: expByCat[k] }))
      .sort((a, b) => b.amount - a.amount),
  };
}

export async function buildInventoryReport(businessId) {
  const { data: variants, error } = await supabase
    .from('product_variants')
    .select(`
      id, name, cost_price, selling_price, is_active,
      products!inner(name, reorder_level, track_stock, is_active)
    `)
    .eq('business_id', businessId).eq('is_active', true)
    .eq('products.is_active', true);
  if (error) throw error;

  const ids = (variants || []).map((v) => v.id);
  let levels = [];
  if (ids.length) {
    const { data: lv, error: lErr } = await supabase
      .from('stock_levels').select('variant_id, quantity')
      .eq('business_id', businessId).in('variant_id', ids);
    if (lErr) throw lErr;
    levels = lv || [];
  }

  const qty = {};
  for (const l of levels) qty[l.variant_id] = (qty[l.variant_id] || 0) + Number(l.quantity || 0);

  const rows = (variants || []).map((v) => {
    const q = qty[v.id] || 0;
    const cost = Number(v.cost_price || 0);
    return {
      product: (v.products && v.products.name) || '',
      variant: v.name,
      sku: '',
      qty: q,
      cost,
      value: q * cost,
      reorder: Number((v.products && v.products.reorder_level) || 0),
      track: !!(v.products && v.products.track_stock),
    };
  });

  const totalValue = rows.reduce((a, r) => a + r.value, 0);
  return { rows: rows.sort((a, b) => b.value - a.value), totalValue };
}
