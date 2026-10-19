import { el } from '../ui.js';
import { navigate } from '../router.js';
import { t } from '../i18n.js';
import { state } from '../state.js';
import { money, date } from '../format.js';
import { listSales } from '../api/sales.js';

export async function salesPage(container) {
  const businessId = state.currentBusiness && state.currentBusiness.id;
  if (!businessId) return;

  const wrap = el('div', { class: 'container col' });
  container.appendChild(wrap);

  const header = el('div', { class: 'row-between' });
  header.appendChild(el('h1', { text: t.nav_sales }));
  const addBtn = el('button', { class: 'btn btn-primary', type: 'button', text: '+ ' + t.sale_new });
  addBtn.addEventListener('click', () => navigate('sales/new'));
  header.appendChild(addBtn);
  wrap.appendChild(header);

  const searchInput = el('input', { class: 'input', type: 'search', placeholder: t.sale_search_sale });
  wrap.appendChild(searchInput);

  const chipsRow = el('div', { class: 'chips' });
  const chipNodes = {};
  let activeFilter = 'all';
  const defs = [
    { id: 'all', label: t.sale_filter_all },
    { id: 'today', label: t.sale_filter_today },
    { id: 'unpaid', label: t.sale_filter_unpaid },
    { id: 'cancelled', label: t.sale_filter_cancelled },
  ];
  for (const d of defs) {
    const b = el('button', {
      class: 'chip' + (d.id === 'all' ? ' chip-active' : ''),
      type: 'button', text: d.label,
    });
    b.addEventListener('click', () => {
      activeFilter = d.id;
      for (const k of Object.keys(chipNodes)) chipNodes[k].classList.toggle('chip-active', k === d.id);
      load();
    });
    chipNodes[d.id] = b;
    chipsRow.appendChild(b);
  }
  wrap.appendChild(chipsRow);

  const list = el('div', { class: 'sale-list' });
  wrap.appendChild(list);

  let all = [];

  async function load() {
    list.innerHTML = '';
    for (let i = 0; i < 3; i++) list.appendChild(el('div', { class: 'skeleton', style: 'height:80px;' }));
    try {
      const opts = {};
      if (activeFilter === 'today') {
        const s = new Date(); s.setHours(0, 0, 0, 0);
        opts.from = s.toISOString();
      } else if (activeFilter === 'unpaid') {
        opts.status = 'completed';
      } else if (activeFilter === 'cancelled') {
        opts.status = 'cancelled';
      }
      all = await listSales(businessId, opts);
      render();
    } catch (err) {
      list.innerHTML = '';
      const st = el('div', { class: 'state' }, [
        el('div', { class: 'state-title', text: t.state_error_title }),
        el('div', { class: 'state-text', text: err.message || '' }),
      ]);
      const rt = el('button', { class: 'btn btn-secondary', type: 'button', text: t.action_retry });
      rt.addEventListener('click', load);
      st.appendChild(rt);
      list.appendChild(st);
    }
  }

  function render() {
    list.innerHTML = '';
    let rows = all;
    if (activeFilter === 'unpaid') rows = rows.filter((s) => Number(s.balance) > 0);
    const q = searchInput.value.trim().toLowerCase();
    if (q) {
      rows = rows.filter((s) => (
        (s.sale_number || '') + ' ' + ((s.customers && s.customers.name) || '')
      ).toLowerCase().includes(q));
    }
    if (!rows.length) {
      const st = el('div', { class: 'state' }, [
        el('div', { class: 'state-title', text: t.sale_empty_title }),
        el('div', { class: 'state-text', text: t.sale_empty_text }),
      ]);
      const b = el('button', { class: 'btn btn-primary', type: 'button', text: '+ ' + t.sale_new });
      b.addEventListener('click', () => navigate('sales/new'));
      st.appendChild(b);
      list.appendChild(st);
      return;
    }
    for (const s of rows) list.appendChild(saleCard(s));
  }

  let tId;
  searchInput.addEventListener('input', () => {
    clearTimeout(tId);
    tId = setTimeout(render, 150);
  });

  await load();
}

function saleCard(s) {
  const card = el('div', { class: 'sale-card' });
  const head = el('div', { class: 'sale-head' });
  head.appendChild(el('div', { class: 'sale-num', text: s.sale_number }));
  head.appendChild(el('div', { class: 'sale-total', text: money(s.total) }));
  card.appendChild(head);

  const cust = (s.customers && s.customers.name) || t.sale_walkin;
  card.appendChild(el('div', { class: 'sale-cust', text: cust + ' · ' + date(s.sale_date) }));

  const foot = el('div', { class: 'sale-foot' });
  const badges = el('div', { class: 'sale-badges' });
  badges.appendChild(el('span', {
    class: 'badge ' + (s.status === 'cancelled' ? 'badge-error' : 'badge-success'),
    text: t['sale_status_' + s.status] || s.status,
  }));
  badges.appendChild(el('span', {
    class: 'badge ' + (s.payment_status === 'paid' ? 'badge-success'
      : s.payment_status === 'partial' ? 'badge-warning' : 'badge-error'),
    text: t['pay_' + s.payment_status] || s.payment_status,
  }));
  foot.appendChild(badges);
  if (Number(s.balance) > 0) {
    foot.appendChild(el('div', { class: 'sale-cust', text: t.sale_balance + ': ' + money(s.balance) }));
  }
  card.appendChild(foot);
  card.addEventListener('click', () => navigate('sales/view/' + s.id));
  return card;
}
