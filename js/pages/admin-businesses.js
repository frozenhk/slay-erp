import { el, toast, modal } from '../ui.js';
import { navigate } from '../router.js';
import { t } from '../i18n.js';
import { date } from '../format.js';
import { adminListBusinesses, adminChangePlan, adminExtendTrial, listPlans } from '../api/subscription.js';
import { listPendingPayments, adminVerifyPayment } from '../api/billing.js';

export async function adminBusinessesPage(container) {
  const wrap = el('div', { class: 'container col fade-in' });
  container.appendChild(wrap);

  const header = el('div', { class: 'row-between' });
  const back = el('button', { class: 'btn btn-ghost', type: 'button', text: '← ' + t.action_back });
  back.addEventListener('click', () => navigate('more'));
  header.appendChild(back);
  header.appendChild(el('h1', { text: 'Admin Dashboard' }));
  wrap.appendChild(header);

  const loading = el('div', { class: 'state' }, [el('div', { class: 'state-title', text: t.state_loading })]);
  wrap.appendChild(loading);

  let rows = [], plans = [], pending = [];
  try {
    rows = await adminListBusinesses();
    plans = await listPlans();
    
    // Safely try to load payments, but don't crash if the table is missing
    try {
      pending = await listPendingPayments();
    } catch (payErr) {
      console.warn('Could not load pending payments:', payErr);
      pending = [];
    }
  } catch (err) {
    loading.innerHTML = '';
    loading.appendChild(el('div', { class: 'state-title', text: t.state_error_title }));
    loading.appendChild(el('div', { class: 'state-text', text: err.message || '' }));
    return;
  }
  loading.remove();

  // Pending Payments Section (Only shows if there are pending payments)
  if (pending.length) {
    const payCard = el('div', { class: 'card', style: 'border:2px solid var(--warning); margin-bottom:16px;' });
    payCard.appendChild(el('div', { class: 'card-title', text: 'Pending Payments (' + pending.length + ')', style: 'color:var(--warning);' }));
    for (const p of pending) {
      const row = el('div', { class: 'row-between', style: 'padding:10px 0;border-bottom:1px solid var(--border);' });
      const left = el('div');
      left.appendChild(el('div', { class: 'prod-name', text: p.subscription_invoices?.businesses?.name || 'Business' }));
      left.appendChild(el('div', { class: 'prod-meta', text: (p.subscription_invoices?.plan_code || '') + ' - ' + p.method + ' - REF: ' + p.reference }));
      row.appendChild(left);
      
      const btn = el('button', { class: 'btn btn-primary btn-sm', type: 'button', text: 'Verify & Activate' });
      btn.addEventListener('click', async () => {
        try { await adminVerifyPayment(p.id); toast('Payment verified! Business upgraded.', 'success'); container.innerHTML=''; adminBusinessesPage(container); }
        catch(e) { toast(e.message, 'error'); }
      });
      row.appendChild(btn);
      payCard.appendChild(row);
    }
    wrap.appendChild(payCard);
  }

  // Businesses List
  const list = el('div', { class: 'prod-list' });
  if (!rows.length) {
    list.appendChild(el('div', { class: 'state' }, [el('div', { class: 'state-title', text: t.admin_no_businesses || 'No businesses yet.' })]));
  } else {
    for (const b of rows) list.appendChild(businessCard(b, plans, () => { container.innerHTML = ''; adminBusinessesPage(container); }));
  }
  wrap.appendChild(list);
}

function businessCard(b, plans, reload) {
  const card = el('div', { class: 'card hover-lift' });

  card.appendChild(el('div', { style: 'font-weight:700;font-size:16px;', text: b.name }));
  if (b.owner_email) card.appendChild(el('div', { class: 'muted', style: 'font-size:12px;', text: b.owner_email }));
  card.appendChild(el('div', { class: 'muted', style: 'font-size:12px;margin-top:4px;', text: 'Created ' + date(b.created_at) }));

  const tags = el('div', { class: 'row', style: 'gap:6px;margin-top:8px;flex-wrap:wrap;' });
  tags.appendChild(el('span', { class: 'badge badge-info', text: b.plan_code }));
  tags.appendChild(el('span', { class: 'badge ' + statusBadgeClass(b.subscription_status), text: t['sub_status_' + b.subscription_status] || b.subscription_status }));
  
  if (b.trial_ends_at) {
    tags.appendChild(el('span', { class: 'badge', text: t.sub_trial_ends + ' ' + date(b.trial_ends_at) }));
  } else if (b.current_period_end) {
    tags.appendChild(el('span', { class: 'badge', text: t.sub_ends_on + ' ' + date(b.current_period_end) }));
  }
  card.appendChild(tags);

  const actions = el('div', { class: 'row-actions', style: 'margin-top:12px;flex-wrap:wrap;' });
  
  const changeBtn = el('button', { class: 'btn btn-primary btn-sm btn-press', type: 'button', text: t.admin_change_plan || 'Change Plan' });
  changeBtn.addEventListener('click', () => openChangePlan(b, plans, reload));
  actions.appendChild(changeBtn);

  const extendBtn = el('button', { class: 'btn btn-secondary btn-sm btn-press', type: 'button', text: t.admin_extend_trial || 'Extend Trial' });
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
  const reason = el('input', { class: 'input', type: 'text', placeholder: t.admin_reason_ph || 'Optional note' });
  const body = el('div', { class: 'col' }, [
    el('div', { class: 'field' }, [el('label', { class: 'label', text: t.admin_plan || 'Plan' }), sel]),
    el('div', { class: 'field' }, [el('label', { class: 'label', text: t.admin_reason || 'Reason' }), reason])
  ]);

  modal({
    title: t.admin_change_plan || 'Change Plan', body,
    actions: [
      { label: t.action_cancel || 'Cancel', class: 'btn-secondary', onClick: (c) => c() },
      { label: t.action_save || 'Save', class: 'btn-primary', onClick: async (close) => {
        try { await adminChangePlan(b.id, sel.value, reason.value.trim() || null); close(); toast(t.admin_plan_changed || 'Plan updated', 'success'); reload(); }
        catch (err) { toast(err.message || t.state_error_text, 'error'); }
      } },
    ],
  });
}

function openExtendTrial(b, reload) {
  const days = el('input', { class: 'input', type: 'number', min: '1', step: '1', value: '14' });
  const reason = el('input', { class: 'input', type: 'text', placeholder: t.admin_reason_ph || 'Optional note' });
  const body = el('div', { class: 'col' }, [
    el('div', { class: 'field' }, [el('label', { class: 'label', text: t.admin_days || 'Days' }), days]),
    el('div', { class: 'field' }, [el('label', { class: 'label', text: t.admin_reason || 'Reason' }), reason])
  ]);

  modal({
    title: t.admin_extend_trial || 'Extend Trial', body,
    actions: [
      { label: t.action_cancel || 'Cancel', class: 'btn-secondary', onClick: (c) => c() },
      { label: t.action_save || 'Save', class: 'btn-primary', onClick: async (close) => {
        const n = Number(days.value);
        if (!n || n <= 0) { toast(t.admin_days_required || 'Enter a number', 'error'); return; }
        try { await adminExtendTrial(b.id, n, reason.value.trim() || null); close(); toast(t.admin_trial_extended || 'Trial extended', 'success'); reload(); }
        catch (err) { toast(err.message || t.state_error_text, 'error'); }
      } },
    ],
  });
}
