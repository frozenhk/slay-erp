import { el, toast, confirmDialog } from '../ui.js';
import { navigate } from '../router.js';
import { t } from '../i18n.js';
import { state } from '../state.js';
import { dateTime, number } from '../format.js';
import { listMovements, reverseStockMovement } from '../api/stock.js';

const REVERSIBLE = ['opening', 'purchase', 'adjustment_in', 'adjustment_out', 'damage'];

export async function movementsPage(container) {
  const businessId = state.currentBusiness && state.currentBusiness.id;
  if (!businessId) return;

  const wrap = el('div', { class: 'container col' });
  container.appendChild(wrap);

  const header = el('div', { class: 'row-between' });
  const back = el('button', {
    class: 'btn btn-ghost', type: 'button', text: '← ' + t.action_back,
  });
  back.addEventListener('click', () => navigate('inventory'));
  header.appendChild(back);
  header.appendChild(el('h1', { text: t.inv_movements }));
  wrap.appendChild(header);

  const typeSel = el('select', { class: 'select' });
  typeSel.appendChild(el('option', { value: '', text: t.inv_all_types }));
  const types = ['opening', 'purchase', 'sale', 'return_in',
    'adjustment_in', 'adjustment_out', 'damage'];
  for (const ty of types) {
    typeSel.appendChild(el('option', { value: ty, text: t['mv_' + ty] || ty }));
  }
  wrap.appendChild(typeSel);

  const list = el('div', { class: 'prod-list' });
  wrap.appendChild(list);

  async function load() {
    list.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      list.appendChild(el('div', { class: 'skeleton', style: 'height:60px;' }));
    }
    try {
      const rows = await listMovements(businessId, {
        type: typeSel.value || undefined,
        limit: 200,
      });
      list.innerHTML = '';
      if (!rows.length) {
        list.appendChild(el('div', { class: 'state' }, [
          el('div', { class: 'state-title', text: t.inv_no_movements }),
        ]));
        return;
      }
      for (const m of rows) {
        const pv = m.product_variants || {};
        const prodName = (pv.products && pv.products.name) || '';
        const varName = pv.name || '';
        const card = el('div', { class: 'mv-card' });
        const top = el('div', { class: 'row-between' });

        const left = el('div');
        left.appendChild(el('div', {
          class: 'prod-name',
          text: prodName + (varName && varName !== 'Default' ? ' — ' + varName : ''),
        }));
        left.appendChild(el('div', {
          class: 'prod-meta',
          text: dateTime(m.created_at) + (m.note ? ' · ' + m.note : ''),
        }));
        top.appendChild(left);

        const qty = Number(m.quantity);
        top.appendChild(el('div', {
          class: 'mv-qty ' + (qty > 0 ? 'mv-in' : 'mv-out'),
          text: (qty > 0 ? '+' : '') + number(qty),
        }));
        card.appendChild(top);

        const tagsRow = el('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap;' });
        tagsRow.appendChild(el('span', {
          class: 'badge',
          text: t['mv_' + m.movement_type] || m.movement_type,
        }));
        if (m.reversed_at) {
          tagsRow.appendChild(el('span', {
            class: 'badge badge-error',
            text: t.inv_reversed_badge,
          }));
        }
        card.appendChild(tagsRow);

        const canReverse = !m.reversed_at && REVERSIBLE.includes(m.movement_type)
          && ['owner', 'manager', 'warehouse'].includes(state.role);
        if (canReverse) {
          const rev = el('button', {
            class: 'btn btn-secondary btn-sm',
            type: 'button',
            text: t.inv_reverse,
            style: 'margin-top:6px;align-self:flex-start;',
          });
          rev.addEventListener('click', async () => {
            const ok = await confirmDialog({
              title: t.inv_reverse,
              message: t.inv_reverse_confirm,
              confirmLabel: t.inv_reverse,
              danger: true,
            });
            if (!ok) return;
            try {
              await reverseStockMovement(businessId, m.id);
              toast(t.inv_reversed_toast, 'success');
              load();
            } catch (err) {
              toast(err.message || t.state_error_text, 'error');
            }
          });
          card.appendChild(rev);
        }

        list.appendChild(card);
      }
    } catch (err) {
      list.innerHTML = '';
      list.appendChild(el('div', { class: 'state' }, [
        el('div', { class: 'state-text', text: err.message || '' }),
      ]));
    }
  }

  typeSel.addEventListener('change', load);
  await load();
}
