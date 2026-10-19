import { el, toast, modal } from '../ui.js';
import { navigate } from '../router.js';
import { t } from '../i18n.js';
import { state } from '../state.js';
import { number } from '../format.js';
import { listStockOverview, adjustStock } from '../api/stock.js';
import { listLocations } from '../api/locations.js';

export async function inventoryPage(container) {
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
  header.appendChild(el('h1', { text: t.nav_inventory }));

  const buttons = el('div', { class: 'row' });
  const movBtn = el('button', { class: 'btn btn-secondary', type: 'button', text: t.inv_movements_btn });
  movBtn.addEventListener('click', () => navigate('inventory/movements'));
  buttons.appendChild(movBtn);

  const locBtn = el('button', { class: 'btn btn-secondary', type: 'button', text: t.inv_locations_btn });
  locBtn.addEventListener('click', () => navigate('inventory/locations'));
  buttons.appendChild(locBtn);
  header.appendChild(buttons);
  wrap.appendChild(header);

  const searchInput = el('input', { class: 'input', type: 'search', placeholder: t.inv_search_ph });
  wrap.appendChild(searchInput);

  const chipsRow = el('div', { class: 'chips' });
  let activeFilter = 'all';
  const chipNodes = {};
  const chipDefs = [
    { id: 'all', label: t.inv_filter_all },
    { id: 'low', label: t.inv_filter_low },
    { id: 'out', label: t.inv_filter_out },
  ];
  for (const c of chipDefs) {
    const b = el('button', {
      class: 'chip' + (c.id === 'all' ? ' chip-active' : ''),
      type: 'button',
      text: c.label,
    });
    b.addEventListener('click', () => {
      activeFilter = c.id;
      for (const k of Object.keys(chipNodes)) {
        chipNodes[k].classList.toggle('chip-active', k === c.id);
      }
      render();
    });
    chipNodes[c.id] = b;
    chipsRow.appendChild(b);
  }
  wrap.appendChild(chipsRow);

  const listBox = el('div', { class: 'inv-list' });
  wrap.appendChild(listBox);

  let rows = [];
  let locations = [];
  let search = '';

  async function reload() {
    listBox.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      listBox.appendChild(el('div', { class: 'skeleton', style: 'height:72px;' }));
    }
    try {
      locations = await listLocations(businessId);
      rows = await listStockOverview(businessId);
      render();
    } catch (err) {
      listBox.innerHTML = '';
      const st = el('div', { class: 'state' }, [
        el('div', { class: 'state-title', text: t.state_error_title }),
        el('div', { class: 'state-text', text: err.message || '' }),
      ]);
      const rt = el('button', { class: 'btn btn-secondary', type: 'button', text: t.action_retry });
      rt.addEventListener('click', reload);
      st.appendChild(rt);
      listBox.appendChild(st);
    }
  }

  function render() {
    listBox.innerHTML = '';
    let filtered = rows;
    if (activeFilter === 'low') {
      filtered = rows.filter((r) => r.track_stock && r.total > 0
        && r.reorder_level > 0 && r.total <= r.reorder_level);
    } else if (activeFilter === 'out') {
      filtered = rows.filter((r) => r.track_stock && r.total <= 0);
    }
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter((r) => (
        r.product_name + ' ' + r.variant_name + ' ' + (r.sku || '')
      ).toLowerCase().includes(s));
    }

    if (!filtered.length) {
      listBox.appendChild(el('div', { class: 'state' }, [
        el('div', { class: 'state-title', text: t.inv_empty_title }),
        el('div', { class: 'state-text', text: t.inv_empty_text }),
      ]));
      return;
    }
    for (const r of filtered) {
      listBox.appendChild(rowCard(r, locations, reload, businessId));
    }
  }

  let tId;
  searchInput.addEventListener('input', () => {
    clearTimeout(tId);
    tId = setTimeout(() => { search = searchInput.value.trim(); render(); }, 200);
  });

  await reload();
}

