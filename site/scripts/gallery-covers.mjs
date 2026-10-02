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
