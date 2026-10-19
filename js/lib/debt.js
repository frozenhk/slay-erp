import { t } from '../i18n.js';
import { money, date, phoneForWhatsApp } from '../format.js';

export function daysUntil(dueDate) {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  return Math.round((due - today) / 86400000);
}

export function dueStatus(dueDate) {
  const days = daysUntil(dueDate);
  if (days === null) return { level: 'none', days: null };
  if (days < 0) return { level: 'overdue', days };
  if (days === 0) return { level: 'today', days };
  if (days <= 3) return { level: 'soon', days };
  return { level: 'later', days };
}

export function dueBadgeClass(dueDate) {
  const s = dueStatus(dueDate);
  if (s.level === 'overdue') return 'badge badge-error';
  if (s.level === 'today' || s.level === 'soon') return 'badge badge-warning';
  return 'badge badge-info';
}

export function countdownText(dueDate) {
  const s = dueStatus(dueDate);
  if (s.level === 'none') return '';
  if (s.level === 'overdue') {
    const n = Math.abs(s.days);
    return n + ' ' + (n === 1 ? t.debt_day_overdue : t.debt_days_overdue);
  }
  if (s.level === 'today') return t.debt_due_today;
  return s.days + ' ' + (s.days === 1 ? t.debt_day_left : t.debt_days_left);
}

// Reminder thresholds (days before due date).
// 5, 3, 2, 1, 0 (due today), and overdue.
export const REMINDER_LEVELS = [5, 3, 2, 1, 0, -1];

export function reminderLevelKey(dueDate) {
  const days = daysUntil(dueDate);
  if (days === null) return null;
  if (days < 0) return 'overdue';
  if (days === 0) return 'due-today';
  if (days === 1) return 'd1';
  if (days === 2) return 'd2';
  if (days === 3) return 'd3';
  if (days === 5) return 'd5';
  return null;
}

export function reminderTitle(levelKey) {
  if (levelKey === 'overdue') return t.debt_notif_overdue_title;
  if (levelKey === 'due-today') return t.debt_notif_today_title;
  if (levelKey === 'd1') return t.debt_notif_d1_title;
  if (levelKey === 'd2') return t.debt_notif_d2_title;
  if (levelKey === 'd3') return t.debt_notif_d3_title;
  if (levelKey === 'd5') return t.debt_notif_d5_title;
  return t.debt_notif_generic_title;
}

export function reminderBody(sale, businessName) {
  const cust = (sale.customers && sale.customers.name) || t.sale_walkin;
  const amount = money(sale.balance);
  const due = sale.due_date ? date(sale.due_date) : '';
  return t.debt_notif_body
    .replace('{customer}', cust)
    .replace('{amount}', amount)
    .replace('{due}', due)
    .replace('{business}', businessName || '');
}

export function reminderMessage(sale, businessName) {
  const lang = (document.documentElement.lang || 'en').toLowerCase();
  const isFr = lang.startsWith('fr');
  const bal = money(sale.balance);
  const due = sale.due_date ? date(sale.due_date) : '';
  const biz = businessName || '';

  if (isFr) {
    const lines = [
      'Bonjour,',
      'Petit rappel amical concernant votre solde de ' + bal + ' pour la vente ' + sale.sale_number + '.',
    ];
    if (due) lines.push('Échéance : ' + due);
    lines.push('Merci de régulariser dès que possible.');
    lines.push('— ' + biz);
    return lines.join('\n');
  }

  const lines = [
    'Hello,',
    'A friendly reminder about your outstanding balance of ' + bal + ' for sale ' + sale.sale_number + '.',
  ];
  if (due) lines.push('Due date: ' + due);
  lines.push('Please settle when you can. Thank you.');
  lines.push('— ' + biz);
  return lines.join('\n');
}

export function openWhatsAppReminder(sale, businessName) {
  const phone = (sale.customers && sale.customers.phone)
    ? phoneForWhatsApp(sale.customers.phone) : '';
  if (!phone) return false;
  const text = encodeURIComponent(reminderMessage(sale, businessName));
  window.open('https://wa.me/' + phone + '?text=' + text, '_blank');
  return true;
}
