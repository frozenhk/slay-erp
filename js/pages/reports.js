import { el } from '../ui.js';
import { t } from '../i18n.js';
import { state } from '../state.js';
import { money, todayISO } from '../format.js';
import { downloadCSV } from '../lib/csv.js';
import {
  buildSalesReport, buildProductsReport, buildCustomersReport,
  buildProfitReport, buildInventoryReport,
} from '../api/reports.js';

const TYPES = [
  { id: 'sales', label: 'rep_sales' },
  { id: 'products', label: 'rep_products' },
  { id: 'customers', label: 'rep_customers' },
  { id: 'profit', label: 'rep_profit' },
  { id: 'inventory', label: 'rep_inventory' },
];

export async function reportsPage(container) {
  const businessId = state.currentBusiness && state.currentBusiness.id;
  if (!businessId) return;

  const wrap = el('div', { class: 'container col' });
  container.appendChild(wrap);

  const header = el('div', { class: 'row-between' });
  header.appendChild(el('h1', { text: t.nav_reports }));
  const exportBtn = el('button', { class: 'btn btn-secondary', type: 'button', text: t.rep_export });
  header.appendChild(exportBtn);
  wrap.appendChild(header);

  // Date range
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const fromInput = el('input', { class: 'input', type: 'date', value: firstOfMonth.toISOString().slice(0, 10) });
  const toInput = el('input', { class: 'input', type: 'date', value: todayISO() });
  const rangeRow = el('div', { class: 'rep-range' });
  rangeRow.appendChild(el('div', { class: 'field' }, [el('label', { class: 'label', text: t.rep_from }), fromInput]));
  rangeRow.appendChild(el('div', { class: 'field' }, [el('label', { class: 'label', text: t.rep_to }), toInput]));
  wrap.appendChild(rangeRow);

  // Type chips
  let activeType = 'sales';
  const chips = el('div', { class: 'chips' });
  const chipNodes = {};
  for (const tp of TYPES) {
    const b = el('button', { class: 'chip' + (tp.id === 'sales' ? ' chip-active' : ''), type: 'button', text: t[tp.label] });
    b.addEventListener('click', () => {
      activeType = tp.id;
      for (const k of Object.keys(chipNodes)) chipNodes[k].classList.toggle('chip-active', k === tp.id);
      render();
    });
    chipNodes[tp.id] = b;
    chips.appendChild(b);
  }
  wrap.appendChild(chips);

  const content = el('div', { class: 'col' });
  wrap.appendChild(content);

  let lastData = null;

  async function render() {
    content.innerHTML = '';
    content.appendChild(el('div', { class: 'state' }, [el('div', { class: 'state-title', text: t.state_loading })]));
    const fromISO = new Date(fromInput.value + 'T00:00:00').toISOString();
    const toISO = new Date(toInput.value + 'T23:59:59').toISOString();

    try {
      content.innerHTML = '';
      if (activeType === 'sales') {
        const d = await buildSalesReport(businessId, fromISO, toISO);
        lastData = { type: 'sales', data: d, from: fromInput.value, to: toInput.value };
        content.appendChild(summaryGrid([
          { label: t.rep_orders, value: String(d.count) },
          { label: t.rep_revenue, value: money(d.total), cls: 'pos' },
        ]));
        content.appendChild(card(t.rep_by_day, table(
          [t.rep_date, t.rep_orders, t.rep_revenue],
          d.byDay.map((r) => [r.date, r.orders, money(r.revenue)]),
          [2]
        )));
        content.appendChild(card(t.rep_by_channel, table(
          [t.rep_channel, t.rep_orders, t.rep_revenue],
          d.byChannel.map((r) => [t['sale_channel_' + r.channel] || r.channel, r.orders, money(r.revenue)]),
          [2]
        )));
      } else if (activeType === 'products') {
        const d = await buildProductsReport(businessId, fromISO, toISO);
        lastData = { type: 'products', data: d, from: fromInput.value, to: toInput.value };
        content.appendChild(card(t.rep_by_product, table(
          [t.rep_product, t.rep_qty, t.rep_revenue, t.rep_cost, t.rep_profit],
          d.rows.map((r) => [r.name, r.qty, money(r.revenue), money(r.cost), money(r.profit)]),
          [1, 2, 3, 4]
        )));
      } else if (activeType === 'customers') {
        const d = await buildCustomersReport(businessId, fromISO, toISO);
        lastData = { type: 'customers', data: d, from: fromInput.value, to: toInput.value };
        content.appendChild(card(t.rep_by_customer, table(
          [t.rep_customer, t.rep_orders, t.rep_revenue],
          d.rows.map((r) => [r.name, r.orders, money(r.revenue)]),
          [2]
        )));
      } else if (activeType === 'profit') {
        const d = await buildProfitReport(businessId, fromISO, toISO);
        lastData = { type: 'profit', data: d, from: fromInput.value, to: toInput.value };
        content.appendChild(summaryGrid([
          { label: t.rep_revenue, value: money(d.revenue) },
          { label: t.rep_cogs, value: money(d.cogs) },
          { label: t.rep_gross, value: money(d.grossProfit), cls: d.grossProfit >= 0 ? 'pos' : 'neg' },
          { label: t.rep_expenses, value: money(d.expenses) },
          { label: t.rep_net, value: money(d.netProfit), cls: d.netProfit >= 0 ? 'pos' : 'neg' },
        ]));
        content.appendChild(card(t.rep_expenses_by_cat, table(
          [t.exp_category, t.exp_amount],
          d.expenseByCategory.map((r) => [r.category, money(r.amount)]),
          [1]
        )));
      } else if (activeType === 'inventory') {
        const d = await buildInventoryReport(businessId);
        lastData = { type: 'inventory', data: d };
        content.appendChild(summaryGrid([
          { label: t.rep_inventory_value, value: money(d.totalValue) },
        ]));
        content.appendChild(card(t.rep_by_variant, table(
          [t.rep_product, t.rep_variant, t.rep_qty, t.rep_cost, t.rep_value],
          d.rows.map((r) => [r.product, r.variant, r.qty, money(r.cost), money(r.value)]),
          [2, 3, 4]
        )));
      }
    } catch (err) {
      content.innerHTML = '';
      content.appendChild(el('div', { class: 'state' }, [
        el('div', { class: 'state-title', text: t.state_error_title }),
        el('div', { class: 'state-text', text: err.message || '' }),
      ]));
    }
  }

  fromInput.addEventListener('change', render);
  toInput.addEventListener('change', render);

  exportBtn.addEventListener('click', () => {
    if (!lastData) return;
    if (lastData.type === 'sales') {
      downloadCSV('sales-by-day-' + lastData.from + '_' + lastData.to + '.csv', [
        ['Date', 'Orders', 'Revenue'],
        ...lastData.data.byDay.map((r) => [r.date, r.orders, r.revenue]),
      ]);
    } else if (lastData.type === 'products') {
      downloadCSV('products-' + lastData.from + '_' + lastData.to + '.csv', [
        ['Product', 'Qty', 'Revenue', 'Cost', 'Profit'],
        ...lastData.data.rows.map((r) => [r.name, r.qty, r.revenue, r.cost, r.profit]),
      ]);
    } else if (lastData.type === 'customers') {
      downloadCSV('customers-' + lastData.from + '_' + lastData.to + '.csv', [
        ['Customer', 'Orders', 'Revenue'],
        ...lastData.data.rows.map((r) => [r.name, r.orders, r.revenue]),
      ]);
    } else if (lastData.type === 'profit') {
      downloadCSV('profit-' + lastData.from + '_' + lastData.to + '.csv', [
        ['Metric', 'Amount'],
        ['Revenue', lastData.data.revenue],
        ['Cost of goods', lastData.data.cogs],
        ['Gross profit', lastData.data.grossProfit],
        ['Expenses', lastData.data.expenses],
        ['Net profit', lastData.data.netProfit],
      ]);
    } else if (lastData.type === 'inventory') {
      downloadCSV('inventory-' + todayISO() + '.csv', [
        ['Product', 'Variant', 'Qty', 'Cost', 'Value'],
        ...lastData.data.rows.map((r) => [r.product, r.variant, r.qty, r.cost, r.value]),
      ]);
    }
  });

  await render();
}

