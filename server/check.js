const { open } = require('./db');
const db = open();
const total = db.prepare('SELECT COUNT(*) AS n FROM products').get();
const hp = db.prepare(`SELECT COUNT(*) AS n FROM products WHERE brand_id=(SELECT id FROM brands WHERE name='HP')`).get();
const withImg = db.prepare(`SELECT COUNT(*) AS n FROM products WHERE primary_image IS NOT NULL`).get();
const sample = db.prepare(`
  SELECT b.name AS brand, p.category, p.name, p.model, p.primary_image
  FROM products p JOIN brands b ON b.id = p.brand_id
  WHERE b.name='HP'
  LIMIT 5
`).all();
const cats = db.prepare(`SELECT category, COUNT(*) AS n FROM products GROUP BY category`).all();
const images = db.prepare('SELECT COUNT(*) AS n FROM product_images').get();
console.log('Total products:', total.n);
console.log('HP products:', hp.n);
console.log('Products with primary image:', withImg.n);
console.log('Total image rows:', images.n);
console.log('Categories:', cats);
console.log('Sample:');
for (const r of sample) console.log(' -', r.brand, '|', r.category, '|', r.name, '|', r.model, '|', r.primary_image);
db.close();
