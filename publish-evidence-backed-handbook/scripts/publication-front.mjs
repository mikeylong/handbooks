const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
function element(html, tag, className) {
  const start = new RegExp(`<${tag}\\b[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>`).exec(html);
  if (!start) return '';
  const tokens = new RegExp(`</?${tag}\\b[^>]*>`, 'g');
  tokens.lastIndex = start.index;
  let depth = 0;
  for (let token; (token = tokens.exec(html));) {
    depth += token[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return html.slice(start.index, tokens.lastIndex);
  }
  return '';
}
export function validateReaderNavigation(html, title) {
  const sidebar = element(html, 'aside', 'sidebar');
  const returns = [...sidebar.matchAll(/<a\b[^>]*href="\/"[^>]*>[\s\S]*?<\/a>/g)].map(match => match[0]);
  const links = [...html.matchAll(/<link\b[^>]*>/g)].map(match => match[0]);
  const failed = [];
  if (returns.length !== 1 || !(returns[0].match(/\bclass="([^"]*)"/)?.[1].split(/\s+/) ?? []).includes('handbooks-return')
    || !/aria-label="All handbooks"/.test(returns[0]) || !returns[0].includes('← All handbooks')) failed.push('sidebarReturn');
  if (returns.some(link => /\bstyle=/.test(link))) failed.push('sidebarReturnInlineStyle');
  if (!links.some(link => /rel="stylesheet"/.test(link) && /href="\/gallery\.css"/.test(link))) failed.push('sharedNavigationStyles');
  if (!/<script\b[^>]*src="\/gallery-focus\.js"[^>]*\bdefer\b/.test(html)) failed.push('galleryReturnFocus');
  if (failed.length) throw new Error(`${title}: inconsistent reader navigation (${failed.join(', ')})`);
  return {title, status:'passed'};
}

// Review schedules are publication metadata, independent of frozen reader/PDF packages.
function reviewTimeLabel(review) {
  return new Intl.DateTimeFormat('en-US', {weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZone: review.timeZone, timeZoneName: 'longGeneric'})
    .format(new Date(review.at)).replace(/[\u00a0\u202f]/g, ' ').replace(/\bTime\b/g, 'time');
}
export function installPublicationReview(html, review) {
  let current = element(html, 'section', 'release-window');
  if (!current) throw new Error('Reader lacks a publication review panel');
  const products = element(current, 'p', 'release-window-products');
  if (products) {
    const cleaned = current.replace(products, '');
    html = html.replace(current, cleaned);
    current = cleaned;
  }
  if (!review) {
    if (current.includes('data-review-state="unscheduled"')) return html;
    return html.replace(current, `<section class="release-window site-only" aria-labelledby="release-window-title" aria-describedby="release-window-policy" data-review-state="unscheduled"><div class="release-window-heading"><p class="release-window-label" id="release-window-title">Next version review</p></div><p class="release-window-schedule">The next review has not been scheduled.</p><p class="release-window-policy" id="release-window-policy">Site and PDF updates publish together after manual review.</p></section>`);
  }
  if (Number.isNaN(Date.parse(review.at)) || !review.timeZone || !review.rrule) {
    throw new Error('Incomplete publication review schedule');
  }
  const attributes = `data-release-window data-release-at="${escape(review.at)}" data-release-time-zone="${escape(review.timeZone)}" data-release-rrule="${escape(review.rrule)}"`;
  const time = `<time datetime="${escape(review.at)}" data-release-time>${escape(reviewTimeLabel(review))}</time>`;
  // Keep already-correct frozen markup byte-identical.
  if (current.includes(attributes) && current.includes(time) && current.includes('data-release-status')
    && ['days', 'hours', 'minutes', 'seconds'].every(unit => current.includes(`data-countdown-${unit}`))) return html;
  const countdown = ['days', 'hours', 'minutes', 'seconds'].map(unit => `<span><strong data-countdown-${unit}>00</strong><small>${unit[0].toUpperCase() + unit.slice(1)}</small></span>`).join('');
  return html.replace(current, `<section class="release-window site-only" aria-labelledby="release-window-title" aria-describedby="release-window-schedule release-window-policy" ${attributes}>
<div class="release-window-heading"><p class="release-window-label" id="release-window-title" data-release-status>Next version review</p></div>
<div class="release-countdown js-only" data-release-countdown aria-hidden="true">${countdown}</div>
<p class="release-window-schedule" id="release-window-schedule">Scheduled for ${time}.</p>
<p class="release-window-policy" id="release-window-policy">Site and PDF updates publish together after manual review.</p></section>`);
}

export function validatePublicationFront(html, edition) {
  validateReaderNavigation(html, edition.title);
  validateReaderBodyStart(html, edition.title);
  const cover = element(html, 'section', 'cover');
  const sidebar = element(html, 'div', 'sidebar-meta');
  const credit = element(cover, 'p', 'cover-credit');
  const date = new Date(`${edition.date}T12:00:00Z`).toLocaleDateString('en-US', {month:'long', day:'numeric', year:'numeric', timeZone:'UTC'});
  const dateLine = `${date} · Version ${edition.version}`;
  const includes = (text, value) => text.includes(escape(value));
  const hasHref = (text, url) => text.includes(`href="${escape(url)}"`);
  const download = [...cover.matchAll(/<a\b[^>]*\bdownload\b[^>]*>[\s\S]*?<\/a>/g)].map(x=>x[0]);
  const review = element(cover, 'section', 'release-window');
  const required = {
    title: includes(cover.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? "", edition.title),
    subtitle: /class="cover-subtitle"[^>]*>[^<]+/.test(cover),
    authorCredit: includes(credit, edition.author) && hasHref(credit, edition.authorSite),
    edition: includes(cover, dateLine),
    exploreAction: /<a\b[^>]*href="#contents"[^>]*>Explore the handbook<\/a>/.test(cover) && /id="contents"/.test(html),
    pdfAction: download.some(x=>hasHref(x, edition.pdfUrl) && includes(x.replace(/<[^>]+>/g, ""), `${edition.pages} pages`)),
    sidebarAuthor: includes(sidebar, edition.author) && hasHref(sidebar, edition.authorSite),
    sidebarEdition: hasHref(sidebar, edition.editionUrl) && includes(sidebar, date),
    sidebarRelease: hasHref(sidebar, edition.releaseUrl) && includes(sidebar, `Version ${edition.version}`),
    sidebarSearch: /data-open-search/.test(sidebar) && /aria-controls="search-dialog"/.test(sidebar),
    sidebarDownload: hasHref(sidebar, edition.pdfUrl) && /\bdownload\b/.test(sidebar),
    reviewPolicy: review.includes('Site and PDF updates publish together after manual review.'),
    reviewLabel: !review.includes('release-window-products') && !review.includes('Site + PDF'),
    reviewState: edition.review
      ? review.includes(`data-release-at="${escape(edition.review.at)}"`) && review.includes(`data-release-time-zone="${escape(edition.review.timeZone)}"`) && review.includes(`data-release-rrule="${escape(edition.review.rrule)}"`) && review.includes('data-release-window') && review.includes('data-release-status') && review.includes('data-release-countdown') && ['days', 'hours', 'minutes', 'seconds'].every(unit => review.includes(`data-countdown-${unit}`)) && !Number.isNaN(Date.parse(edition.review.at)) && review.includes(`<time datetime="${escape(edition.review.at)}" data-release-time>${escape(reviewTimeLabel(edition.review))}</time>`)
      : review.includes('data-review-state="unscheduled"') && review.includes('The next review has not been scheduled.') && !review.includes('data-release-countdown') && !review.includes('data-release-at'),
  };
  const failed = Object.entries(required).filter(([,passed])=>!passed).map(([name])=>name);
  if (failed.length) throw new Error(`${edition.title}: incomplete publication front page (${failed.join(', ')})`);
  return {title:edition.title, status:'passed', checks:Object.keys(required).length};
}

export function validateReaderBodyStart(html, title) {
  const main = html.match(/<main\b[^>]*id="main-content"[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? '';
  const contents = element(main, 'section', 'contents-page');
  const body = contents ? main.slice(main.indexOf(contents) + contents.length).trimStart() : '';
  if (!/^<section\b[^>]*class="[^"]*\bchapter\b/.test(body)) {
    throw new Error(`${title}: stray content between Contents and the first chapter`);
  }
  return {title, status:'passed'};
}

export function validateGalleryPublications(html, validatedPaths) {
  if (/\bdata-(?:pdf-downloads|pdf-theme|markdown-download)\b|<a\b[^>]*\bdownload(?:\s|=|>)/.test(html)) throw new Error('Gallery must open handbooks without download controls');
  if (!/<script\b[^>]*src="\/gallery-focus\.js"[^>]*\bdefer\b/.test(html)) throw new Error('Gallery lacks return-focus behavior');
  const cards = [...html.matchAll(/<a\b[^>]*class="[^"]*\bhandbook-card-link\b[^"]*"[^>]*>/g)];
  if (!cards.length) throw new Error('The gallery has no published titles');
  for (const [card] of cards) {
    const path = card.match(/href="([^"]+)"/)?.[1];
    if (!validatedPaths.includes(path)) throw new Error(`Gallery title lacks publication-front validation: ${path}`);
  }
}
