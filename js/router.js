import { showLoader, hideLoader } from './ui.js';

const routes = new Map();
let onNavigate = null;

export function register(path, handler) {
  routes.set(path, handler);
}

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
    renderCurrent(false); // Force manual refresh
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

  // If we are doing a background refresh, make sure the route hasn't changed
  if (isBackground && (path !== lastPath || JSON.stringify(params) !== lastParamsStr)) {
    return; 
  }

  if (!isBackground) {
    lastPath = path;
    lastParamsStr = JSON.stringify(params);
  }

  if (isBackground) {
    // --- SMART DIFFING ---
    const tempContainer = document.createElement('div');
    try {
      // Render the page silently in the background
      await handler(tempContainer, params);
      const newHtml = tempContainer.innerHTML;
      
      // Only touch the DOM if something actually changed
      if (newHtml !== lastHtml) {
        const scrollY = window.scrollY; // Save scroll position
        container.innerHTML = newHtml;
        lastHtml = newHtml;
        window.scrollTo(0, scrollY); // Restore scroll position
      }
    } catch (e) {
      console.warn('Silent background refresh skipped', e);
    }
    return;
  }

  // --- NORMAL NAVIGATION ---
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
