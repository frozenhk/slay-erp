import { el, toast } from '../ui.js';
import { navigate } from '../router.js';
import { t } from '../i18n.js';
import { state } from '../state.js';
import { signOut } from '../auth.js';
import { canManageUsers, canEditBusiness } from '../permissions.js';
import { isPlatformAdmin } from '../api/subscription.js';
import { svgIcon } from '../shell.js';

export async function morePage(container) {
  const wrap = el('div', { class: 'container col' });
  container.appendChild(wrap);

  const header = el('div', { class: 'row-between' });
  header.appendChild(el('h1', { text: t.nav_more }));
  wrap.appendChild(header);

  const biz = state.currentBusiness || {};
  const bizCard = el('div', { class: 'card' });
  bizCard.appendChild(el('div', { class: 'metric-label', text: t.account_current }));
  bizCard.appendChild(el('div', { class: 'metric-value', text: biz.name || 'Business' }));
  const roleLabel = t['role_' + (state.role || 'owner')] || state.role || 'member';
  bizCard.appendChild(el('div', { class: 'metric-sub', text: roleLabel + ' · ' + (biz.currency || 'XAF') }));
  wrap.appendChild(bizCard);

  const grid = el('div', { class: 'more-grid' });

  const tiles = [
    { id: 'recovery', label: 'Customer Recovery', desc: 'Win back inactive customers', icon: 'chart', visible: true },
    { id: 'recovery', label: 'Customer Recovery', desc: 'Win back inactive customers', icon: 'chart', visible: true },
    { id: 'expenses', label: t.nav_expenses, desc: t.more_desc_expenses, icon: 'coins', visible: true },
    { id: 'users', label: t.users_title, desc: t.more_desc_users, icon: 'user', visible: canManageUsers(state.role) },
    { id: 'settings', label: t.settings_title, desc: t.more_desc_settings, icon: 'cog', visible: canEditBusiness(state.role) },
    { id: 'subscription', label: t.sub_title, desc: t.more_desc_sub, icon: 'card', visible: true },
  ];

  try {
    const isAdmin = await isPlatformAdmin();
    if (isAdmin) {
      tiles.push({ id: 'admin/businesses', label: t.admin_tile, desc: t.admin_tile_desc, icon: 'cog', visible: true });
      tiles.push({ id: 'admin/support', label: 'Support Inbox', desc: 'Reply to user tickets', icon: 'bell', visible: true });
    }
  } catch (e) { }

  for (const tile of tiles) {
    if (!tile.visible) continue;
    const node = el('div', { class: 'more-tile' });
    const ic = el('div', { class: 'more-tile-icon' });
    ic.appendChild(svgIcon(tile.icon, 20));
    node.appendChild(ic);
    node.appendChild(el('div', { class: 'more-tile-label', text: tile.label }));
    node.appendChild(el('div', { class: 'more-tile-desc', text: tile.desc }));
    node.addEventListener('click', () => navigate(tile.id));
    grid.appendChild(node);
  }
  wrap.appendChild(grid);

  const signOutBtn = el('button', { class: 'btn btn-secondary btn-block', type: 'button', text: t.auth_sign_out, style: 'margin-top:12px;' });
  signOutBtn.addEventListener('click', async () => {
    try { await signOut(); navigate('login'); }
    catch (e) { toast(e.message || 'Sign out failed', 'error'); }
  });
  wrap.appendChild(signOutBtn);
}
