import { el } from '../ui.js';
import { navigate } from '../router.js';
import { t } from '../i18n.js';
import { state } from '../state.js';
import { initials } from '../format.js';
import { listCustomers, CUSTOMER_TYPES } from '../api/customers.js';

export async function customersPage(container) {
  const businessId = state.currentBusiness && state.currentBusiness.id;
  if (!businessId) {
    container.appendChild(el('div', { class: 'state' }, [
      el('div', { class: 'state-title', text: t.state_error_title }),
    ]));
    return;
  }

  const wrap = el('div', { class: 'container col' });
  container.appendChild(wrap);

  const header = el('div', { class: 'row-between' });
  header.appendChild(el('h1', { text: t.nav_customers }));
  const addBtn = el('button', {
    class: 'btn btn-primary', type: 'button', text: t.cust_add,
  });
  addBtn.addEventListener('click', () => navigate('customers/new'));
  header.appendChild(addBtn);
  wrap.appendChild(header);

  const searchInput = el('input', {
    class: 'input', type: 'search', placeholder: t.cust_search_ph,
  });
  wrap.appendChild(searchInput);

  const chipsRow = el('div', { class: 'chips' });
  const chipNodes = {};
  let activeType = '';
  const defs = [{ id: '', label: t.cust_all_types }]
    .concat(CUSTOMER_TYPES.map((x) => ({ id: x, label: t['cust_type_' + x] })));
  for (const d of defs) {
    const b = el('button', {
      class: 'chip' + (d.id === '' ? ' chip-active' : ''),
      type: 'button',
      text: d.label,
    });
    b.addEventListener('click', () => {
      activeType = d.id;
      for (const k of Object.keys(chipNodes)) {
        chipNodes[k].classList.toggle('chip-active', k === d.id);
      }
      render();
    });
    chipNodes[d.id] = b;
    chipsRow.appendChild(b);
  }
  wrap.appendChild(chipsRow);

  const list = el('div', { class: 'cust-list' });
  wrap.appendChild(list);

  let all = [];
  let search = '';

  async function reload() {
    list.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      list.appendChild(el('div', { class: 'skeleton', style: 'height:64px;' }));
    }
    try {
      all = await listCustomers(businessId, {});
      render();
    } catch (err) {
      list.innerHTML = '';
      const st = el('div', { class: 'state' }, [
        el('div', { class: 'state-title', text: t.state_error_title }),
        el('div', { class: 'state-text', text: err.message || '' }),
      ]);
      const rt = el('button', {
        class: 'btn btn-secondary', type: 'button', text: t.action_retry,
      });
      rt.addEventListener('click', reload);
      st.appendChild(rt);
      list.appendChild(st);
    }
  }

  function render() {
    list.innerHTML = '';
    let filtered = all;
    if (activeType) filtered = filtered.filter((c) => c.customer_type === activeType);
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter((c) => (
        (c.name || '') + ' ' + (c.phone || '') + ' ' + (c.email || '')
      ).toLowerCase().includes(s));
    }

    if (!filtered.length) {
      const st = el('div', { class: 'state' }, [
        el('div', { class: 'state-title', text: t.cust_empty_title }),
        el('div', { class: 'state-text', text: t.cust_empty_text }),
      ]);
      if (!search && !activeType) {
        const b = el('button', {
          class: 'btn btn-primary', type: 'button', text: t.cust_add,
        });
        b.addEventListener('click', () => navigate('customers/new'));
        st.appendChild(b);
      }
      list.appendChild(st);
      return;
    }
    for (const c of filtered) list.appendChild(customerCard(c));
  }

  let tId;
  searchInput.addEventListener('input', () => {
    clearTimeout(tId);
    tId = setTimeout(() => { search = searchInput.value.trim(); render(); }, 200);
  });

  await reload();
}

function customerCard(c) {
  const card = el('div', { class: 'cust-card' });
  card.appendChild(el('div', { class: 'cust-avatar', text: initials(c.name) }));

  const info = el('div');
  info.appendChild(el('div', { class: 'cust-name', text: c.name }));
  const parts = [];
  if (c.phone) parts.push(c.phone);
  if (c.city) parts.push(c.city);
  info.appendChild(el('div', {
    class: 'cust-meta', text: parts.join(' · ') || '—',
  }));
  card.appendChild(info);

  const right = el('div', { class: 'cust-right' });
  right.appendChild(el('span', {
    class: 'badge badge-info', text: t['cust_type_' + c.customer_type] || c.customer_type,
  }));
  card.appendChild(right);

  card.addEventListener('click', () => navigate('customers/view/' + c.id));
  return card;
}
