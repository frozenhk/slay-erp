import { supabase } from '../supabase.js';
import { listStockOverview } from './stock.js';

export async function getDashboardData(businessId) {
  const now = new Date();
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const thirtyDaysAgo = new Date(startOfToday);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

  const { data: sales, error: sErr } = await supabase
    .from('sales')
    .select('id, sale_number, sale_date, status, total, balance, amount_paid, payment_status, customers(name)')
    .eq('business_id', businessId)
    .gte('sale_date', thirtyDaysAgo.toISOString())
    .order('sale_date', { ascending: false });
  if (sErr) throw sErr;
  const allSales = sales || [];

  let todayRevenue = 0, weekRevenue = 0, monthRevenue = 0;
  let ordersToday = 0, unpaidBalance = 0;

  for (const s of allSales) {
    if (s.status !== 'completed') continue;
    const d = new Date(s.sale_date);
    const total = Number(s.total || 0);
    if (d >= startOfToday) { todayRevenue += total; ordersToday += 1; }
    if (d >= sevenDaysAgo) weekRevenue += total;
    if (d >= startOfMonth) monthRevenue += total;
    unpaidBalance += Number(s.balance || 0);
  }

  const completedIds = allSales.filter((s) => s.status === 'completed').map((s) => s.id);

  let topProducts = [];
  if (completedIds.length) {
    const { data: items, error: iErr } = await supabase
      .from('sale_items')
      .select('product_name, quantity, line_total')
      .in('sale_id', completedIds);
    if (!iErr) {
      const map = {};
      for (const it of items || []) {
        const key = it.product_name || 'Unknown';
        if (!map[key]) map[key] = { name: key, qty: 0, revenue: 0 };
        map[key].qty += Number(it.quantity || 0);
        map[key].revenue += Number(it.line_total || 0);
      }
      topProducts = Object.values(map)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    }
  }

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(startOfToday);
    d.setDate(d.getDate() - i);
    days.push({
      date: d,
      label: d.toLocaleDateString('en', { weekday: 'short' }),
      revenue: 0,
    });
  }
  for (const s of allSales) {
    if (s.status !== 'completed') continue;
    const sd = new Date(s.sale_date);
    sd.setHours(0, 0, 0, 0);
    const idx = days.findIndex((d) => d.date.getTime() === sd.getTime());
    if (idx >= 0) days[idx].revenue += Number(s.total || 0);
  }

  let lowStockCount = 0, outStockCount = 0, lowStockItems = [];
  try {
    const stock = await listStockOverview(businessId);
    for (const row of stock) {
      if (!row.track_stock) continue;
      const isOut = row.total <= 0;
      const isLow = !isOut && row.reorder_level > 0 && row.total <= row.reorder_level;
      if (isOut) outStockCount += 1;
      else if (isLow) lowStockCount += 1;
      if (isOut || isLow) lowStockItems.push(row);
    }
    lowStockItems = lowStockItems.slice(0, 5);
  } catch (err) {
    console.error('stock overview failed', err);
  }

  const recentSales = allSales.filter((s) => s.status === 'completed').slice(0, 5);

  return {
    todayRevenue, weekRevenue, monthRevenue, ordersToday, unpaidBalance,
    lowStockCount, outStockCount,
    topProducts, days, lowStockItems, recentSales,
  };
}
