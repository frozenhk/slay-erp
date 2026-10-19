export const ROLES = ['owner', 'manager', 'sales_agent', 'warehouse', 'accountant'];

export const INVITE_ROLES = ['manager', 'sales_agent', 'warehouse', 'accountant'];

const MENU = {
  owner: ['dashboard', 'sales', 'invoices', 'payments', 'products', 'inventory', 'customers', 'expenses', 'reports', 'more'],
  manager: ['dashboard', 'sales', 'invoices', 'payments', 'products', 'inventory', 'customers', 'expenses', 'reports', 'more'],
  sales_agent: ['dashboard', 'sales', 'invoices', 'payments', 'products', 'inventory', 'customers', 'more'],
  warehouse: ['dashboard', 'products', 'inventory', 'more'],
  accountant: ['dashboard', 'sales', 'invoices', 'payments', 'customers', 'expenses', 'reports', 'more'],
};

const ACCESS = {
  dashboard: ['owner', 'manager', 'sales_agent', 'warehouse', 'accountant'],
  sales: ['owner', 'manager', 'sales_agent', 'accountant'],
  invoices: ['owner', 'manager', 'sales_agent', 'accountant'],
  payments: ['owner', 'manager', 'sales_agent', 'accountant'],
  products: ['owner', 'manager', 'sales_agent', 'warehouse'],
  inventory: ['owner', 'manager', 'warehouse'],
  customers: ['owner', 'manager', 'sales_agent', 'accountant'],
  expenses: ['owner', 'manager', 'accountant'],
  reports: ['owner', 'manager', 'accountant'],
  users: ['owner', 'manager'],
  settings: ['owner'],
  more: ['owner', 'manager', 'sales_agent', 'warehouse', 'accountant'],
  notifications: ['owner', 'manager', 'sales_agent', 'warehouse', 'accountant'],
};

export function canSeeMenu(role, id) {
  const r = role || 'owner';
  return (MENU[r] || MENU.owner).indexOf(id) !== -1;
}

export function canAccess(role, page) {
  const r = role || 'owner';
  const list = ACCESS[page];
  if (!list) return true;
  return list.indexOf(r) !== -1;
}

export function canManageUsers(role) { return role === 'owner' || role === 'manager'; }
export function canEditBusiness(role) { return role === 'owner'; }
export function roleLabel(t, role) { return t['role_' + role] || role; }
