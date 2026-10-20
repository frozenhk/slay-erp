import { el, toast, modal } from '../ui.js';
import { navigate } from '../router.js';
import { t } from '../i18n.js';
import { state } from '../state.js';
import { money } from '../format.js';
import { listPlans } from '../api/subscription.js';
import { generateInvoice, submitPayment } from '../api/billing.js';

const BENEFITS = {
  TRIAL: ['Basic Sales & Invoicing', '1 User', '1 Location', '50 Products', '100 Orders/mo'],
  STARTER: ['All Sales & Invoicing', '1 User', '1 Location', '200 Products', '500 Orders/mo', 'Basic Reports'],
  BUSINESS: ['Advanced Inventory', '3 Users', '2 Locations', '2,000 Products', '2,000 Orders/mo', 'Multi-location', 'Basic AI Insights'],
  PROFESSIONAL: ['Advanced Accounting', '10 Users', '5 Locations', '10,000 Products', '10,000 Orders/mo', 'API Access (Limited)', 'Advanced AI Insights'],
  ENTERPRISE: ['Full API Access', '25 Users', '15 Locations', 'Unlimited Products', 'Unlimited Orders/mo', 'Dedicated Support', 'Advanced AI Insights']
};

export async function pricingPage(container) {
  const wrap = el('div', { class: 'container col' });
  container.appendChild(wrap);

  const header = el('div', { class: 'row-between' });
  const back = el('button', { class: 'btn btn-ghost', type: 'button', text: '← ' + t.action_back });
  back.addEventListener('click', () => navigate('subscription'));
  header.appendChild(back);
  header.appendChild(el('h1', { text: t.sub_pricing_title }));
  wrap.appendChild(header);
  wrap.appendChild(el('p', { class: 'muted', text: 'Swipe to see all plans. Choose the plan that fits your business.' }));

  let plans = [];
  try { plans = await listPlans(); }
  catch (err) { toast(err.message, 'error'); return; }

  const currentCode = state.currentBusiness && state.currentBusiness.plan_code;

  const carousel = el('div', { class: 'pricing-carousel' });
  for (const p of plans) {
    carousel.appendChild(planCard(p, currentCode));
  }
  wrap.appendChild(carousel);
}

function planCard(p, currentCode) {
  const isCurrent = p.code === currentCode;
  const isRecommended = p.code === 'BUSINESS';
  const isTrial = p.code === 'TRIAL';

  const card = el('div', { class: 'pricing-card' + (isRecommended ? ' recommended' : '') });
  
  if (isRecommended) {
    card.appendChild(el('div', { style: 'background:var(--primary);color:#fff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:999px;align-self:flex-start;margin-bottom:12px;', text: 'RECOMMENDED' }));
  }
  if (isCurrent) {
    card.appendChild(el('div', { style: 'background:var(--success);color:#fff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:999px;align-self:flex-start;margin-bottom:12px;', text: 'CURRENT PLAN' }));
  }

  card.appendChild(el('div', { style: 'font-size:20px;font-weight:700;', text: p.name }));
  if (p.description) {
    card.appendChild(el('div', { class: 'muted', style: 'font-size:13px;margin-bottom:12px;', text: p.description }));
  }

  if (isTrial) {
    card.appendChild(el('div', { style: 'font-size:24px;font-weight:700;margin:6px 0;', text: p.trial_days + ' Days Free' }));
  } else {
    card.appendChild(el('div', { style: 'font-size:24px;font-weight:700;margin:6px 0;', text: money(p.monthly_price) + ' /mo' }));
    card.appendChild(el('div', { class: 'muted', style: 'font-size:13px;', text: 'or ' + money(p.annual_price) + ' /year' }));
  }

  const benefits = BENEFITS[p.code] || [];
  const benefitsList = el('div', { class: 'pricing-benefits' });
  for (const b of benefits) {
    const row = el('div', { class: 'pricing-benefit-item' });
    row.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg><span>${b}</span>`;
    benefitsList.appendChild(row);
  }
  card.appendChild(benefitsList);

  const btn = el('button', {
    class: 'btn ' + (isCurrent ? 'btn-secondary' : 'btn-primary') + ' btn-block',
    type: 'button',
    text: isCurrent ? 'Current Plan' : 'Choose Plan',
    style: 'margin-top:16px;'
  });
  if (isCurrent) btn.disabled = true;
  else btn.addEventListener('click', () => openPlanModal(p));
  card.appendChild(btn);

  return card;
}

async function openPlanModal(p) {
  const businessId = state.currentBusiness.id;
  const intervalSel = el('select', { class: 'select' }, [
    el('option', { value: 'monthly', text: t.sub_monthly + ' - ' + money(p.monthly_price, p.currency) }),
    el('option', { value: 'annual', text: t.sub_annual + ' - ' + money(p.annual_price, p.currency) })
  ]);
  
  const body = el('div', { class: 'col' }, [
    el('p', { text: 'Select billing cycle for ' + p.name }),
    el('div', { class: 'field' }, [el('label', { class: 'label', text: 'Billing Cycle' }), intervalSel])
  ]);

  modal({
    title: 'Choose Plan',
    body,
    actions: [
      { label: 'Cancel', class: 'btn-secondary', onClick: (c) => c() },
      { label: 'Continue to Payment', class: 'btn-primary', onClick: async (close) => {
          close();
          try {
            const invId = await generateInvoice(businessId, p.code, intervalSel.value);
            showPaymentInstructions(invId, p, intervalSel.value);
          } catch (e) { toast(e.message, 'error'); }
      }}
    ]
  });
}

async function showPaymentInstructions(invoiceId, plan, interval) {
  const amount = interval === 'monthly' ? plan.monthly_price : plan.annual_price;
  
  const methodSel = el('select', { class: 'select' }, [
    el('option', { value: 'mtn_momo', text: 'MTN Mobile Money' }),
    el('option', { value: 'orange_money', text: 'Orange Money' }),
    el('option', { value: 'bank_transfer', text: 'Bank Transfer' })
  ]);
  const refInput = el('input', { class: 'input', type: 'text', placeholder: 'e.g. MOMO-12345678' });

  const body = el('div', { class: 'col' }, [
    el('div', { style: 'background:var(--surface-2);padding:10px;border-radius:8px;font-size:13px;' }, [
      el('div', { text: 'Please send ' + money(amount) + ' to:' }),
      el('div', { style: 'font-weight:700;margin-top:4px;', text: 'MTN MoMo: +237 6XX XXX XXX (Slay ERP)' }),
      el('div', { style: 'font-weight:700;', text: 'Orange Money: +237 6XX XXX XXX' }),
    ]),
    el('div', { class: 'field' }, [el('label', { class: 'label', text: 'Payment Method' }), methodSel]),
    el('div', { class: 'field' }, [el('label', { class: 'label', text: 'Transaction ID / Reference' }), refInput])
  ]);

  modal({
    title: 'Complete Payment',
    body,
    actions: [
      { label: 'Cancel', class: 'btn-secondary', onClick: (c) => c() },
      { label: 'I have paid', class: 'btn-primary', onClick: async (close) => {
          const ref = refInput.value.trim();
          if (!ref) { toast('Please enter the transaction ID', 'error'); return; }
          try {
            await submitPayment(invoiceId, state.currentBusiness.id, amount, methodSel.value, ref);
            close();
            toast('Payment submitted! Awaiting admin verification.', 'success');
            navigate('subscription');
          } catch (e) { toast(e.message, 'error'); }
      }}
    ]
  });
}
