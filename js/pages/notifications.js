import { el, toast } from '../ui.js';
import { navigate } from '../router.js';
import { t } from '../i18n.js';
import { state } from '../state.js';
import { dateTime } from '../format.js';
import {
  getNotifications, markAllRead, clearNotifications,
  requestBrowserPermission, scanForDebtReminders,
} from '../lib/notifications.js';

export async function notificationsPage(container) {
  const businessId = state.currentBusiness && state.currentBusiness.id;
  const businessName = (state.currentBusiness && state.currentBusiness.name) || '';

  const wrap = el('div', { class: 'container col' });
  container.appendChild(wrap);

  const header = el('div', { class: 'row-between' });
  header.appendChild(el('h1', { text: t.notif_title }));
  wrap.appendChild(header);

  const toolbar = el('div', { class: 'row', style: 'gap:8px;flex-wrap:wrap;' });
  const markBtn = el('button', { class: 'btn btn-secondary btn-sm', type: 'button', text: t.notif_mark_all });
  markBtn.addEventListener('click', () => { markAllRead(); rerender(); });
  toolbar.appendChild(markBtn);

  const clearBtn = el('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: t.notif_clear });
  clearBtn.addEventListener('click', () => { clearNotifications(); rerender(); });
  toolbar.appendChild(clearBtn);

  const permBtn = el('button', {
    class: 'btn btn-secondary btn-sm', type: 'button', text: t.notif_enable_browser,
  });
  permBtn.addEventListener('click', async () => {
    const ok = await requestBrowserPermission();
    if (ok) toast(t.notif_browser_on, 'success');
    else toast(t.notif_browser_off, 'warning');
  });
  toolbar.appendChild(permBtn);
  wrap.appendChild(toolbar);

  const listBox = el('div', { class: 'col' });
  wrap.appendChild(listBox);

  function rerender() {
    listBox.innerHTML = '';
    const list = getNotifications();
    if (!list.length) {
      listBox.appendChild(el('div', { class: 'state' }, [
        el('div', { class: 'state-title', text: t.notif_empty_title }),
        el('div', { class: 'state-text', text: t.notif_empty_text }),
      ]));
      return;
    }
    for (const n of list) listBox.appendChild(notifCard(n));
  }

  function notifCard(n) {
    const card = el('div', {
      class: 'card',
      style: 'cursor:pointer;' + (n.read ? 'opacity:.7;' : 'border-left:3px solid var(--primary);'),
    });
    const head = el('div', { class: 'row-between' });
    head.appendChild(el('div', { class: 'prod-name', text: n.title }));
    head.appendChild(el('div', { class: 'prod-meta', text: dateTime(n.createdAt) }));
    card.appendChild(head);
    card.appendChild(el('div', { class: 'prod-meta', text: n.body, style: 'margin-top:4px;' }));
    card.addEventListener('click', () => {
      markAllRead();
      if (n.saleId) navigate('sales/view/' + n.saleId);
      else navigate('payments');
    });
    return card;
  }

  // Refresh reminders for this session on entry.
  if (businessId) {
    await scanForDebtReminders(businessId, businessName);
  }
  rerender();
}