function rowCard(r, locations, reload, businessId) {
  const card = el('div', { class: 'inv-card' });

  const left = el('div', { class: 'inv-left' });
  left.appendChild(el('div', { class: 'inv-product', text: r.product_name }));
  const sub = r.variant_name === 'Default'
    ? (r.sku ? 'SKU ' + r.sku : t.prod_variant_sing)
    : r.variant_name;
  left.appendChild(el('div', { class: 'inv-variant', text: sub }));
  card.appendChild(left);

  const mid = el('div', { class: 'inv-mid' });
  mid.appendChild(el('div', { class: 'inv-qty', text: number(r.total) }));
  let badgeClass = 'badge';
  let badgeText = t.inv_ok;
  if (r.track_stock) {
    if (r.total <= 0) { badgeClass = 'badge badge-error'; badgeText = t.inv_out; }
    else if (r.reorder_level > 0 && r.total <= r.reorder_level) {
      badgeClass = 'badge badge-warning'; badgeText = t.inv_low;
    } else { badgeClass = 'badge badge-success'; badgeText = t.inv_in_stock; }
  } else {
    badgeClass = 'badge'; badgeText = t.prod_no_track;
  }
  mid.appendChild(el('span', { class: badgeClass, text: badgeText }));
  card.appendChild(mid);

  const actions = el('div', { class: 'inv-actions' });
  const btn = el('button', {
    class: 'btn btn-secondary btn-sm', type: 'button', text: t.inv_adjust_btn,
  });
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    openAdjustModal(r, locations, businessId, reload);
  });
  actions.appendChild(btn);
  card.appendChild(actions);

  return card;
}

function openAdjustModal(row, locations, businessId, onDone) {
  if (!locations.length) {
    toast(t.inv_no_locations, 'error');
    return;
  }
  const locSel = el('select', { class: 'select' });
  for (const l of locations) locSel.appendChild(el('option', { value: l.id, text: l.name }));

  const actionSel = el('select', { class: 'select' });
  actionSel.appendChild(el('option', { value: 'purchase', text: t.inv_receive }));
  actionSel.appendChild(el('option', { value: 'adjustment_in', text: t.inv_add_stock }));
  actionSel.appendChild(el('option', { value: 'adjustment_out', text: t.inv_remove_stock }));
  actionSel.appendChild(el('option', { value: 'damage', text: t.inv_damage }));
  actionSel.appendChild(el('option', { value: 'opening', text: t.inv_opening }));

  const qtyInput = el('input', {
    class: 'input', type: 'number', min: '0.01', step: '0.01', inputmode: 'decimal',
  });
  const noteInput = el('input', {
    class: 'input', type: 'text', placeholder: t.inv_note_ph,
  });

  const body = el('div', { class: 'col' });
  body.appendChild(el('div', {
    class: 'muted',
    text: row.product_name + (row.variant_name === 'Default' ? '' : ' — ' + row.variant_name),
  }));
  body.appendChild(el('div', { class: 'field' }, [
    el('label', { class: 'label', text: t.inv_location }), locSel,
  ]));
  body.appendChild(el('div', { class: 'field' }, [
    el('label', { class: 'label', text: t.inv_action }), actionSel,
  ]));
  body.appendChild(el('div', { class: 'field' }, [
    el('label', { class: 'label', text: t.inv_quantity }), qtyInput,
  ]));
  body.appendChild(el('div', { class: 'field' }, [
    el('label', { class: 'label', text: t.inv_note }), noteInput,
  ]));

  modal({
    title: t.inv_adjust_title,
    body,
    actions: [
      { label: t.action_cancel, class: 'btn-secondary', onClick: (close) => close() },
      { label: t.action_save, class: 'btn-primary', onClick: async (close) => {
        const q = Number(qtyInput.value);
        if (!q || q <= 0) { toast(t.inv_qty_required, 'error'); return; }
        const type = actionSel.value;
        const isNegative = type === 'adjustment_out' || type === 'damage';
        const change = isNegative ? -q : q;
        try {
          await adjustStock(businessId, row.variant_id, locSel.value, change, type,
            noteInput.value.trim() || null);
          close();
          toast(t.inv_saved, 'success');
          if (typeof onDone === 'function') onDone();
        } catch (err) {
          toast(err.message || t.state_error_text, 'error');
        }
      } },
    ],
  });
}
