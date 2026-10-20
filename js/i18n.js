import { en } from './i18n/en.js';
import { fr } from './i18n/fr.js';

// v48 additions — Fixed missing due date buttons
Object.assign(en, {
  debt_due_date: 'Payment due date',
  debt_due_date_hint: 'When should the remaining balance be paid?',
  debt_quick_3: '3 days', debt_quick_7: '7 days',
  debt_quick_14: '14 days', debt_quick_30: '30 days',
  debt_quick_custom: 'Custom date',
  debt_due_today: 'Due today', debt_day_left: 'day left', debt_days_left: 'days left',
  debt_day_overdue: 'day overdue', debt_days_overdue: 'days overdue',
  debt_overdue_count: 'Overdue', debt_due_soon_count: 'Due within 7 days',
  debt_total_outstanding: 'Total outstanding', debt_nothing: 'No outstanding balances.',
  debt_view_payments: 'View all', debt_dashboard_title: 'Money owed to you',
  debt_no_due: 'No due date', debt_remind_wa: 'Remind on WhatsApp',
});

Object.assign(fr, {
  debt_due_date: 'Date d\'échéance',
  debt_due_date_hint: 'Quand le solde doit-il être payé ?',
  debt_quick_3: '3 jours', debt_quick_7: '7 jours',
  debt_quick_14: '14 jours', debt_quick_30: '30 jours',
  debt_quick_custom: 'Autre date',
  debt_due_today: "Échéance aujourd'hui", debt_day_left: 'jour restant', debt_days_left: 'jours restants',
  debt_day_overdue: 'jour de retard', debt_days_overdue: 'jours de retard',
  debt_overdue_count: 'En retard', debt_due_soon_count: 'Dû sous 7 jours',
  debt_total_outstanding: 'Total impayé', debt_nothing: 'Aucun solde impayé.',
  debt_view_payments: 'Voir tout', debt_dashboard_title: 'Argent qu\'on vous doit',
  debt_no_due: 'Pas d\'échéance', debt_remind_wa: 'Rappeler sur WhatsApp',
});

const STORAGE_KEY = 'slay-erp-lang';
const dicts = { en, fr };

export const t = { ...en };
let currentLang = 'en';

export function getLang() { return currentLang; }
export function listLangs() { return ['en', 'fr']; }

export function setLang(lang, opts) {
  if (!dicts[lang]) lang = 'en';
  currentLang = lang;
  try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* ignore */ }
  const dict = dicts[lang];
  for (const k of Object.keys(t)) delete t[k];
  Object.assign(t, dict);
  try { document.documentElement.lang = lang; } catch (e) { /* ignore */ }
  if (!opts || opts.reload !== false) {
    if (typeof location !== 'undefined' && location.reload) location.reload();
  }
}

export function initLang() {
  let saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) { /* ignore */ }
  if (saved && dicts[saved]) { setLang(saved, { reload: false }); return; }
  const browser = (typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en').toLowerCase();
  setLang(browser.startsWith('fr') ? 'fr' : 'en', { reload: false });
}
