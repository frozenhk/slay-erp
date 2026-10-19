import { en } from './i18n/en.js';
import { fr } from './i18n/fr.js';

Object.assign(en, {
  sub_title: 'Subscription',
  sub_pricing_title: 'Plans & pricing',
  sub_pricing_sub: 'Choose the plan that fits your business. 60 days free to start — no payment required.',
  sub_recommended: 'Recommended',
  sub_current: 'Current',
  sub_current_plan: 'Current plan',
  sub_current_plan_btn: 'Your current plan',
  sub_choose_plan: 'Choose this plan',
  sub_monthly: 'Monthly',
  sub_annual: 'Annual',
  sub_save_2_months: 'Annual saves you 2 months',
  sub_days_free: 'days free',
  sub_no_payment_needed: 'No payment required to start',
  sub_trial_ends: 'Trial ends',
  sub_renews_on: 'Renews on',
  sub_day_left: 'day left',
  sub_days_left: 'days left',
  sub_usage: 'Your usage',
  sub_upgrade: 'Compare plans',
  sub_activation_note: 'Activation is handled by our team after your payment is confirmed. Payment options are coming next.',
  sub_billing_coming: 'Billing history will appear here once your subscription is activated.',

  sub_status_trialing: 'Free trial',
  sub_status_active: 'Active',
  sub_status_past_due: 'Past due',
  sub_status_grace_period: 'Grace period',
  sub_status_expired: 'Expired',
  sub_status_cancelled: 'Cancelled',
  sub_status_suspended: 'Suspended',

  ent_feature_users: 'Team members',
  ent_feature_locations: 'Locations',
  ent_feature_products: 'Products',
  ent_feature_orders_per_month: 'Orders this month',
  ent_limit_reached: 'You have reached the {feature} limit of your plan ({current}/{limit}). Upgrade to add more.',
  ent_feature_upgrade: 'Your plan does not include {feature}. Upgrade to unlock it.',
  ent_subscription_inactive: 'Your subscription is not active. Renew your plan to continue.',
  ent_action_blocked: 'This action is not available on your current plan.',

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
});

Object.assign(fr, {
  sub_title: 'Abonnement',
  sub_pricing_title: 'Forfaits & tarifs',
  sub_pricing_sub: 'Choisissez le forfait adapté à votre entreprise. 60 jours gratuits — aucun paiement requis.',
  sub_recommended: 'Recommandé',
  sub_current: 'Actuel',
  sub_current_plan: 'Forfait actuel',
  sub_current_plan_btn: 'Votre forfait actuel',
  sub_choose_plan: 'Choisir ce forfait',
  sub_monthly: 'Mensuel',
  sub_annual: 'Annuel',
  sub_save_2_months: "L'annuel vous fait économiser 2 mois",
  sub_days_free: 'jours gratuits',
  sub_no_payment_needed: 'Aucun paiement requis pour commencer',
  sub_trial_ends: "Fin de l'essai",
  sub_renews_on: 'Renouvellement le',
  sub_day_left: 'jour restant',
  sub_days_left: 'jours restants',
  sub_usage: 'Votre utilisation',
  sub_upgrade: 'Comparer les forfaits',
  sub_activation_note: "L'activation est gérée par notre équipe après confirmation du paiement. Les options de paiement arrivent bientôt.",
  sub_billing_coming: "L'historique de facturation apparaîtra ici une fois votre abonnement activé.",

  sub_status_trialing: 'Essai gratuit',
  sub_status_active: 'Actif',
  sub_status_past_due: 'En retard',
  sub_status_grace_period: 'Période de grâce',
  sub_status_expired: 'Expiré',
  sub_status_cancelled: 'Annulé',
  sub_status_suspended: 'Suspendu',

  ent_feature_users: "Membres de l'équipe",
  ent_feature_locations: 'Emplacements',
  ent_feature_products: 'Produits',
  ent_feature_orders_per_month: 'Commandes ce mois',
  ent_limit_reached: 'Vous avez atteint la limite {feature} de votre forfait ({current}/{limit}). Passez à un forfait supérieur.',
  ent_feature_upgrade: "Votre forfait n'inclut pas {feature}. Améliorez votre forfait.",
  ent_subscription_inactive: "Votre abonnement n'est pas actif. Renouvelez pour continuer.",
  ent_action_blocked: "Cette action n'est pas disponible avec votre forfait actuel.",

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
  const browser = (typeof navigator !== 'undefined' && navigator.language
    ? navigator.language : 'en').toLowerCase();
  setLang(browser.startsWith('fr') ? 'fr' : 'en', { reload: false });
}
