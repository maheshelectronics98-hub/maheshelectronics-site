// Renders <div class="p-card"> blocks from DB rows using the EXISTING markup
// pattern from gaming.html line 44 — visual design must stay identical.
'use strict';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function renderCard(p, tag) {
  const img = p.primary_image
    ? `/${p.primary_image.replace(/^\/+/, '')}`
    : 'https://via.placeholder.com/600x450?text=Image+pending';
  const desc = esc(p.description || (p.model ? `Model ${p.model}` : ''));
  const waMsg = `Hi, I'd like a quote for ${p.brand} ${p.name}.`;
  // data-tags drives the filter chips on shop.html — fall back to category.
  const tagAttr = tag || (p.category ? p.category.toLowerCase() : '');
  // data-brand drives the ?brand= filter on shop.html (set by catalog.html links).
  const brandAttr = (p.brand || '').toLowerCase().replace(/\s+/g, '-');
  return `<div class="p-card" data-tags="${esc(tagAttr)}" data-brand="${esc(brandAttr)}">`
    + `<div class="p-img"><img src="${esc(img)}" alt="${esc(p.brand)} ${esc(p.name)}" loading="lazy" style="object-fit:contain;background:#fff"></div>`
    + `<div class="p-body">`
    +   `<div class="p-brand">${esc(p.brand)}</div>`
    +   `<div class="p-name">${esc(p.name)}</div>`
    +   `<div class="p-desc">${desc}</div>`
    +   `<div class="p-foot"><a class="btn btn-p btn-sm" href="#" data-wa data-wa-msg="${esc(waMsg)}">Quote</a></div>`
    + `</div>`
    + `</div>`;
}

function renderProducts(db, attrs) {
  const where = ['p.status = ?'];
  const params = ['active'];
  if (attrs.brand)    { where.push('b.name = ?'); params.push(attrs.brand); }
  if (attrs.category) { where.push('p.category = ?'); params.push(attrs.category); }
  const limit = Math.max(1, Math.min(100, parseInt(attrs.limit || '12', 10)));
  const sql = `
    SELECT p.id, b.name AS brand, p.category, p.name, p.model, p.description,
           p.primary_image
    FROM products p JOIN brands b ON b.id = p.brand_id
    WHERE ${where.join(' AND ')}
    ORDER BY p.last_seen_at DESC
    LIMIT ${limit}
  `;
  const rows = db.prepare(sql).all(...params);
  if (!rows.length) {
    return `<!-- products: 0 results for ${esc(JSON.stringify(attrs))} -->`;
  }
  return rows.map(r => renderCard(r, attrs.tag)).join('\n');
}

module.exports = { renderProducts, renderCard };
