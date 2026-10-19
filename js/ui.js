let toastRoot = null;

function ensureToastRoot() {
  if (!toastRoot) toastRoot = document.getElementById('toasts');
  return toastRoot;
}

export function el(tag, attrs, children) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const key of Object.keys(attrs)) {
      const value = attrs[key];
      if (value === undefined || value === null) continue;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key === 'html') node.innerHTML = value;
      else if (key.startsWith('on') && typeof value === 'function') {
        node.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key === 'dataset' && typeof value === 'object') {
        for (const dk of Object.keys(value)) node.dataset[dk] = value[dk];
      } else {
        node.setAttribute(key, value);
      }
    }
  }
  if (children !== undefined && children !== null) {
    const list = Array.isArray(children) ? children : [children];
    for (const child of list) {
      if (child === null || child === undefined || child === false) continue;
      if (typeof child === 'string' || typeof child === 'number') {
        node.appendChild(document.createTextNode(String(child)));
      } else {
        node.appendChild(child);
      }
    }
  }
  return node;
}

export function clear(node) {
  if (!node) return;
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function spinner(extraClass) {
  return el('div', { class: 'spinner' + (extraClass ? ' ' + extraClass : '') });
}

export function toast(message, type, ms) {
  const root = ensureToastRoot();
  if (!root) return;
  const cls = 'toast' + (type ? ' toast-' + type : '');
  const node = el('div', { class: cls, text: String(message) });
  root.appendChild(node);
  const life = typeof ms === 'number' ? ms : 3200;
  setTimeout(() => {
    node.style.transition = 'opacity .2s';
    node.style.opacity = '0';
    setTimeout(() => { if (node.parentNode) node.parentNode.removeChild(node); }, 220);
  }, life);
}

export function modal(opts) {
  const root = document.getElementById('modal-root');
  if (!root) return { close() {} };
  clear(root);

  function close() {
    clear(root);
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) { if (e.key === 'Escape') close(); }

  const backdrop = el('div', {
    class: 'modal-backdrop',
    onclick: (e) => { if (e.target === backdrop) close(); },
  });

  const actions = el('div', { class: 'modal-actions' });
  (opts.actions || []).forEach((a) => {
    const btn = el('button', {
      class: 'btn ' + (a.class || 'btn-secondary'),
      text: a.label,
      onclick: () => {
        if (typeof a.onClick === 'function') a.onClick(close);
        else close();
      },
    });
    actions.appendChild(btn);
  });

  const sheet = el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' }, [
    opts.title ? el('div', { class: 'modal-title', text: opts.title }) : null,
    opts.body || null,
    actions,
  ]);

  backdrop.appendChild(sheet);
  root.appendChild(backdrop);
  document.addEventListener('keydown', onKey);
  return { close };
}

export function confirmDialog(opts) {
  return new Promise((resolve) => {
    const body = el('div', { text: opts.message || '' });
    modal({
      title: opts.title || 'Are you sure?',
      body,
      actions: [
        {
          label: opts.cancelLabel || 'Cancel',
          class: 'btn-secondary',
          onClick: (close) => { close(); resolve(false); },
        },
        {
          label: opts.confirmLabel || 'Confirm',
          class: opts.danger ? 'btn-danger' : 'btn-primary',
          onClick: (close) => { close(); resolve(true); },
        },
      ],
    });
  });
}

// ---- Password input with eye toggle ----
function svgEye(open) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  const paths = open ? [
    'M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94',
    'M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19',
    'M14.12 14.12a3 3 0 1 1-4.24-4.24',
    'M1 1l22 22',
  ] : [
    'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z',
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  ];
  for (const d of paths) {
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', d);
    svg.appendChild(p);
  }
  return svg;
}

export function passwordInput(opts) {
  const o = opts || {};
  const wrap = el('div', { class: 'pw-wrap' });
  const input = el('input', {
    class: 'input',
    type: 'password',
    id: o.id,
    placeholder: o.placeholder,
    autocomplete: o.autocomplete || 'current-password',
    required: o.required ? 'true' : undefined,
    minlength: o.minlength,
  });
  wrap.appendChild(input);

  const toggle = el('button', {
    type: 'button',
    class: 'pw-toggle',
    'aria-label': 'Show password',
    title: 'Show password',
  });
  toggle.appendChild(svgEye(false));
  toggle.addEventListener('click', () => {
    const isText = input.type === 'text';
    input.type = isText ? 'password' : 'text';
    toggle.innerHTML = '';
    toggle.appendChild(svgEye(!isText));
    toggle.setAttribute('title', isText ? 'Show password' : 'Hide password');
  });
  wrap.appendChild(toggle);

  return { wrap, input, toggle };
}
