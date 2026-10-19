import { el, toast } from '../ui.js';
import { navigate, parseHash } from '../router.js';
import { t } from '../i18n.js';
import { state } from '../state.js';
import { money } from '../format.js';
import { listProducts, listCategories, getStockByVariant } from '../api/products.js';
import { openProductModal } from './product-form.js';
import { guardFeature } from '../lib/entitlements.js';

export async function productsPage(container, opts) {
  const cfg = opts || {};
  const businessId = state.currentBusiness && state.currentBusiness.id;
  if (!businessId) {
    container.appendChild(el('div', { class: 'state' }, [
      el('div', { class: 'state-title', text: t.state_error_title }),
      el('div', { class: 'state-text', text: t.prod_no_business }),
    ]));
    return;
  }

  const wrap = el('div', { class: 'container col' });
  container.appendChild(wrap);

  const header = el('div', { class: 'row-between' });
  header.appendChild(el('h1', { text: t.nav_products }));
  const addBtn = el('button', { class: 'btn btn-primary', type: 'button', text: t.prod_add });
  
  addBtn.addEventListener('click', async () => {
    const ok = await guardFeature(businessId, 'products', t, toast);
    if (!ok) return;
    openProductModal({ mode: 'create' }, load);
  });
  
  header.appendChild(addBtn);
  wrap.appendChild(header);

  const toolbar = el('div', { class: 'toolbar' });
  const searchInput = el('input', { class: 'input', type: 'search', placeholder: t.prod_search_ph });
  toolbar.appendChild(searchInput);
  const catSel = el('select', { class: 'select' });
  catSel.appendChild(el('option', { value: '', text: t.prod_all_categories }));
  toolbar.appendChild(catSel);
  const archBtn = el('button', { class: 'btn btn-secondary', type: 'button', text: t.prod_show_archived });
  toolbar.appendChild(archBtn);
  wrap.appendChild(toolbar);

  const listBox = el('div', { class: 'prod-list' });
  wrap.appendChild(listBox);

  try {
    const cats = await listCategories(businessId);
    for (const c of cats) catSel.appendChild(el('option', { value: c.id, text: c.name }));
  } catch (err) { console.error('categories', err); }

  const filter = { search: '', categoryId: '', includeArchived: false };

  async function load() {
    listBox.innerHTML = '';
    for (let i = 0; i < 3; i++) listBox.appendChild(el('div', { class: 'skeleton', style: 'height:80px;' }));
    try {
      const products = await listProducts(businessId, filter);
      const variantIds = [];
      for (const p of products) for (const v of (p.product_variants || [])) variantIds.push(v.id);
      const stockMap = await getStockByVariant(businessId, variantIds);
      listBox.innerHTML = '';

      if (!products.length) {
        const st = el('div', { class: 'state' }, [
          el('div', { class: 'state-title', text: t.prod_empty_title }),
          el('div', { class: 'state-text', text: t.prod_empty_text }),
        ]);
        const b = el('button', { class: 'btn btn-primary', type: 'button', text: t.prod_add });
        b.addEventListener('click', async () => {
          const ok = await guardFeature(businessId, 'products', t, toast);
          if (!ok) return;
          openProductModal({ mode: 'create' }, load);
        });
        st.appendChild(b);
        listBox.appendChild(st);
        return;
      }
      for (const p of products) listBox.appendChild(productCard(p, stockMap, load));
    } catch (err) {
      listBox.innerHTML = '';
      const st = el('div', { class: 'state' }, [
        el('div', { class: 'state-title', text: t.state_error_title }),
        el('div', { class: 'state-text', text: err.message || t.state_error_text }),
      ]);
      const rt = el('button', { class: 'btn btn-secondary', type: 'button', text: t.action_retry });
      rt.addEventListener('click', load);
      st.appendChild(rt);
      listBox.appendChild(st);
    }
  }

  let tId;
  searchInput.addEventListener('input', () => {
    clearTimeout(tId);
    tId = setTimeout(() => { filter.search = searchInput.value.trim(); load(); }, 250);
  });
  catSel.addEventListener('change', () => { filter.categoryId = catSel.value; load(); });
  archBtn.addEventListener('click', () => {
    filter.includeArchived = !filter.includeArchived;
    archBtn.textContent = filter.includeArchived ? t.prod_hide_archived : t.prod_show_archived;
    load();
  });

  await load();

  if (!cfg.skipAutoModal) {
    const { params } = parseHash();
    if (params && params[0] === 'new') {
      const ok = await guardFeature(businessId, 'products', t, toast);
      if (ok) openProductModal({ mode: 'create' }, () => navigate('products'));
      else navigate('products');
    } else if (params && params[0] === 'edit' && params[1]) {
      openProductModal({ mode: 'edit', id: params[1] }, () => navigate('products'));
    }
  }
}

function productCard(p, stockMap, reload) {
  const variants = (p.product_variants || []).filter((v) => v.is_active);
  let totalStock = 0, pMin = null, pMax = null;
  for (const v of variants) {
    totalStock += Number(stockMap[v.id] || 0);
    const price = Number(v.selling_price || 0);
    if (pMin === null || price < pMin) pMin = price;
    if (pMax === null || price > pMax) pMax = price;
  }

  const card = el('div', { class: 'prod-card' });

  const thumb = el('div', { class: 'prod-thumb' });
  if (p.image_url) {
    const img = document.createElement('img');
    img.src = p.image_url;
    img.alt = '';
    thumb.appendChild(img);
  } else {
    thumb.textContent = (p.name || '?').charAt(0).toUpperCase();
  }
  card.appendChild(thumb);

  const info = el('div', { class: 'prod-info' });
  info.appendChild(el('div', { class: 'prod-name', text: p.name }));
  const meta = [];
  if (p.category && p.category.name) meta.push(p.category.name);
  meta.push(variants.length + ' ' + (variants.length === 1 ? t.prod_variant_sing : t.prod_variant_plur));
  info.appendChild(el('div', { class: 'prod-meta', text: meta.join(' · ') }));
  card.appendChild(info);

  const right = el('div', { class: 'prod-right' });
  if (pMin !== null) {
    const priceText = (pMin === pMax) ? money(pMin) : money(pMin) + ' – ' + money(pMax);
    right.appendChild(el('div', { class: 'prod-price', text: priceText }));
  }
  const badge = el('div', {});
  if (p.track_stock) {
    if (totalStock <= 0) badge.className = 'badge badge-error';
    else if (Number(p.reorder_level || 0) > 0 && totalStock <= Number(p.reorder_level)) badge.className = 'badge badge-warning';
    else badge.className = 'badge badge-success';
    badge.textContent = totalStock + ' ' + t.prod_in_stock;
  } else {
    badge.className = 'badge';
    badge.textContent = t.prod_no_track;
  }
  right.appendChild(badge);
  card.appendChild(right);

  card.addEventListener('click', () => {
    openProductModal({ mode: 'edit', id: p.id }, reload);
  });
  return card;
}
