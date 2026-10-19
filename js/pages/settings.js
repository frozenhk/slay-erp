import { el, toast } from '../ui.js';
import { navigate } from '../router.js';
import { t, getLang, setLang, listLangs } from '../i18n.js';
import { state } from '../state.js';
import { canEditBusiness } from '../permissions.js';
import { updateBusiness, uploadLogo } from '../api/businesses.js';

const TYPES = ['Clothing', 'Supermarket', 'Electronics', 'Beauty',
  'Restaurant', 'Wholesale / Distribution', 'Other'];
const CURRENCIES = ['XAF', 'XOF', 'USD', 'EUR', 'GBP'];

export async function settingsPage(container) {
  const biz = state.currentBusiness;
  const businessId = biz && biz.id;
  if (!businessId) return;

  const wrap = el('div', { class: 'container col' });
  container.appendChild(wrap);

  const header = el('div', { class: 'row-between' });
  const back = el('button', { class: 'btn btn-ghost', type: 'button', text: '← ' + t.action_back });
  back.addEventListener('click', () => navigate('more'));
  header.appendChild(back);
  header.appendChild(el('h1', { text: t.settings_title }));
  wrap.appendChild(header);

  // Language section — shown to EVERYONE, regardless of role
  wrap.appendChild(buildLanguageCard());

  if (!canEditBusiness(state.role)) {
    wrap.appendChild(el('div', { class: 'state' }, [
      el('div', { class: 'state-title', text: t.settings_no_access }),
      el('div', { class: 'state-text', text: t.settings_no_access_text }),
    ]));
    return;
  }

  const form = el('form', { class: 'col' });

  const logoRow = el('div', { class: 'settings-logo-row' });
  const logoBox = el('div', { class: 'settings-logo' });
  if (biz.logo_url) {
    const img = document.createElement('img');
    img.src = biz.logo_url;
    img.alt = '';
    logoBox.appendChild(img);
  } else {
    logoBox.textContent = (biz.name || 'S').charAt(0).toUpperCase();
  }
  logoRow.appendChild(logoBox);
  const logoRight = el('div', { class: 'col', style: 'gap:6px;flex:1;' });
  const logoInput = el('input', { class: 'input', type: 'file', accept: 'image/*' });
  logoRight.appendChild(logoInput);
  logoRight.appendChild(el('div', { class: 'hint', text: t.settings_logo_hint }));
  logoRow.appendChild(logoRight);
  form.appendChild(logoRow);

  const nameInput = el('input', { class: 'input', type: 'text', value: biz.name || '', required: 'true' });
  form.appendChild(el('div', { class: 'field' }, [el('label', { class: 'label', text: t.biz_name_label }), nameInput]));

  const typeSel = el('select', { class: 'select' });
  for (const ty of TYPES) typeSel.appendChild(el('option', { value: ty, text: ty }));
  if (biz.business_type) typeSel.value = biz.business_type;
  form.appendChild(el('div', { class: 'field' }, [el('label', { class: 'label', text: t.biz_type_label }), typeSel]));

  const countryInput = el('input', { class: 'input', type: 'text', value: biz.country || '' });
  form.appendChild(el('div', { class: 'field' }, [el('label', { class: 'label', text: t.biz_country_label }), countryInput]));

  const currSel = el('select', { class: 'select' });
  for (const c of CURRENCIES) currSel.appendChild(el('option', { value: c, text: c }));
  currSel.value = biz.currency || 'XAF';
  form.appendChild(el('div', { class: 'field' }, [el('label', { class: 'label', text: t.biz_currency_label }), currSel]));

  const phoneInput = el('input', { class: 'input', type: 'tel', value: biz.phone || '' });
  form.appendChild(el('div', { class: 'field' }, [el('label', { class: 'label', text: t.cust_phone }), phoneInput]));

  const emailInput = el('input', { class: 'input', type: 'email', value: biz.email || '' });
  form.appendChild(el('div', { class: 'field' }, [el('label', { class: 'label', text: t.cust_email }), emailInput]));

  const addrInput = el('input', { class: 'input', type: 'text', value: biz.address || '' });
  form.appendChild(el('div', { class: 'field' }, [el('label', { class: 'label', text: t.cust_address }), addrInput]));

  form.appendChild(el('h2', { text: t.settings_invoice, style: 'margin-top:12px;' }));

  const prefixInput = el('input', { class: 'input', type: 'text', value: biz.invoice_prefix || 'INV' });
  form.appendChild(el('div', { class: 'field' }, [
    el('label', { class: 'label', text: t.settings_invoice_prefix }),
    prefixInput,
    el('div', { class: 'hint', text: t.settings_invoice_prefix_hint }),
  ]));

  const footerInput = el('textarea', { class: 'textarea' });
  footerInput.value = biz.invoice_footer || '';
  form.appendChild(el('div', { class: 'field' }, [
    el('label', { class: 'label', text: t.settings_invoice_footer }),
    footerInput,
  ]));

  const submitBtn = el('button', { class: 'btn btn-primary btn-lg btn-block', type: 'submit', text: t.action_save });
  form.appendChild(submitBtn);
  wrap.appendChild(form);

  let busy = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    const name = nameInput.value.trim();
    if (!name) { toast(t.biz_name_required, 'error'); return; }

    busy = true;
    submitBtn.disabled = true;
    submitBtn.textContent = t.action_saving;

    try {
      const patch = {
        name,
        business_type: typeSel.value,
        country: countryInput.value.trim() || null,
        currency: currSel.value,
        phone: phoneInput.value.trim() || null,
        email: emailInput.value.trim() || null,
        address: addrInput.value.trim() || null,
        invoice_prefix: prefixInput.value.trim() || 'INV',
        invoice_footer: footerInput.value.trim() || null,
      };

      const logoFile = logoInput.files && logoInput.files[0];
      if (logoFile) {
        try {
          const url = await uploadLogo(businessId, logoFile);
          patch.logo_url = url;
        } catch (err) { toast(t.prod_image_failed, 'warning'); }
      }

      const updated = await updateBusiness(businessId, patch);
      Object.assign(state.currentBusiness, updated);
      toast(t.settings_saved, 'success');
    } catch (err) {
      toast(err.message || t.state_error_text, 'error');
    } finally {
      busy = false;
      submitBtn.disabled = false;
      submitBtn.textContent = t.action_save;
    }
  });
}

function buildLanguageCard() {
  const card = el('div', { class: 'card' });
  card.appendChild(el('div', { class: 'card-title', text: t.settings_language }));
  card.appendChild(el('div', { class: 'hint', text: t.settings_language_hint, style: 'margin-bottom:10px;' }));

  const row = el('div', { class: 'row' });
  const current = getLang();
  const choices = [
    { code: 'en', label: t.lang_en },
    { code: 'fr', label: t.lang_fr },
  ];
  for (const c of choices) {
    const active = current === c.code;
    const b = el('button', {
      type: 'button',
      text: c.label,
      class: active ? 'btn btn-primary' : 'btn btn-secondary',
    });
    if (!active) {
      b.addEventListener('click', () => setLang(c.code));
    }
    row.appendChild(b);
  }
  card.appendChild(row);
  return card;
}
