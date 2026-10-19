import { el } from '../ui.js';
import { navigate } from '../router.js';
import { t } from '../i18n.js';
import { state } from '../state.js';
import { initials, money, date, phoneForWhatsApp } from '../format.js';
import { getCustomer, getCustomerStats } from '../api/customers.js';

export async function customerDetail(container, opts) {
  const businessId = state.currentBusiness && state.currentBusiness.id;
  if (!businessId) return;

  const wrap = el('div', { class: 'container col' });
  container.appendChild(wrap);

  const header = el('div', { class: 'row-between' });
  const back = el('button', {
    class: 'btn btn-ghost', type: 'button', text: '← ' + t.action_back,
  });
  back.addEventListener('click', () => navigate('customers'));
  header.appendChild(back);

  const right = el('div', { class: 'row-actions' });
  const editBtn = el('button', {
    class: 'btn btn-secondary', type: 'button', text: t.action_edit,
  });
  editBtn.addEventListener('click', () => navigate('customers/edit/' + opts.id));
  right.appendChild(editBtn);
  header.appendChild(right);
  wrap.appendChild(header);

  const loading = el('div', { class: 'state' }, [
    el('div', { class: 'state-title', text: t.state_loading }),
  ]);
  wrap.appendChild(loading);

  let c, stats;
  try {
    c = await getCustomer(opts.id, businessId);
    stats = await getCustomerStats(opts.id, businessId);
  } catch (err) {
    loading.innerHTML = '';
    loading.appendChild(el('div', { class: 'state-title', text: t.state_error_title }));
    loading.appendChild(el('div', { class: 'state-text', text: err.message || '' }));
    return;
  }
  loading.remove();

  // Profile head
  const head = el('div', { class: 'profile-head' });
  head.appendChild(el('div', { class: 'profile-avatar', text: initials(c.name) }));
  const headInfo = el('div');
  headInfo.appendChild(el('div', { class: 'profile-name', text: c.name }));
  const subParts = [t['cust_type_' + c.customer_type] || c.customer_type];
  if (c.city) subParts.push(c.city);
  headInfo.appendChild(el('div', { class: 'profile-sub', text: subParts.join(' · ') }));
  head.appendChild(headInfo);
  wrap.appendChild(head);

  // Info metrics
  const grid = el('div', { class: 'info-grid' });
  grid.appendChild(infoCard(t.cust_total_spent, money(stats.totalSpent)));
  grid.appendChild(infoCard(t.cust_outstanding, money(stats.totalBalance)));
  grid.appendChild(infoCard(t.cust_purchases, String(stats.purchaseCount)));
  grid.appendChild(infoCard(t.cust_last_purchase,
    stats.lastPurchase ? date(stats.lastPurchase) : '—'));
  wrap.appendChild(grid);

  // Contact
  const contact = el('div', { class: 'card' });
  contact.appendChild(el('div', { class: 'card-title', text: t.cust_contact }));
  if (c.phone) contact.appendChild(contactRow(t.cust_phone, c.phone));
  if (c.email) contact.appendChild(contactRow(t.cust_email, c.email));
  if (c.address) contact.appendChild(contactRow(t.cust_address, c.address));
  if (!c.phone && !c.email && !c.address) {
    contact.appendChild(el('div', { class: 'muted', text: '—' }));
  }
  wrap.appendChild(contact);

  // WhatsApp / call buttons
  const actions = el('div', { class: 'row-actions' });
  if (c.phone) {
    const wp = phoneForWhatsApp(c.phone);
    const wpBtn = el('a', {
      class: 'btn btn-secondary', href: 'https://wa.me/' + wp,
      target: '_blank', rel: 'noopener', text: t.cust_whatsapp,
    });
    actions.appendChild(wpBtn);
    const callBtn = el('a', {
      class: 'btn btn-secondary', href: 'tel:' + c.phone, text: t.cust_call,
    });
    actions.appendChild(callBtn);
  }
  if (actions.childNodes.length) wrap.appendChild(actions);

  // Notes
  if (c.notes) {
    const notes = el('div', { class: 'card' });
    notes.appendChild(el('div', { class: 'card-title', text: t.cust_notes }));
    notes.appendChild(el('div', { text: c.notes }));
    wrap.appendChild(notes);
  }

  // Purchase history
  const hist = el('div', { class: 'card' });
  hist.appendChild(el('div', { class: 'card-title', text: t.cust_history }));
  if (!stats.sales.length) {
    hist.appendChild(el('div', { class: 'muted', text: t.cust_no_purchases }));
  } else {
    for (const s of stats.sales) {
      const row = el('div', { class: 'row-between', style: 'padding:8px 0;border-bottom:1px solid var(--border);' });
      const l = el('div');
      l.appendChild(el('div', { class: 'prod-name', text: s.sale_number }));
      l.appendChild(el('div', { class: 'prod-meta', text: date(s.sale_date) }));
      row.appendChild(l);
      const r = el('div', { class: 'cust-right' });
      r.appendChild(el('div', { class: 'prod-price', text: money(s.total) }));
      const st = el('span', {
        class: 'badge ' + (s.payment_status === 'paid' ? 'badge-success'
          : s.payment_status === 'partial' ? 'badge-warning' : 'badge-error'),
        text: t['pay_' + s.payment_status] || s.payment_status,
      });
      r.appendChild(st);
      row.appendChild(r);
      row.style.cursor = 'pointer';
      row.addEventListener('click', () => navigate('sales/view/' + s.id));
      hist.appendChild(row);
    }
  }
  wrap.appendChild(hist);
}

function infoCard(label, value) {
  const c = el('div', { class: 'info-card' });
  c.appendChild(el('div', { class: 'info-label', text: label }));
  c.appendChild(el('div', { class: 'info-value', text: value }));
  return c;
}

function contactRow(label, value) {
  const r = el('div', { class: 'row-between', style: 'padding:4px 0;' });
  r.appendChild(el('div', { class: 'muted', text: label }));
  r.appendChild(el('div', { text: value }));
  return r;
}
