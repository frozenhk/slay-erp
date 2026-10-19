import { el, toast } from '../ui.js';
import { navigate } from '../router.js';
import { t } from '../i18n.js';
import { state, setCurrentBusiness } from '../state.js';
import { signOut } from '../auth.js';

export function switcher(container) {
  const wrap = el('div', { class: 'container col' });
  wrap.appendChild(el('h1', { text: t.biz_choose }));
  wrap.appendChild(el('p', { class: 'muted', text: t.biz_choose_hint }));

  const list = state.businesses || [];

  if (list.length === 0) {
    const s = el('div', { class: 'state' }, [
      el('div', { class: 'state-title', text: t.biz_none }),
      el('div', { class: 'state-text', text: t.biz_none_text }),
    ]);
    wrap.appendChild(s);
  }

  for (const m of list) {
    const b = m.business || {};
    const card = el('div', { class: 'card switcher-card' });
    const row = el('div', { class: 'row-between' });

    const left = el('div');
    left.appendChild(el('div', { class: 'metric-value', text: b.name || 'Business' }));
    left.appendChild(el('div', {
      class: 'metric-sub',
      text: (b.business_type || 'business') + ' · ' + (b.currency || 'XAF'),
    }));
    row.appendChild(left);
    row.appendChild(el('span', { class: 'badge badge-info', text: m.role }));

    card.appendChild(row);
    card.addEventListener('click', () => {
      setCurrentBusiness(b, m.role);
      navigate('dashboard');
    });
    wrap.appendChild(card);
  }

  const signOutBtn = el('button', {
    class: 'btn btn-secondary btn-block', type: 'button', text: t.auth_sign_out,
    style: 'margin-top: 16px;',
  });
  signOutBtn.addEventListener('click', async () => {
    try { await signOut(); navigate('login'); }
    catch (e) { toast(e.message || 'Sign out failed', 'error'); }
  });
  wrap.appendChild(signOutBtn);

  container.appendChild(wrap);
}
