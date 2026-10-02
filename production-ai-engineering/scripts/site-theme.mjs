const control = '<label class="theme-control"><span>Appearance</span><select data-theme-select aria-label="Appearance"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>';

export function addSiteTheme(html, gallery = false) {
  return html
    .replace('<header class="mobile-bar"><a href="/">← All handbooks</a>', '<header class="mobile-bar"><a class="handbooks-return-mobile" href="/" aria-label="All handbooks">←</a>')
    .replace('<meta name="color-scheme" content="light">', '<meta name="color-scheme" content="light dark">')
    .replace('<head>', '<head><script src="/theme.js"></script>')
    .replace('</head>', '<link rel="stylesheet" href="/theme.css"></head>')
    .replace(gallery ? '<div class="gallery-rule"' : '<div class="sidebar-meta">', gallery ? `${control}<div class="gallery-rule"` : `<div class="sidebar-meta">${control}`)
    .replace('<div class="mobile-actions">', `<div class="mobile-actions">${control}`);
}

export function validateSiteTheme(html, gallery = false) {
  if (!html.includes('<script src="/theme.js"></script>') || html.indexOf('/theme.js') > html.indexOf('rel="stylesheet"')
    || !html.includes('href="/theme.css"') || !html.includes('content="light dark"')
    || [...html.matchAll(/data-theme-select/g)].length !== (gallery ? 1 : 2)) {
    throw new Error('Site lacks shared appearance controls or theme initialization before paint');
  }
}
