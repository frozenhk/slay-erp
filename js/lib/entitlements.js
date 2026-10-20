import { checkFeature } from '../api/subscription.js';
import { modal, el } from '../ui.js';
import { navigate } from '../router.js';

const cache = new Map();

export async function can(businessId, feature, force) {
  if (!businessId) return { ok: false, reason: 'no_business' };
  const key = businessId + ':' + feature;
  if (!force && cache.has(key)) return cache.get(key);
  try {
    const res = await checkFeature(businessId, feature);
    cache.set(key, res);
    return res;
  } catch (e) {
    return { ok: false, reason: 'error', message: e.message };
  }
}

export function clearCache(businessId) {
  if (!businessId) { cache.clear(); return; }
  for (const k of Array.from(cache.keys())) {
    if (k.startsWith(businessId + ':')) cache.delete(k);
  }
}

export function upgradeMessage(t, res, feature) {
  if (!res || res.ok) return '';
  const featureLabel = t['ent_feature_' + feature] || feature;
  if (res.reason === 'limit_reached') {
    return t.ent_limit_reached.replace('{feature}', featureLabel)
      .replace('{current}', res.current || '0')
      .replace('{limit}', res.limit || '0');
  }
  if (res.reason === 'feature_not_in_plan') {
    return t.ent_feature_upgrade.replace('{feature}', featureLabel);
  }
  if (String(res.reason || '').startsWith('subscription_')) {
    return t.ent_subscription_inactive;
  }
  return t.ent_action_blocked;
}

export async function guardFeature(businessId, feature, t, toast) {
  const res = await can(businessId, feature);
  if (res.ok) return true;

  // Platform admins bypass everything
  if (res.reason === 'platform_admin') return true;

  const msg = upgradeMessage(t, res, feature);

  // If it's a limit or feature restriction, show a professional upgrade modal
  if (res.reason === 'limit_reached' || res.reason === 'feature_not_in_plan') {
    const body = el('div', { class: 'col' }, [
      el('div', { class: 'state-text', text: msg, style: 'text-align:left;font-size:14px;' }),
      el('div', { class: 'hint', text: 'Upgrade your plan to unlock this feature and add more.' })
    ]);
    modal({
      title: 'Upgrade Required',
      body,
      actions: [
        { label: 'Not now', class: 'btn-secondary', onClick: (close) => close() },
        { label: 'View Plans', class: 'btn-primary', onClick: (close) => { close(); navigate('pricing'); } },
      ],
    });
  } else {
    // For other errors (e.g. expired subscription), use a toast
    if (typeof toast === 'function') toast(msg, 'error', 5000);
  }
  return false;
}
