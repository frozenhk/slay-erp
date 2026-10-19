import { el, toast } from '../ui.js';
import { navigate } from '../router.js';
import { t } from '../i18n.js';
import { sendReset } from '../auth.js';

export function forgot(container) {
  const wrap = el('div', { class: 'auth-wrap' });
  const card = el('div', { class: 'auth-card' });

  const brand = el('div', { class: 'auth-brand' });
  brand.appendChild(el('img', { src: './assets/logo.svg', alt: '', width: 36, height: 36 }));
  brand.appendChild(el('h1', { text: t.app_name }));
  card.appendChild(brand);

  card.appendChild(el('h2', { text: t.auth_forgot_title, style: 'text-align:center;' }));
  card.appendChild(el('div', { class: 'auth-sub', text: t.auth_forgot_sub }));

  const form = el('form', { class: 'auth-form' });
  const emailInput = el('input', {
    class: 'input', type: 'email', required: 'true',
    autocomplete: 'email', placeholder: 'you@example.com',
  });
  form.appendChild(el('div', { class: 'field' }, [
    el('label', { class: 'label', text: t.auth_email }), emailInput,
  ]));

  const submitBtn = el('button', {
    class: 'btn btn-primary btn-lg btn-block', type: 'submit', text: t.auth_send_reset,
  });
  form.appendChild(submitBtn);
  card.appendChild(form);

  const links = el('div', { class: 'auth-links' });
  links.appendChild(el('a', {
    href: '#/login', text: t.auth_back_login,
    onclick: (e) => { e.preventDefault(); navigate('login'); },
  }));
  card.appendChild(links);

  wrap.appendChild(card);
  container.appendChild(wrap);

  let busy = false;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    busy = true;
    submitBtn.disabled = true;
    submitBtn.textContent = t.auth_sending;
    try {
      // Mark on this device that we are in a reset flow, so when the user
      // comes back from the email, the app forces the "new password" screen.
      try { localStorage.setItem('slay-reset-pending', '1'); } catch (err) { /* ignore */ }
      await sendReset(emailInput.value.trim());
      navigate('check-email');
    } catch (err) {
      toast(err.message || 'Could not send reset link', 'error');
      busy = false;
      submitBtn.disabled = false;
      submitBtn.textContent = t.auth_send_reset;
    }
  });
}
