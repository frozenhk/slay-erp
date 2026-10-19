import { el, toast } from '../ui.js';
import { navigate } from '../router.js';
import { t } from '../i18n.js';
import { state } from '../state.js';
import {
  createCustomer, updateCustomer, getCustomer, CUSTOMER_TYPES,
} from '../api/customers.js';

export async function customerForm(container, opts) {
  const mode = opts.mode || 'create';
  const businessId = state.currentBusiness && state.currentBusiness.id;
  if (!businessId) return;

  const wrap = el('div', { class: 'container col' });
  container.appendChild(wrap);

  const header = el('div', { class: 'row-between' });
  const back = el('button', {
    class: 'btn btn-ghost', type: 'button', text: '← ' + t.action_back,
  });
  back.addEventListener('click', () => {
    if (mode === 'edit') navigate('customers/view/' + opts.id);
    else navigate('customers');
  });
  header.appendChild(back);
  header.appendChild(el('h1', { text: mode === 'create' ? t.cust_new : t.cust_edit }));
  wrap.appendChild(header);

  let existing = null;
  if (mode === 'edit') {
    try { existing = await getCustomer(opts.id, businessId); }
    catch (err) {
      container.appendChild(el('div', { class: 'state' }, [
        el('div', { class: 'state-text', text: err.message || '' }),
      ]));
      return;
    }
  }

  const form = el('form', { class: 'col' });

  const nameInput = el('input', {
    class: 'input', type: 'text', required: 'true',
    value: (existing && existing.name) || '',
  });
  form.appendChild(el('div', { class: 'field' }, [
    el('label', { class: 'label', text: t.cust_name }), nameInput,
  ]));

  const phoneInput = el('input', {
    class: 'input', type: 'tel', inputmode: 'tel',
    value: (existing && existing.phone) || '',
    placeholder: '+237 6XX XXX XXX',
  });
  form.appendChild(el('div', { class: 'field' }, [
    el('label', { class: 'label', text: t.cust_phone }), phoneInput,
  ]));

  const emailInput = el('input', {
    class: 'input', type: 'email', inputmode: 'email',
    value: (existing && existing.email) || '',
  });
  form.appendChild(el('div', { class: 'field' }, [
    el('label', { class: 'label', text: t.cust_email }), emailInput,
  ]));

  const typeSel = el('select', { class: 'select' });
  for (const ty of CUSTOMER_TYPES) {
    typeSel.appendChild(el('option', { value: ty, text: t['cust_type_' + ty] }));
  }
  if (existing && existing.customer_type) typeSel.value = existing.customer_type;
  form.appendChild(el('div', { class: 'field' }, [
    el('label', { class: 'label', text: t.cust_type }), typeSel,
  ]));

  const cityInput = el('input', {
    class: 'input', type: 'text', value: (existing && existing.city) || '',
  });
  form.appendChild(el('div', { class: 'field' }, [
    el('label', { class: 'label', text: t.cust_city }), cityInput,
  ]));

  const addrInput = el('input', {
    class: 'input', type: 'text', value: (existing && existing.address) || '',
  });
  form.appendChild(el('div', { class: 'field' }, [
    el('label', { class: 'label', text: t.cust_address }), addrInput,
  ]));

  const notesInput = el('textarea', {
    class: 'textarea', placeholder: t.cust_notes_ph,
  });
  if (existing && existing.notes) notesInput.value = existing.notes;
  form.appendChild(el('div', { class: 'field' }, [
    el('label', { class: 'label', text: t.cust_notes }), notesInput,
  ]));

  const submit = el('button', {
    class: 'btn btn-primary btn-lg btn-block', type: 'submit', text: t.action_save,
  });
  form.appendChild(submit);
  wrap.appendChild(form);

  let busy = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    const name = nameInput.value.trim();
    if (!name) { toast(t.cust_name_required, 'error'); return; }

    busy = true;
    submit.disabled = true;
    submit.textContent = t.action_saving;

    const payload = {
      name,
      phone: phoneInput.value.trim(),
      email: emailInput.value.trim(),
      customer_type: typeSel.value,
      city: cityInput.value.trim(),
      address: addrInput.value.trim(),
      notes: notesInput.value.trim(),
    };

    try {
      if (mode === 'create') {
        const row = await createCustomer(businessId, payload);
        toast(t.cust_created, 'success');
        navigate('customers/view/' + row.id);
      } else {
        await updateCustomer(opts.id, businessId, payload);
        toast(t.cust_updated, 'success');
        navigate('customers/view/' + opts.id);
      }
    } catch (err) {
      toast(err.message || t.state_error_text, 'error');
      busy = false;
      submit.disabled = false;
      submit.textContent = t.action_save;
    }
  });
}
