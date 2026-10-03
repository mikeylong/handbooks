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
    // A screen-only source respects explicit appearance and falls back to the
    // original bitmap for browser print. Without JS its media follows System.
    document.querySelectorAll('[data-dark-artwork]').forEach(source => {
      source.media = theme === 'dark' ? 'screen' : 'not all';
    });
    const label = preference[0].toUpperCase() + preference.slice(1);
    document.querySelectorAll('[data-theme-trigger]').forEach(button => button.setAttribute('aria-label', `Appearance: ${label}`));
    document.querySelectorAll('[data-theme-label]').forEach(span => { span.textContent = label; });
    document.querySelectorAll('[data-theme-choice]').forEach(button => button.setAttribute('aria-checked', String(button.dataset.themeChoice === preference)));
    const color = document.querySelector('meta[name="theme-color"]');
    if (color) color.content = theme === 'dark' ? '#191918' : '#ffffff';
  };
  const close = control => {
    control.querySelector('.theme-menu').hidden = true;
    control.querySelector('[data-theme-trigger]').setAttribute('aria-expanded', 'false');
  };
  const closeAll = () => document.querySelectorAll('.theme-control').forEach(close);
  const open = control => {
    closeAll();
    const menu = control.querySelector('.theme-menu');
    menu.hidden = false;
    const triggerRect = control.querySelector('[data-theme-trigger]').getBoundingClientRect();
    const roomBelow = innerHeight - triggerRect.bottom;
    control.dataset.menuPlacement = roomBelow >= menu.offsetHeight + 8 || roomBelow >= triggerRect.top ? 'below' : 'above';
    control.querySelector('[data-theme-trigger]').setAttribute('aria-expanded', 'true');
    control.querySelector('[aria-checked="true"]').focus({preventScroll:true});
  };
  read();
  apply(); // This blocking head script applies the preference before styles paint.
  document.addEventListener('click', event => {
    const control = event.target.closest('.theme-control');
    if (!control) { closeAll(); return; }
    const choice = event.target.closest('[data-theme-choice]');
    const trigger = control.querySelector('[data-theme-trigger]');
    if (choice) {
      preference = valid(choice.dataset.themeChoice);
      try { localStorage.setItem(key, preference); } catch { /* Switching works without storage. */ }
      apply();
      close(control);
      trigger.focus({preventScroll:true});
    } else if (event.target.closest('[data-theme-trigger]')) {
      if (trigger.getAttribute('aria-expanded') === 'true') close(control);
      else open(control);
    }
  });
  document.addEventListener('keydown', event => {
    const control = event.target.closest('.theme-control');
    if (!control) return;
    const trigger = control.querySelector('[data-theme-trigger]');
    const expanded = trigger.getAttribute('aria-expanded') === 'true';
    if (event.key === 'Escape' && expanded) {
      event.preventDefault(); close(control); trigger.focus({preventScroll:true});
    } else if (event.key === 'Tab') close(control);
    else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      if (!expanded) { open(control); return; }
      const choices = [...control.querySelectorAll('[data-theme-choice]')];
      const current = choices.indexOf(document.activeElement);
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? choices.length - 1
        : (current + (event.key === 'ArrowDown' ? 1 : -1) + choices.length) % choices.length;
      choices[index].focus();
    }
  });
  document.addEventListener('focusin', event => {
    document.querySelectorAll('.theme-control').forEach(control => {
      if (!control.contains(event.target)) close(control);
    });
  });
  // A viewport change must not leave a menu open in a now-hidden header/sidebar.
  window.addEventListener('resize', closeAll);
  document.addEventListener('DOMContentLoaded', apply);
  system.addEventListener('change', () => { if (preference === 'system') apply(); });
  window.addEventListener('storage', event => { if (event.key === key || event.key === null) { read(); apply(); } });
  window.addEventListener('pageshow', () => { read(); apply(); closeAll(); });
})();
