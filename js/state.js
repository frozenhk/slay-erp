const listeners = new Set();

export const state = {
  user: null,
  profile: null,
  businesses: [],
  currentBusiness: null,
  role: null,
  currentLocation: null,
};

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notify() {
  for (const fn of listeners) {
    try { fn(state); } catch (err) { console.error(err); }
  }
}

export function setUser(user) { state.user = user; notify(); }
export function setProfile(profile) { state.profile = profile; notify(); }
export function setBusinesses(list) { state.businesses = list || []; notify(); }

export function setCurrentBusiness(business, role) {
  state.currentBusiness = business || null;
  state.role = role || null;
  state.currentLocation = null;
  notify();
}

export function setCurrentLocation(location) {
  state.currentLocation = location || null;
  notify();
}

export function resetState() {
  state.user = null;
  state.profile = null;
  state.businesses = [];
  state.currentBusiness = null;
  state.role = null;
  state.currentLocation = null;
  notify();
}

export function hasRole(...roles) {
  return roles.includes(state.role);
}
