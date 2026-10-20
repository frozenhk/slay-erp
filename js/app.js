import './supabase.js';
import { supabase } from './supabase.js';
import { t, initLang } from './i18n.js';
import { register, startRouter, navigate, onRouteChange } from './router.js';
import { notfound } from './pages/notfound.js';
import { login } from './pages/login.js';
import { signup } from './pages/signup.js';
import { forgot } from './pages/forgot.js';
import { checkEmail } from './pages/check-email.js';
import { resetPage } from './pages/reset.js';
import { switcher } from './pages/switcher.js';
import { onboarding } from './pages/onboarding.js';
import { dashboard } from './pages/dashboard.js';
import { productsPage } from './pages/products.js';
import { inventoryPage } from './pages/inventory.js';
import { locationsPage } from './pages/locations.js';
import { movementsPage } from './pages/movements.js';
import { customersPage } from './pages/customers.js';
import { customerForm } from './pages/customer-form.js';
import { customerDetail } from './pages/customer-detail.js';
import { salesPage } from './pages/sales.js';
import { saleNew } from './pages/sale-new.js';
import { saleDetail } from './pages/sale-detail.js';
import { invoicesPage } from './pages/invoices.js';
import { invoiceView } from './pages/invoice-view.js';
import { paymentsPage } from './pages/payments.js';
import { expensesPage } from './pages/expenses.js';
import { reportsPage } from './pages/reports.js';
import { usersPage } from './pages/users.js';
import { settingsPage } from './pages/settings.js';
import { morePage } from './pages/more.js';
import { notificationsPage } from './pages/notifications.js';
import { subscriptionPage } from './pages/subscription.js';
import { pricingPage } from './pages/pricing.js';
import { adminBusinessesPage } from './pages/admin-businesses.js';
import { state, resetState, setCurrentBusiness } from './state.js';
import { loadSession, loadUserData, routeAfterAuth } from './auth.js';
import { buildShell, setActiveNav, refreshAvatar, refreshBell } from './shell.js';
import { canAccess } from './permissions.js';
import { scanForDebtReminders } from './lib/notifications.js';

const PUBLIC_PAGES = ['login', 'signup', 'forgot', 'check-email', 'reset'];
const AUTH_REDIRECT = ['login', 'signup', 'forgot'];
const NO_GUARD = ['login', 'signup', 'forgot', 'check-email', 'reset',
  'switcher', 'onboarding', '*'];

const RESET_FLAG = 'slay-reset-pending';
const LAST_ROUTE_KEY = 'slay-last-route';
const SESSION_ROUTE_KEY = 'slay-last-route-session';

const NO_RESTORE_HEAD = ['login', 'signup', 'forgot', 'check-email', 'reset', 'onboarding', 'switcher', ''];

