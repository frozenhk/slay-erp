import { el, toast, modal, confirmDialog } from '../ui.js';
import { navigate } from '../router.js';
import { t } from '../i18n.js';
import { state } from '../state.js';
import { initials } from '../format.js';
import { canManageUsers } from '../permissions.js';
import { guardFeature } from '../lib/entitlements.js';
import { listMembers, updateMemberRole, removeMember, listInvitations, createInvitation, cancelInvitation } from '../api/members.js';

const ROLES = ['owner', 'manager', 'sales_agent', 'warehouse', 'accountant'];
const INVITE_ROLES = ['manager', 'sales_agent', 'warehouse', 'accountant'];

export async function usersPage(container) {
  const businessId = state.currentBusiness && state.currentBusiness.id;
  if (!businessId) return;

  const wrap = el('div', { class: 'container col' });
  container.appendChild(wrap);

  const header = el('div', { class: 'row-between' });
  const back = el('button', { class: 'btn btn-ghost', type: 'button', text: '← ' + t.action_back });
  back.addEventListener('click', () => navigate('more'));
  header.appendChild(back);
  header.appendChild(el('h1', { text: t.users_title }));
  wrap.appendChild(header);

  if (!canManageUsers(state.role)) {
    wrap.appendChild(el('div', { class: 'state' }, [
      el('div', { class: 'state-title', text: t.users_no_access }),
      el('div', { class: 'state-text', text: t.users_no_access_text }),
    ]));
    return;
  }

  const inviteBtn = el('button', { class: 'btn btn-primary', type: 'button', text: '+ ' + t.users_invite });
  inviteBtn.addEventListener('click', async () => {
    const ok = await guardFeature(businessId, 'users', t, toast);
    if (!ok) return;
    openInvite(businessId, load);
  });
  wrap.appendChild(inviteBtn);

  const membersCard = el('div', { class: 'col' });
  membersCard.appendChild(el('h2', { text: t.users_members }));
  const membersList = el('div', { class: 'col' });
  membersCard.appendChild(membersList);
  wrap.appendChild(membersCard);

  const invitesCard = el('div', { class: 'col' });
  invitesCard.appendChild(el('h2', { text: t.users_pending }));
  const invitesList = el('div', { class: 'col' });
  invitesCard.appendChild(invitesList);
  wrap.appendChild(invitesCard);

  async function load() {
    membersList.innerHTML = '';
    for (let i = 0; i < 2; i++) membersList.appendChild(el('div', { class: 'skeleton', style: 'height:64px;' }));
    invitesList.innerHTML = '';
    try {
      const members = await listMembers(businessId);
      membersList.innerHTML = '';
      for (const m of members) membersList.appendChild(memberRow(m, businessId, load));

      const invites = await listInvitations(businessId);
      invitesList.innerHTML = '';
      if (!invites.length) {
        invitesList.appendChild(el('div', { class: 'muted', text: t.users_no_pending }));
      } else {
        for (const inv of invites) invitesList.appendChild(inviteRow(inv, businessId, load));
      }
    } catch (err) {
      membersList.innerHTML = '';
      membersList.appendChild(el('div', { class: 'state' }, [
        el('div', { class: 'state-title', text: t.state_error_title }),
        el('div', { class: 'state-text', text: err.message || '' }),
      ]));
    }
  }

  await load();
}

function memberRow(m, businessId, onDone) {
  const p = m.profiles || {};
  const isMe = state.user && state.user.id === m.user_id;
  const isOwner = m.role === 'owner';
  const canChange = canManageUsers(state.role) && !isOwner && !isMe;

  const card = el('div', { class: 'member-card' });
  card.appendChild(el('div', { class: 'member-avatar', text: initials(p.full_name || '?') }));

  const info = el('div');
  info.appendChild(el('div', { class: 'member-name', text: p.full_name || t.users_unnamed }));
  info.appendChild(el('div', { class: 'member-meta', text: p.phone || (isMe ? t.users_you : t.users_no_phone) }));
  card.appendChild(info);

  const right = el('div', { class: 'member-right' });

  if (canChange) {
    const sel = el('select', { class: 'select', style: 'min-height:36px;padding:6px 10px;font-size:14px;' });
    for (const r of ROLES) sel.appendChild(el('option', { value: r, text: t['role_' + r] }));
    sel.value = m.role;
    sel.addEventListener('change', async () => {
      try { await updateMemberRole(m.id, businessId, sel.value); toast(t.users_role_updated, 'success'); onDone(); }
      catch (err) { toast(err.message || t.state_error_text, 'error'); onDone(); }
    });
    right.appendChild(sel);

    const rm = el('button', {
      type: 'button', text: t.action_remove,
      style: 'background:transparent;border:none;color:var(--error);font-size:12px;cursor:pointer;padding:0;font-family:inherit;',
    });
    rm.addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: t.users_remove, message: t.users_remove_confirm,
        danger: true, confirmLabel: t.action_remove,
      });
      if (!ok) return;
      try { await removeMember(m.id, businessId); toast(t.users_removed, 'success'); onDone(); }
      catch (err) { toast(err.message || t.state_error_text, 'error'); }
    });
    right.appendChild(rm);
  } else {
    right.appendChild(el('span', { class: 'badge badge-info', text: t['role_' + m.role] || m.role }));
  }
  card.appendChild(right);
  return card;
}

function inviteRow(inv, businessId, onDone) {
  const card = el('div', { class: 'invite-card' });
  const l = el('div');
  l.appendChild(el('div', { class: 'invite-email', text: inv.email }));
  l.appendChild(el('div', { class: 'invite-meta', text: t['role_' + inv.role] || inv.role + ' · ' + t.users_pending_label }));
  card.appendChild(l);

  const cancel = el('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: t.action_cancel });
  cancel.addEventListener('click', async () => {
    try { await cancelInvitation(inv.id, businessId); toast(t.users_invite_cancelled, 'success'); onDone(); }
    catch (err) { toast(err.message || t.state_error_text, 'error'); }
  });
  card.appendChild(cancel);
  return card;
}

function openInvite(businessId, onDone) {
  const emailInput = el('input', { class: 'input', type: 'email', placeholder: 'name@example.com' });
  const roleSel = el('select', { class: 'select' });
  for (const r of INVITE_ROLES) roleSel.appendChild(el('option', { value: r, text: t['role_' + r] }));

  const body = el('div', { class: 'col' });
  body.appendChild(el('div', { class: 'field' }, [el('label', { class: 'label', text: t.auth_email }), emailInput]));
  body.appendChild(el('div', { class: 'field' }, [el('label', { class: 'label', text: t.users_role }), roleSel]));
  body.appendChild(el('div', { class: 'hint', text: t.users_invite_hint }));

  modal({
    title: t.users_invite,
    body,
    actions: [
      { label: t.action_cancel, class: 'btn-secondary', onClick: (c) => c() },
      { label: t.action_save, class: 'btn-primary', onClick: async (close) => {
        const e = emailInput.value.trim();
        if (!e || e.indexOf('@') === -1) { toast(t.users_email_invalid, 'error'); return; }
        try {
          await createInvitation(businessId, e, roleSel.value);
          close();
          toast(t.users_invite_sent, 'success');
          if (typeof onDone === 'function') onDone();
        } catch (err) { toast(err.message || t.state_error_text, 'error'); }
      } },
    ],
  });
}
