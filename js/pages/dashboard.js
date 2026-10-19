import { el } from '../ui.js';
import { navigate } from '../router.js';
import { state } from '../state.js';
import { t } from '../i18n.js';
import { money, date } from '../format.js';
import { getDashboardData } from '../api/dashboard.js';
import { listOutstandingSales } from '../api/sales.js';
import { countdownText, dueBadgeClass, dueStatus } from '../lib/debt.js';

let chartInstance = null;

export async function dashboard(container) {
  const businessId = state.currentBusiness && state.currentBusiness.id;
  const wrap = el('div', { class: 'container col' });
  container.appendChild(wrap);

  if (!businessId) {
    wrap.appendChild(el('div', { class: 'state' }, [
      el('div', { class: 'state-title', text: t.dash_no_business }),
    ]));
    return;
  }

  const biz = state.currentBusiness || {};
  const role = state.role || 'member';

  const head = el('div');
  head.appendChild(el('h1', { text: biz.name || t.nav_dashboard }));
  head.appendChild(el('p', { class: 'muted', text: t.dash_signed_in_as + ' ' + role }));
  wrap.appendChild(head);

  const loading = el('div', { class: 'dash-grid' });
  for (let i = 0; i < 4; i++) loading.appendChild(el('div', { class: 'skeleton', style: 'height:100px;' }));
  wrap.appendChild(loading);

  let data, outstanding;
  try {
    data = await getDashboardData(businessId);
    outstanding = await listOutstandingSales(businessId);
  } catch (err) {
    loading.remove();
    const st = el('div', { class: 'state' }, [
      el('div', { class: 'state-title', text: t.state_error_title }),
      el('div', { class: 'state-text', text: err.message || t.state_error_text }),
    ]);
    const rt = el('button', { class: 'btn btn-secondary', type: 'button', text: t.action_retry });
    rt.addEventListener('click', () => { container.innerHTML = ''; dashboard(container); });
    st.appendChild(rt);
    wrap.appendChild(st);
    return;
  }
  loading.remove();

  const hero = el('div', { class: 'dash-hero' });
  hero.appendChild(el('div', { class: 'dash-hero-label', text: t.dash_today_revenue }));
  hero.appendChild(el('div', { class: 'dash-hero-value', text: money(data.todayRevenue) }));
  hero.appendChild(el('div', {
    class: 'dash-hero-sub',
    text: data.ordersToday + ' ' + (data.ordersToday === 1 ? t.dash_order : t.dash_orders) + ' ' + t.dash_today,
  }));
  wrap.appendChild(hero);

  const quick = el('div', { class: 'dash-quick' });
  const newSale = el('button', { class: 'btn btn-primary btn-lg', type: 'button', text: '+ ' + t.sale_new });
  newSale.addEventListener('click', () => navigate('sales/new'));
  quick.appendChild(newSale);
  const newProd = el('button', { class: 'btn btn-secondary btn-lg', type: 'button', text: '+ ' + t.prod_add });
  newProd.addEventListener('click', () => navigate('products/new'));
  quick.appendChild(newProd);
  wrap.appendChild(quick);

  // ---- MONEY OWED TO YOU (credit awareness) ----
  if (outstanding && outstanding.length) {
    let overdueCount = 0, dueSoonCount = 0, totalOutstanding = 0;
    for (const s of outstanding) {
      totalOutstanding += Number(s.balance || 0);
      const st = dueStatus(s.due_date);
      if (st.level === 'overdue') overdueCount++;
      else if (st.level === 'today' || st.level === 'soon') dueSoonCount++;
    }

    const debtCard = el('div', { class: 'dash-card', style: 'border-left:3px solid var(--warning);' });
    const dh = el('div', { class: 'dash-card-head' });
    dh.appendChild(el('div', { class: 'dash-card-title', text: t.debt_dashboard_title }));
    const seeAll = el('div', { class: 'dash-card-link', text: t.debt_view_payments });
    seeAll.addEventListener('click', () => navigate('payments'));
    dh.appendChild(seeAll);
    debtCard.appendChild(dh);

    const statGrid = el('div', { class: 'dash-grid', style: 'margin-bottom:10px;' });
    statGrid.appendChild(metric(t.debt_overdue_count, String(overdueCount), overdueCount > 0 ? 'error' : 'success'));
    statGrid.appendChild(metric(t.debt_due_soon_count, String(dueSoonCount), dueSoonCount > 0 ? 'warn' : 'success'));
    statGrid.appendChild(metric(t.debt_total_outstanding, money(totalOutstanding), totalOutstanding > 0 ? 'warn' : 'success'));
    debtCard.appendChild(statGrid);

    // Top 5 most urgent
    const sorted = outstanding.slice().sort((a, b) => {
      const sa = dueStatus(a.due_date), sb = dueStatus(b.due_date);
      const wa = sa.level === 'overdue' ? 0 : sa.level === 'today' ? 1 : sa.level === 'soon' ? 2 : 3;
      const wb = sb.level === 'overdue' ? 0 : sb.level === 'today' ? 1 : sb.level === 'soon' ? 2 : 3;
      return wa - wb;
    }).slice(0, 5);

    for (const s of sorted) {
      const item = el('div', { class: 'dash-list-item' });
      const l = el('div', { class: 'dash-list-left' });
      l.appendChild(el('div', { class: 'dash-list-title', text: (s.customers && s.customers.name) || t.sale_walkin }));
      l.appendChild(el('div', {
        class: 'dash-list-sub',
        text: s.sale_number + (s.due_date ? ' · ' + date(s.due_date) : ''),
      }));
      item.appendChild(l);
      const r = el('div', { class: 'dash-list-right' });
      r.appendChild(el('div', { class: 'dash-list-title', text: money(s.balance) }));
      if (s.due_date) {
        r.appendChild(el('span', { class: dueBadgeClass(s.due_date), text: countdownText(s.due_date) }));
      }
      item.appendChild(r);
      item.addEventListener('click', () => navigate('sales/view/' + s.id));
      debtCard.appendChild(item);
    }
    wrap.appendChild(debtCard);
  }

  const grid = el('div', { class: 'dash-grid' });
  grid.appendChild(metric(t.dash_week_revenue, money(data.weekRevenue)));
  grid.appendChild(metric(t.dash_month_revenue, money(data.monthRevenue)));
  grid.appendChild(metric(t.dash_orders_today, String(data.ordersToday)));
  grid.appendChild(metric(t.dash_unpaid, money(data.unpaidBalance), data.unpaidBalance > 0 ? 'warn' : ''));
  grid.appendChild(metric(t.dash_low_stock, String(data.lowStockCount), data.lowStockCount > 0 ? 'warn' : 'success'));
  grid.appendChild(metric(t.dash_out_stock, String(data.outStockCount), data.outStockCount > 0 ? 'error' : 'success'));
  wrap.appendChild(grid);

  const chartCard = el('div', { class: 'dash-card' });
  chartCard.appendChild(el('div', { class: 'dash-card-title', text: t.dash_revenue_7d }));
  const canvasWrap = el('div', { class: 'chart-canvas-wrap' });
  const canvas = document.createElement('canvas');
  canvas.id = 'dash-chart';
  canvasWrap.appendChild(canvas);
  chartCard.appendChild(canvasWrap);
  wrap.appendChild(chartCard);
  setTimeout(() => drawChart(data.days), 0);

  const topCard = el('div', { class: 'dash-card' });
  topCard.appendChild(el('div', { class: 'dash-card-title', text: t.dash_top_products }));
  if (!data.topProducts.length) {
    topCard.appendChild(el('div', { class: 'muted', text: t.dash_no_data }));
  } else {
    const maxRev = data.topProducts[0].revenue || 1;
    for (const p of data.topProducts) {
      const row = el('div', { class: 'bar-row' });
      const line = el('div', { class: 'bar-line' });
      line.appendChild(el('div', { class: 'bar-line-name', text: p.name }));
      line.appendChild(el('div', { text: money(p.revenue) }));
      row.appendChild(line);
      const track = el('div', { class: 'bar-track' });
      const fill = el('div', { class: 'bar-fill' });
      fill.style.width = Math.max(4, (p.revenue / maxRev) * 100) + '%';
      track.appendChild(fill);
      row.appendChild(track);
      topCard.appendChild(row);
    }
  }
  wrap.appendChild(topCard);

  const recentCard = el('div', { class: 'dash-card' });
  const recentHead = el('div', { class: 'dash-card-head' });
  recentHead.appendChild(el('div', { class: 'dash-card-title', text: t.dash_recent_sales }));
  const seeAll = el('div', { class: 'dash-card-link', text: t.dash_see_all });
  seeAll.addEventListener('click', () => navigate('sales'));
  recentHead.appendChild(seeAll);
  recentCard.appendChild(recentHead);
  if (!data.recentSales.length) {
    recentCard.appendChild(el('div', { class: 'muted', text: t.dash_no_sales }));
  } else {
    for (const s of data.recentSales) {
      const item = el('div', { class: 'dash-list-item' });
      const l = el('div', { class: 'dash-list-left' });
      l.appendChild(el('div', { class: 'dash-list-title', text: s.sale_number }));
      const cust = (s.customers && s.customers.name) || t.sale_walkin;
      l.appendChild(el('div', { class: 'dash-list-sub', text: cust + ' · ' + date(s.sale_date) }));
      item.appendChild(l);
      const r = el('div', { class: 'dash-list-right' });
      r.appendChild(el('div', { class: 'dash-list-title', text: money(s.total) }));
      r.appendChild(el('span', {
        class: 'badge ' + (s.payment_status === 'paid' ? 'badge-success'
          : s.payment_status === 'partial' ? 'badge-warning' : 'badge-error'),
        text: t['pay_' + s.payment_status] || s.payment_status,
      }));
      item.appendChild(r);
      item.addEventListener('click', () => navigate('sales/view/' + s.id));
      recentCard.appendChild(item);
    }
  }
  wrap.appendChild(recentCard);

  const lowCard = el('div', { class: 'dash-card' });
  const lowHead = el('div', { class: 'dash-card-head' });
  lowHead.appendChild(el('div', { class: 'dash-card-title', text: t.dash_low_stock_alerts }));
  const invLink = el('div', { class: 'dash-card-link', text: t.dash_see_all });
  invLink.addEventListener('click', () => navigate('inventory'));
  lowHead.appendChild(invLink);
  lowCard.appendChild(lowHead);
  if (!data.lowStockItems.length) {
    lowCard.appendChild(el('div', { class: 'muted', text: t.dash_all_good }));
  } else {
    for (const row of data.lowStockItems) {
      const item = el('div', { class: 'dash-list-item' });
      const l = el('div', { class: 'dash-list-left' });
      l.appendChild(el('div', { class: 'dash-list-title', text: row.product_name }));
      const sub = row.variant_name && row.variant_name !== 'Default'
        ? row.variant_name
        : (row.sku ? 'SKU ' + row.sku : t.prod_variant_sing);
      l.appendChild(el('div', { class: 'dash-list-sub', text: sub }));
      item.appendChild(l);
      const r = el('div', { class: 'dash-list-right' });
      r.appendChild(el('div', { class: 'dash-list-title', text: String(row.total) }));
      r.appendChild(el('span', {
        class: 'badge ' + (row.total <= 0 ? 'badge-error' : 'badge-warning'),
        text: row.total <= 0 ? t.inv_out : t.inv_low,
      }));
      item.appendChild(r);
      item.addEventListener('click', () => navigate('inventory'));
      lowCard.appendChild(item);
    }
  }
  wrap.appendChild(lowCard);
}

function metric(label, value, variant) {
  const cls = 'dash-metric' + (variant ? ' dash-metric-' + variant : '');
  const card = el('div', { class: cls });
  card.appendChild(el('div', { class: 'dash-metric-label', text: label }));
  card.appendChild(el('div', { class: 'dash-metric-value', text: value }));
  return card;
}

function drawChart(days) {
  if (chartInstance) {
    try { chartInstance.destroy(); } catch (e) { /* ignore */ }
    chartInstance = null;
  }
  const canvas = document.getElementById('dash-chart');
  if (!canvas || !window.Chart) return;
  const labels = days.map((d) => d.label);
  const values = days.map((d) => d.revenue);
  chartInstance = new window.Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: t.sale_total,
        data: values,
        borderColor: '#2563EB',
        backgroundColor: 'rgba(37,99,235,.12)',
        borderWidth: 2, fill: true, tension: 0.35,
        pointRadius: 3, pointBackgroundColor: '#2563EB',
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => money(ctx.parsed.y) } } },
      scales: {
        y: { beginAtZero: true, ticks: { callback: (v) => money(v), font: { size: 11 } }, grid: { color: '#E5E7EB' } },
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      },
    },
  });
}
