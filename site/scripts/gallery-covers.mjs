// Use the reader's publication cover as the gallery's source of truth.
// These are text previews, so a new edition never needs a separate screenshot.
export function renderGalleryCover(reader) {
  const cover = reader.match(/<section\b[^>]*class="cover"[^>]*>([\s\S]*?)<section\b/)?.[1];
  const fields = {
    title: cover?.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1],
    subtitle: cover?.match(/<p\b[^>]*class="cover-subtitle"[^>]*>([\s\S]*?)<\/p>/)?.[1],
    credit: cover?.match(/<p\b[^>]*class="cover-credit"[^>]*>([\s\S]*?)<\/p>/)?.[1],
    date: cover?.match(/<p\b[^>]*class="cover-date"[^>]*>([\s\S]*?)<\/p>/)?.[1],
  };
  for (const [key, value] of Object.entries(fields)) {
    if (!value?.trim()) throw new Error(`Gallery cover is missing reader ${key}`);
    // Keep escaped text; remove links to avoid interactive content inside a card.
    fields[key] = value.replace(/<[^>]+>/g, '');
  }
  return `<div class="handbook-cover" aria-hidden="true"><div class="gallery-cover-rule"></div><div class="gallery-cover-copy"><h2>${fields.title}</h2><p class="gallery-cover-subtitle">${fields.subtitle}</p></div><p class="gallery-cover-credit">${fields.credit}</p><p class="gallery-cover-date">${fields.date}</p><div class="gallery-cover-footer-rule"></div></div>`;
}

export function validateGalleryCover(gallery, path, reader) {
  const card = [...gallery.matchAll(/<a\b[^>]*class="handbook-card-link"[^>]*>[\s\S]*?<\/a>/g)]
    .find(([markup]) => markup.includes(`href="${path}"`))?.[0];
  if (!card?.includes(renderGalleryCover(reader))) {
    throw new Error(`Gallery cover does not match the published reader: ${path}`);
  }
}

// Published content-edition dates determine DOM order; same-day cards keep their order.
export function sortGalleryCards(gallery, editions) {
  const dates = new Map();
  for (const {id, date} of editions) {
    const parsed = new Date(`${date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
      throw new Error(`Gallery edition date is invalid: ${id}`);
    }
    const path = `/${id}/`;
    if (dates.has(path)) throw new Error(`Duplicate gallery edition: ${id}`);
    dates.set(path, date);
  }
  const pattern = /<article\b[^>]*class="handbook-card"[^>]*>[\s\S]*?<\/article>/g;
  const seen = new Set();
  const cards = [...gallery.matchAll(pattern)].map(([markup]) => {
    const path = markup.match(/class="handbook-card-link"[^>]*href="([^"]+)"/)?.[1];
    if (!dates.has(path) || seen.has(path)) throw new Error(`Gallery card has no unique published edition: ${path}`);
    seen.add(path);
    return {markup, date: dates.get(path)};
  });
  if (cards.length !== dates.size) throw new Error('Gallery cards do not match published editions');
  cards.sort((a, b) => b.date.localeCompare(a.date));
  let index = 0;
  return gallery.replace(pattern, () => cards[index++].markup);
}
