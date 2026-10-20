import { t } from './i18n.js';
import { navigate } from './router.js';
import { state } from './state.js';
import { initials } from './format.js';
import { el, modal, toast } from './ui.js';
import { signOut } from './auth.js';
import { canSeeMenu } from './permissions.js';
import { unreadCount } from './lib/notifications.js';

const ICONS = {
  home: ['M3 10.5 12 3l9 7.5', 'M5 9.5V21h14V9.5'],
  cart: ['M3 5h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.5L21 8H6', 'M10 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z', 'M17 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z'],
  tag: ['M20.6 13.4 11 3.8A2 2 0 0 0 9.6 3.2H4v5.6a2 2 0 0 0 .6 1.4l9.6 9.6a2 2 0 0 0 2.8 0l3.6-3.6a2 2 0 0 0 0-2.8Z', 'M7.5 7.5h.01'],
  box: ['M3 7.5 12 3l9 4.5-9 4.5-9-4.5Z', 'M3 7.5V17l9 4.5 9-4.5V7.5', 'M12 12v9.5'],
  user: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M4 21a8 8 0 0 1 16 0'],
  chart: ['M4 20V10', 'M10 20V4', 'M16 20v-7', 'M22 20H2'],
  menu: ['M4 7h16', 'M4 12h16', 'M4 17h16'],
  close: ['M6 6l12 12', 'M18 6 6 18'],
  file: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z', 'M14 2v6h6', 'M9 13h6', 'M9 17h6'],
  card: ['M2 7h20v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z', 'M2 7V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2', 'M6 15h4'],
  coins: ['M12 8c4.97 0 9-1.34 9-3s-4.03-3-9-3-9 1.34-9 3 4.03 3 9 3Z', 'M21 12c0 1.66-4.03 3-9 3s-9-1.34-9-3', 'M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5'],
  cog: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z', 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z'],
  bell: ['M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9', 'M13.7 21a2 2 0 0 1-3.4 0'],
  recovery: ['M20 12a8 8 0 1 1-8-8', 'M12 4v4h4', 'M12 8l4-4'], // Refresh/Recovery icon
  dot: ['M12 12h.01'],
};

function getNav() {
  return [
    { id: 'dashboard', label: t.nav_dashboard, path: 'dashboard', icon: 'home' },
    { id: 'sales', label: t.nav_sales, path: 'sales', icon: 'cart' },
    { id: 'invoices', label: t.nav_invoices, path: 'invoices', icon: 'file' },
    { id: 'payments', label: t.nav_payments, path: 'payments', icon: 'card' },
    { id: 'products', label: t.nav_products, path: 'products', icon: 'tag' },
    { id: 'inventory', label: t.nav_inventory, path: 'inventory', icon: 'box' },
    { id: 'customers', label: t.nav_customers, path: 'customers', icon: 'user' },
    { id: 'expenses', label: t.nav_expenses, path: 'expenses', icon: 'coins' },
    { id: 'reports', label: t.nav_reports, path: 'reports', icon: 'chart' },
    { id: 'more', label: t.nav_more, path: 'more', icon: 'menu' },
  ];
}

function getTitles() {
  return {
    dashboard: t.nav_dashboard, sales: t.nav_sales, products: t.nav_products,
    inventory: t.nav_inventory, customers: t.nav_customers, reports: t.nav_reports,
    more: t.nav_more, invoices: t.nav_invoices, payments: t.nav_payments,
    expenses: t.nav_expenses, users: t.users_title, settings: t.settings_title,
    notifications: t.notif_title, subscription: t.sub_title, pricing: t.sub_pricing_title,
    recovery: 'Customer Recovery', admin: t.admin_businesses_title,
    login: t.auth_sign_in, signup: t.auth_sign_up, forgot: t.auth_forgot_title,
    'check-email': t.auth_check_email_title, reset: t.auth_forgot_title,
    switcher: t.biz_choose, onboarding: t.biz_welcome,
  };
}

export function svgIcon(name, size) {
  const ns = 'http://www.w3.org/2000/svg';
  const s = size || 22;
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', s); svg.setAttribute('height', s);
  svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2'); svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  for (const d of ICONS[name] || ICONS.dot) {
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', d); svg.appendChild(p);
  }
  return svg;
}

function makeNavBtn(item) {
  const btn = el('button', { class: 'navlink', type: 'button' });
  btn.dataset.nav = item.id;
  btn.appendChild(svgIcon(item.icon));
  btn.appendChild(el('span', { text: item.label }));
  btn.addEventListener('click', () => { closeDrawer(); navigate(item.path); });
  return btn;
}

function openDrawer() { document.body.classList.add('drawer-open'); }
function closeDrawer() { document.body.classList.remove('drawer-open'); }
function currentBusinessName() {
  return (state.currentBusiness && state.currentBusiness.name) || '—';
}
function refreshBusinessBlock() {
  const bn = document.getElementById('sidebar-biz-name');
  if (bn) bn.textContent = currentBusinessName();
}

