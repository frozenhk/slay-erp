import { checkFeature } from '../api/subscription.js';

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
  if (!res.ok) {
    const msg = upgradeMessage(t, res, feature);
    if (typeof toast === 'function') toast(msg, 'error', 5000);
    return false;
  }
  return true;
}
