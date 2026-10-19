import { el, toast, confirmDialog, modal } from '../ui.js';
import { navigate } from '../router.js';
import { t } from '../i18n.js';
import { state } from '../state.js';
import { money, dateTime } from '../format.js';
import {
  getSale, getSaleItems, getSalePayments,
  recordPayment, cancelSale, cancelPayment, PAYMENT_METHODS,
} from '../api/sales.js';

export async function saleDetail(container, opts) {
  const businessId = state.currentBusiness && state.currentBusiness.id;
  if (!businessId) return;

  const wrap = el('div', { class: 'container col' });
  container.appendChild(wrap);

  const header = el('div', { class: 'row-between' });
  const back = el('button', { class: 'btn btn-ghost', type: 'button', text: '← ' + t.action_back });
  back.addEventListener('click', () => navigate('sales'));
  header.appendChild(back);
  const newBtn = el('button', { class: 'btn btn-secondary', type: 'button', text: '+ ' + t.sale_new });
  newBtn.addEventListener('click', () => navigate('sales/new'));
  header.appendChild(newBtn);
  wrap.appendChild(header);

  const loading = el('div', { class: 'state' }, [el('div', { class: 'state-title', text: t.state_loading })]);
  wrap.appendChild(loading);

  let sale, items, payments;
  try {
    sale = await getSale(opts.id, businessId);
    items = await getSaleItems(opts.id);
    payments = await getSalePayments(opts.id);
  } catch (err) {
    loading.innerHTML = '';
    loading.appendChild(el('div', { class: 'state-title', text: t.state_error_title }));
    loading.appendChild(el('div', { class: 'state-text', text: err.message || '' }));
    return;
  }
  loading.remove();

  const head = el('div', { class: 'card' });
  const headRow = el('div', { class: 'row-between' });
  const l1 = el('div');
  l1.appendChild(el('div', { style: 'font-size:18px;font-weight:700;', text: sale.sale_number }));
  l1.appendChild(el('div', { class: 'prod-meta', text: dateTime(sale.sale_date) }));
  headRow.appendChild(l1);
  const badges = el('div', { class: 'sale-badges' });
  badges.appendChild(el('span', {
    class: 'badge ' + (sale.status === 'cancelled' ? 'badge-error' : 'badge-success'),
    text: t['sale_status_' + sale.status] || sale.status,
  }));
  badges.appendChild(el('span', {
    class: 'badge ' + (sale.payment_status === 'paid' ? 'badge-success'
      : sale.payment_status === 'partial' ? 'badge-warning' : 'badge-error'),
    text: t['pay_' + sale.payment_status] || sale.payment_status,
  }));
  headRow.appendChild(badges);
  head.appendChild(headRow);
  wrap.appendChild(head);

  const cCard = el('div', { class: 'card' });
  cCard.appendChild(el('div', { class: 'card-title', text: t.sale_customer }));
  if (sale.customers) {
    cCard.appendChild(el('div', { text: sale.customers.name }));
    if (sale.customers.phone) cCard.appendChild(el('div', { class: 'muted', text: sale.customers.phone }));
  } else {
    cCard.appendChild(el('div', { class: 'muted', text: t.sale_walkin }));
  }
  if (sale.locations) {
    cCard.appendChild(el('div', { class: 'muted', style: 'margin-top:6px;', text: t.sale_location + ': ' + sale.locations.name }));
  }
  wrap.appendChild(cCard);

  const itemsCard = el('div', { class: 'card' });
  itemsCard.appendChild(el('div', { class: 'card-title', text: t.sale_items }));
  for (const it of items) {
    const row = el('div', { class: 'row-between', style: 'padding:6px 0;border-bottom:1px solid var(--border);' });
    const left = el('div');
    left.appendChild(el('div', { class: 'prod-name', text: it.product_name }));
    left.appendChild(el('div', { class: 'prod-meta', text: money(it.unit_price) + ' × ' + it.quantity }));
    row.appendChild(left);
    row.appendChild(el('div', { class: 'prod-price', text: money(it.line_total) }));
    itemsCard.appendChild(row);
  }
  wrap.appendChild(itemsCard);

  const totals = el('div', { class: 'sale-totals' });
  totals.appendChild(rowLine(t.sale_subtotal, money(sale.subtotal)));
  if (Number(sale.discount) > 0) totals.appendChild(rowLine(t.sale_discount, '- ' + money(sale.discount)));
  if (Number(sale.tax) > 0) totals.appendChild(rowLine(t.sale_tax, money(sale.tax)));
  if (Number(sale.delivery_fee) > 0) totals.appendChild(rowLine(t.sale_delivery, money(sale.delivery_fee)));
  totals.appendChild(el('div', { class: 'row-between total-row' }, [
    el('div', { text: t.sale_total }), el('div', { text: money(sale.total) }),
  ]));
  totals.appendChild(rowLine(t.sale_amount_paid, money(sale.amount_paid)));
  totals.appendChild(rowLine(t.sale_balance, money(sale.balance)));
  wrap.appendChild(totals);

  const pCard = el('div', { class: 'card' });
  pCard.appendChild(el('div', { class: 'card-title', text: t.sale_payments }));
  if (!payments.length) pCard.appendChild(el('div', { class: 'muted', text: t.sale_no_payments }));
  else {
    const canVoid = ['owner', 'manager', 'accountant'].includes(state.role)
      && sale.status === 'completed';
    for (const p of payments) {
      const row = el('div', {
        style: 'display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);',
      });
      const l = el('div');
      l.appendChild(el('div', { class: 'prod-name', text: money(p.amount) }));
      l.appendChild(el('div', {
        class: 'prod-meta',
        text: (t['pay_method_' + p.method] || p.method) + (p.reference ? ' · ' + p.reference : ''),
      }));
      l.appendChild(el('div', { class: 'prod-meta', text: dateTime(p.paid_at) }));
      row.appendChild(l);

      const right = el('div', { style: 'display:flex;align-items:center;gap:8px;' });
      if (canVoid) {
        const menuBtn = el('button', {
          type: 'button',
          class: 'btn btn-ghost btn-sm',
          title: 'Options',
          text: '⋮',
          style: 'font-size:20px;padding:2px 10px;line-height:1;',
        });
        menuBtn.addEventListener('click', () => {
          openPaymentOptions(p, businessId, () => refresh(container, opts));
        });
        right.appendChild(menuBtn);
      }
      row.appendChild(right);
      pCard.appendChild(row);
    }
  }
  wrap.appendChild(pCard);

  const actions = el('div', { class: 'row-actions' });
  if (sale.status === 'completed' && Number(sale.balance) > 0) {
    const payBtn = el('button', { class: 'btn btn-primary', type: 'button', text: t.sale_record_payment });
    payBtn.addEventListener('click', () => openRecordPayment(businessId, sale, () => refresh(container, opts)));
    actions.appendChild(payBtn);
  }
  if (sale.status === 'completed' && (state.role === 'owner' || state.role === 'manager')) {
    const cancelBtn = el('button', { class: 'btn btn-ghost', type: 'button', text: t.sale_cancel, style: 'color:var(--error);' });
    cancelBtn.addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: t.sale_cancel,
        message: t.sale_cancel_confirm,
        confirmLabel: t.sale_cancel,
        danger: true,
      });
      if (!ok) return;
      try {
        await cancelSale(businessId, sale.id);
        toast(t.sale_cancelled, 'success');
        refresh(container, opts);
      } catch (err) { toast(err.message || t.state_error_text, 'error'); }
    });
    actions.appendChild(cancelBtn);
  }
  if (actions.childNodes.length) wrap.appendChild(actions);
}

