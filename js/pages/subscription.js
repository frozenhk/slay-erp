import { el } from '../ui.js';
import { navigate } from '../router.js';
import { t } from '../i18n.js';
import { state } from '../state.js';
import { money, date } from '../format.js';
import { can } from '../lib/entitlements.js';

const FEATURES = [
  { code: 'users', label: 'ent_feature_users' },
  { code: 'locations', label: 'ent_feature_locations' },
  { code: 'products', label: 'ent_feature_products' },
  { code: 'orders_per_month', label: 'ent_feature_orders_per_month' },
];

export async function subscriptionPage(container) {
  const biz = state.currentBusiness || {};
  const businessId = biz.id;

  const wrap = el('div', { class: 'container col' });
  container.appendChild(wrap);

  const header = el('div', { class: 'row-between' });
  const back = el('button', { class: 'btn btn-ghost', type: 'button', text: '← ' + t.action_back });
  back.addEventListener('click', () => navigate('more'));
  header.appendChild(back);
  header.appendChild(el('h1', { text: t.sub_title }));
  wrap.appendChild(header);

  const planRow = el('div', { class: 'card' });
  planRow.appendChild(el('div', { class: 'metric-label', text: t.sub_current_plan }));
  planRow.appendChild(el('div', { class: 'metric-value', text: biz.plan_code || 'TRIAL' }));
  const status = biz.subscription_status || 'trialing';
  planRow.appendChild(el('span', {
    class: 'badge ' + statusBadgeClass(status),
    text: t['sub_status_' + status] || status,
    style: 'margin-top:6px;display:inline-block;',
  }));
  wrap.appendChild(planRow);

  if (status === 'trialing' && biz.trial_ends_at) {
    wrap.appendChild(trialCard(biz));
  } else if (biz.current_period_end) {
    const c = el('div', { class: 'card' });
    c.appendChild(el('div', { class: 'metric-label', text: t.sub_renews_on }));
    c.appendChild(el('div', { class: 'metric-value', text: date(biz.current_period_end) }));
    wrap.appendChild(c);
  }

  const usageCard = el('div', { class: 'card col' });
  usageCard.appendChild(el('div', { class: 'card-title', text: t.sub_usage }));
  for (const f of FEATURES) {
    const row = await usageRow(businessId, f, t);
    usageCard.appendChild(row);
  }
  wrap.appendChild(usageCard);

  const actions = el('div', { class: 'row-actions' });
  const upgrade = el('button', { class: 'btn btn-primary', type: 'button', text: t.sub_upgrade });
  upgrade.addEventListener('click', () => navigate('pricing'));
  actions.appendChild(upgrade);
  wrap.appendChild(actions);

  wrap.appendChild(el('div', { class: 'hint', style: 'margin-top:12px;', text: t.sub_billing_coming }));
}

function trialCard(biz) {
  const c = el('div', {
    class: 'card',
    style: 'background:#FFF7ED;border-color:#FED7AA;',
  });
  c.appendChild(el('div', { class: 'metric-label', text: t.sub_trial_ends }));
  c.appendChild(el('div', {
    class: 'metric-value',
    style: 'color:#9A3412;',
    text: date(biz.trial_ends_at),
  }));
  const days = daysLeft(biz.trial_ends_at);
  c.appendChild(el('div', {
    class: 'metric-sub',
    style: 'color:#9A3412;',
    text: days + ' ' + (days === 1 ? t.sub_day_left : t.sub_days_left),
  }));
  return c;
}

function daysLeft(iso) {
  if (!iso) return 0;
  const end = new Date(iso).getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((end - now) / 86400000));
}

function statusBadgeClass(s) {
  if (s === 'active' || s === 'trialing') return 'badge-success';
  if (s === 'past_due' || s === 'grace_period') return 'badge-warning';
  if (s === 'expired' || s === 'cancelled' || s === 'suspended') return 'badge-error';
  return 'badge-info';
}

async function usageRow(businessId, f, t) {
  const row = el('div', { style: 'padding:8px 0;border-bottom:1px solid var(--border);' });
  const top = el('div', { class: 'row-between' });
  top.appendChild(el('div', { class: 'prod-name', text: t[f.label] || f.code }));
  const res = await can(businessId, f.code);
  const limit = res.limit != null ? res.limit : null;
  const used = res.current != null ? res.current : 0;
  const label = (limit === -1 || limit === null)
    ? used + ' / ∞'
    : used + ' / ' + limit;
  top.appendChild(el('div', { class: 'prod-meta', text: label }));
  row.appendChild(top);

  if (limit != null && limit > 0) {
    const track = el('div', { class: 'bar-track', style: 'margin-top:6px;' });
    const fill = el('div', { class: 'bar-fill' });
    const pct = Math.min(100, (used / limit) * 100);
    fill.style.width = pct + '%';
    if (pct >= 100) fill.style.background = 'var(--error)';
    else if (pct >= 80) fill.style.background = 'var(--warning)';
    track.appendChild(fill);
    row.appendChild(track);
  }
  return row;
}
