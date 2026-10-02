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
    sidebarRepository: hasHref(sidebar, edition.repository) && includes(sidebar, date),
    sidebarRelease: hasHref(sidebar, edition.releaseUrl) && includes(sidebar, `Version ${edition.version}`),
    sidebarSearch: /data-open-search/.test(sidebar) && /aria-controls="search-dialog"/.test(sidebar),
    sidebarDownload: hasHref(sidebar, edition.pdfUrl) && /\bdownload\b/.test(sidebar),
    reviewPolicy: review.includes('Site + PDF') && review.includes('Site and PDF updates publish together after manual review.'),
    reviewState: edition.review
      ? review.includes(`data-release-at="${escape(edition.review.at)}"`) && review.includes(`data-release-time-zone="${escape(edition.review.timeZone)}"`) && review.includes(`data-release-rrule="${escape(edition.review.rrule)}"`) && review.includes('data-release-countdown') && !Number.isNaN(Date.parse(edition.review.at))
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
  if (!/<script\b[^>]*src="\/gallery-focus\.js"[^>]*\bdefer\b/.test(html)) throw new Error('Gallery lacks return-focus behavior');
  const cards = [...html.matchAll(/<a\b[^>]*class="[^"]*\bhandbook-card-link\b[^"]*"[^>]*>/g)];
  if (!cards.length) throw new Error('The gallery has no published titles');
  for (const [card] of cards) {
    const path = card.match(/href="([^"]+)"/)?.[1];
    if (!validatedPaths.includes(path)) throw new Error(`Gallery title lacks publication-front validation: ${path}`);
  }
}
