(() => {
  const lastKey = 'handbook-last-viewed';
  const returnKey = 'handbook-gallery-return';
  const cards = [...document.querySelectorAll('.handbook-card-link')];
  const read = key => { try { return sessionStorage.getItem(key); } catch { return null; } };
  const write = (key, value) => { try { sessionStorage.setItem(key, value); } catch { /* History and referrer remain available. */ } };
  const consumeReturn = () => {
    const path = read(returnKey);
    try { sessionStorage.removeItem(returnKey); } catch { /* Storage may be disabled. */ }
    return path;
  };
  const remember = path => {
    try { history.replaceState({...history.state, handbookReturnPath: path}, ''); } catch { /* Keep ordinary navigation. */ }
  };
  const ordinaryClick = (event, link) => !event.defaultPrevented && event.button === 0
    && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
    && (!link.target || link.target === '_self');

  if (!cards.length) {
    // Every hosted reader loads this script, including directly opened editions.
    if (!document.querySelector('.sidebar .handbooks-return')) return;
    window.addEventListener('pageshow', () => write(lastKey, location.pathname));
    document.querySelectorAll('.sidebar a[href="/"], .mobile-bar a[href="/"]').forEach(link => {
      link.addEventListener('click', event => {
        if (ordinaryClick(event, link)) write(returnKey, location.pathname);
      });
    });
    return;
  }

  cards.forEach(card => card.addEventListener('click', event => {
    if (ordinaryClick(event, card)) remember(new URL(card.href).pathname);
  }));
  document.addEventListener('focusout', event => {
    event.target.classList?.remove('is-return-focus');
  });
  window.addEventListener('pageshow', event => {
    const historyReturn = event.persisted || performance.getEntriesByType('navigation')[0]?.type === 'back_forward';
    let fromReader;
    try {
      const referrer = new URL(document.referrer);
      if (referrer.origin === location.origin) fromReader = referrer.pathname;
    } catch { /* A fresh gallery visit may have no referrer. */ }
    const paths = [consumeReturn(), historyReturn ? read(lastKey) : null, history.state?.handbookReturnPath, fromReader];
    const card = paths.map(path => cards.find(item => new URL(item.href).pathname === path)).find(Boolean);
    if (!card) return;
    remember(new URL(card.href).pathname);
    requestAnimationFrame(() => {
      cards.forEach(item => item.classList.remove('is-return-focus'));
      card.classList.add('is-return-focus');
      card.focus({preventScroll: true});
      const bounds = card.getBoundingClientRect();
      if (bounds.top < 0 || bounds.bottom > innerHeight) card.scrollIntoView({block: 'nearest', behavior: 'instant'});
    });
  });
})();
