import { el, toast, modal } from '../ui.js';
import { navigate } from '../router.js';
import { t } from '../i18n.js';
import { state } from '../state.js';
import {
  createProduct, updateProduct, getProduct,
  listCategories, createCategory,
  uploadProductImage, setProductImage,
} from '../api/products.js';
import { createVariantEditor } from '../components/variant-editor.js';
import { listLocations } from '../api/locations.js';
import { adjustStock } from '../api/stock.js';

export async function openProductModal(opts, onClose) {
  const mode = opts.mode || 'create';
  const businessId = state.currentBusiness && state.currentBusiness.id;
  if (!businessId) {
    toast(t.state_error_title, 'error');
    return null;
  }

  let categories = [];
  let existing = null;
  let locations = [];
  try {
    categories = await listCategories(businessId);
    locations = await listLocations(businessId);
    if (mode === 'edit') existing = await getProduct(opts.id, businessId);
  } catch (err) {
    toast(err.message || t.state_error_text, 'error');
    return null;
  }

  let selectedCategory = (existing && existing.category_id) || '';
  let imageFile = null;
  let previewUrl = (existing && existing.image_url) || null;

  const body = el('div', { class: 'col' });

  // Name
  const nameInput = el('input', {
    class: 'input', type: 'text', value: (existing && existing.name) || '',
  });
  body.appendChild(el('div', { class: 'field' }, [
    el('label', { class: 'label', text: t.prod_name }), nameInput,
  ]));

  // Category row
  const catRow = el('div', { class: 'row' });
  const catSel = el('select', { class: 'select' });
  catSel.appendChild(el('option', { value: '', text: t.prod_no_category }));
  for (const c of categories) catSel.appendChild(el('option', { value: c.id, text: c.name }));
  catSel.value = selectedCategory || '';
  catSel.addEventListener('change', () => { selectedCategory = catSel.value; });
  catRow.appendChild(catSel);

  const newCatBtn = el('button', { class: 'btn btn-secondary', type: 'button', text: '+ ' + t.prod_new_category_short });
  newCatBtn.addEventListener('click', () => {
    const input = el('input', { class: 'input', type: 'text', placeholder: t.prod_category_name_ph });
    modal({
      title: t.prod_new_category,
      body: el('div', { class: 'field' }, [
        el('label', { class: 'label', text: t.prod_category_name }), input,
      ]),
      actions: [
        { label: t.action_cancel, class: 'btn-secondary', onClick: (c) => c() },
        { label: t.action_save, class: 'btn-primary', onClick: async (close) => {
          const n = input.value.trim();
          if (!n) return;
          try {
            const c = await createCategory(businessId, n);
            categories.push(c);
            catSel.appendChild(el('option', { value: c.id, text: c.name }));
            catSel.value = c.id;
            selectedCategory = c.id;
            close();
          } catch (err) { toast(err.message || t.state_error_text, 'error'); }
        } },
      ],
    });
  });
  catRow.appendChild(newCatBtn);
  body.appendChild(el('div', { class: 'field' }, [
    el('label', { class: 'label', text: t.prod_category }), catRow,
  ]));

  // Description
  const descInput = el('textarea', { class: 'textarea', placeholder: t.prod_desc_ph });
  if (existing && existing.description) descInput.value = existing.description;
  body.appendChild(el('div', { class: 'field' }, [
    el('label', { class: 'label', text: t.prod_description }), descInput,
  ]));

  // Tax / Reorder
  const taxInput = el('input', {
    class: 'input', type: 'number', min: '0', step: '0.01',
    value: String((existing && existing.tax_rate) || 0),
  });
  const reorderInput = el('input', {
    class: 'input', type: 'number', min: '0', step: '1',
    value: String((existing && existing.reorder_level) || 0),
  });
  body.appendChild(el('div', { class: 'form-row-2' }, [
    el('div', { class: 'field' }, [el('label', { class: 'label', text: t.prod_tax }), taxInput]),
    el('div', { class: 'field' }, [el('label', { class: 'label', text: t.prod_reorder }), reorderInput]),
  ]));

  // Track stock toggle
  const trackInput = el('input', { type: 'checkbox' });
  trackInput.checked = existing ? !!existing.track_stock : true;
  const trackField = el('div', { class: 'field' });
  trackField.appendChild(el('label', { class: 'label', text: t.prod_track_stock }));
  trackField.appendChild(el('div', { class: 'switch-row' }, [
    el('label', { class: 'switch' }, [trackInput, el('span', { class: 'switch-track' })]),
    el('span', { class: 'muted', text: t.prod_track_stock_hint }),
  ]));
  body.appendChild(trackField);

  // Image
  const imgField = el('div', { class: 'field' });
  imgField.appendChild(el('label', { class: 'label', text: t.prod_image }));
  const preview = el('div', { class: 'img-preview' });
  renderPreview(preview, previewUrl);
  imgField.appendChild(preview);

  const imgInput = document.createElement('input');
  imgInput.type = 'file';
  imgInput.accept = 'image/*';
  imgInput.style.display = 'none';

  const chooseBtn = el('button', { class: 'btn btn-secondary', type: 'button', text: '📁 ' + t.prod_image });
  chooseBtn.addEventListener('click', (e) => { e.preventDefault(); imgInput.click(); });
  imgField.appendChild(chooseBtn);
  imgField.appendChild(imgInput);

  imgInput.addEventListener('change', () => {
    const f = imgInput.files && imgInput.files[0];
    if (!f) return;
    imageFile = f;
    previewUrl = URL.createObjectURL(f);
    renderPreview(preview, previewUrl);
    toast('Image ready — tap Save', 'success');
  });
  body.appendChild(imgField);

  // Variants (with opening stock when creating & track_stock)
  const editor = createVariantEditor(existing ? existing.product_variants : null, {
    showOpeningStock: mode === 'create' && trackInput.checked,
  });
  body.appendChild(editor.node);

  // Opening stock location (only when needed)
  const locField = el('div', { class: 'field' });
  locField.appendChild(el('label', { class: 'label', text: t.inv_location }));
  const locSel = el('select', { class: 'select' });
  for (const l of locations) locSel.appendChild(el('option', { value: l.id, text: l.name }));
  locField.appendChild(locSel);
  const needsLoc = mode === 'create' && trackInput.checked && locations.length > 1;
  locField.style.display = needsLoc ? '' : 'none';
  body.appendChild(locField);

  trackInput.addEventListener('change', () => {
    const show = mode === 'create' && trackInput.checked;
    editor.setShowOpening(show);
    locField.style.display = (show && locations.length > 1) ? '' : 'none';
  });

  // Modal
  modal({
    title: mode === 'create' ? t.prod_new : t.prod_edit,
    body,
    actions: [
      { label: t.action_cancel, class: 'btn-secondary', onClick: (close) => {
        close();
        if (typeof onClose === 'function') onClose();
      } },
      { label: t.action_save, class: 'btn-primary', onClick: async (close) => {
        const name = nameInput.value.trim();
        if (!name) { toast(t.prod_name_required, 'error'); return; }

        try {
          const editorVariants = editor.getVariants();
          const payload = {
            name,
            category_id: selectedCategory || null,
            description: descInput.value.trim() || null,
            tax_rate: Number(taxInput.value) || 0,
            reorder_level: Number(reorderInput.value) || 0,
            track_stock: trackInput.checked,
            variants: editorVariants.map((v) => ({
              id: v.id,
              name: v.name || 'Default',
              sku: v.sku,
              barcode: v.barcode,
              cost_price: v.cost_price,
              selling_price: v.selling_price,
            })),
          };

          let productId;
          if (mode === 'create') {
            const p = await createProduct(businessId, payload);
            productId = p.id;
          } else {
            await updateProduct(opts.id, businessId, payload);
            productId = opts.id;
          }

          // Image upload
          if (imageFile) {
            try {
              const url = await uploadProductImage(businessId, productId, imageFile);
              await setProductImage(businessId, productId, url);
            } catch (err) {
              toast('Image failed: ' + (err.message || ''), 'warning');
            }
          }

          // Opening stock (create mode only)
          if (mode === 'create' && trackInput.checked && locations.length) {
            const locId = locations.length > 1 ? locSel.value : locations[0].id;
            const fresh = await getProduct(productId, businessId);
            const freshVariants = (fresh && fresh.product_variants) || [];
            for (const ev of editorVariants) {
              const qty = Number(ev.opening_qty) || 0;
              if (qty <= 0) continue;
              const match = freshVariants.find((fv) =>
                (fv.name || 'Default') === (ev.name || 'Default'));
              if (!match) continue;
              try {
                await adjustStock(businessId, match.id, locId, qty, 'opening', 'Opening stock');
              } catch (err) {
                toast('Opening stock failed for ' + match.name + ': ' + (err.message || ''), 'warning');
              }
            }
          }

          toast(mode === 'create' ? t.prod_created : t.prod_updated, 'success');
          close();
          if (typeof onClose === 'function') onClose();
        } catch (err) {
          console.error('save failed', err);
          toast(err.message || t.state_error_text, 'error');
        }
      } },
    ],
  });
}

function renderPreview(preview, url) {
  preview.innerHTML = '';
  if (url) {
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    preview.appendChild(img);
  } else {
    preview.appendChild(el('div', { class: 'img-preview-empty', text: '📷' }));
  }
}

// Kept for backward compatibility with the router.
export async function productForm(container, opts) {
  await openProductModal(opts, () => navigate('products'));
  if (!document.querySelector('.modal-backdrop')) {
    navigate('products');
  }
}
