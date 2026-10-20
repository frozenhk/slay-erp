import { el, toast, modal } from '../ui.js';
import { navigate } from '../router.js';
import { state } from '../state.js';
import { money, date, dateTime, phoneForWhatsApp } from '../format.js';
import { getRecoveryRecord, logRecoveryActivity, listRecoveryActivities, updateRecoveryStatus } from '../api/recovery.js';

export async function recoveryRecordPage(container, opts) {
  const wrap = el('div', { class: 'container col' });
  container.appendChild(wrap);

  const header = el('div', { class: 'row-between' });
  const back = el('button', { class: 'btn btn-ghost', text: '← Back' });
  back.onclick = () => navigate('recovery');
  header.appendChild(back);
  wrap.appendChild(header);

  const loading = el('div', { class: 'state' }, [el('div', { class: 'state-title', text: 'Loading...' })]);
  wrap.appendChild(loading);

  let record, activities;
  try {
    record = await getRecoveryRecord(opts.id);
    activities = await listRecoveryActivities(opts.id);
  } catch (e) {
    loading.innerHTML = 'Error loading record.';
    return;
  }
  loading.remove();

  const c = record.customers;

  // Customer Info Card
  const infoCard = el('div', { class: 'card' });
  infoCard.appendChild(el('div', { style: 'font-size:20px;font-weight:700;', text: c.name }));
  if (c.phone) infoCard.appendChild(el('div', { class: 'muted', text: c.phone }));
  infoCard.appendChild(el('div', { class: 'badge badge-warning', style: 'margin-top:8px;', text: 'Reason: ' + record.reason.toUpperCase() }));
  wrap.appendChild(infoCard);

  // Status Selector
  const statusSel = el('select', { class: 'select', style: 'margin-top:12px;' });
  const statuses = ['new', 'contacted', 'interested', 'recovered', 'not_interested', 'unreachable'];
  for (const s of statuses) statusSel.appendChild(el('option', { value: s, text: s.replace('_', ' ').toUpperCase() }));
  statusSel.value = record.status;
  statusSel.onchange = async () => {
    await updateRecoveryStatus(record.id, statusSel.value);
    toast('Status updated', 'success');
  };
  wrap.appendChild(statusSel);

  // Actions
  const actions = el('div', { class: 'row-actions', style: 'margin-top:16px;' });
  
  if (c.phone) {
    const waBtn = el('button', { class: 'btn btn-primary', text: 'WhatsApp' });
    waBtn.onclick = () => {
      const text = encodeURIComponent(`Hello ${c.name}, this is ${state.currentBusiness.name}. We miss you! Do you need anything?`);
      window.open(`https://wa.me/${phoneForWhatsApp(c.phone)}?text=${text}`, '_blank');
      logRecoveryActivity(record.id, record.business_id, 'whatsapp', 'Sent WhatsApp message', state.user.id);
    };
    actions.appendChild(waBtn);
  }

  const noteBtn = el('button', { class: 'btn btn-secondary', text: 'Add Note' });
  noteBtn.onclick = () => {
    const input = el('input', { class: 'input', placeholder: 'What happened?' });
    modal({
      title: 'Log Activity', body: input,
      actions: [
        { label: 'Cancel', class: 'btn-secondary', onClick: (cl) => cl() },
        { label: 'Save', class: 'btn-primary', onClick: async (cl) => {
          await logRecoveryActivity(record.id, record.business_id, 'note', input.value, state.user.id);
          cl(); toast('Note added', 'success'); container.innerHTML = ''; recoveryRecordPage(container, opts);
        }}
      ]
    });
  };
  actions.appendChild(noteBtn);
  wrap.appendChild(actions);

  // History
  wrap.appendChild(el('h2', { text: 'Activity History', style: 'margin-top:24px;' }));
  const history = el('div', { class: 'prod-list' });
  if (!activities.length) history.appendChild(el('div', { class: 'muted', text: 'No activities yet.' }));
  for (const a of activities) {
    const card = el('div', { class: 'card' });
    card.appendChild(el('div', { style: 'font-weight:600;', text: a.activity_type.toUpperCase() }));
    if (a.note) card.appendChild(el('div', { text: a.note }));
    card.appendChild(el('div', { class: 'muted', style: 'font-size:12px;', text: dateTime(a.created_at) }));
    history.appendChild(card);
  }
  wrap.appendChild(history);
}
