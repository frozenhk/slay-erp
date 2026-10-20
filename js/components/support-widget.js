import { el, toast } from '../ui.js';
import { state } from '../state.js';
import { getOrCreateTicket, getMessages, sendMessage } from '../api/support.js';

export function buildSupportWidget() {
  if (document.getElementById('support-fab')) return;

  const fab = el('div', { id: 'support-fab', class: 'support-fab' });
  fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
  
  const chat = el('div', { id: 'support-chat', class: 'support-chat' });
  
  const header = el('div', { class: 'chat-header' });
  header.appendChild(el('h3', { text: 'Help & Support' }));
  const closeBtn = el('button', { class: 'chat-close', text: '×' });
  closeBtn.onclick = () => chat.classList.remove('open');
  header.appendChild(closeBtn);
  chat.appendChild(header);

  const tabs = el('div', { class: 'chat-tabs' });
  const tabFaq = el('div', { class: 'chat-tab active', text: 'FAQ' });
  const tabChat = el('div', { class: 'chat-tab', text: 'Live Chat' });
  tabs.appendChild(tabFaq); tabs.appendChild(tabChat);
  chat.appendChild(tabs);

  const body = el('div', { class: 'chat-body' });
  chat.appendChild(body);

  const inputArea = el('div', { class: 'chat-input-area', style: 'display:none;' });
  const input = el('input', { type: 'text', placeholder: 'Type your message...' });
  const sendBtn = el('button', { class: 'btn btn-primary' }, '→');
  inputArea.appendChild(input); inputArea.appendChild(sendBtn);
  chat.appendChild(inputArea);

  document.body.appendChild(fab);
  document.body.appendChild(chat);

  fab.onclick = () => chat.classList.toggle('open');

  const faqs = [
    { q: 'How do I add a product?', a: 'Go to Products -> Add Product. Fill in the name and price, then save.' },
    { q: 'How do I receive stock?', a: 'Go to Inventory, find the product, tap Adjust, and select "Receive Stock".' },
    { q: 'How do I make a sale?', a: 'Go to Sales -> New Sale. Add items and tap Complete Sale.' },
    { q: 'How do I invite a team member?', a: 'Go to Users & Roles, tap Invite User, and enter their email.' }
  ];

  function renderFaq() {
    body.innerHTML = '';
    faqs.forEach(f => {
      const item = el('div', { class: 'faq-item' });
      item.appendChild(el('h4', { text: f.q }));
      item.appendChild(el('p', { text: f.a }));
      item.onclick = () => item.classList.toggle('open');
      body.appendChild(item);
    });
  }

  let currentTicketId = null;

  async function renderChat() {
    body.innerHTML = '<div style="text-align:center;padding:20px;color:#666;">Connecting...</div>';
    try {
      if (!currentTicketId) {
        currentTicketId = await getOrCreateTicket(state.currentBusiness.id, state.user.id, 'App Support');
      }
      const msgs = await getMessages(currentTicketId);
      body.innerHTML = '';
      if (!msgs.length) {
        body.innerHTML = '<div style="text-align:center;padding:20px;color:#666;">No messages yet. Send a message to start.</div>';
      }
      msgs.forEach(m => {
        const bubble = el('div', { class: 'msg-bubble ' + (m.sender_type === 'user' ? 'msg-user' : 'msg-admin') });
        bubble.appendChild(el('div', { text: m.message }));
        bubble.appendChild(el('div', { class: 'msg-meta', text: new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }));
        body.appendChild(bubble);
      });
      body.scrollTop = body.scrollHeight;
    } catch (e) {
      body.innerHTML = '<div style="color:red;padding:10px;">Error loading chat.</div>';
    }
  }

  sendBtn.onclick = async () => {
    const txt = input.value.trim();
    if (!txt || !currentTicketId) return;
    input.value = '';
    try {
      await sendMessage(currentTicketId, state.user.id, 'user', txt);
      renderChat();
    } catch (e) { toast('Failed to send', 'error'); }
  };

  tabFaq.onclick = () => {
    tabFaq.classList.add('active'); tabChat.classList.remove('active');
    inputArea.style.display = 'none'; renderFaq();
  };
  tabChat.onclick = () => {
    tabChat.classList.add('active'); tabFaq.classList.remove('active');
    inputArea.style.display = 'flex'; renderChat();
  };

  renderFaq();
}
