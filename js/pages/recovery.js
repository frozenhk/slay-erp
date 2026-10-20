import { el, toast } from '../ui.js';
import { navigate } from '../router.js';
import { state } from '../state.js';
import { money, date } from '../format.js';
import { getRecoveryCandidates, createRecoveryRecord, listRecoveryRecords } from '../api/recovery.js';

export async function recoveryPage(container) {
  const businessId = state.currentBusiness.id;
  const wrap = el('div', { class: 'container col' });
  container.appendChild(wrap);

  wrap.appendChild(el('h1', { text: 'Customer Recovery' }));

  const candidates = await getRecoveryCandidates(businessId, 30);
  const activeRecords = await listRecoveryRecords(businessId);

  let potentialProfit = 0;
  candidates.forEach(c => {
    potentialProfit += c.recovery_reason === 'unpaid' ? Number(c.outstanding_balance) : Number(c.total_spent);
  });

  const grid = el('div', { class: 'dash-grid' });
  grid.appendChild(el('div', { class: 'metric-card' }, [
    el('div', { class: 'metric-value', text: String(candidates.length) }),
    el('div', { class: 'metric-label', text: 'Customers to Recover' })
  ]));
  grid.appendChild(el('div', { class: 'metric-card' }, [
    el('div', { class: 'metric-value', text: money(potentialProfit) }),
    el('div', { class: 'metric-label', text: 'Potential Profit' })
  ]));
  wrap.appendChild(grid);

  if (activeRecords.length) {
    wrap.appendChild(el('h2', { text: 'Active Follow-ups', style: 'margin-top:20px;' }));
    const list = el('div', { class: 'prod-list' });
    for (const r of activeRecords) {
      const card = el('div', { class: 'card', style: 'cursor:pointer;' });
      card.appendChild(el('div', { class: 'prod-name', text: r.customers.name }));
      card.appendChild(el('div', { class: 'prod-meta', text: 'Status: ' + r.status.replace('_', ' ').toUpperCase() + ' · Reason: ' + r.reason }));
      card.onclick = () => navigate('recovery/record/' + r.id);
      list.appendChild(card);
    }
    wrap.appendChild(list);
  }

  wrap.appendChild(el('h2', { text: 'Needs Attention (Inactive 30+ days)', style: 'margin-top:20px;' }));
  const candList = el('div', { class: 'prod-list' });
  
  if (!candidates.length) {
    candList.appendChild(el('div', { class: 'state' }, [el('div', { class: 'state-title', text: 'All caught up!' })]));
  }

  for (const c of candidates) {
    const card = el('div', { class: 'card' });
    const row = el('div', { class: 'row-between' });
    const info = el('div');
    info.appendChild(el('div', { class: 'prod-name', text: c.customer_name }));
    info.appendChild(el('div', { class: 'prod-meta', text: 'Last buy: ' + (c.last_purchase_date ? date(c.last_purchase_date) : 'Never') }));
    
    const right = el('div', { style: 'text-align:right;' });
    right.appendChild(el('div', { style: 'font-weight:700;color:var(--primary);', text: money(c.recovery_reason === 'unpaid' ? c.outstanding_balance : c.total_spent) }));
    right.appendChild(el('div', { class: 'prod-meta', text: c.recovery_reason === 'unpaid' ? 'Unpaid Balance' : 'Total Spent' }));

    row.appendChild(info); row.appendChild(right);
    card.appendChild(row);

    const btn = el('button', { class: 'btn btn-secondary btn-sm', style: 'margin-top:10px;', text: 'Start Recovery' });
    btn.onclick = async () => {
      try {
        await createRecoveryRecord(businessId, c.customer_id, c.recovery_reason);
        toast('Record created', 'success');
        container.innerHTML = ''; recoveryPage(container);
      } catch(e) { toast(e.message, 'error'); }
    };
    card.appendChild(btn);
    candList.appendChild(card);
  }
  wrap.appendChild(candList);
}
