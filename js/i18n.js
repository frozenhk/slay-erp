import { en } from './i18n/en.js';
import { fr } from './i18n/fr.js';

Object.assign(en, {
  // Admin translations
  admin_businesses_title: 'All businesses',
  admin_no_businesses: 'No businesses yet.',
  admin_change_plan: 'Change plan',
  admin_extend_trial: 'Extend trial',
  admin_plan: 'Plan',
  admin_reason: 'Reason',
  admin_reason_ph: 'Optional note for the audit log',
  admin_days: 'Days',
  admin_days_required: 'Enter a number of days',
  admin_plan_changed: 'Plan updated',
  admin_trial_extended: 'Trial extended',
  admin_tile: 'Platform admin',
  admin_tile_desc: 'Manage businesses and subscriptions',

  // Trial translations
  sub_trial_ends: 'Trial ends',
  sub_ends_on: 'Ends on',
  sub_status_trialing: 'Free trial',
  sub_status_active: 'Active',
  sub_status_past_due: 'Past due',
  sub_status_grace_period: 'Grace period',
  sub_status_expired: 'Expired',
  sub_status_cancelled: 'Cancelled',
  sub_status_suspended: 'Suspended',

  // Dashboard translations
  dash_full_analytics: 'Full Analytics',
  dash_revenue: 'Revenue',
  dash_orders: 'Orders',
  dash_profit: 'Profit',
});

Object.assign(fr, {
  admin_businesses_title: 'Toutes les entreprises',
  admin_no_businesses: 'Aucune entreprise.',
  admin_change_plan: 'Changer de forfait',
  admin_extend_trial: "Prolonger l'essai",
  admin_plan: 'Forfait',
  admin_reason: 'Raison',
  admin_reason_ph: "Note optionnelle pour le journal d'audit",
  admin_days: 'Jours',
  admin_days_required: 'Entrez un nombre de jours',
  admin_plan_changed: 'Forfait mis à jour',
  admin_trial_extended: 'Essai prolongé',
  admin_tile: 'Admin plateforme',
  admin_tile_desc: 'Gérer les entreprises et abonnements',

  sub_trial_ends: "Fin de l'essai",
  sub_ends_on: 'Se termine le',
  sub_status_trialing: 'Essai gratuit',
  sub_status_active: 'Actif',
  sub_status_past_due: 'En retard',
  sub_status_grace_period: 'Période de grâce',
  sub_status_expired: 'Expiré',
  sub_status_cancelled: 'Annulé',
  sub_status_suspended: 'Suspendu',

  dash_full_analytics: 'Analyses complètes',
  dash_revenue: "Chiffre d'affaires",
  dash_orders: 'Commandes',
  dash_profit: 'Bénéfice',
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
