import { navigate } from '../router.js';

export function notfound(container) {
  const wrap = document.createElement('div');
  wrap.className = 'state';

  const title = document.createElement('div');
  title.className = 'state-title';
  title.textContent = 'Page not found';
  wrap.appendChild(title);

  const text = document.createElement('div');
  text.className = 'state-text';
  text.textContent = 'The screen you asked for does not exist.';
  wrap.appendChild(text);

  const btn = document.createElement('button');
  btn.className = 'btn btn-primary';
  btn.textContent = 'Go to Dashboard';
  btn.addEventListener('click', () => navigate('dashboard'));
  wrap.appendChild(btn);

  container.appendChild(wrap);
}
