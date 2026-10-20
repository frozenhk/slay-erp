import { el, toast, passwordInput } from '../ui.js';
import { navigate } from '../router.js';
import { t } from '../i18n.js';
import { signUp, loadUserData, routeAfterAuth } from '../auth.js';

export function signup(container) {
  const wrap = el('div', { class: 'auth-wrap' });
  const card = el('div', { class: 'auth-card' });

  const brand = el('div', { class: 'auth-brand' });
  brand.appendChild(el('img', { src: './assets/logo.svg', alt: '', width: 36, height: 36 }));
  brand.appendChild(el('h1', { text: t.app_name }));
  card.appendChild(brand);
  card.appendChild(el('div', { class: 'auth-sub', text: t.auth_signup_sub }));

  const form = el('form', { class: 'auth-form' });

  const nameInput = el('input', {
    class: 'input', type: 'text', required: 'true', autocomplete: 'name',
    placeholder: 'Ada Njoya',
  });
  form.appendChild(el('div', { class: 'field' }, [
    el('label', { class: 'label', text: t.auth_full_name }), nameInput,
  ]));

  const emailInput = el('input', {
    class: 'input', type: 'email', required: 'true', autocomplete: 'email',
    placeholder: 'you@example.com',
  });
  form.appendChild(el('div', { class: 'field' }, [
    el('label', { class: 'label', text: t.auth_email }), emailInput,
  ]));

  const pw = passwordInput({
    placeholder: '••••••••',
    autocomplete: 'new-password',
    required: true,
    minlength: '6',
  });
  form.appendChild(el('div', { class: 'field' }, [
    el('label', { class: 'label', text: t.auth_password }), pw.wrap,
  ]));

  const pw2 = passwordInput({
    placeholder: '••••••••',
    autocomplete: 'new-password',
    required: true,
    minlength: '6',
  });
  form.appendChild(el('div', { class: 'field' }, [
    el('label', { class: 'label', text: t.auth_confirm_password }), pw2.wrap,
  ]));

  const submitBtn = el('button', {
    class: 'btn btn-primary btn-lg btn-block', type: 'submit', text: t.auth_sign_up,
  });
  form.appendChild(submitBtn);
  card.appendChild(form);

  const links = el('div', { class: 'auth-links' });
  links.appendChild(document.createTextNode(t.auth_have_account + ' '));
  links.appendChild(el('a', {
    href: '#/login', text: t.auth_login_link,
    onclick: (e) => { e.preventDefault(); navigate('login'); },
  }));
  card.appendChild(links);

  wrap.appendChild(card);
  container.appendChild(wrap);

  let busy = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = pw.input.value;
    const confirm = pw2.input.value;

    if (password.length < 6) { toast(t.auth_min_password, 'error'); return; }
    if (password !== confirm) { toast(t.auth_passwords_dont_match, 'error'); return; }

    busy = true;
    submitBtn.disabled = true;
    submitBtn.textContent = t.auth_signing_up;

    try {
      const res = await signUp(email, password, name);
      
      // If email confirmation is OFF, Supabase returns a session immediately.
      if (res && res.session) {
        await loadUserData();
        await routeAfterAuth();
      } else {
        // If it requires email confirmation
        navigate('check-email');
      }
    } catch (err) {
      toast(err.message || t.auth_error_signup, 'error');
      busy = false;
      submitBtn.disabled = false;
      submitBtn.textContent = t.auth_sign_up;
    }
  });
}
