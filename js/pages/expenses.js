import { el, toast, modal, confirmDialog } from '../ui.js';
import { t } from '../i18n.js';
import { state } from '../state.js';
import { money, date, todayISO } from '../format.js';
import { listExpenses, createExpense, deleteExpense, EXPENSE_CATEGORIES } from '../api/expenses.js';
import { PAYMENT_METHODS } from '../api/sales.js';

export async function expensesPage(container) {
  const businessId = state.currentBusiness && state.currentBusiness.id;
  if (!businessId) return;

  const wrap = el('div', { class: 'container col' });
  container.appendChild(wrap);

  const header = el('div', { class: 'row-between' });
  header.appendChild(el('h1', { text: t.exp_title }));
  const addBtn = el('button', { class: 'btn btn-primary', type: 'button', text: '+ ' + t.exp_add });
  addBtn.addEventListener('click', () => openForm(businessId, load));
  header.appendChild(addBtn);
  wrap.appendChild(header);

  const total = el('div', { class: 'exp-total' });
  total.appendChild(el('div', { class: 'exp-total-label', text: t.exp_total }));
  const totalVal = el('div', { class: 'exp-total-value', text: '0' });
  total.appendChild(totalVal);
  wrap.appendChild(total);

  const catSel = el('select', { class: 'select' });
  catSel.appendChild(el('option', { value: '', text: t.exp_all_categories }));
  for (const c of EXPENSE_CATEGORIES) catSel.appendChild(el('option', { value: c, text: c }));
  catSel.addEventListener('change', load);
  wrap.appendChild(catSel);

  const list = el('div', { class: 'exp-list' });
  wrap.appendChild(list);

  async function load() {
    list.innerHTML = '';
    for (let i = 0; i < 3; i++) list.appendChild(el('div', { class: 'skeleton', style: 'height:64px;' }));
    try {
      const rows = await listExpenses(businessId, { category: catSel.value || undefined });
      list.innerHTML = '';
      let sum = 0;
      for (const r of rows) sum += Number(r.amount || 0);
      totalVal.textContent = money(sum);
      if (!rows.length) {
        const st = el('div', { class: 'state' }, [
          el('div', { class: 'state-title', text: t.exp_empty }),
          el('div', { class: 'state-text', text: t.exp_empty_text }),
        ]);
        const b = el('button', { class: 'btn btn-primary', type: 'button', text: '+ ' + t.exp_add });
        b.addEventListener('click', () => openForm(businessId, load));
        st.appendChild(b);
        list.appendChild(st);
        return;
      }
      for (const r of rows) list.appendChild(rowCard(r, businessId, load));
    } catch (err) {
      list.innerHTML = '';
      list.appendChild(el('div', { class: 'state' }, [
        el('div', { class: 'state-title', text: t.state_error_title }),
        el('div', { class: 'state-text', text: err.message || '' }),
      ]));
    }
  }

  await load();
}

function rowCard(r, businessId, onDone) {
  const card = el('div', { class: 'exp-card' });
  const left = el('div');
  left.appendChild(el('div', { class: 'exp-cat', text: r.category }));
  const parts = [date(r.expense_date), t['pay_method_' + r.method] || r.method];
  if (r.description) parts.push(r.description);
  left.appendChild(el('div', { class: 'exp-meta', text: parts.join(' · ') }));
  card.appendChild(left);
  const right = el('div', { class: 'exp-right' });
  right.appendChild(el('div', { class: 'exp-amount', text: '- ' + money(r.amount) }));
  const del = el('button', {
    type: 'button', text: t.action_delete,
    style: 'background:transparent;border:none;color:var(--error);font-size:12px;cursor:pointer;padding:0;font-family:inherit;',
  });
  del.addEventListener('click', async () => {
    const ok = await confirmDialog({ title: t.action_delete, message: t.exp_delete_confirm, danger: true, confirmLabel: t.action_delete });
    if (!ok) return;
    try { await deleteExpense(r.id, businessId); toast(t.exp_deleted, 'success'); onDone(); }
    catch (err) { toast(err.message || t.state_error_text, 'error'); }
  });
  right.appendChild(del);
  card.appendChild(right);
  return card;
}

function openForm(businessId, onDone) {
  const catSel = el('select', { class: 'select' });
  for (const c of EXPENSE_CATEGORIES) catSel.appendChild(el('option', { value: c, text: c }));
  const amountInput = el('input', { class: 'input', type: 'number', min: '0', step: '1', required: 'true' });
  const methodSel = el('select', { class: 'select' });
  for (const m of PAYMENT_METHODS) methodSel.appendChild(el('option', { value: m, text: t['pay_method_' + m] }));
  const dateInput = el('input', { class: 'input', type: 'date', value: todayISO() });
  const descInput = el('input', { class: 'input', type: 'text', placeholder: t.exp_desc_ph });

  const body = el('div', { class: 'col' });
  body.appendChild(el('div', { class: 'field' }, [el('label', { class: 'label', text: t.exp_category }), catSel]));
  body.appendChild(el('div', { class: 'field' }, [el('label', { class: 'label', text: t.exp_amount }), amountInput]));
  body.appendChild(el('div', { class: 'field' }, [el('label', { class: 'label', text: t.exp_method }), methodSel]));
  body.appendChild(el('div', { class: 'field' }, [el('label', { class: 'label', text: t.exp_date }), dateInput]));
  body.appendChild(el('div', { class: 'field' }, [el('label', { class: 'label', text: t.exp_desc }), descInput]));

  modal({
    title: t.exp_add,
    body,
    actions: [
      { label: t.action_cancel, class: 'btn-secondary', onClick: (c) => c() },
      { label: t.action_save, class: 'btn-primary', onClick: async (close) => {
        const amt = Number(amountInput.value);
        if (!amt || amt <= 0) { toast(t.exp_amount_required, 'error'); return; }
        try {
          await createExpense(businessId, {
            category: catSel.value,
            amount: amt,
            method: methodSel.value,
            description: descInput.value.trim(),
            expense_date: dateInput.value || todayISO(),
          });
          close();
          toast(t.exp_created, 'success');
          if (typeof onDone === 'function') onDone();
        } catch (err) { toast(err.message || t.state_error_text, 'error'); }
      } },
    ],
  });
}
