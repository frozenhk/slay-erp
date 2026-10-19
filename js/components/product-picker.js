import { el, modal } from '../ui.js';
import { t } from '../i18n.js';
import { money } from '../format.js';
import { searchVariants } from '../api/sales.js';

export function openProductPicker(businessId, onPick) {
  let closeModal = () => {};

  const searchInput = el('input', {
    class: 'input', type: 'search', placeholder: t.sale_search_ph,
  });
  const listBox = el('div', {
    style: 'max-height:55vh; overflow:auto; margin-top:8px;',
  });

  const body = el('div');
  body.appendChild(searchInput);
  body.appendChild(listBox);

  let timer;
  async function run(q) {
    listBox.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      listBox.appendChild(el('div', { class: 'skeleton', style: 'height:56px;margin-bottom:6px;' }));
    }
    try {
      const rows = await searchVariants(businessId, q);
      listBox.innerHTML = '';
      if (!rows.length) {
        listBox.appendChild(el('div', { class: 'state' }, [
          el('div', { class: 'state-text', text: t.sale_no_products }),
        ]));
        return;
      }
      for (const v of rows) listBox.appendChild(pickItem(v, onPick, () => closeModal()));
    } catch (err) {
      listBox.innerHTML = '';
      listBox.appendChild(el('div', { class: 'state' }, [
        el('div', { class: 'state-text', text: err.message || '' }),
      ]));
    }
  }

  searchInput.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => run(searchInput.value), 200);
  });

  const m = modal({
    title: t.sale_pick_product,
    body,
    actions: [{ label: t.action_close, class: 'btn-secondary', onClick: (c) => c() }],
  });
  closeModal = m.close;

  run('');
  setTimeout(() => searchInput.focus(), 100);
}

function pickItem(v, onPick, closeFn) {
  const prodName = (v.products && v.products.name) || '';
  const varName = v.name && v.name !== 'Default' ? ' — ' + v.name : '';
  const row = el('div', { class: 'pick-item' });

  const left = el('div');
  left.appendChild(el('div', { class: 'pick-name', text: prodName + varName }));
  const metaParts = [];
  if (v.sku) metaParts.push('SKU ' + v.sku);
  if (v.products && v.products.track_stock) metaParts.push(t.sale_tracked);
  left.appendChild(el('div', { class: 'pick-meta', text: metaParts.join(' · ') }));
  row.appendChild(left);

  row.appendChild(el('div', { class: 'pick-name', text: money(v.selling_price) }));

  row.addEventListener('click', () => {
    if (typeof onPick === 'function') onPick(v);
    closeFn();
  });
  return row;
}