function refresh(container, opts) {
  container.innerHTML = '';
  saleDetail(container, opts);
}

function rowLine(label, value) {
  const row = el('div', { class: 'row-between' });
  row.appendChild(el('div', { class: 'muted', text: label }));
  row.appendChild(el('div', { text: value }));
  return row;
}

function openPaymentOptions(p, businessId, onDone) {
  const body = el('div', { class: 'col' });

  const info = el('div', { class: 'card' });
  info.appendChild(el('div', { class: 'metric-label', text: t.sale_amount }));
  info.appendChild(el('div', { class: 'metric-value', text: money(p.amount) }));
  info.appendChild(el('div', {
    class: 'metric-sub',
    text: (t['pay_method_' + p.method] || p.method) + ' · ' + dateTime(p.paid_at),
  }));
  body.appendChild(info);

  const voidBtn = el('button', {
    class: 'btn btn-secondary btn-block',
    type: 'button',
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
    } catch (err) {
      toast(err.message || t.state_error_text, 'error');
    }
  });
  body.appendChild(voidBtn);

  body.appendChild(el('div', {
    class: 'hint',
    text: 'Use this only if the payment was recorded by mistake.',
  }));

  modal({
    title: 'Payment options',
    body,
    actions: [
      { label: t.action_close, class: 'btn-secondary', onClick: (c) => c() },
    ],
  });
}

function openRecordPayment(businessId, sale, onDone) {
  const methodSel = el('select', { class: 'select' });
  for (const m of PAYMENT_METHODS) methodSel.appendChild(el('option', { value: m, text: t['pay_method_' + m] }));
  const amountInput = el('input', {
    class: 'input', type: 'number', min: '1', step: '1', value: String(sale.balance),
  });
  const refInput = el('input', { class: 'input', type: 'text', placeholder: t.sale_payment_ref_ph });

  const body = el('div', { class: 'col' });
  body.appendChild(el('div', { class: 'muted', text: t.sale_balance + ': ' + money(sale.balance) }));
  body.appendChild(el('div', { class: 'field' }, [el('label', { class: 'label', text: t.sale_amount }), amountInput]));
  body.appendChild(el('div', { class: 'field' }, [el('label', { class: 'label', text: t.sale_payment_method }), methodSel]));
  body.appendChild(el('div', { class: 'field' }, [el('label', { class: 'label', text: t.sale_payment_ref }), refInput]));

  modal({
    title: t.sale_record_payment,
    body,
    actions: [
      { label: t.action_cancel, class: 'btn-secondary', onClick: (c) => c() },
      { label: t.action_save, class: 'btn-primary', onClick: async (close) => {
        const amount = Number(amountInput.value);
        if (!amount || amount <= 0) { toast(t.sale_amount_required, 'error'); return; }
        try {
          await recordPayment(businessId, sale.id, amount, methodSel.value, refInput.value.trim() || null);
          close();
          toast(t.sale_payment_recorded, 'success');
          if (typeof onDone === 'function') onDone();
        } catch (err) { toast(err.message || t.state_error_text, 'error'); }
      } },
    ],
  });
}
