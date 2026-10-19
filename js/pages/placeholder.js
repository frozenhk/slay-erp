export function placeholder(opts) {
  const info = opts || {};
  return function render(container) {
    const wrap = document.createElement('div');
    wrap.className = 'state';

    const title = document.createElement('div');
    title.className = 'state-title';
    title.textContent = info.title || 'Coming soon';
    wrap.appendChild(title);

    if (info.description) {
      const desc = document.createElement('div');
      desc.className = 'state-text';
      desc.textContent = info.description;
      wrap.appendChild(desc);
    }

    if (info.stage) {
      const badge = document.createElement('span');
      badge.className = 'badge badge-info';
      badge.textContent = 'Arrives at Stage ' + info.stage;
      wrap.appendChild(badge);
    }

    container.appendChild(wrap);
  };
}
