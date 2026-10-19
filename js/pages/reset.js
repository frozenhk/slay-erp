import { el, toast, passwordInput } from '../ui.js';
import { navigate } from '../router.js';
import { t } from '../i18n.js';
import { updatePassword, signOut } from '../auth.js';
import { supabase } from '../supabase.js';

const RESET_FLAG = 'slay-reset-pending';

function clearFlag() {
  try { localStorage.removeItem(RESET_FLAG); } catch (e) { /* ignore */ }
}

export function resetPage(container) {
  const wrap = el('div', { class: 'auth-wrap' });
  const card = el('div', { class: 'auth-card' });

  const brand = el('div', { class: 'auth-brand' });
  brand.appendChild(el('img', { src: './assets/logo.svg', alt: '', width: 36, height: 36 }));
  brand.appendChild(el('h1', { text: t.app_name }));
  card.appendChild(brand);

  card.appendChild(el('h2', { text: t.auth_forgot_title, style: 'text-align:center;' }));
  const sub = el('div', { class: 'auth-sub', text: 'Enter a new password for your account.' });
  card.appendChild(sub);

  const status = el('div', { class: 'hint', text: 'Verifying your reset link...', style: 'text-align:center;margin-bottom:12px;' });
  card.appendChild(status);

  const form = el('form', { class: 'auth-form' });

  const pw1 = passwordInput({ placeholder: '••••••••', autocomplete: 'new-password', required: true, minlength: '6' });
  form.appendChild(el('div', { class: 'field' }, [
    el('label', { class: 'label', text: t.auth_new_password }), pw1.wrap,
  ]));

  const pw2 = passwordInput({ placeholder: '••••••••', autocomplete: 'new-password', required: true, minlength: '6' });
  form.appendChild(el('div', { class: 'field' }, [
    el('label', { class: 'label', text: t.auth_confirm_password }), pw2.wrap,
  ]));

  const submitBtn = el('button', {
    class: 'btn btn-primary btn-lg btn-block', type: 'submit', text: t.auth_reset_button,
  });
  form.appendChild(submitBtn);
  card.appendChild(form);

  const links = el('div', { class: 'auth-links' });
  links.appendChild(el('a', {
    href: '#/forgot', text: 'Request a new link',
    onclick: (e) => { e.preventDefault(); clearFlag(); navigate('forgot'); },
  }));
  links.appendChild(document.createTextNode(' · '));
  links.appendChild(el('a', {
    href: '#/login', text: t.auth_back_login,
    onclick: (e) => { e.preventDefault(); clearFlag(); navigate('login'); },
  }));
  card.appendChild(links);

  wrap.appendChild(card);
  container.appendChild(wrap);

  let ready = false;

  // Wait for the session that supabase-js creates when exchanging the code.
  async function checkSession() {
    for (let i = 0; i < 20; i++) {
      const { data } = await supabase.auth.getSession();
      if (data && data.session) {
        ready = true;
        status.textContent = 'Link verified. Enter your new password.';
        status.style.color = 'var(--success)';
        return;
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    ready = false;
    status.textContent = 'This reset link is invalid or has expired. Request a new one.';
    status.style.color = 'var(--error)';
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.6';
  }

  checkSession();

  let busy = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!ready) { toast('Reset link not valid. Request a new link.', 'error'); return; }
    if (pw1.input.value.length < 6) { toast(t.auth_min_password, 'error'); return; }
    if (pw1.input.value !== pw2.input.value) { toast(t.auth_passwords_dont_match, 'error'); return; }

    busy = true;
    submitBtn.disabled = true;
    submitBtn.textContent = t.auth_resetting;

    try {
      await updatePassword(pw1.input.value);
      clearFlag();
      try { await signOut(); } catch (err) { /* ignore */ }
      toast(t.auth_reset_success, 'success');
      navigate('login');
    } catch (err) {
      toast(err.message || 'Could not update password', 'error');
      busy = false;
      submitBtn.disabled = false;
      submitBtn.textContent = t.auth_reset_button;
    }
  });
}
