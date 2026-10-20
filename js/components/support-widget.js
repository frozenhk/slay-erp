import { el, toast } from '../ui.js';
import { state } from '../state.js';
import { getOrCreateTicket, getMessages, sendMessage, markMessagesRead, getUnreadCount } from '../api/support.js';

export function buildSupportWidget() {
  if (document.getElementById('support-fab')) return;

  const fab = el('div', { id: 'support-fab', class: 'support-fab' });
  fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
  
  const badge = el('div', { id: 'support-badge', style: 'position:absolute;top:0;right:0;background:red;color:white;border-radius:50%;padding:2px 6px;font-size:12px;font-weight:bold;display:none;' });
  fab.appendChild(badge);

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

  // Draggable Logic
  let isDragging = false, hasMoved = false, startX, startY, initialX, initialY;
  const savedX = localStorage.getItem('slay-fab-x'), savedY = localStorage.getItem('slay-fab-y');
  if (savedX !== null && savedY !== null) { fab.style.right = 'auto'; fab.style.bottom = 'auto'; fab.style.left = savedX + 'px'; fab.style.top = savedY + 'px'; }
  
  fab.addEventListener('pointerdown', (e) => {
    startX = e.clientX; startY = e.clientY; initialX = fab.offsetLeft; initialY = fab.offsetTop;
    isDragging = true; hasMoved = false;
    fab.setPointerCapture(e.pointerId);
  });
  fab.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX; const dy = e.clientY - startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      hasMoved = true; fab.style.right = 'auto'; fab.style.bottom = 'auto';
      fab.style.left = Math.max(10, Math.min(initialX + dx, window.innerWidth - 66)) + 'px';
      fab.style.top = Math.max(10, Math.min(initialY + dy, window.innerHeight - 66)) + 'px';
    }
  });
  fab.addEventListener('pointerup', (e) => {
    if (!isDragging) return; isDragging = false;
    if (hasMoved) { localStorage.setItem('slay-fab-x', fab.offsetLeft); localStorage.setItem('slay-fab-y', fab.offsetTop); }
    else { chat.classList.toggle('open'); if (chat.classList.contains('open') && tabChat.classList.contains('active')) loadMessages(); }
  });

  const faqs = [
    { q: 'How do I add a product?', a: 'Go to Products -> Add Product.' },
    { q: 'How do I receive stock?', a: 'Go to Inventory -> Adjust -> Receive Stock.' }
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
  let lastMessageId = null; // Track the last message so we don't redraw if nothing changed

  async function checkUnread() {
    if (!currentTicketId || (chat.classList.contains('open') && tabChat.classList.contains('active'))) { badge.style.display = 'none'; return; }
    const count = await getUnreadCount('user', currentTicketId);
    if (count > 0) { badge.style.display = 'block'; badge.textContent = count; } else { badge.style.display = 'none'; }
  }

  async function loadMessages() {
    if (!currentTicketId) return;
    const msgs = await getMessages(currentTicketId);
    
    // SMART DIFFING: If no messages or the last message is the same, DO NOTHING (prevents blinking)
    if (msgs.length === 0) return;
    const newLastId = msgs[msgs.length - 1].id;
    if (newLastId === lastMessageId) return;

    lastMessageId = newLastId;
    body.innerHTML = ''; // Only clear if there's actually a new message
    msgs.forEach(m => {
      const bubble = el('div', { class: 'msg-bubble ' + (m.sender_type === 'user' ? 'msg-user' : 'msg-admin') });
      bubble.appendChild(el('div', { text: m.message }));
      bubble.appendChild(el('div', { class: 'msg-meta', text: new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }));
      body.appendChild(bubble);
    });
    body.scrollTop = body.scrollHeight;
    
    await markMessagesRead(currentTicketId, 'user');
    await checkUnread();
  }

  getOrCreateTicket(state.currentBusiness.id, state.user.id, 'App Support').then(id => {
    currentTicketId = id;
    checkUnread();
    if (chat.classList.contains('open') && tabChat.classList.contains('active')) loadMessages();
  });

  tabChat.onclick = async () => {
    tabChat.classList.add('active'); tabFaq.classList.remove('active');
    inputArea.style.display = 'flex';
    if (!currentTicketId) currentTicketId = await getOrCreateTicket(state.currentBusiness.id, state.user.id, 'App Support');
    lastMessageId = null; // Force reload when switching tabs
    loadMessages();
  };

  sendBtn.onclick = async () => {
    const txt = input.value.trim();
    if (!txt || !currentTicketId) return;
    input.value = '';
    await sendMessage(currentTicketId, state.user.id, 'user', txt);
    lastMessageId = null; // Force reload to show our own message
    loadMessages();
  };

  tabFaq.onclick = () => { tabFaq.classList.add('active'); tabChat.classList.remove('active'); inputArea.style.display = 'none'; renderFaq(); };
  
  setInterval(checkUnread, 2000);
  setInterval(loadMessages, 2000); // This runs every 2s, but won't blink because of the lastMessageId check
  renderFaq();
}
