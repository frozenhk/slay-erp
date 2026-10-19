import { el } from '../ui.js';
import { navigate } from '../router.js';
import { t } from '../i18n.js';
import { state } from '../state.js';
import { money, date, phoneForWhatsApp } from '../format.js';
import { getSale, getSaleItems, getSalePayments } from '../api/sales.js';
import { getInvoiceForSale } from '../api/invoices.js';

export async function invoiceView(container, opts) {
  const businessId = state.currentBusiness && state.currentBusiness.id;
  if (!businessId) return;
  const saleId = opts.saleId;

  const wrap = el('div', { class: 'container col' });
  container.appendChild(wrap);

  const loading = el('div', { class: 'state' }, [
    el('div', { class: 'state-title', text: t.state_loading }),
  ]);
  wrap.appendChild(loading);

  let sale, items, payments, inv;
  try {
    sale = await getSale(saleId, businessId);
    items = await getSaleItems(saleId);
    payments = await getSalePayments(saleId);
    inv = await getInvoiceForSale(saleId, businessId);
  } catch (err) {
    loading.innerHTML = '';
    loading.appendChild(el('div', { class: 'state-title', text: t.state_error_title }));
    loading.appendChild(el('div', { class: 'state-text', text: err.message || '' }));
    return;
  }
  loading.remove();

  const actions = el('div', { class: 'inv-actions no-print' });
  const back = el('button', { class: 'btn btn-ghost', type: 'button', text: '← ' + t.action_back });
  back.addEventListener('click', () => navigate('sales/view/' + saleId));
  actions.appendChild(back);

  const printBtn = el('button', { class: 'btn btn-secondary', type: 'button', text: t.invoice_print });
  printBtn.addEventListener('click', () => window.print());
  actions.appendChild(printBtn);

  const waBtn = el('button', { class: 'btn btn-primary', type: 'button', text: t.invoice_share_wa });
  waBtn.addEventListener('click', () => shareWhatsApp(sale, items, inv));
  actions.appendChild(waBtn);

  const newBtn = el('button', { class: 'btn btn-secondary', type: 'button', text: '+ ' + t.sale_new });
  newBtn.addEventListener('click', () => navigate('sales/new'));
  actions.appendChild(newBtn);
  wrap.appendChild(actions);

  const sheet = el('div', { class: 'invoice-sheet' });
  const biz = state.currentBusiness || {};

  const header = el('div', { class: 'inv-header' });

  const bizBox = el('div', { class: 'inv-biz' });
  const logo = el('div', { class: 'inv-logo' });
  if (biz.logo_url) {
    const img = document.createElement('img');
    img.src = biz.logo_url;
    img.alt = '';
    logo.appendChild(img);
  } else {
    logo.textContent = (biz.name || 'S').charAt(0).toUpperCase();
  }
  bizBox.appendChild(logo);

  const bizMeta = el('div');
  bizMeta.appendChild(el('div', { class: 'inv-biz-name', text: biz.name || '' }));
  if (biz.phone) bizMeta.appendChild(el('div', { class: 'inv-biz-meta', text: biz.phone }));
  if (biz.email) bizMeta.appendChild(el('div', { class: 'inv-biz-meta', text: biz.email }));
  if (biz.address) bizMeta.appendChild(el('div', { class: 'inv-biz-meta', text: biz.address }));
  bizBox.appendChild(bizMeta);
  header.appendChild(bizBox);

  const metaBox = el('div', { class: 'inv-meta' });
  metaBox.appendChild(el('div', { class: 'inv-meta-title', text: t.invoice_title.toUpperCase() }));
  if (inv && inv.invoice_number) {
    metaBox.appendChild(el('div', { class: 'inv-meta-num', text: inv.invoice_number }));
  }
  metaBox.appendChild(el('div', { class: 'inv-meta-date', text: t.invoice_sale_num + ': ' + sale.sale_number }));
  metaBox.appendChild(el('div', { class: 'inv-meta-date', text: t.invoice_date + ': ' + date(sale.sale_date) }));
  header.appendChild(metaBox);
  sheet.appendChild(header);

  const billTo = el('div', { class: 'inv-section' });
  billTo.appendChild(el('div', { class: 'inv-section-title', text: t.invoice_bill_to }));
  if (sale.customers) {
    billTo.appendChild(el('div', { class: 'inv-billto-name', text: sale.customers.name }));
    if (sale.customers.phone) billTo.appendChild(el('div', { class: 'inv-billto-meta', text: sale.customers.phone }));
    if (sale.customers.email) billTo.appendChild(el('div', { class: 'inv-billto-meta', text: sale.customers.email }));
  } else {
    billTo.appendChild(el('div', { class: 'inv-billto-name', text: t.sale_walkin }));
  }
  sheet.appendChild(billTo);

  const table = el('table', { class: 'inv-table' });
  const thead = el('thead');
  const tr = el('tr');
  tr.appendChild(el('th', { text: t.invoice_col_item }));
  tr.appendChild(el('th', { class: 'num', text: t.invoice_col_qty }));
  tr.appendChild(el('th', { class: 'num', text: t.invoice_col_price }));
  tr.appendChild(el('th', { class: 'num', text: t.invoice_col_total }));
  thead.appendChild(tr);
  table.appendChild(thead);

  const tbody = el('tbody');
  for (const it of items) {
    const r = el('tr');
    r.appendChild(el('td', { text: it.product_name }));
    r.appendChild(el('td', { class: 'num', text: String(it.quantity) }));
    r.appendChild(el('td', { class: 'num', text: money(it.unit_price) }));
    r.appendChild(el('td', { class: 'num', text: money(it.line_total) }));
    tbody.appendChild(r);
  }
  table.appendChild(tbody);
  sheet.appendChild(table);

  const totals = el('div', { class: 'inv-totals' });
  totals.appendChild(el('div', { class: 'row-between' }, [
    el('div', { class: 'muted', text: t.sale_subtotal }),
    el('div', { text: money(sale.subtotal) }),
  ]));
  if (Number(sale.discount) > 0) {
    totals.appendChild(el('div', { class: 'row-between' }, [
      el('div', { class: 'muted', text: t.sale_discount }),
      el('div', { text: '- ' + money(sale.discount) }),
    ]));
  }
  if (Number(sale.tax) > 0) {
    totals.appendChild(el('div', { class: 'row-between' }, [
      el('div', { class: 'muted', text: t.sale_tax }),
      el('div', { text: money(sale.tax) }),
    ]));
  }
  if (Number(sale.delivery_fee) > 0) {
    totals.appendChild(el('div', { class: 'row-between' }, [
      el('div', { class: 'muted', text: t.sale_delivery }),
      el('div', { text: money(sale.delivery_fee) }),
    ]));
  }
  totals.appendChild(el('div', { class: 'row-between grand' }, [
    el('div', { text: t.sale_total }),
    el('div', { text: money(sale.total) }),
  ]));
  totals.appendChild(el('div', { class: 'row-between paid-row' }, [
    el('div', { text: t.sale_amount_paid }),
    el('div', { text: money(sale.amount_paid) }),
  ]));
  if (Number(sale.balance) > 0) {
    totals.appendChild(el('div', { class: 'row-between bal-row' }, [
      el('div', { text: t.sale_balance }),
      el('div', { text: money(sale.balance) }),
    ]));
  }
  sheet.appendChild(totals);

  const statusBox = el('div', { class: 'inv-status' });
  statusBox.appendChild(el('span', {
    class: 'badge ' + (sale.payment_status === 'paid' ? 'badge-success'
      : sale.payment_status === 'partial' ? 'badge-warning' : 'badge-error'),
    text: t['pay_' + sale.payment_status] || sale.payment_status,
  }));
  if (sale.status === 'cancelled') {
    statusBox.appendChild(document.createTextNode(' '));
    statusBox.appendChild(el('span', { class: 'badge badge-error', text: t.sale_status_cancelled }));
  }
  sheet.appendChild(statusBox);

  if (payments.length) {
    const payBox = el('div', { class: 'inv-payments' });
    payBox.appendChild(el('div', { class: 'inv-section-title', text: t.sale_payments }));
    for (const p of payments) {
      const row = el('div', { class: 'pay-row' });
      row.appendChild(el('div', {
        text: (t['pay_method_' + p.method] || p.method) + (p.reference ? ' · ' + p.reference : ''),
      }));
      row.appendChild(el('div', { text: money(p.amount) + '  ·  ' + date(p.date || p.paid_at) }));
      payBox.appendChild(row);
    }
    sheet.appendChild(payBox);
  }

  // Footer — either the business's custom footer from Settings, or the default.
  const footerText = biz.invoice_footer
    ? biz.invoice_footer
    : 'Thank you for shopping with us.';
  sheet.appendChild(el('div', { class: 'inv-footer', text: footerText }));

  wrap.appendChild(sheet);
}

