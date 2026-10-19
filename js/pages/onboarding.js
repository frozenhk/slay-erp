import { el, toast } from '../ui.js';
import { navigate } from '../router.js';
import { t } from '../i18n.js';
import { supabase } from '../supabase.js';
import { createBusiness, uploadLogo } from '../api/businesses.js';
import { loadUserData } from '../auth.js';
import { state, setCurrentBusiness } from '../state.js';

const TYPES = ['Clothing', 'Supermarket', 'Electronics', 'Beauty',
  'Restaurant', 'Wholesale / Distribution', 'Other'];
const CURRENCIES = ['XAF', 'XOF', 'USD', 'EUR', 'GBP'];

export function onboarding(container) {
  const wrap = el('div', { class: 'auth-wrap' });
  const card = el('div', { class: 'auth-card' });

  const brand = el('div', { class: 'auth-brand' });
  brand.appendChild(el('img', { src: './assets/logo.svg', alt: '', width: 36, height: 36 }));
  brand.appendChild(el('h1', { text: t.app_name }));
  card.appendChild(brand);

  card.appendChild(el('h2', { text: t.biz_welcome, style: 'text-align:center;' }));
  card.appendChild(el('div', { class: 'auth-sub', text: t.biz_welcome_text }));

  const form = el('form', { class: 'auth-form' });

  const nameInput = el('input', {
    class: 'input', type: 'text', required: 'true',
    placeholder: 'e.g. Ada Fashion House',
  });
  form.appendChild(el('div', { class: 'field' }, [
    el('label', { class: 'label', text: t.biz_name_label }), nameInput,
  ]));

  const typeSel = el('select', { class: 'select' });
  for (const bt of TYPES) typeSel.appendChild(el('option', { value: bt, text: bt }));
  form.appendChild(el('div', { class: 'field' }, [
    el('label', { class: 'label', text: t.biz_type_label }), typeSel,
  ]));

  const countryInput = el('input', {
    class: 'input', type: 'text', value: 'Cameroon',
  });
  form.appendChild(el('div', { class: 'field' }, [
    el('label', { class: 'label', text: t.biz_country_label }), countryInput,
  ]));

  const currSel = el('select', { class: 'select' });
  for (const c of CURRENCIES) currSel.appendChild(el('option', { value: c, text: c }));
  form.appendChild(el('div', { class: 'field' }, [
    el('label', { class: 'label', text: t.biz_currency_label }), currSel,
  ]));

  const logoInput = el('input', { class: 'input', type: 'file', accept: 'image/*' });
  form.appendChild(el('div', { class: 'field' }, [
    el('label', { class: 'label', text: t.biz_logo_label }),
    logoInput,
    el('div', { class: 'hint', text: t.biz_logo_hint }),
  ]));

  const submitBtn = el('button', {
    class: 'btn btn-primary btn-lg btn-block', type: 'submit', text: t.biz_create_btn,
  });
  form.appendChild(submitBtn);
  card.appendChild(form);
  wrap.appendChild(card);
  container.appendChild(wrap);

  let busy = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    const name = nameInput.value.trim();
    if (!name) { toast(t.biz_name_required, 'error'); return; }

    busy = true;
    submitBtn.disabled = true;
    submitBtn.textContent = t.biz_creating_btn;

    try {
      const businessId = await createBusiness({
        name,
        type: typeSel.value,
        country: countryInput.value.trim(),
        currency: currSel.value,
      });

      const file = logoInput.files && logoInput.files[0];
      if (file) {
        try {
          const url = await uploadLogo(businessId, file);
          await supabase.from('businesses').update({ logo_url: url }).eq('id', businessId);
        } catch (upErr) {
          toast(t.biz_logo_failed, 'warning');
        }
      }

      await loadUserData();
      const m = (state.businesses || []).find((x) => x.businessId === businessId);
      if (m) setCurrentBusiness(m.business, m.role);

      toast(t.biz_created_toast, 'success');
      navigate('dashboard');
    } catch (err) {
      toast(err.message || t.biz_create_failed, 'error');
      busy = false;
      submitBtn.disabled = false;
      submitBtn.textContent = t.biz_create_btn;
    }
  });
}
