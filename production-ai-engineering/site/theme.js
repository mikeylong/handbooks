(() => {
  const key = 'handbook-theme';
  const root = document.documentElement;
  const system = matchMedia('(prefers-color-scheme: dark)');
  const valid = value => ['light', 'dark', 'system'].includes(value) ? value : 'system';
  let preference = 'system';
  const read = () => {
    try { preference = valid(localStorage.getItem(key)); } catch { /* Keep the in-page choice if storage is unavailable. */ }
  };
  const apply = () => {
    const theme = preference === 'system' ? (system.matches ? 'dark' : 'light') : preference;
    root.dataset.theme = theme;
    document.querySelectorAll('[data-theme-select]').forEach(select => { select.value = preference; });
    const color = document.querySelector('meta[name="theme-color"]');
    if (color) color.content = theme === 'dark' ? '#191918' : '#ffffff';
  };
  read();
  apply(); // This blocking head script applies the preference before styles paint.
  document.addEventListener('change', event => {
    if (!event.target.matches('[data-theme-select]')) return;
    preference = valid(event.target.value);
    try { localStorage.setItem(key, preference); } catch { /* Theme switching still works without storage. */ }
    apply();
  });
  document.addEventListener('DOMContentLoaded', apply);
  system.addEventListener('change', () => { if (preference === 'system') apply(); });
  window.addEventListener('storage', event => { if (event.key === key || event.key === null) { read(); apply(); } });
  window.addEventListener('pageshow', () => { read(); apply(); });
})();