function summaryGrid(items) {
  const g = el('div', { class: 'rep-summary' });
  for (const it of items) {
    const c = el('div', { class: 'rep-sum-card' });
    c.appendChild(el('div', { class: 'rep-sum-label', text: it.label }));
    c.appendChild(el('div', { class: 'rep-sum-value ' + (it.cls || ''), text: it.value }));
    g.appendChild(c);
  }
  return g;
}

function card(title, body) {
  const c = el('div', { class: 'rep-card' });
  c.appendChild(el('div', { class: 'rep-card-title', text: title }));
  c.appendChild(body);
  return c;
}

function table(headers, rows, numCols) {
  const wrap = el('div', { class: 'table-wrap' });
  const tbl = el('table', { class: 'rep-table' });
  const thead = el('thead');
  const tr = el('tr');
  headers.forEach((h, i) => {
    const th = el('th', { text: h });
    if (numCols && numCols.indexOf(i) !== -1) th.className = 'num';
    tr.appendChild(th);
  });
  thead.appendChild(tr);
  tbl.appendChild(thead);
  const tbody = el('tbody');
  if (!rows.length) {
    const r = el('tr');
    const td = el('td', { text: t.dash_no_data, colspan: headers.length });
    r.appendChild(td); tbody.appendChild(r);
  } else {
    for (const row of rows) {
      const r = el('tr');
      row.forEach((cell, i) => {
        const td = el('td', { text: String(cell) });
        if (numCols && numCols.indexOf(i) !== -1) td.className = 'num';
        r.appendChild(td);
      });
      tbody.appendChild(r);
    }
  }
  tbl.appendChild(tbody);
  wrap.appendChild(tbl);
  return wrap;
}
