import { el } from '../ui.js';
import { t } from '../i18n.js';

export function createVariantEditor(initialVariants, opts) {
  const config = opts || {};
  let showOpening = !!config.showOpeningStock;

  const variants = (initialVariants && initialVariants.length)
    ? initialVariants.map((v) => ({ ...v, opening_qty: v.opening_qty || 0 }))
    : [{ name: 'Default', sku: '', barcode: '', cost_price: 0, selling_price: 0, opening_qty: 0 }];

  const list = el('div', { class: 'variant-list' });

  function render() {
    list.innerHTML = '';
    variants.forEach((v, idx) => list.appendChild(variantCard(v, idx)));
  }

  function variantCard(v, idx) {
    const card = el('div', { class: 'variant-card' });

    const head = el('div', { class: 'variant-head' });
    head.appendChild(el('div', { class: 'muted', text: t.prod_variant + ' ' + (idx + 1) }));
    if (variants.length > 1) {
      const rm = el('button', { class: 'variant-remove', type: 'button', text: t.action_delete });
      rm.addEventListener('click', () => { variants.splice(idx, 1); render(); });
      head.appendChild(rm);
    }
    card.appendChild(head);

    const nameI = el('input', {
      class: 'input', type: 'text',
      placeholder: t.prod_variant_name_ph, value: v.name || '',
    });
    nameI.addEventListener('input', () => { v.name = nameI.value; });
    card.appendChild(el('div', { class: 'field' }, [
      el('label', { class: 'label', text: t.prod_variant_name }), nameI,
    ]));

    const skuI = el('input', { class: 'input', type: 'text', value: v.sku || '' });
    skuI.addEventListener('input', () => { v.sku = skuI.value; });
    const barcodeI = el('input', { class: 'input', type: 'text', value: v.barcode || '' });
    barcodeI.addEventListener('input', () => { v.barcode = barcodeI.value; });
    card.appendChild(el('div', { class: 'form-row-2' }, [
      el('div', { class: 'field' }, [el('label', { class: 'label', text: t.prod_sku }), skuI]),
      el('div', { class: 'field' }, [el('label', { class: 'label', text: t.prod_barcode }), barcodeI]),
    ]));

    const costI = el('input', {
      class: 'input', type: 'number', min: '0', step: '0.01',
      value: String(v.cost_price || 0),
    });
    costI.addEventListener('input', () => { v.cost_price = costI.value; });
    const priceI = el('input', {
      class: 'input', type: 'number', min: '0', step: '0.01',
      value: String(v.selling_price || 0),
    });
    priceI.addEventListener('input', () => { v.selling_price = priceI.value; });
    card.appendChild(el('div', { class: 'form-row-2' }, [
      el('div', { class: 'field' }, [el('label', { class: 'label', text: t.prod_cost }), costI]),
      el('div', { class: 'field' }, [el('label', { class: 'label', text: t.prod_price }), priceI]),
    ]));

    if (showOpening) {
      const qtyI = el('input', {
        class: 'input', type: 'number', min: '0', step: '1',
        value: String(v.opening_qty || 0),
      });
      qtyI.addEventListener('input', () => { v.opening_qty = qtyI.value; });
      card.appendChild(el('div', { class: 'field' }, [
        el('label', { class: 'label', text: t.prod_opening_stock }),
        qtyI,
        el('div', { class: 'hint', text: t.prod_opening_stock_hint }),
      ]));
    }

    return card;
  }

  const wrap = el('div', { class: 'card' });
  wrap.appendChild(el('div', { class: 'card-title', text: t.prod_variants }));
  wrap.appendChild(list);

  const addBtn = el('button', {
    class: 'btn btn-secondary', type: 'button',
    text: '+ ' + t.prod_add_variant,
  });
  addBtn.addEventListener('click', () => {
    variants.push({ name: '', sku: '', barcode: '', cost_price: 0, selling_price: 0, opening_qty: 0 });
    render();
  });
  wrap.appendChild(addBtn);

  render();

  return {
    node: wrap,
    getVariants() { return variants; },
    setShowOpening(bool) {
      showOpening = !!bool;
      render();
    },
  };
}
