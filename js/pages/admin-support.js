import { el, toast } from '../ui.js';
import { navigate } from '../router.js';
import { listAllTickets, getMessages, sendMessage } from '../api/support.js';
import { state } from '../state.js';

export async function adminSupportPage(container) {
  const wrap = el('div', { class: 'container col' });
  container.appendChild(wrap);

  const header = el('div', { class: 'row-between' });
  header.appendChild(el('h1', { text: 'Support Inbox' }));
  wrap.appendChild(header);

  const tickets = await listAllTickets();
  const list = el('div', { class: 'prod-list' });
  
  if (!tickets.length) {
    list.appendChild(el('div', { class: 'state' }, [el('div', { class: 'state-title', text: 'No support tickets yet.' })]));
  }

  for (const t of tickets) {
    const card = el('div', { class: 'card' });
    card.appendChild(el('div', { class: 'prod-name', text: (t.businesses ? t.businesses.name : 'Business') + ' - ' + (t.profiles ? t.profiles.full_name : 'User') }));
    card.appendChild(el('div', { class: 'prod-meta', text: 'Status: ' + t.status.toUpperCase() }));
    card.onclick = () => openTicket(t, container);
    list.appendChild(card);
  }
  wrap.appendChild(list);
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

  const chatBox = el('div', { style: 'background:var(--surface-2);border-radius:8px;padding:16px;height:300px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;' });
  wrap.appendChild(chatBox);

  const inputRow = el('div', { class: 'row', style: 'margin-top:10px;' });
  const input = el('input', { class: 'input', style: 'flex:1;', placeholder: 'Reply as Admin...' });
  const btn = el('button', { class: 'btn btn-primary', text: 'Send' });
  inputRow.appendChild(input); inputRow.appendChild(btn);
  wrap.appendChild(inputRow);

  async function loadMsgs() {
    chatBox.innerHTML = '';
    const msgs = await getMessages(t.id);
    msgs.forEach(m => {
      const b = el('div', { class: 'msg-bubble ' + (m.sender_type === 'admin' ? 'msg-user' : 'msg-admin') });
      b.appendChild(el('div', { text: m.message }));
      chatBox.appendChild(b);
    });
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  btn.onclick = async () => {
    const txt = input.value.trim();
    if (!txt) return;
    input.value = '';
    await sendMessage(t.id, state.user.id, 'admin', txt);
    loadMsgs();
  };

  loadMsgs();
}