function shareWhatsApp(sale, items, inv) {
  const biz = state.currentBusiness || {};
  const lines = [];
  lines.push('*' + (biz.name || t.app_name) + '*');
  if (inv && inv.invoice_number) lines.push(inv.invoice_number);
  lines.push(date(sale.sale_date));
  lines.push('');
  const custName = sale.customers ? sale.customers.name : t.sale_walkin;
  lines.push(t.invoice_bill_to + ': ' + custName);
  lines.push('');
  for (const it of items) {
    lines.push('• ' + it.product_name + ' ×' + it.quantity + '  ' + money(it.line_total));
  }
  lines.push('');
  lines.push(t.sale_total + ': ' + money(sale.total));
  if (Number(sale.amount_paid) > 0) lines.push(t.sale_amount_paid + ': ' + money(sale.amount_paid));
  if (Number(sale.balance) > 0) lines.push(t.sale_balance + ': ' + money(sale.balance));
  lines.push('');
  lines.push('Thank you for shopping with us.');

  const text = encodeURIComponent(lines.join('\n'));
  let url = 'https://wa.me/';
  if (sale.customers && sale.customers.phone) {
    const ph = phoneForWhatsApp(sale.customers.phone);
    if (ph) url += ph;
  }
  url += '?text=' + text;
  window.open(url, '_blank');
}
