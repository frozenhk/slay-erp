import { en } from './i18n/en.js';
import { fr } from './i18n/fr.js';

Object.assign(en, {
  debt_overdue_count: 'Overdue',
  debt_due_soon_count: 'Due within 7 days',
  debt_days_left: 'days left',
  debt_day_left: 'day left',
  debt_days_overdue: 'days overdue',
  debt_day_overdue: 'day overdue',
  debt_due_today: 'Due today',
  debt_no_due: 'No due date',
});

Object.assign(fr, {
  debt_overdue_count: 'En retard',
  debt_due_soon_count: 'Dû sous 7 jours',
  debt_days_left: 'jours restants',
  debt_day_left: 'jour restant',
  debt_days_overdue: 'jours de retard',
  debt_day_overdue: 'jour de retard',
  debt_due_today: "Échéance aujourd'hui",
  debt_no_due: "Pas d'échéance",
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
