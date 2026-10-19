import { el } from '../ui.js';
import { navigate } from '../router.js';
import { t } from '../i18n.js';

export function checkEmail(container) {
  const wrap = el('div', { class: 'auth-wrap' });
  const card = el('div', { class: 'auth-card' });

  const brand = el('div', { class: 'auth-brand' });
  brand.appendChild(el('img', { src: './assets/logo.svg', alt: '', width: 36, height: 36 }));
  brand.appendChild(el('h1', { text: t.app_name }));
  card.appendChild(brand);

  card.appendChild(el('h2', { text: t.auth_check_email_title, style: 'text-align:center;' }));
  card.appendChild(el('div', { class: 'auth-sub', text: t.auth_check_email_text }));

  const back = el('button', {
    class: 'btn btn-secondary btn-block', type: 'button', text: t.auth_back_login,
  });
  back.addEventListener('click', () => navigate('login'));
  card.appendChild(back);

  wrap.appendChild(card);
  container.appendChild(wrap);
}
