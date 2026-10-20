import { el, toast } from '../ui.js';
import { state } from '../state.js';
import { supabase } from '../supabase.js';
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

  // Draggable logic
  let isDragging = false;
  let hasMoved = false;
  let startX, startY, initialX, initialY;
  const dragThreshold = 5;

  const savedX = localStorage.getItem('slay-fab-x');
  const savedY = localStorage.getItem('slay-fab-y');
  if (savedX !== null && savedY !== null) {
    fab.style.right = 'auto'; fab.style.bottom = 'auto';
    fab.style.left = savedX + 'px'; fab.style.top = savedY + 'px';
  }

  function dragStart(e) {
    if (e.type === 'mousedown') { startX = e.clientX; startY = e.clientY; }
    else { startX = e.touches[0].clientX; startY = e.touches[0].clientY; }
    initialX = fab.offsetLeft; initialY = fab.offsetTop;
    isDragging = true; hasMoved = false;
  }

  function dragMove(e) {
    if (!isDragging) return;
    let currentX, currentY;
    if (e.type === 'mousemove') { currentX = e.clientX; currentY = e.clientY; }
    else { currentX = e.touches[0].clientX; currentY = e.touches[0].clientY; e.preventDefault(); }

    const dx = currentX - startX; const dy = currentY - startY;
    if (Math.abs(dx) > dragThreshold || Math.abs(dy) > dragThreshold) {
      hasMoved = true;
      fab.style.right = 'auto'; fab.style.bottom = 'auto';
      let newX = Math.max(10, Math.min(initialX + dx, window.innerWidth - 66));
      let newY = Math.max(10, Math.min(initialY + dy, window.innerHeight - 66));
      fab.style.left = newX + 'px'; fab.style.top = newY + 'px';
    }
  }

  function dragEnd(e) {
    if (!isDragging) return;
    isDragging = false;
    if (!hasMoved) chat.classList.toggle('open');
    else { localStorage.setItem('slay-fab-x', fab.offsetLeft); localStorage.setItem('slay-fab-y', fab.offsetTop); }
  }

  fab.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', dragMove);
  document.addEventListener('mouseup', dragEnd);
  fab.addEventListener('touchstart', dragStart, { passive: true });
  document.addEventListener('touchmove', dragMove, { passive: false });
  document.addEventListener('touchend', dragEnd);

  // FAQ
  const faqs = [
    { q: 'How do I add a product?', a: 'Go to Products -> Add Product.' },
    { q: 'How do I receive stock?', a: 'Go to Inventory -> Adjust -> Receive Stock.' },
    { q: 'How do I make a sale?', a: 'Go to Sales -> New Sale.' },
    { q: 'How do I invite a team member?', a: 'Go to Users & Roles -> Invite User.' }
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
  let realtimeChannel = null;

  async function renderChat() {
    body.innerHTML = '<div style="text-align:center;padding:20px;color:#666;">Connecting...</div>';
    try {
      if (!currentTicketId) {
        currentTicketId = await getOrCreateTicket(state.currentBusiness.id, state.user.id, 'App Support');
        
        // --- REALTIME WEBSOCKETS ---
        if (realtimeChannel) supabase.removeChannel(realtimeChannel);
        realtimeChannel = supabase.channel('ticket-' + currentTicketId)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: 'ticket_id=eq.' + currentTicketId }, payload => {
            if (payload.new.sender_type !== 'user') {
              loadMessages(); // reload messages instantly when admin replies
            }
          }).subscribe();
      }
      await loadMessages();
    } catch (e) {
      body.innerHTML = '<div style="color:red;padding:10px;">Error loading chat.</div>';
    }
  }

  async function loadMessages() {
    const msgs = await getMessages(currentTicketId);
    body.innerHTML = '';
    if (!msgs.length) body.innerHTML = '<div style="text-align:center;padding:20px;color:#666;">No messages yet.</div>';
    msgs.forEach(m => {
      const bubble = el('div', { class: 'msg-bubble ' + (m.sender_type === 'user' ? 'msg-user' : 'msg-admin') });
      bubble.appendChild(el('div', { text: m.message }));
      bubble.appendChild(el('div', { class: 'msg-meta', text: new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }));
      body.appendChild(bubble);
    });
    body.scrollTop = body.scrollHeight;
  }

  sendBtn.onclick = async () => {
    const txt = input.value.trim();
    if (!txt || !currentTicketId) return;
    input.value = '';
    try {
      await sendMessage(currentTicketId, state.user.id, 'user', txt);
      loadMessages();
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
