import { el, toast, modal } from '../ui.js';
import { navigate } from '../router.js';
import { t } from '../i18n.js';
import { state } from '../state.js';
import { listLocations, createLocation, updateLocation } from '../api/locations.js';

export async function locationsPage(container) {
  const businessId = state.currentBusiness && state.currentBusiness.id;
  if (!businessId) return;

  const wrap = el('div', { class: 'container col' });
  container.appendChild(wrap);

  const header = el('div', { class: 'row-between' });
  const backBtn = el('button', {
    class: 'btn btn-ghost', type: 'button', text: '← ' + t.action_back,
  });
  backBtn.addEventListener('click', () => navigate('inventory'));
  header.appendChild(backBtn);
  header.appendChild(el('h1', { text: t.inv_locations }));
  wrap.appendChild(header);

  const addBtn = el('button', {
    class: 'btn btn-primary', type: 'button', text: t.inv_add_location,
  });
  addBtn.addEventListener('click', () => openLocationModal(null, businessId, reload));
  wrap.appendChild(addBtn);

  const list = el('div', { class: 'prod-list' });
  wrap.appendChild(list);

  async function reload() {
    list.innerHTML = '';
    for (let i = 0; i < 2; i++) {
      list.appendChild(el('div', { class: 'skeleton', style: 'height:64px;' }));
    }
    try {
      const rows = await listLocations(businessId);
      list.innerHTML = '';
      if (!rows.length) {
        list.appendChild(el('div', { class: 'state' }, [
          el('div', { class: 'state-title', text: t.inv_no_locations }),
        ]));
        return;
      }
      for (const l of rows) {
        const card = el('div', { class: 'prod-card' });
        card.appendChild(el('div', {
          class: 'prod-thumb', text: (l.name || '?').charAt(0).toUpperCase(),
        }));
        const info = el('div', { class: 'prod-info' });
        info.appendChild(el('div', { class: 'prod-name', text: l.name }));
        if (l.address) info.appendChild(el('div', { class: 'prod-meta', text: l.address }));
        card.appendChild(info);

        const right = el('div', { class: 'prod-right' });
        const edit = el('button', {
          class: 'btn btn-secondary btn-sm', type: 'button', text: t.inv_edit_location,
        });
        edit.addEventListener('click', (e) => {
          e.stopPropagation();
          openLocationModal(l, businessId, reload);
        });
        right.appendChild(edit);
        card.appendChild(right);
        list.appendChild(card);
      }
    } catch (err) {
      list.innerHTML = '';
      list.appendChild(el('div', { class: 'state' }, [
        el('div', { class: 'state-text', text: err.message || '' }),
      ]));
    }
  }

  await reload();
}

function openLocationModal(loc, businessId, onDone) {
  const nameInput = el('input', { class: 'input', type: 'text', value: (loc && loc.name) || '' });
  const addrInput = el('input', { class: 'input', type: 'text', value: (loc && loc.address) || '' });

  const body = el('div', { class: 'col' });
  body.appendChild(el('div', { class: 'field' }, [
    el('label', { class: 'label', text: t.inv_location_name }), nameInput,
  ]));
  body.appendChild(el('div', { class: 'field' }, [
    el('label', { class: 'label', text: t.inv_location_address }), addrInput,
  ]));

  modal({
    title: loc ? t.inv_edit_location : t.inv_add_location,
    body,
    actions: [
      { label: t.action_cancel, class: 'btn-secondary', onClick: (c) => c() },
      { label: t.action_save, class: 'btn-primary', onClick: async (close) => {
        const name = nameInput.value.trim();
        if (!name) { toast(t.inv_location_name_required, 'error'); return; }
        try {
          if (loc) {
            await updateLocation(loc.id, businessId, {
              name, address: addrInput.value.trim() || null,
            });
          } else {
            await createLocation(businessId, name, addrInput.value.trim() || null);
          }
          close();
          if (typeof onDone === 'function') onDone();
        } catch (err) {
          toast(err.message || t.state_error_text, 'error');
        }
      } },
    ],
  });
}
