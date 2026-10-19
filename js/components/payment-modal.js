import { el, toast, modal } from '../ui.js';
import { t } from '../i18n.js';
import { money } from '../format.js';
import { recordPayment, PAYMENT_METHODS } from '../api/sales.js';

export function openRecordPaymentModal(businessId, sale, onDone) {
  const methodSel = el('select', { class: 'select' });
  for (const m of PAYMENT_METHODS) {
    methodSel.appendChild(el('option', { value: m, text: t['pay_method_' + m] }));
  }

  const amountInput = el('input', {
    class: 'input', type: 'number', min: '1', step: '1',
    value: String(Math.round(Number(sale.balance || 0))),
  });
  const refInput = el('input', {
    class: 'input', type: 'text', placeholder: t.sale_payment_ref_ph,
  });

  const body = el('div', { class: 'col' });
  body.appendChild(el('div', {
    class: 'muted',
    text: (sale.sale_number || '') + ' · ' + t.sale_balance + ': ' + money(sale.balance),
  }));
  body.appendChild(el('div', { class: 'field' }, [
    el('label', { class: 'label', text: t.sale_amount }), amountInput,
  ]));
  body.appendChild(el('div', { class: 'field' }, [
    el('label', { class: 'label', text: t.sale_payment_method }), methodSel,
  ]));
  body.appendChild(el('div', { class: 'field' }, [
    el('label', { class: 'label', text: t.sale_payment_ref }), refInput,
  ]));

  modal({
    title: t.sale_record_payment,
    body,
    actions: [
      { label: t.action_cancel, class: 'btn-secondary', onClick: (c) => c() },
      { label: t.action_save, class: 'btn-primary', onClick: async (close) => {
        const amount = Number(amountInput.value);
        if (!amount || amount <= 0) { toast(t.sale_amount_required, 'error'); return; }
        try {
          await recordPayment(businessId, sale.id, amount, methodSel.value, refInput.value.trim() || null);
          close();
          toast(t.sale_payment_recorded, 'success');
          if (typeof onDone === 'function') onDone();
        } catch (err) {
          toast(err.message || t.state_error_text, 'error');
        }
      } },
    ],
  });
}
