// Compares scrape results against DB and applies INSERT/UPDATE/DISCONTINUE.
// "Discontinued" = present in DB but not in scrape → status flipped, NOT deleted.
'use strict';

function applyDiff(db, brandRow, scrapedItems, log) {
  const stats = { added: 0, updated: 0, removed: 0 };

  const findOne = db.prepare(`SELECT * FROM products WHERE brand_id=? AND oem_id=?`);
  const insert  = db.prepare(`
    INSERT INTO products (brand_id, category, oem_id, name, model, description,
                          specs_json, primary_image, source_url, status,
                          first_seen_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
  const update  = db.prepare(`
    UPDATE products
       SET category=?, name=?, model=?, description=?, specs_json=?,
           primary_image=COALESCE(?, primary_image),
           source_url=?, status='active', last_seen_at=CURRENT_TIMESTAMP
     WHERE id=?
  `);
  const insertImg = db.prepare(`
    INSERT INTO product_images (product_id, path, source_url, sha256, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `);
  const clearImgs = db.prepare(`DELETE FROM product_images WHERE product_id=?`);
  const allCurrent = db.prepare(
    `SELECT id, oem_id FROM products WHERE brand_id=? AND status<>'discontinued'`
  );
  const markDiscontinued = db.prepare(
    `UPDATE products SET status='discontinued', last_seen_at=CURRENT_TIMESTAMP WHERE id=?`
  );

  const scrapedIds = new Set();

  const tx = db.transaction(() => {
    for (const it of scrapedItems) {
      if (!it || !it.oem_id) continue;
      scrapedIds.add(it.oem_id);
      const existing = findOne.get(brandRow.id, it.oem_id);
      const specsJson = it.specs ? JSON.stringify(it.specs) : null;
      const primary = (it.images && it.images[0] && it.images[0].path) || null;

      if (!existing) {
        const r = insert.run(brandRow.id, it.category || null, it.oem_id, it.name,
                             it.model || null, it.description || null, specsJson,
                             primary, it.source_url || null);
        for (let i = 0; i < (it.images || []).length; i++) {
          const im = it.images[i];
          if (im && im.path) insertImg.run(r.lastInsertRowid, im.path, im.source_url, im.sha256, i);
        }
        stats.added++;
      } else {
        update.run(it.category || existing.category, it.name, it.model || existing.model,
                   it.description || existing.description, specsJson,
                   primary, it.source_url || existing.source_url, existing.id);
        // refresh image rows if scraper returned images
        if (it.images && it.images.length) {
          clearImgs.run(existing.id);
          for (let i = 0; i < it.images.length; i++) {
            const im = it.images[i];
            if (im && im.path) insertImg.run(existing.id, im.path, im.source_url, im.sha256, i);
          }
        }
        stats.updated++;
      }
    }
    // discontinued sweep
    for (const row of allCurrent.all(brandRow.id)) {
      if (!scrapedIds.has(row.oem_id)) {
        markDiscontinued.run(row.id);
        stats.removed++;
      }
    }
  });

  tx();
  log && log.info({ brand: brandRow.name, ...stats }, 'diff applied');
  return stats;
}

module.exports = { applyDiff };
