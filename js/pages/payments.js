import { el, toast, confirmDialog, modal } from '../ui.js';
import { navigate } from '../router.js';
import { t } from '../i18n.js';
import { state } from '../state.js';
import { money, date } from '../format.js';
import { listPayments, listOutstandingSales, cancelPayment, PAYMENT_METHODS } from '../api/sales.js';
import { openRecordPaymentModal } from '../components/payment-modal.js';
import { countdownText, dueBadgeClass, dueStatus, openWhatsAppReminder } from '../lib/debt.js';

export async function paymentsPage(container) {
  const businessId = state.currentBusiness && state.currentBusiness.id;
  if (!businessId) return;

  const wrap = el('div', { class: 'container col' });
  container.appendChild(wrap);

  const header = el('div', { class: 'row-between' });
  header.appendChild(el('h1', { text: t.sale_payments }));
  wrap.appendChild(header);

  const outstandingCard = el('div', { class: 'card col' });
  outstandingCard.appendChild(el('div', { class: 'card-title', text: t.payments_outstanding }));
  const outstandingList = el('div', { class: 'sale-list' });
  outstandingCard.appendChild(outstandingList);
  wrap.appendChild(outstandingCard);

  const chipsRow = el('div', { class: 'chips' });
  let activeMethod = '';
  const chipNodes = {};
  const defs = [{ id: '', label: t.payments_all_methods }]
    .concat(PAYMENT_METHODS.map((m) => ({ id: m, label: t['pay_method_' + m] })));
  for (const d of defs) {
    const b = el('button', {
      class: 'chip' + (d.id === '' ? ' chip-active' : ''),
      type: 'button', text: d.label,
    });
    b.addEventListener('click', () => {
      activeMethod = d.id;
      for (const k of Object.keys(chipNodes)) chipNodes[k].classList.toggle('chip-active', k === d.id);
      loadHistory();
    });
    chipNodes[d.id] = b;
    chipsRow.appendChild(b);
  }
  wrap.appendChild(chipsRow);

  const histCard = el('div', { class: 'card col' });
  histCard.appendChild(el('div', { class: 'card-title', text: t.payments_history }));
  const histList = el('div', { class: 'sale-list' });
  histCard.appendChild(histList);
  wrap.appendChild(histCard);

  const canVoid = ['owner', 'manager', 'accountant'].includes(state.role);

  async function loadOutstanding() {
    outstandingList.innerHTML = '';
    for (let i = 0; i < 2; i++) {
      outstandingList.appendChild(el('div', { class: 'skeleton', style: 'height:60px;' }));
    }
    try {
      const rows = await listOutstandingSales(businessId);
      outstandingList.innerHTML = '';
      if (!rows.length) {
        outstandingList.appendChild(el('div', {
          class: 'muted', text: t.debt_nothing, style: 'padding:6px 0;',
        }));
        return;
      }
      for (const s of rows) outstandingList.appendChild(outstandingCardFor(s, businessId, () => {
        loadOutstanding(); loadHistory();
      }));
    } catch (err) {
      outstandingList.innerHTML = '';
      outstandingList.appendChild(el('div', { class: 'muted', text: err.message || '' }));
    }
  }

  async function loadHistory() {
    histList.innerHTML = '';
    for (let i = 0; i < 2; i++) {
      histList.appendChild(el('div', { class: 'skeleton', style: 'height:56px;' }));
    }
    try {
      const rows = await listPayments(businessId, { method: activeMethod || undefined });
      histList.innerHTML = '';
      if (!rows.length) {
        histList.appendChild(el('div', { class: 'muted', text: t.payments_empty, style: 'padding:6px 0;' }));
        return;
      }
      for (const p of rows) histList.appendChild(paymentRow(p, businessId, canVoid, () => {
        loadOutstanding(); loadHistory();
      }));
    } catch (err) {
      histList.innerHTML = '';
      histList.appendChild(el('div', { class: 'muted', text: err.message || '' }));
    }
  }

  await loadOutstanding();
  await loadHistory();
}

