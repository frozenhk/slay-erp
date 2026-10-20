import { el, toast } from '../ui.js';
import { navigate } from '../router.js';
import { listAllTickets, getMessages, sendMessage, markMessagesRead, getUnreadCount } from '../api/support.js';
import { state } from '../state.js';

export async function adminSupportPage(container) {
  const wrap = el('div', { class: 'container col' });
  container.appendChild(wrap);
  wrap.appendChild(el('h1', { text: 'Support Inbox' }));

  const list = el('div', { class: 'prod-list' });
  wrap.appendChild(list);

  async function loadTickets() {
    const tickets = await listAllTickets();
    list.innerHTML = '';
    if (!tickets.length) list.appendChild(el('div', { class: 'state' }, [el('div', { class: 'state-title', text: 'No support tickets.' })]));
    
    for (const t of tickets) {
      const unreadCount = await getUnreadCount('admin', t.id);
      
      const card = el('div', { class: 'card', style: 'cursor:pointer; display:flex; justify-content:space-between; align-items:center;' });
      
      const left = el('div');
      left.appendChild(el('div', { class: 'prod-name', text: (t.businesses ? t.businesses.name : 'Business') }));
      left.appendChild(el('div', { class: 'prod-meta', text: 'User: ' + (t.profiles ? t.profiles.full_name : 'User') }));
      card.appendChild(left);

      if (unreadCount > 0) {
        const badge = el('div', { style: 'background:red;color:white;border-radius:50%;padding:4px 8px;font-size:12px;font-weight:bold;', text: String(unreadCount) });
        card.appendChild(badge);
      }

      card.onclick = () => openTicket(t, container);
      list.appendChild(card);
    }
  }
  await loadTickets();
  
  // Auto-refresh the admin inbox list every 2 seconds
  const interval = setInterval(async () => {
    if (!document.body.contains(wrap)) { clearInterval(interval); return; }
    await loadTickets();
  }, 2000);
}

async function openTicket(t, container) {
  container.innerHTML = '';
  const wrap = el('div', { class: 'container col' });
  container.appendChild(wrap);

  const header = el('div', { class: 'row-between' });
  const back = el('button', { class: 'btn btn-ghost', text: '← Back' });
  back.onclick = () => { container.innerHTML = ''; adminSupportPage(container); };
  header.appendChild(back);
  header.appendChild(el('h1', { text: t.businesses ? t.businesses.name : 'Support' }));
  wrap.appendChild(header);

  const chatBox = el('div', { style: 'background:var(--surface-2);border-radius:8px;padding:16px;height:400px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;' });
  wrap.appendChild(chatBox);

  const inputRow = el('div', { class: 'row', style: 'margin-top:10px;' });
  const input = el('input', { class: 'input', style: 'flex:1;', placeholder: 'Reply as Admin...' });
  const btn = el('button', { class: 'btn btn-primary', text: 'Send' });
  inputRow.appendChild(input); inputRow.appendChild(btn);
  wrap.appendChild(inputRow);

  async function loadMsgs() {
    const msgs = await getMessages(t.id);
    chatBox.innerHTML = '';
    msgs.forEach(m => {
      const b = el('div', { class: 'msg-bubble ' + (m.sender_type === 'admin' ? 'msg-user' : 'msg-admin') });
      b.appendChild(el('div', { text: m.message }));
      chatBox.appendChild(b);
    });
    chatBox.scrollTop = chatBox.scrollHeight;
    await markMessagesRead(t.id, 'admin'); // Clear admin unread badge
  }

  btn.onclick = async () => {
    const txt = input.value.trim();
    if (!txt) return;
    input.value = '';
    await sendMessage(t.id, state.user.id, 'admin', txt);
    loadMsgs();
  };

  loadMsgs();
  setInterval(loadMsgs, 2000);
}