function buildSidebar() {
  const sb = document.getElementById('sidebar');
  if (!sb) return;
  while (sb.firstChild) sb.removeChild(sb.firstChild);

  const brand = el('div', { class: 'sidebar-brand' });
  const brandLeft = el('a', { class: 'sidebar-brand-left', href: '#/dashboard' });
  brandLeft.appendChild(el('span', { class: 'sidebar-logo', text: 'S' }));
  brandLeft.appendChild(el('span', { text: t.app_name }));
  brandLeft.addEventListener('click', (e) => { e.preventDefault(); closeDrawer(); navigate('dashboard'); });
  brand.appendChild(brandLeft);
  const closeBtn = el('button', { class: 'sidebar-close', type: 'button', 'aria-label': t.menu_close, title: t.menu_close });
  closeBtn.appendChild(svgIcon('close', 20));
  closeBtn.addEventListener('click', closeDrawer);
  brand.appendChild(closeBtn);
  sb.appendChild(brand);

  const biz = el('div', { class: 'sidebar-biz' });
  biz.appendChild(el('div', { class: 'sidebar-biz-label', text: t.biz_your_business }));
  biz.appendChild(el('div', { class: 'sidebar-biz-name', id: 'sidebar-biz-name', text: currentBusinessName() }));
  sb.appendChild(biz);

  const list = el('nav', { class: 'navlist' });
  const role = state.role || 'owner';
  for (const item of getNav()) {
    if (canSeeMenu(role, item.id)) list.appendChild(makeNavBtn(item));
  }
  sb.appendChild(list);
}

function buildBellButton() {
  const wrap = el('div', { style: 'position:relative;' });
  const btn = el('button', { class: 'hamburger-btn', type: 'button', 'aria-label': t.notif_bell_label, title: t.notif_bell_label, id: 'bell-btn' });
  btn.appendChild(svgIcon('bell', 22));
  btn.addEventListener('click', () => navigate('notifications'));
  wrap.appendChild(btn);

  const badge = el('span', { id: 'bell-badge', style: 'display:none;position:absolute;top:-2px;right:-2px;background:var(--error);color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:999px;min-width:18px;text-align:center;' });
  wrap.appendChild(badge);
  return wrap;
}

function buildRecoveryButton() {
  const btn = el('button', { class: 'hamburger-btn recovery-btn', type: 'button', 'aria-label': 'Recovery', title: 'Recovery' });
  btn.appendChild(svgIcon('recovery', 22));
  btn.addEventListener('click', () => navigate('recovery'));
  return btn;
}

export function refreshBell() {
  const badge = document.getElementById('bell-badge');
  if (!badge) return;
  const n = unreadCount();
  if (!n) { badge.style.display = 'none'; return; }
  badge.style.display = '';
  badge.textContent = n > 99 ? '99+' : String(n);
}

function buildTopbar() {
  const bar = document.getElementById('topbar');
  if (!bar) return;
  while (bar.firstChild) bar.removeChild(bar.firstChild);

  const left = el('div', { class: 'topbar-left' });
  const hamburger = el('button', { class: 'hamburger-btn', type: 'button', 'aria-label': t.menu_open, title: t.menu_open });
  hamburger.appendChild(svgIcon('menu', 22));
  hamburger.addEventListener('click', openDrawer);
  left.appendChild(hamburger);
  left.appendChild(el('div', { class: 'topbar-title', id: 'page-title', text: t.app_name }));
  bar.appendChild(left);

  const actions = el('div', { class: 'topbar-actions' });
  
  // Add Recovery Icon next to Bell
  const role = state.role || 'owner';
  if (['owner', 'manager', 'sales_agent'].includes(role)) {
    actions.appendChild(buildRecoveryButton());
  }

  actions.appendChild(buildBellButton());

  const avatar = el('button', { class: 'avatar-btn', id: 'avatar-btn', type: 'button', title: t.account_menu });
  avatar.addEventListener('click', openAccountMenu);
  actions.appendChild(avatar);
  bar.appendChild(actions);
}

function highlight(path) {
  for (const node of document.querySelectorAll('.navlink')) {
    if (node.dataset.nav === path) node.classList.add('active');
    else node.classList.remove('active');
  }
}

export function setActiveNav(path) {
  if (!state.currentBusiness && (state.businesses || []).length === 1) {
    state.currentBusiness = state.businesses[0].business;
    state.role = state.businesses[0].role;
  }
  buildSidebar();
  highlight(path);
  const title = document.getElementById('page-title');
  if (title) title.textContent = getTitles()[path] || t.app_name;
  refreshBusinessBlock();
  refreshAvatar();
  refreshBell();
}

export function refreshAvatar() {
  const btn = document.getElementById('avatar-btn');
  if (!btn) return;
  if (!state.user) { btn.style.display = 'none'; return; }
  btn.style.display = '';
  const name = (state.profile && state.profile.full_name) || (state.user && state.user.email) || '?';
  btn.textContent = initials(name);
}

function openAccountMenu() {
  const body = el('div', { class: 'col' });
  if (state.currentBusiness) {
    body.appendChild(el('div', { class: 'card' }, [
      el('div', { class: 'metric-label', text: t.account_current }),
      el('div', { class: 'metric-value', text: state.currentBusiness.name || 'Business' }),
      el('div', { class: 'metric-sub', text: t.account_role + ': ' + (t['role_' + state.role] || state.role || 'member') }),
    ]));
  } else if (state.user) {
    body.appendChild(el('div', { class: 'muted', text: state.user.email || '' }));
  }
  const actions = [];
  if ((state.businesses || []).length > 1) {
    actions.push({ label: t.account_switch, class: 'btn-secondary', onClick: (close) => { close(); navigate('switcher'); } });
  }
  actions.push({
    label: t.auth_sign_out, class: 'btn-danger',
    onClick: async (close) => {
      close();
      try { await signOut(); navigate('login'); }
      catch (e) { toast(e.message || 'Sign out failed', 'error'); }
    },
  });
  modal({ title: t.account_menu, body, actions });
}

export function buildShell() {
  buildSidebar();
  buildTopbar();
  if (!document.querySelector('.drawer-backdrop')) {
    const bd = el('div', { class: 'drawer-backdrop' });
    bd.addEventListener('click', closeDrawer);
    document.body.appendChild(bd);
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
}

export { closeDrawer, openDrawer };