function outstandingCardFor(s, businessId, onDone) {
  const card = el('div', { class: 'sale-card', style: 'cursor:default;' });

  const head = el('div', { class: 'sale-head' });
  head.appendChild(el('div', { class: 'sale-num', text: s.sale_number }));
  head.appendChild(el('div', { class: 'sale-total', text: money(s.balance) }));
  card.appendChild(head);

  const cust = (s.customers && s.customers.name) || t.sale_walkin;
  card.appendChild(el('div', {
    class: 'sale-cust',
    text: cust + ' · ' + date(s.sale_date) + ' · ' + t.sale_total + ' ' + money(s.total),
  }));

  const badgesRow = el('div', { class: 'sale-badges', style: 'margin-top:6px;' });
  if (s.due_date) {
    badgesRow.appendChild(el('span', {
      class: dueBadgeClass(s.due_date),
      text: countdownText(s.due_date) + ' · ' + date(s.due_date),
    }));
  } else {
    badgesRow.appendChild(el('span', { class: 'badge', text: t.debt_no_due }));
  }
  card.appendChild(badgesRow);

  const actions = el('div', { class: 'row-actions', style: 'margin-top:8px;flex-wrap:wrap;' });
  const payBtn = el('button', {
    class: 'btn btn-primary btn-sm', type: 'button', text: t.sale_record_payment,
  });
  payBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openRecordPaymentModal(businessId, s, onDone);
  });
  actions.appendChild(payBtn);

  if (s.customers && s.customers.phone) {
    const waBtn = el('button', {
      class: 'btn btn-secondary btn-sm', type: 'button', text: t.debt_remind_wa,
    });
    waBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openWhatsAppReminder(s, (state.currentBusiness && state.currentBusiness.name) || '');
    });
    actions.appendChild(waBtn);
  } else {
    actions.appendChild(el('div', {
      class: 'hint', text: t.debt_needs_phone, style: 'align-self:center;',
    }));
  }

  const viewBtn = el('button', {
    class: 'btn btn-secondary btn-sm', type: 'button', text: t.action_view,
  });
  viewBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    navigate('sales/view/' + s.id);
  });
  actions.appendChild(viewBtn);
  card.appendChild(actions);

  return card;
}

function paymentRow(p, businessId, canVoid, onDone) {
  const row = el('div', {
    style: 'display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);',
  });
  const left = el('div');
  left.appendChild(el('div', { class: 'prod-name', text: money(p.amount) }));
  const saleNum = (p.sales && p.sales.sale_number) || '';
  const custName = (p.customers && p.customers.name) || t.sale_walkin;
  left.appendChild(el('div', {
    class: 'prod-meta',
    text: saleNum + ' · ' + custName + (p.reference ? ' · ' + p.reference : ''),
  }));
  left.appendChild(el('div', { class: 'prod-meta', text: date(p.paid_at) }));
  row.appendChild(left);

  const right = el('div', { style: 'display:flex;align-items:center;gap:8px;' });
  right.appendChild(el('span', {
    class: 'badge badge-info', text: t['pay_method_' + p.method] || p.method,
  }));
  if (canVoid && p.sales && p.sales.id) {
    const menuBtn = el('button', {
      type: 'button',
      class: 'btn btn-ghost btn-sm',
      title: 'Options',
      text: '⋮',
      style: 'font-size:20px;padding:2px 10px;line-height:1;',
    });
    menuBtn.addEventListener('click', () => openPaymentOptions(p, businessId, onDone));
    right.appendChild(menuBtn);
  }
  row.appendChild(right);
  return row;
}

function openPaymentOptions(p, businessId, onDone) {
  const body = el('div', { class: 'col' });
  const info = el('div', { class: 'card' });
  info.appendChild(el('div', { class: 'metric-label', text: t.sale_amount }));
  info.appendChild(el('div', { class: 'metric-value', text: money(p.amount) }));
  const saleNum = (p.sales && p.sales.sale_number) || '';
  if (saleNum) info.appendChild(el('div', { class: 'metric-sub', text: saleNum }));
  body.appendChild(info);

  const voidBtn = el('button', {
    class: 'btn btn-secondary btn-block', type: 'button',
    text: t.sale_cancel_payment,
    style: 'color:var(--error);border-color:var(--error);',
  });
  voidBtn.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: t.sale_cancel_payment,
      message: t.sale_cancel_payment_confirm,
      confirmLabel: t.sale_cancel_payment,
      danger: true,
    });
    if (!ok) return;
    try {
      await cancelPayment(businessId, p.id);
      toast(t.sale_payment_cancelled, 'success');
      if (typeof onDone === 'function') onDone();
    } catch (err) { toast(err.message || t.state_error_text, 'error'); }
  });
  body.appendChild(voidBtn);
  body.appendChild(el('div', { class: 'hint', text: 'Use this only if the payment was recorded by mistake.' }));

  modal({
    title: 'Payment options',
    body,
    actions: [{ label: t.action_close, class: 'btn-secondary', onClick: (c) => c() }],
  });
}
