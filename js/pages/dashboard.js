import { el } from '../ui.js';
import { navigate } from '../router.js';
import { state } from '../state.js';
import { t } from '../i18n.js';
import { money, date } from '../format.js';
import { getDashboardData } from '../api/dashboard.js';
import { listOutstandingSales } from '../api/sales.js';
import { countdownText, dueBadgeClass, dueStatus } from '../lib/debt.js';

let chartInstance = null;
let topChartInstance = null;

export async function dashboard(container) {
  const businessId = state.currentBusiness && state.currentBusiness.id;
  const wrap = el('div', { class: 'container col fade-in' });
  container.appendChild(wrap);

  if (!businessId) return;

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
    wrap.appendChild(el('div', { class: 'state' }, [el('div', { class: 'state-title', text: err.message })]));
    return;
  }
  loading.remove();

  const hero = el('div', { class: 'dash-hero' });
  hero.appendChild(el('div', { class: 'dash-hero-label', text: t.dash_today_revenue }));
  hero.appendChild(el('div', { class: 'dash-hero-value', text: money(data.todayRevenue) }));
  hero.appendChild(el('div', { class: 'dash-hero-sub', text: data.ordersToday + ' ' + (data.ordersToday === 1 ? t.dash_order : t.dash_orders) + ' ' + t.dash_today }));
  wrap.appendChild(hero);

  const quick = el('div', { class: 'dash-quick' });
  const newSale = el('button', { class: 'btn btn-primary btn-lg btn-press', type: 'button', text: '+ ' + t.sale_new });
  newSale.addEventListener('click', () => navigate('sales/new'));
  quick.appendChild(newSale);
  const newProd = el('button', { class: 'btn btn-secondary btn-lg btn-press', type: 'button', text: '+ ' + t.prod_add });
  newProd.addEventListener('click', () => navigate('products/new'));
  quick.appendChild(newProd);
  wrap.appendChild(quick);

  const grid = el('div', { class: 'dash-grid' });
  grid.appendChild(metric(t.dash_week_revenue, money(data.weekRevenue)));
  grid.appendChild(metric(t.dash_month_revenue, money(data.monthRevenue)));
  grid.appendChild(metric(t.dash_orders_today, String(data.ordersToday)));
  grid.appendChild(metric(t.dash_unpaid, money(data.unpaidBalance), data.unpaidBalance > 0 ? 'warn' : ''));
  grid.appendChild(metric(t.dash_low_stock, String(data.lowStockCount), data.lowStockCount > 0 ? 'warn' : 'success'));
  grid.appendChild(metric(t.dash_out_stock, String(data.outStockCount), data.outStockCount > 0 ? 'error' : 'success'));
  wrap.appendChild(grid);

  const chartsGrid = el('div', { style: 'display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:16px; margin-top:16px;' });

  // --- FOREX TRADING CHART ---
  const chartCard = el('div', { class: 'dash-card hover-lift' });
  chartCard.appendChild(el('div', { class: 'dash-card-title', text: t.dash_revenue_7d }));
  const canvasWrap = el('div', { class: 'chart-canvas-wrap', style: 'height: 260px;' });
  const canvas = document.createElement('canvas');
  canvas.id = 'dash-chart';
  canvasWrap.appendChild(canvas);
  chartCard.appendChild(canvasWrap);
  chartsGrid.appendChild(chartCard);

  wrap.appendChild(chartsGrid);
  
  setTimeout(() => {
    drawChart(data.days);
  }, 50);

  const recentCard = el('div', { class: 'dash-card hover-lift', style: 'margin-top:16px;' });
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
        class: 'badge ' + (s.payment_status === 'paid' ? 'badge-success' : s.payment_status === 'partial' ? 'badge-warning' : 'badge-error'),
        text: t['pay_' + s.payment_status] || s.payment_status,
      }));
      item.appendChild(r);
      item.addEventListener('click', () => navigate('sales/view/' + s.id));
      recentCard.appendChild(item);
    }
  }
  wrap.appendChild(recentCard);
}

function metric(label, value, variant) {
  const cls = 'dash-metric' + (variant ? ' dash-metric-' + variant : '') + ' hover-lift';
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
  
  const ctx = canvas.getContext('2d');
  
  // Glowing gradient for the Forex feel
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(37,99,235,0.5)');
  gradient.addColorStop(1, 'rgba(37,99,235,0)');

  const labels = days.map((d) => d.label);
  const values = days.map((d) => d.revenue);
  
  chartInstance = new window.Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: t.sale_total,
        data: values,
        borderColor: '#3B82F6',
        borderWidth: 3,
        backgroundColor: gradient,
        fill: true,
        tension: 0.45, // Smooth curve
        pointRadius: 0, 
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#3B82F6',
        pointHoverBorderWidth: 3,
        shadowColor: 'rgba(59,130,246,0.5)', // Glow effect
        shadowBlur: 10
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      animation: {
        duration: 1500,
        easing: 'easeOutQuart'
      },
      plugins: { 
        legend: { display: false }, 
        tooltip: { 
          backgroundColor: '#111827',
          titleFont: { size: 13, family: 'Inter' },
          bodyFont: { size: 16, weight: 'bold', family: 'Inter' },
          padding: 12,
          displayColors: false,
          cornerRadius: 8,
          callbacks: { label: (ctx) => money(ctx.parsed.y) } 
        } 
      },
      scales: {
        y: { 
          beginAtZero: true, 
          ticks: { display: false }, // Hide Y axis for clean trading look
          grid: { display: false, drawBorder: false } 
        },
        x: { 
          grid: { display: false, drawBorder: false }, 
          ticks: { font: { size: 11, family: 'Inter' }, color: '#94A3B8' } 
        },
      },
    },
  });
}
