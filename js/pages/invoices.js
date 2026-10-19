import { el } from '../ui.js';
import { navigate } from '../router.js';
import { t } from '../i18n.js';
import { state } from '../state.js';
import { money, date } from '../format.js';
import { listInvoices } from '../api/invoices.js';

export async function invoicesPage(container) {
  const businessId = state.currentBusiness && state.currentBusiness.id;
  if (!businessId) return;

  const wrap = el('div', { class: 'container col' });
  container.appendChild(wrap);

  const header = el('div', { class: 'row-between' });
  header.appendChild(el('h1', { text: t.invoice_history }));
  wrap.appendChild(header);

  const list = el('div', { class: 'sale-list' });
  wrap.appendChild(list);

  list.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    list.appendChild(el('div', { class: 'skeleton', style: 'height:72px;' }));
  }

  let rows = [];
  try {
    rows = await listInvoices(businessId);
  } catch (err) {
    list.innerHTML = '';
    list.appendChild(el('div', { class: 'state' }, [
      el('div', { class: 'state-title', text: t.state_error_title }),
      el('div', { class: 'state-text', text: err.message || '' }),
    ]));
    return;
  }

  list.innerHTML = '';
  if (!rows.length) {
    list.appendChild(el('div', { class: 'state' }, [
      el('div', { class: 'state-title', text: t.invoice_empty }),
      el('div', { class: 'state-text', text: t.invoice_empty_text }),
    ]));
    return;
  }
  for (const inv of rows) list.appendChild(invCard(inv));
}

function invCard(inv) {
  const sale = inv.sales || {};
  const card = el('div', { class: 'sale-card' });

  const head = el('div', { class: 'sale-head' });
  head.appendChild(el('div', { class: 'sale-num', text: inv.invoice_number }));
  head.appendChild(el('div', { class: 'sale-total', text: money(sale.total) }));
  card.appendChild(head);

  const cust = (sale.customers && sale.customers.name) || t.sale_walkin;
  const line2 = sale.sale_number + ' · ' + cust + ' · ' + date(sale.sale_date || inv.issued_at);
  card.appendChild(el('div', { class: 'sale-cust', text: line2 }));

  const foot = el('div', { class: 'sale-foot' });
  const badges = el('div', { class: 'sale-badges' });
  badges.appendChild(el('span', {
    class: 'badge ' + (sale.payment_status === 'paid' ? 'badge-success'
      : sale.payment_status === 'partial' ? 'badge-warning' : 'badge-error'),
    text: t['pay_' + (sale.payment_status || 'unpaid')] || (sale.payment_status || 'unpaid'),
  }));
  foot.appendChild(badges);
  card.appendChild(foot);

  card.addEventListener('click', () => navigate('invoices/view/' + inv.sale_id));
  return card;
}
