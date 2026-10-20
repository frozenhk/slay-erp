import { showLoader, hideLoader } from './ui.js';

const routes = new Map();
let onNavigate = null;

// Pages where we must NEVER auto-refresh to avoid losing user input
const FORM_PAGES = ['sales/new', 'sales/view', 'products/edit', 'products/new', 'customers/new', 'customers/edit', 'login', 'signup', 'onboarding', 'choose-plan', 'settings', 'users'];

export function register(path, handler) { routes.set(path, handler); }
export function onRouteChange(fn) { onNavigate = fn; }

export function parseHash() {
  const raw = (location.hash || '').replace(/^#/, '');
  const clean = raw.replace(/^\/+/, '');
  const parts = clean.split('/');
  const path = parts[0] || 'dashboard';
  const params = parts.slice(1);
  return { path, params };
}

export function navigate(path) {
  const clean = String(path || '').replace(/^#?\/*/, '');
  const target = '#/' + clean;
  if (location.hash === target) {
    renderCurrent(false);
  } else {
    location.hash = target;
  }
}

export function startRouter() {
  window.addEventListener('hashchange', () => renderCurrent(false));
  window.addEventListener('soft-refresh', () => renderCurrent(true));
  renderCurrent(false);
}

let lastPath = '';
let lastParamsStr = '';
let lastHtml = '';

async function renderCurrent(isBackground) {
  const { path, params } = parseHash();
  const handler = routes.get(path) || routes.get('*');
  const container = document.getElementById('page');
  if (!container || typeof handler !== 'function') return;

  // 1. If we are doing a background refresh, make sure the route hasn't changed
  if (isBackground && (path !== lastPath || JSON.stringify(params) !== lastParamsStr)) return;

  // 2. If we are on a form page, STOP the background refresh completely
  const fullPath = path + (params.length ? '/' + params.join('/') : '');
  if (isBackground && FORM_PAGES.some(p => fullPath.startsWith(p))) return;

  // 3. If the user is typing, STOP the refresh
  const active = document.activeElement;
  if (isBackground && active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;

  if (!isBackground) {
    lastPath = path;
    lastParamsStr = JSON.stringify(params);
  }

  if (isBackground) {
    const tempContainer = document.createElement('div');
    try {
      await handler(tempContainer, params);
      const newHtml = tempContainer.innerHTML;
      
      // Only touch the DOM if something actually changed
      if (newHtml !== lastHtml) {
        const scrollY = window.scrollY;
        container.innerHTML = newHtml;
        lastHtml = newHtml;
        window.scrollTo(0, scrollY);
      }
    } catch (e) {
      console.warn('Silent refresh skipped', e);
    }
    return;
  }

  // Normal navigation
  showLoader();
  await new Promise((r) => setTimeout(r, 10));
  while (container.firstChild) container.removeChild(container.firstChild);

  try {
    await handler(container, params);
    lastHtml = container.innerHTML;
  } catch (err) {
    console.error(err);
    while (container.firstChild) container.removeChild(container.firstChild);
    const wrap = document.createElement('div');
    wrap.className = 'state';
    const title = document.createElement('div');
    title.className = 'state-title';
    title.textContent = 'Something went wrong';
    const msg = document.createElement('div');
    msg.className = 'state-text';
    msg.textContent = (err && err.message) ? err.message : 'Unknown error';
    wrap.appendChild(title);
    wrap.appendChild(msg);
    container.appendChild(wrap);
  }

  hideLoader(); 
  if (typeof onNavigate === 'function') onNavigate(path);
}
