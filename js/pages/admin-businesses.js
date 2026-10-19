import { el, toast, modal } from '../ui.js';
import { navigate } from '../router.js';
import { t } from '../i18n.js';
import { date } from '../format.js';
import { adminListBusinesses, adminChangePlan, adminExtendTrial, listPlans } from '../api/subscription.js';

export async function adminBusinessesPage(container) {
  const wrap = el('div', { class: 'container col' });
  container.appendChild(wrap);

  const header = el('div', { class: 'row-between' });
  const back = el('button', { class: 'btn btn-ghost', type: 'button', text: '← ' + t.action_back });
  back.addEventListener('click', () => navigate('more'));
  header.appendChild(back);
  header.appendChild(el('h1', { text: t.admin_businesses_title }));
  wrap.appendChild(header);

  const loading = el('div', { class: 'state' }, [el('div', { class: 'state-title', text: t.state_loading })]);
  wrap.appendChild(loading);

  let rows = [], plans = [];
  try {
    rows = await adminListBusinesses();
    plans = await listPlans();
  } catch (err) {
    loading.innerHTML = '';
    loading.appendChild(el('div', { class: 'state-title', text: t.state_error_title }));
    loading.appendChild(el('div', { class: 'state-text', text: err.message || '' }));
    return;
  }
  loading.remove();

  if (!rows.length) {
    wrap.appendChild(el('div', { class: 'state' }, [
      el('div', { class: 'state-title', text: t.admin_no_businesses }),
    ]));
    return;
  }

  const list = el('div', { class: 'prod-list' });
  for (const b of rows) list.appendChild(businessCard(b, plans, () => {
    container.innerHTML = '';
    adminBusinessesPage(container);
  }));
  wrap.appendChild(list);
}

function businessCard(b, plans, reload) {
  const card = el('div', { class: 'card' });

  card.appendChild(el('div', { style: 'font-weight:700;font-size:16px;', text: b.name }));
  if (b.owner_email) {
    card.appendChild(el('div', { class: 'muted', style: 'font-size:12px;', text: b.owner_email }));
  }
  card.appendChild(el('div', { class: 'muted', style: 'font-size:12px;margin-top:4px;',
    text: 'Created ' + date(b.created_at) }));

  const tags = el('div', { class: 'row', style: 'gap:6px;margin-top:8px;flex-wrap:wrap;' });
  tags.appendChild(el('span', { class: 'badge badge-info', text: b.plan_code }));
  tags.appendChild(el('span', {
    class: 'badge ' + statusBadgeClass(b.subscription_status),
    text: t['sub_status_' + b.subscription_status] || b.subscription_status,
  }));
  if (b.trial_ends_at) {
    tags.appendChild(el('span', {
      class: 'badge',
      text: t.sub_trial_ends + ' ' + date(b.trial_ends_at),
    }));
  }
  card.appendChild(tags);

  const actions = el('div', { class: 'row-actions', style: 'margin-top:10px;flex-wrap:wrap;' });

  const changeBtn = el('button', { class: 'btn btn-primary btn-sm', type: 'button', text: t.admin_change_plan });
  changeBtn.addEventListener('click', () => openChangePlan(b, plans, reload));
  actions.appendChild(changeBtn);

  const extendBtn = el('button', { class: 'btn btn-secondary btn-sm', type: 'button', text: t.admin_extend_trial });
  extendBtn.addEventListener('click', () => openExtendTrial(b, reload));
  actions.appendChild(extendBtn);

  card.appendChild(actions);
  return card;
}

function statusBadgeClass(s) {
  if (s === 'active' || s === 'trialing') return 'badge-success';
  if (s === 'past_due' || s === 'grace_period') return 'badge-warning';
  if (s === 'expired' || s === 'cancelled' || s === 'suspended') return 'badge-error';
  return 'badge-info';
}

function openChangePlan(b, plans, reload) {
  const sel = el('select', { class: 'select' });
  for (const p of plans) sel.appendChild(el('option', { value: p.code, text: p.name + ' (' + p.code + ')' }));
  sel.value = b.plan_code;

  const reason = el('input', { class: 'input', type: 'text', placeholder: t.admin_reason_ph });

  const body = el('div', { class: 'col' });
  body.appendChild(el('div', { class: 'field' }, [el('label', { class: 'label', text: t.admin_plan }), sel]));
  body.appendChild(el('div', { class: 'field' }, [el('label', { class: 'label', text: t.admin_reason }), reason]));

  modal({
    title: t.admin_change_plan,
    body,
    actions: [
      { label: t.action_cancel, class: 'btn-secondary', onClick: (c) => c() },
      { label: t.action_save, class: 'btn-primary', onClick: async (close) => {
        try {
          await adminChangePlan(b.id, sel.value, reason.value.trim() || null);
          close();
          toast(t.admin_plan_changed, 'success');
          reload();
        } catch (err) { toast(err.message || t.state_error_text, 'error'); }
      } },
    ],
  });
}

function openExtendTrial(b, reload) {
  const days = el('input', { class: 'input', type: 'number', min: '1', step: '1', value: '14' });
  const reason = el('input', { class: 'input', type: 'text', placeholder: t.admin_reason_ph });

  const body = el('div', { class: 'col' });
  body.appendChild(el('div', { class: 'field' }, [el('label', { class: 'label', text: t.admin_days }), days]));
  body.appendChild(el('div', { class: 'field' }, [el('label', { class: 'label', text: t.admin_reason }), reason]));

  modal({
    title: t.admin_extend_trial,
    body,
    actions: [
      { label: t.action_cancel, class: 'btn-secondary', onClick: (c) => c() },
      { label: t.action_save, class: 'btn-primary', onClick: async (close) => {
        const n = Number(days.value);
        if (!n || n <= 0) { toast(t.admin_days_required, 'error'); return; }
        try {
          await adminExtendTrial(b.id, n, reason.value.trim() || null);
          close();
          toast(t.admin_trial_extended, 'success');
          reload();
        } catch (err) { toast(err.message || t.state_error_text, 'error'); }
      } },
    ],
  });
}
