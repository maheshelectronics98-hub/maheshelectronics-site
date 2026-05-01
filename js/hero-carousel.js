// Hero rotating product carousel — 15 products from our authorized brand catalog.
// Uses Unsplash CDN photos (free, hotlink-OK). On image load failure, falls back
// to a clean branded SVG tile so the slideshow never shows a broken image.
(function () {
  var SLIDES = [
    { brand: 'HP',        name: 'Pavilion / EliteBook Laptops',  icon: '💻', img: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=900&q=80' },
    { brand: 'Lenovo',    name: 'ThinkPad Business Series',      icon: '💼', img: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=900&q=80' },
    { brand: 'Acer',      name: 'Predator Gaming Laptops',       icon: '🎮', img: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=900&q=80' },
    { brand: 'Mahesh PC', name: 'Custom Gaming Rig — RGB Build', icon: '🖥', img: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=900&q=80' },
    { brand: 'Lapcare',   name: 'Mechanical Keyboards',          icon: '⌨️', img: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=900&q=80' },
    { brand: 'ViewSonic', name: 'Pro Reference Monitors',        icon: '🖥', img: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=900&q=80' },
    { brand: 'Canon',     name: 'PIXMA Zone Authorized',         icon: '🖨', img: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=900&q=80' },
    { brand: 'Hikvision', name: '4K CCTV — Free Site Survey',    icon: '📷', img: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=900&q=80' },
    { brand: 'HP / Acer', name: 'Tower & Rack Servers',          icon: '🗄', img: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=900&q=80' },
    { brand: 'LG',        name: 'OLED Smart Televisions',        icon: '📺', img: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=900&q=80' },
    { brand: 'HP',        name: 'Wireless Mouse & Combos',       icon: '🖱', img: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=900&q=80' },
    { brand: 'Sony',      name: 'PS5 Slim — In Stock',           icon: '🎮', img: 'https://images.unsplash.com/photo-1606318313846-8aef1d09cce8?w=900&q=80' },
    { brand: 'Vertiv',    name: 'Online UPS for Servers',        icon: '⚡', img: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=900&q=80' },
    { brand: 'Epson',     name: 'EcoTank & Projectors',          icon: '📽', img: 'https://images.unsplash.com/photo-1626379953822-baec19c3accd?w=900&q=80' },
    { brand: 'LG',        name: 'Refrigerators & Washing M/c',   icon: '🧊', img: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=900&q=80' }
  ];

  var root = document.getElementById('heroCarousel');
  if (!root) return;
  var track = root.querySelector('.hc-track');
  var dots  = root.querySelector('.hc-dots');
  var capB  = root.querySelector('.hc-brand');
  var capN  = root.querySelector('.hc-name');

  function fallbackSVG(s) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450">'
      + '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
      + '<stop offset="0" stop-color="#1F5FA8"/><stop offset="1" stop-color="#16447A"/></linearGradient></defs>'
      + '<rect width="600" height="450" fill="url(#g)"/>'
      + '<text x="300" y="210" font-size="140" text-anchor="middle" dominant-baseline="middle">' + s.icon + '</text>'
      + '<text x="300" y="330" fill="#fff" font-family="Quicksand,sans-serif" font-weight="700" font-size="34" text-anchor="middle">' + s.brand + '</text>'
      + '<text x="300" y="370" fill="#ffffffcc" font-family="Noto Sans,sans-serif" font-size="20" text-anchor="middle">' + s.name + '</text>'
      + '</svg>';
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  // Build all <img> tags up-front, stacked
  SLIDES.forEach(function (s, i) {
    var img = document.createElement('img');
    img.alt = s.brand + ' — ' + s.name;
    img.loading = i === 0 ? 'eager' : 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.onerror = function () { img.onerror = null; img.src = fallbackSVG(s); };
    img.src = s.img;
    track.appendChild(img);

    var d = document.createElement('button');
    d.type = 'button';
    d.setAttribute('aria-label', 'Show slide ' + (i + 1) + ' of ' + SLIDES.length);
    d.addEventListener('click', function(){ show(i); restart(); });
    dots.appendChild(d);
  });

  var imgs = track.querySelectorAll('img');
  var dotEls = dots.querySelectorAll('button');
  var idx = 0;

  function show(n) {
    imgs[idx].classList.remove('is-active');
    dotEls[idx].classList.remove('is-active');
    idx = (n + SLIDES.length) % SLIDES.length;
    imgs[idx].classList.add('is-active');
    dotEls[idx].classList.add('is-active');
    capB.textContent = SLIDES[idx].brand;
    capN.textContent = SLIDES[idx].name;
  }

  show(0);

  // Honor prefers-reduced-motion: don't auto-rotate; users can click dots.
  var rm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduce = rm && rm.matches;
  var timer = null;
  function start(){ if(!reduce) timer = setInterval(function(){ show(idx + 1); }, 3000); }
  function stop(){ if(timer){ clearInterval(timer); timer = null; } }
  function restart(){ stop(); start(); }
  start();

  // Pause on hover / focus
  root.addEventListener('mouseenter', stop);
  root.addEventListener('mouseleave', start);
  root.addEventListener('focusin', stop);
  root.addEventListener('focusout', start);

  // React to motion-pref toggle at runtime (DevTools emulation, OS change)
  if(rm && rm.addEventListener){
    rm.addEventListener('change', function(e){ reduce = e.matches; restart(); });
  }
})();
