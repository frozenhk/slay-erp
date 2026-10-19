import { el, toast, passwordInput } from '../ui.js';
import { navigate } from '../router.js';
import { t } from '../i18n.js';
import { signIn, loadUserData, routeAfterAuth } from '../auth.js';

export function login(container) {
  const wrap = el('div', { class: 'auth-wrap' });
  const card = el('div', { class: 'auth-card' });

  const brand = el('div', { class: 'auth-brand' });
  brand.appendChild(el('img', { src: './assets/logo.svg', alt: '', width: 36, height: 36 }));
  brand.appendChild(el('h1', { text: t.app_name }));
  card.appendChild(brand);

  card.appendChild(el('div', { class: 'auth-sub', text: t.auth_welcome_back }));

  const form = el('form', { class: 'auth-form' });

  const emailInput = el('input', {
    class: 'input', type: 'email', required: 'true',
    autocomplete: 'email', placeholder: 'you@example.com',
  });
  form.appendChild(el('div', { class: 'field' }, [
    el('label', { class: 'label', text: t.auth_email }), emailInput,
  ]));

  const pw = passwordInput({
    placeholder: '••••••••',
    autocomplete: 'current-password',
    required: true,
    minlength: '6',
  });
  form.appendChild(el('div', { class: 'field' }, [
    el('label', { class: 'label', text: t.auth_password }), pw.wrap,
  ]));

  const submitBtn = el('button', {
    class: 'btn btn-primary btn-lg btn-block', type: 'submit', text: t.auth_sign_in,
  });
  form.appendChild(submitBtn);
  card.appendChild(form);

  const links = el('div', { class: 'auth-links' });
  links.appendChild(el('a', {
    href: '#/forgot', text: t.auth_forgot_link,
    onclick: (e) => { e.preventDefault(); navigate('forgot'); },
  }));
  card.appendChild(links);

  const links2 = el('div', { class: 'auth-links' });
  links2.appendChild(document.createTextNode(t.auth_no_account + ' '));
  links2.appendChild(el('a', {
    href: '#/signup', text: t.auth_create_link,
    onclick: (e) => { e.preventDefault(); navigate('signup'); },
  }));
  card.appendChild(links2);

  wrap.appendChild(card);
  container.appendChild(wrap);

  let busy = false;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    busy = true;
    submitBtn.disabled = true;
    submitBtn.textContent = t.auth_signing_in;

    try {
      await signIn(emailInput.value.trim(), pw.input.value);
      await loadUserData();
      await routeAfterAuth();
    } catch (err) {
      toast(err.message || t.auth_error_signin, 'error');
      busy = false;
      submitBtn.disabled = false;
      submitBtn.textContent = t.auth_sign_in;
    }
  });
}
