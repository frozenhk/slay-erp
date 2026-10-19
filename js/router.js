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
    renderCurrent();
  } else {
    location.hash = target;
  }
}

export function startRouter() {
  window.addEventListener('hashchange', renderCurrent);
  renderCurrent();
}

async function renderCurrent() {
  const { path, params } = parseHash();
  const handler = routes.get(path) || routes.get('*');
  const container = document.getElementById('page');
  if (!container || typeof handler !== 'function') return;

  while (container.firstChild) container.removeChild(container.firstChild);

  try {
    await handler(container, params);
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

  if (typeof onNavigate === 'function') onNavigate(path);
}
