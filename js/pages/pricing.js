import { el, toast, modal } from '../ui.js';
import { navigate } from '../router.js';
import { t } from '../i18n.js';
import { state } from '../state.js';
import { money } from '../format.js';
import { listPlans } from '../api/subscription.js';

export async function pricingPage(container) {
  const wrap = el('div', { class: 'container col' });
  container.appendChild(wrap);

  const header = el('div', { class: 'row-between' });
  const back = el('button', { class: 'btn btn-ghost', type: 'button', text: '← ' + t.action_back });
  back.addEventListener('click', () => navigate('subscription'));
  header.appendChild(back);
  header.appendChild(el('h1', { text: t.sub_pricing_title }));
  wrap.appendChild(header);

  wrap.appendChild(el('p', { class: 'muted', text: t.sub_pricing_sub }));

  let plans = [];
  try { plans = await listPlans(); }
  catch (err) {
    wrap.appendChild(el('div', { class: 'state' }, [
      el('div', { class: 'state-title', text: t.state_error_title }),
      el('div', { class: 'state-text', text: err.message || '' }),
    ]));
    return;
  }

  const currentCode = state.currentBusiness && state.currentBusiness.plan_code;

  for (const p of plans) {
    wrap.appendChild(planCard(p, currentCode));
  }
}

function planCard(p, currentCode) {
  const isCurrent = p.code === currentCode;
  const isRecommended = p.code === 'BUSINESS';
  const isTrial = p.code === 'TRIAL';

  const card = el('div', {
    class: 'card',
    style: 'position:relative;' + (isRecommended ? 'border:2px solid var(--primary);' : ''),
  });

  if (isRecommended) {
    card.appendChild(el('div', {
      style: 'position:absolute;top:-12px;left:16px;background:var(--primary);color:#fff;font-size:11px;font-weight:600;padding:2px 10px;border-radius:999px;letter-spacing:.05em;',
      text: t.sub_recommended.toUpperCase(),
    }));
  }
  if (isCurrent) {
    card.appendChild(el('div', {
      style: 'position:absolute;top:-12px;right:16px;background:var(--success);color:#fff;font-size:11px;font-weight:600;padding:2px 10px;border-radius:999px;letter-spacing:.05em;',
      text: t.sub_current.toUpperCase(),
    }));
  }

  card.appendChild(el('div', { style: 'font-size:18px;font-weight:700;', text: p.name }));
  if (p.description) {
    card.appendChild(el('div', { class: 'muted', style: 'font-size:13px;margin-bottom:8px;', text: p.description }));
  }

  if (isTrial) {
    card.appendChild(el('div', { style: 'font-size:22px;font-weight:700;margin:6px 0;', text: p.trial_days + ' ' + t.sub_days_free }));
    card.appendChild(el('div', { class: 'muted', text: t.sub_no_payment_needed }));
  } else {
    const mRow = el('div', { class: 'row-between', style: 'padding:4px 0;' });
    mRow.appendChild(el('div', { class: 'muted', text: t.sub_monthly }));
    mRow.appendChild(el('div', { style: 'font-weight:700;', text: money(p.monthly_price, p.currency) }));
    card.appendChild(mRow);

    const aRow = el('div', { class: 'row-between', style: 'padding:4px 0;border-bottom:1px solid var(--border);' });
    aRow.appendChild(el('div', { class: 'muted', text: t.sub_annual }));
    aRow.appendChild(el('div', { style: 'font-weight:700;', text: money(p.annual_price, p.currency) }));
    card.appendChild(aRow);

    card.appendChild(el('div', {
      class: 'muted',
      style: 'font-size:12px;margin-top:6px;',
      text: t.sub_save_2_months,
    }));
  }

  const btn = el('button', {
    class: 'btn ' + (isCurrent ? 'btn-secondary' : 'btn-primary') + ' btn-block',
    type: 'button',
    text: isCurrent ? t.sub_current_plan_btn : t.sub_choose_plan,
    style: 'margin-top:12px;',
  });
  if (isCurrent) btn.disabled = true;
  else btn.addEventListener('click', () => openChooseModal(p));
  card.appendChild(btn);

  return card;
}

function openChooseModal(p) {
  const body = el('div', { class: 'col' });
  body.appendChild(el('div', { style: 'font-weight:600;font-size:16px;', text: p.name }));
  body.appendChild(el('div', { class: 'muted', text: t.sub_monthly + ': ' + money(p.monthly_price, p.currency) }));
  body.appendChild(el('div', { class: 'muted', text: t.sub_annual + ': ' + money(p.annual_price, p.currency) }));
  body.appendChild(el('div', { class: 'hint', style: 'margin-top:8px;', text: t.sub_activation_note }));

  modal({
    title: t.sub_choose_plan,
    body,
    actions: [
      { label: t.action_close, class: 'btn-secondary', onClick: (c) => c() },
    ],
  });
}
