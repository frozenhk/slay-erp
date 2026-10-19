const CACHE = 'slay-erp-shell-v13';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './assets/logo.svg',
  './css/tokens.css',
  './css/base.css',
  './css/components.css',
  './css/account.css',
  './css/products.css',
  './css/inventory.css',
  './css/customers.css',
  './css/sales.css',
  './css/invoice.css',
  './css/dashboard.css',
  './css/expenses.css',
  './css/reports.css',
  './css/users.css',
  './js/app.js',
  './js/config.js',
  './js/supabase.js',
  './js/state.js',
  './js/format.js',
  './js/i18n.js',
  './js/ui.js',
  './js/router.js',
  './js/auth.js',
  './js/shell.js',
  './js/permissions.js',
  './js/lib/csv.js',
  './js/api/businesses.js',
  './js/api/products.js',
  './js/api/stock.js',
  './js/api/locations.js',
  './js/api/customers.js',
  './js/api/sales.js',
  './js/api/invoices.js',
  './js/api/expenses.js',
  './js/api/reports.js',
  './js/api/members.js',
  './js/api/dashboard.js',
  './js/components/variant-editor.js',
  './js/components/product-picker.js',
  './js/components/payment-modal.js',
  './js/pages/login.js',
  './js/pages/signup.js',
  './js/pages/forgot.js',
  './js/pages/check-email.js',
  './js/pages/reset.js',
  './js/pages/switcher.js',
  './js/pages/onboarding.js',
  './js/pages/dashboard.js',
  './js/pages/products.js',
  './js/pages/product-form.js',
  './js/pages/inventory.js',
  './js/pages/locations.js',
  './js/pages/movements.js',
  './js/pages/customers.js',
  './js/pages/customer-form.js',
  './js/pages/customer-detail.js',
  './js/pages/sales.js',
  './js/pages/sale-new.js',
  './js/pages/sale-detail.js',
  './js/pages/invoices.js',
  './js/pages/invoice-view.js',
  './js/pages/payments.js',
  './js/pages/expenses.js',
  './js/pages/reports.js',
  './js/pages/users.js',
  './js/pages/settings.js',
  './js/pages/more.js',
  './js/pages/placeholder.js',
  './js/pages/notfound.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never cache the Supabase API, auth, or storage
  if (url.hostname.endsWith('.supabase.co')) return;
  // Never cache the Chart.js CDN
  if (url.hostname === 'cdn.jsdelivr.net') return;
  // Never cache the Google Fonts HTML page
  if (url.hostname === 'fonts.googleapis.com') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const sameOrigin = url.origin === self.location.origin;
        const isFont = url.hostname === 'fonts.gstatic.com';
        if (res.ok && (sameOrigin || isFont)) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone));
        }
        return res;
      }).catch(() => {
        if (req.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
