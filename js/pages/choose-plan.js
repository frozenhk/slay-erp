import { el } from '../ui.js';
import { navigate } from '../router.js';
import { t } from '../i18n.js';
import { state } from '../state.js';

export function choosePlanPage(container) {
  const wrap = el('div', { class: 'container col' });
  container.appendChild(wrap);

  const biz = state.currentBusiness || {};
  
  wrap.appendChild(el('h1', { text: 'Welcome, ' + biz.name }));
  wrap.appendChild(el('p', { class: 'muted', text: 'Your business is ready. Choose how you want to proceed.' }));

  const card = el('div', { class: 'card', style: 'border: 2px solid var(--primary); background: #F0F9FF;' });
  card.appendChild(el('div', { style: 'font-size: 20px; font-weight: 700; color: var(--primary);', text: '60-Day Free Trial' }));
  card.appendChild(el('p', { text: 'Test all the features of Slay ERP for free for 60 days. No payment required right now.' }));
  
  const trialBtn = el('button', { class: 'btn btn-primary btn-lg btn-block', text: 'Start Free Trial & Enter Dashboard', style: 'margin-top: 16px;' });
  trialBtn.onclick = () => {
    // Set a local flag so they don't get redirected again
    localStorage.setItem('slay-plan-chosen-' + biz.id, '1');
    navigate('dashboard');
  };
  card.appendChild(trialBtn);
  
  wrap.appendChild(card);

  const upgradeCard = el('div', { class: 'card', style: 'margin-top: 16px;' });
  upgradeCard.appendChild(el('div', { style: 'font-size: 18px; font-weight: 700;', text: 'Upgrade to a Paid Plan' }));
  upgradeCard.appendChild(el('p', { class: 'muted', text: 'Choose a plan now to unlock more users, locations, and advanced features.' }));
  
  const upgradeBtn = el('button', { class: 'btn btn-secondary btn-lg btn-block', text: 'View Paid Plans', style: 'margin-top: 16px;' });
  upgradeBtn.onclick = () => navigate('pricing');
  upgradeCard.appendChild(upgradeBtn);
  
  wrap.appendChild(upgradeCard);
}
