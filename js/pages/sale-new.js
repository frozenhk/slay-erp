import { el, toast, modal } from '../ui.js';
import { navigate } from '../router.js';
import { t } from '../i18n.js';
import { state } from '../state.js';
import { money } from '../format.js';
import { createSale, PAYMENT_METHODS } from '../api/sales.js';
import { listLocations } from '../api/locations.js';
import { listCustomers } from '../api/customers.js';
import { openProductPicker } from '../components/product-picker.js';

const DRAFT_KEY = 'slay-sale-draft';

function isoDayOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + mm + '-' + dd;
}

function saveDraft(draft) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch (e) { /* ignore */ }
}
function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ }
}

function clockIcon() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  for (const d of ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 7v5l3 2']) {
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', d); svg.appendChild(p);
  }
  return svg;
}

export async function saleNew(container) {
  const businessId = state.currentBusiness && state.currentBusiness.id;
  if (!businessId) return;

  const draft = loadDraft();

  const wrap = el('div', { class: 'container col' });
  container.appendChild(wrap);

  const header = el('div', { class: 'row-between' });
  const back = el('button', { class: 'btn btn-ghost', type: 'button', text: '← ' + t.action_back });
  back.addEventListener('click', async () => {
    const ok = await confirmLeave();
    if (ok) { clearDraft(); navigate('sales'); }
  });
  header.appendChild(back);
  header.appendChild(el('h1', { text: t.sale_new }));
  wrap.appendChild(header);

  if (draft && draft.saved_at) {
    const ageMin = Math.round((Date.now() - new Date(draft.saved_at).getTime()) / 60000);
    if (ageMin >= 1 && (draft.cart && draft.cart.length)) {
      const banner = el('div', {
        class: 'card',
        style: 'background:#DBEAFE;border-color:#93C5FD;padding:10px;font-size:13px;color:#1E40AF;',
      });
      banner.appendChild(el('div', { text: 'You are resuming an unfinished sale.' }));
      const reset = el('button', {
        class: 'btn btn-ghost btn-sm',
        type: 'button',
        text: 'Start fresh',
        style: 'color:#1E40AF;padding:2px 6px;margin-top:4px;',
      });
      reset.addEventListener('click', () => {
        clearDraft();
        container.innerHTML = '';
        saleNew(container);
      });
      banner.appendChild(reset);
      wrap.appendChild(banner);
    }
  }

  let locations = [];
  try { locations = await listLocations(businessId); }
  catch (err) { toast(err.message || t.state_error_text, 'error'); }
  if (!locations.length) {
    wrap.appendChild(el('div', { class: 'state' }, [
      el('div', { class: 'state-title', text: t.sale_no_location }),
      el('div', { class: 'state-text', text: t.sale_no_location_hint }),
    ]));
    return;
  }

  const locationSel = el('select', { class: 'select' });
  for (const l of locations) locationSel.appendChild(el('option', { value: l.id, text: l.name }));
  if (draft && draft.location_id && locations.find((l) => l.id === draft.location_id)) {
    locationSel.value = draft.location_id;
  }
  locationSel.addEventListener('change', persist);

  let customer = draft && draft.customer ? draft.customer : null;
  const customerBtn = el('button', {
    class: 'btn btn-secondary btn-block',
    type: 'button',
    text: customer ? customer.name : t.sale_walkin,
  });
  customerBtn.addEventListener('click', () => {
    openCustomerPicker(businessId, (c) => {
      customer = c ? { id: c.id, name: c.name } : null;
      customerBtn.textContent = c ? c.name : t.sale_walkin;
      persist();
    });
  });

  const s1 = el('div', { class: 'card col' });
  s1.appendChild(el('div', { class: 'card-title', text: t.sale_step1 }));
  s1.appendChild(el('div', { class: 'field' }, [
    el('label', { class: 'label', text: t.sale_location }), locationSel,
  ]));
  s1.appendChild(el('div', { class: 'field' }, [
    el('label', { class: 'label', text: t.sale_customer }), customerBtn,
  ]));
  wrap.appendChild(s1);

  const addProdBtn = el('button', { class: 'btn btn-primary btn-block', type: 'button', text: '+ ' + t.sale_add_product });
  const cartBox = el('div', { class: 'sale-cart' });
  const cartEmpty = el('div', { class: 'muted', text: t.sale_cart_empty, style: 'padding:8px 0;' });
  addProdBtn.addEventListener('click', () => openProductPicker(businessId, addToCart));

  const s2 = el('div', { class: 'card col' });
  s2.appendChild(el('div', { class: 'card-title', text: t.sale_step2 }));
  s2.appendChild(addProdBtn);
  s2.appendChild(cartEmpty);
  s2.appendChild(cartBox);
  wrap.appendChild(s2);

  const discountInput = el('input', {
    class: 'input', type: 'number', min: '0', step: '1',
    value: String(draft && draft.discount != null ? draft.discount : 0),
  });
  const deliveryInput = el('input', {
    class: 'input', type: 'number', min: '0', step: '1',
    value: String(draft && draft.delivery_fee != null ? draft.delivery_fee : 0),
  });
  discountInput.addEventListener('input', () => { updateTotals(); persist(); });
  deliveryInput.addEventListener('input', () => { updateTotals(); persist(); });

  const totals = el('div', { class: 'sale-totals' });
  const subEl = el('div', { text: '0' });
  const taxEl = el('div', { text: '0' });
  const totalEl = el('div', { text: '0' });
  totals.appendChild(el('div', { class: 'row-between' }, [el('div', { class: 'muted', text: t.sale_subtotal }), subEl]));
  totals.appendChild(el('div', { class: 'row-between' }, [el('div', { class: 'muted', text: t.sale_tax }), taxEl]));
  totals.appendChild(el('div', { class: 'row-between' }, [
    el('div', { class: 'muted', text: t.sale_discount }),
    el('div', { style: 'width:120px;' }, discountInput),
  ]));
  totals.appendChild(el('div', { class: 'row-between' }, [
    el('div', { class: 'muted', text: t.sale_delivery }),
    el('div', { style: 'width:120px;' }, deliveryInput),
  ]));
  totals.appendChild(el('div', { class: 'row-between total-row' }, [el('div', { text: t.sale_total }), totalEl]));
  wrap.appendChild(totals);

  const methodSel = el('select', { class: 'select' });
  for (const m of PAYMENT_METHODS) methodSel.appendChild(el('option', { value: m, text: t['pay_method_' + m] }));
  if (draft && draft.payment_method) methodSel.value = draft.payment_method;
  methodSel.addEventListener('change', persist);

  const amountInput = el('input', {
    class: 'input', type: 'number', min: '0', step: '1',
    value: String(draft && draft.amount_paid != null ? draft.amount_paid : 0),
  });
  amountInput.addEventListener('input', () => { updateTotals(); persist(); });

  const quickRow = el('div', { class: 'pay-quick' });
  const paidFullBtn = el('button', { class: 'btn btn-secondary btn-sm', type: 'button', text: t.sale_paid_full });
  paidFullBtn.addEventListener('click', () => {
    amountInput.value = String(computeTotal());
    setDueVisible(false);
    persist();
  });
  const creditBtn = el('button', { class: 'btn btn-secondary btn-sm', type: 'button', text: t.sale_credit });
  creditBtn.addEventListener('click', () => {
    amountInput.value = '0';
    setDueVisible(true);
    persist();
  });
  quickRow.appendChild(paidFullBtn);
  quickRow.appendChild(creditBtn);

  const duePanel = el('div', { class: 'due-panel' });

  const dpHead = el('div', { class: 'due-panel-head' });
  dpHead.appendChild(clockIcon());
  dpHead.appendChild(el('span', { text: t.debt_due_date }));
  duePanel.appendChild(dpHead);

  const dueDateInput = el('input', {
    class: 'input', type: 'date',
    value: (draft && draft.due_date) || isoDayOffset(7),
  });
  dueDateInput.addEventListener('change', persist);

  const quickDefs = [
    { id: '3', label: t.debt_quick_3, days: 3 },
    { id: '7', label: t.debt_quick_7, days: 7 },
    { id: '14', label: t.debt_quick_14, days: 14 },
    { id: '30', label: t.debt_quick_30, days: 30 },
  ];

  let dueQuick = (draft && draft.due_quick) || '7';

  const quickRow2 = el('div', { class: 'chips' });
  const quickNodes = {};
  function setDueQuick(id) {
    dueQuick = id;
    for (const k of Object.keys(quickNodes)) {
      quickNodes[k].classList.toggle('chip-active', k === id);
    }
    const def = quickDefs.find((d) => d.id === id);
    if (def) {
      dueDateInput.value = isoDayOffset(def.days);
      dueDateInput.style.display = 'none';
    } else {
      dueDateInput.style.display = '';
      dueDateInput.focus();
    }
    persist();
  }
  for (const d of quickDefs) {
    const b = el('button', {
      class: 'chip' + (d.id === dueQuick ? ' chip-active' : ''),
      type: 'button', text: d.label,
    });
    b.addEventListener('click', () => setDueQuick(d.id));
    quickNodes[d.id] = b;
    quickRow2.appendChild(b);
  }
  const customChip = el('button', { class: 'chip' + (dueQuick === 'custom' ? ' chip-active' : ''), type: 'button', text: t.debt_quick_custom });
  customChip.addEventListener('click', () => setDueQuick('custom'));
  quickNodes['custom'] = customChip;
  quickRow2.appendChild(customChip);

  dueDateInput.style.display = dueQuick === 'custom' ? '' : 'none';

  duePanel.appendChild(el('div', { class: 'due-panel-label', text: t.debt_due_date_hint }));
  duePanel.appendChild(quickRow2);
  duePanel.appendChild(dueDateInput);

  const s4 = el('div', { class: 'card col' });
  s4.appendChild(el('div', { class: 'card-title', text: t.sale_step3 }));
  s4.appendChild(el('div', { class: 'field' }, [el('label', { class: 'label', text: t.sale_payment_method }), methodSel]));
  s4.appendChild(el('div', { class: 'field' }, [el('label', { class: 'label', text: t.sale_amount_paid }), amountInput]));
  s4.appendChild(quickRow);
  s4.appendChild(duePanel);
  wrap.appendChild(s4);

  const completeBtn = el('button', { class: 'btn btn-primary btn-lg btn-block', type: 'button', text: t.sale_complete });
  completeBtn.addEventListener('click', complete);
  wrap.appendChild(completeBtn);

  let cart = (draft && Array.isArray(draft.cart)) ? draft.cart : [];
  let busy = false;

  function setDueVisible(on) {
    if (on) duePanel.classList.add('visible');
    else duePanel.classList.remove('visible');
  }

  function persist() {
    saveDraft({
      location_id: locationSel.value,
      customer: customer,
      cart: cart,
      discount: Number(discountInput.value) || 0,
      delivery_fee: Number(deliveryInput.value) || 0,
      payment_method: methodSel.value,
      amount_paid: Number(amountInput.value) || 0,
      due_date: dueDateInput.value || null,
      due_quick: dueQuick,
      saved_at: new Date().toISOString(),
    });
  }

  // Extra lifecycle saves so nothing is lost even in the worst case.
  function onLifecycleSave() { persist(); }
  window.addEventListener('pagehide', onLifecycleSave);
  window.addEventListener('beforeunload', onLifecycleSave);
  document.addEventListener('visibilitychange', onLifecycleSave);

  function addToCart(v) {
    const existing = cart.find((c) => c.variant_id === v.id);
    if (existing) existing.quantity += 1;
    else {
      cart.push({
        variant_id: v.id,
        product_name: (v.products && v.products.name) || '',
        variant_name: v.name || 'Default',
        tax_rate: Number((v.products && v.products.tax_rate) || 0),
        cost_price: Number(v.cost_price || 0),
        unit_price: Number(v.selling_price || 0),
        quantity: 1,
      });
    }
    renderCart();
    updateTotals();
    persist();
  }

  function renderCart() {
    cartBox.innerHTML = '';
    cartEmpty.style.display = cart.length ? 'none' : '';
    cart.forEach((c, idx) => cartBox.appendChild(cartRow(c, idx)));
  }

  function cartRow(c, idx) {
    const row = el('div', { class: 'cart-item' });
    const left = el('div');
    const name = c.product_name + (c.variant_name && c.variant_name !== 'Default' ? ' — ' + c.variant_name : '');
    left.appendChild(el('div', { class: 'cart-item-name', text: name }));
    left.appendChild(el('div', { class: 'cart-item-meta', text: money(c.unit_price) + ' × ' + c.quantity }));

    const editPrice = el('button', {
      class: 'btn btn-ghost btn-sm', type: 'button', text: t.sale_edit_price,
      style: 'padding:2px 6px;font-size:12px;',
    });
    editPrice.addEventListener('click', () => openPriceEdit(c, () => { renderCart(); updateTotals(); persist(); }));
    left.appendChild(editPrice);

    const right = el('div', { class: 'cart-item-right' });
    const stepper = el('div', { class: 'qty-stepper' });
    const minus = el('button', { type: 'button', text: '−' });
    minus.addEventListener('click', () => {
      c.quantity -= 1;
      if (c.quantity <= 0) cart.splice(idx, 1);
      renderCart(); updateTotals(); persist();
    });
    const qtyInput = el('input', { type: 'number', min: '1', value: String(c.quantity) });
    qtyInput.addEventListener('input', () => {
      const n = Number(qtyInput.value);
      if (n > 0) { c.quantity = n; persist(); }
    });
    qtyInput.addEventListener('change', () => {
      const n = Number(qtyInput.value);
      c.quantity = (!n || n <= 0) ? 1 : n;
      renderCart(); updateTotals(); persist();
    });
    const plus = el('button', { type: 'button', text: '+' });
    plus.addEventListener('click', () => { c.quantity += 1; renderCart(); updateTotals(); persist(); });
    stepper.appendChild(minus);
    stepper.appendChild(qtyInput);
    stepper.appendChild(plus);
    right.appendChild(stepper);
    right.appendChild(el('div', { class: 'prod-price', text: money(c.unit_price * c.quantity) }));

    const rm = el('button', {
      type: 'button', text: t.action_delete,
      style: 'background:transparent;border:none;color:var(--error);font-size:12px;cursor:pointer;padding:0;font-family:inherit;',
    });
    rm.addEventListener('click', () => { cart.splice(idx, 1); renderCart(); updateTotals(); persist(); });
    right.appendChild(rm);

    row.appendChild(left);
    row.appendChild(right);
    return row;
  }

  function openPriceEdit(c, onDone) {
    const input = el('input', { class: 'input', type: 'number', min: '0', step: '1', value: String(c.unit_price) });
    modal({
      title: t.sale_edit_price,
      body: el('div', { class: 'field' }, [el('label', { class: 'label', text: t.sale_unit_price }), input]),
      actions: [
        { label: t.action_cancel, class: 'btn-secondary', onClick: (cl) => cl() },
        { label: t.action_save, class: 'btn-primary', onClick: (cl) => {
          const n = Number(input.value);
          if (isNaN(n) || n < 0) { toast(t.sale_price_invalid, 'error'); return; }
          c.unit_price = n;
          cl();
          if (typeof onDone === 'function') onDone();
        } },
      ],
    });
  }

  function computeSubtotal() {
    let s = 0;
    for (const c of cart) s += c.unit_price * c.quantity;
    return s;
  }
  function computeTax() {
    let tx = 0;
    for (const c of cart) tx += c.unit_price * c.quantity * (c.tax_rate / 100);
    return tx;
  }
  function computeTotal() {
    const sub = computeSubtotal();
    const tax = computeTax();
    const disc = Number(discountInput.value) || 0;
    const del = Number(deliveryInput.value) || 0;
    return Math.max(0, sub - disc + tax + del);
  }

  function updateTotals() {
    const sub = computeSubtotal();
    const tax = computeTax();
    const total = computeTotal();
    subEl.textContent = money(sub);
    taxEl.textContent = money(tax);
    totalEl.textContent = money(total);
    const remaining = total - (Number(amountInput.value) || 0);
    setDueVisible(remaining > 0 && cart.length > 0);
  }

  async function complete() {
    if (busy) return;
    busy = true;
    completeBtn.disabled = true;
    completeBtn.textContent = t.sale_saving;

    try {
      if (!cart.length) { toast(t.sale_cart_empty_msg, 'error'); return; }
      const total = computeTotal();
      const paid = Math.min(Math.max(Number(amountInput.value) || 0, 0), total);
      const items = cart.map((c) => ({
        variant_id: c.variant_id,
        quantity: c.quantity,
        unit_price: c.unit_price,
      }));
      const remaining = total - paid;
      const due = remaining > 0 ? (dueDateInput.value || null) : null;

      const saleId = await createSale(businessId, {
        location_id: locationSel.value,
        customer_id: customer ? customer.id : null,
        items,
        discount: Number(discountInput.value) || 0,
        delivery_fee: Number(deliveryInput.value) || 0,
        channel: 'in_store',
        payment_method: methodSel.value,
        amount_paid: paid,
        due_date: due,
      });

      window.removeEventListener('pagehide', onLifecycleSave);
      window.removeEventListener('beforeunload', onLifecycleSave);
      document.removeEventListener('visibilitychange', onLifecycleSave);

      clearDraft();
      toast(t.sale_created, 'success');
      navigate('sales/view/' + saleId);
    } catch (err) {
      console.error('create_sale failed', err);
      toast((err && err.message) || t.state_error_text, 'error');
      throw err;
    } finally {
      busy = false;
      completeBtn.disabled = false;
      completeBtn.textContent = t.sale_complete;
    }
  }

  renderCart();
  updateTotals();
  persist();
}

