import { listOutstandingSales } from '../api/sales.js';
import { reminderLevelKey, reminderTitle, reminderBody } from './debt.js';

const SEEN_KEY = 'slay-notif-seen';
const LIST_KEY = 'slay-notif-list';

function getSeen() {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}') || {}; } catch (e) { return {}; }
}
function saveSeen(obj) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(obj)); } catch (e) { /* ignore */ }
}
function getList() {
  try { return JSON.parse(localStorage.getItem(LIST_KEY) || '[]') || []; } catch (e) { return []; }
}
function saveList(arr) {
  try { localStorage.setItem(LIST_KEY, JSON.stringify(arr.slice(0, 100))); } catch (e) { /* ignore */ }
}

export function unreadCount() {
  const list = getList();
  let n = 0;
  for (const x of list) if (!x.read) n++;
  return n;
}

export function getNotifications() {
  return getList();
}

export function markAllRead() {
  const list = getList();
  for (const x of list) x.read = true;
  saveList(list);
}

export function clearNotifications() {
  saveList([]);
}

// Runs when the app starts (and when data changes). Detects which debts
// have crossed a reminder threshold since we last checked, and adds a
// notification for each (once per sale per level).
export async function scanForDebtReminders(businessId, businessName) {
  if (!businessId) return { added: 0 };

  let sales = [];
  try { sales = await listOutstandingSales(businessId); }
  catch (e) { console.error('scanForDebtReminders', e); return { added: 0 }; }

  const seen = getSeen();
  const list = getList();
  let added = 0;

  for (const s of sales) {
    if (!s.due_date) continue;
    const key = reminderLevelKey(s.due_date);
    if (!key) continue;
    const seenKey = s.id + ':' + key;
    if (seen[seenKey]) continue;

    const entry = {
      id: seenKey,
      saleId: s.id,
      saleNumber: s.sale_number,
      level: key,
      title: reminderTitle(key),
      body: reminderBody(s, businessName),
      createdAt: new Date().toISOString(),
      read: false,
    };
    list.unshift(entry);
    seen[seenKey] = true;
    added++;
  }

  if (added) {
    saveSeen(seen);
    saveList(list);
    tryShowBrowserNotification(added, list[0]);
  }
  return { added };
}

function tryShowBrowserNotification(count, latest) {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  if (!latest) return;
  try {
    new Notification('Slay ERP', { body: latest.title + ' — ' + latest.body, silent: false });
  } catch (e) { /* ignore */ }
}

export async function requestBrowserPermission() {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const res = await Notification.requestPermission();
  return res === 'granted';
}