function rawRoute() { return (location.hash || '').replace(/^#\/?/, ''); }
function getCurrentPath() { return rawRoute().split('/')[0] || 'dashboard'; }
function isRestorableRoute(route) {
  if (!route) return false;
  const head = route.split('/')[0];
  if (NO_RESTORE_HEAD.includes(head)) return false;
  return true;
}

function saveLastRoute() {
  const route = rawRoute();
  if (!isRestorableRoute(route)) return;
  try { localStorage.setItem(LAST_ROUTE_KEY, route); } catch (e) { /* ignore */ }
  try { sessionStorage.setItem(SESSION_ROUTE_KEY, route); } catch (e) { /* ignore */ }
}
function getLastRoute() {
  let route = '';
  try { route = localStorage.getItem(LAST_ROUTE_KEY) || ''; } catch (e) { /* ignore */ }
  if (!route) { try { route = sessionStorage.getItem(SESSION_ROUTE_KEY) || ''; } catch (e) { /* ignore */ } }
  return route;
}
function restoreRouteIfMissing() {
  if (rawRoute()) return;
  const saved = getLastRoute();
  if (!isRestorableRoute(saved)) return;
  try { location.hash = '#/' + saved; } catch (e) { /* ignore */ }
}

setInterval(() => {
  saveLastRoute();
  if (!rawRoute() && state.user) restoreRouteIfMissing();
}, 500);

window.addEventListener('hashchange', saveLastRoute);
window.addEventListener('pagehide', saveLastRoute);
window.addEventListener('beforeunload', saveLastRoute);
window.addEventListener('pageshow', () => { if (!rawRoute() && state.user) restoreRouteIfMissing(); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveLastRoute();
  else if (document.visibilityState === 'visible') { if (!rawRoute() && state.user) restoreRouteIfMissing(); }
});

function hasRecoveryInUrl() {
  const href = String(window.location.href || '');
  if (href.indexOf('type=recovery') !== -1) return true;
  if (href.indexOf('access_token=') !== -1 && href.indexOf('recovery') !== -1) return true;
  try {
    const u = new URL(href);
    if (u.searchParams.get('type') === 'recovery') return true;
  } catch (e) { /* ignore */ }
  return false;
}
function isResetFlow() {
  try { if (localStorage.getItem(RESET_FLAG) === '1') return true; } catch (e) { /* ignore */ }
  return hasRecoveryInUrl();
}
function setResetFlag() { try { localStorage.setItem(RESET_FLAG, '1'); } catch (e) { /* ignore */ } }

function registerRoutes() {
  register('login', login); register('signup', signup); register('forgot', forgot);
  register('check-email', checkEmail); register('reset', resetPage);
  register('switcher', switcher); register('onboarding', onboarding);
  register('dashboard', dashboard);
  register('products', productsPage);
  register('inventory', async (c, p) => {
    if (p && p[0] === 'locations') return locationsPage(c);
    if (p && p[0] === 'movements') return movementsPage(c);
    return inventoryPage(c);
  });
  register('customers', async (c, p) => {
    if (p && p[0] === 'new') return customerForm(c, { mode: 'create' });
    if (p && p[0] === 'edit' && p[1]) return customerForm(c, { mode: 'edit', id: p[1] });
    if (p && p[0] === 'view' && p[1]) return customerDetail(c, { id: p[1] });
    return customersPage(c);
  });
  register('sales', async (c, p) => {
    if (p && p[0] === 'new') return saleNew(c);
    if (p && p[0] === 'view' && p[1]) return saleDetail(c, { id: p[1] });
    return salesPage(c);
  });
  register('invoices', async (c, p) => {
    if (p && p[0] === 'view' && p[1]) return invoiceView(c, { saleId: p[1] });
    return invoicesPage(c);
  });
  register('payments', paymentsPage);
  register('expenses', expensesPage);
  register('reports', reportsPage);
  register('users', usersPage);
  register('settings', settingsPage);
  register('more', morePage);
  register('notifications', notificationsPage);
  register('subscription', subscriptionPage);
  register('pricing', pricingPage);
  register('admin/businesses', adminBusinessesPage);
  register('*', notfound);
}

function guard(path) {
  if (isResetFlow() && path !== 'reset' && path !== 'login' && path !== 'check-email') {
    navigate('reset'); return;
  }
  if (!state.user && !PUBLIC_PAGES.includes(path)) { navigate('login'); return; }
  if (state.user && AUTH_REDIRECT.includes(path) && !isResetFlow()) { routeAfterAuth(); return; }
  if (state.user && !isResetFlow()) {
    const list = state.businesses || [];
    if (list.length === 0 && path !== 'onboarding') { navigate('onboarding'); return; }
    if (list.length > 0 && !NO_GUARD.includes(path)
        && path !== 'admin' && !canAccess(state.role, path)) {
      navigate('dashboard'); return;
    }
  }
  setActiveNav(path);
  refreshAvatar();
  refreshBell();
  saveLastRoute();
}

async function boot() {
  initLang();
  restoreRouteIfMissing();
  buildShell();
  registerRoutes();
  onRouteChange(guard);

  supabase.auth.onAuthStateChange(async (event) => {
    if (event === 'PASSWORD_RECOVERY') { setResetFlag(); navigate('reset'); return; }
    if (event === 'SIGNED_OUT') {
      if (isResetFlow()) { navigate('reset'); return; }
      resetState(); navigate('login'); return;
    }
    if (event === 'SIGNED_IN') {
      if (isResetFlow()) { navigate('reset'); return; }
      if (!state.user) return;
      try { await loadUserData(); } catch (e) { /* ignore */ }
    }
  });

  if (hasRecoveryInUrl()) setResetFlag();

  const session = await loadSession();
  if (session) {
    try {
      await loadUserData();
      const list = state.businesses || [];
      if (list.length === 1) setCurrentBusiness(list[0].business, list[0].role);
    } catch (err) { console.error('loadUserData failed', err); resetState(); }
  }

  if (isResetFlow()) {
    if (getCurrentPath() !== 'reset') location.hash = '#/reset';
  } else if (!state.user) {
    if (!PUBLIC_PAGES.includes(getCurrentPath())) location.hash = '#/login';
  } else {
    const list = state.businesses || [];
    const p = getCurrentPath();
    const hasRoute = !!rawRoute();

    if (!hasRoute) {
      const saved = getLastRoute();
      if (isRestorableRoute(saved) && list.length > 0) { location.hash = '#/' + saved; }
      else if (list.length === 0) location.hash = '#/onboarding';
      else if (list.length === 1) {
        setCurrentBusiness(list[0].business, list[0].role);
        location.hash = '#/dashboard';
      } else location.hash = '#/switcher';
    } else if (AUTH_REDIRECT.includes(p) || p === 'check-email') {
      if (list.length === 0) location.hash = '#/onboarding';
      else if (list.length === 1) {
        setCurrentBusiness(list[0].business, list[0].role);
        location.hash = '#/dashboard';
      } else location.hash = '#/switcher';
    } else if (list.length === 0 && p !== 'onboarding') {
      location.hash = '#/onboarding';
    } else if (list.length === 1 && !state.currentBusiness) {
      setCurrentBusiness(list[0].business, list[0].role);
    }
  }

  startRouter();

  if (state.currentBusiness && state.currentBusiness.id) {
    setTimeout(async () => {
      try {
        const r = await scanForDebtReminders(state.currentBusiness.id, state.currentBusiness.name || '');
        if (r && r.added) refreshBell();
      } catch (e) { console.error('scanForDebtReminders', e); }
    }, 1200);
  }
}

boot();