function confirmLeave() {
  return new Promise((resolve) => {
    modal({
      title: 'Discard this sale?',
      body: el('div', { text: 'You have an unfinished sale. Leave anyway?' }),
      actions: [
        { label: 'Stay', class: 'btn-secondary', onClick: (c) => { c(); resolve(false); } },
        { label: 'Discard', class: 'btn-danger', onClick: (c) => { c(); resolve(true); } },
      ],
    });
  });
}

async function openCustomerPicker(businessId, onPick) {
  let closeModal = () => {};
  const searchInput = el('input', { class: 'input', type: 'search', placeholder: t.cust_search_ph });
  const listBox = el('div', { style: 'max-height:45vh;overflow:auto;margin-top:8px;' });
  let allCustomers = [];
  const walkin = el('div', { class: 'pick-item' });
  walkin.appendChild(el('div', { class: 'pick-name', text: t.sale_walkin }));
  walkin.addEventListener('click', () => { onPick(null); closeModal(); });

  function render(q) {
    while (listBox.firstChild) listBox.removeChild(listBox.firstChild);
    listBox.appendChild(walkin);
    let rows = allCustomers;
    if (q) {
      const s = q.toLowerCase();
      rows = rows.filter((c) => ((c.name || '') + ' ' + (c.phone || '')).toLowerCase().includes(s));
    }
    if (!rows.length) {
      listBox.appendChild(el('div', { class: 'state' }, [el('div', { class: 'state-text', text: t.sale_no_customers })]));
      return;
    }
    for (const c of rows.slice(0, 40)) {
      const item = el('div', { class: 'pick-item' });
      const l = el('div');
      l.appendChild(el('div', { class: 'pick-name', text: c.name }));
      if (c.phone) l.appendChild(el('div', { class: 'pick-meta', text: c.phone }));
      item.appendChild(l);
      item.addEventListener('click', () => { onPick(c); closeModal(); });
      listBox.appendChild(item);
    }
  }

  let tId;
  searchInput.addEventListener('input', () => {
    clearTimeout(tId);
    tId = setTimeout(() => render(searchInput.value.trim()), 150);
  });

  const body = el('div');
  body.appendChild(searchInput);
  body.appendChild(listBox);

  const m = modal({
    title: t.sale_pick_customer,
    body,
    actions: [{ label: t.action_close, class: 'btn-secondary', onClick: (c) => c() }],
  });
  closeModal = m.close;

  try {
    allCustomers = await listCustomers(businessId, {});
    render('');
  } catch (err) {
    listBox.innerHTML = '';
    listBox.appendChild(el('div', { class: 'state' }, [el('div', { class: 'state-text', text: err.message || '' })]));
  }
  setTimeout(() => searchInput.focus(), 100);
}
