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
export function validatePublicationFront(html, edition) {
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
    title: includes(cover, edition.title) && /<h1\b/.test(cover),
    subtitle: /class="cover-subtitle"[^>]*>[^<]+/.test(cover),
    authorCredit: includes(credit, edition.author) && hasHref(credit, edition.authorSite),
    edition: includes(cover, dateLine),
    exploreAction: /<a\b[^>]*href="#contents"[^>]*>Explore the handbook<\/a>/.test(cover) && /id="contents"/.test(html),
    pdfAction: download.some(x=>hasHref(x, edition.pdfUrl) && includes(x, `${edition.pages} pages`)),
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
