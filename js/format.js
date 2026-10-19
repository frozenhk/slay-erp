const numberFmt = new Intl.NumberFormat('fr-FR');

const ZERO_DECIMAL_CURRENCIES = ['XAF', 'XOF', 'JPY', 'KRW', 'VND', 'CLP'];

export function money(amount, currency = 'XAF') {
  const n = Number(amount || 0);
  if (!isFinite(n)) return '0 ' + currency;
  const curr = (currency || 'XAF').toUpperCase();
  if (ZERO_DECIMAL_CURRENCIES.includes(curr)) {
    return numberFmt.format(Math.round(n)) + ' ' + curr;
  }
  return numberFmt.format(n) + ' ' + curr;
}

export function number(value) {
  const n = Number(value || 0);
  if (!isFinite(n)) return '0';
  return numberFmt.format(n);
}

export function date(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return dd + '/' + mm + '/' + yyyy;
}

export function dateTime(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return date(d) + ' ' + hh + ':' + mi;
}

export function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + mm + '-' + dd;
}

export function phoneForWhatsApp(phone) {
  if (!phone) return '';
  let p = String(phone).replace(/[^\d+]/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  return p;
}

export function initials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join('') || '?';
}
