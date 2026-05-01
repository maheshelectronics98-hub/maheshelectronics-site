// Mahesh Electronics — shared JS
(function(){
  'use strict';

  // WhatsApp number — replace with real number before launch
  window.ME_WHATSAPP = '919998874634'; // Rajesh — Mahesh Electronics

  // Build a wa.me deep link with a pre-filled message
  window.waLink = function(message){
    return 'https://wa.me/' + window.ME_WHATSAPP + '?text=' + encodeURIComponent(message || '');
  };

  // Wire every [data-wa] element to open WhatsApp with its data-wa-msg
  document.addEventListener('DOMContentLoaded', function(){
    // Inject "Skip to main content" link as the first body child (a11y)
    if(!document.querySelector('.skip-link')){
      var skip = document.createElement('a');
      skip.className = 'skip-link';
      skip.href = '#main';
      skip.textContent = 'Skip to main content';
      document.body.insertBefore(skip, document.body.firstChild);
    }

document.querySelectorAll('[data-wa]').forEach(function(el){
      var msg = el.getAttribute('data-wa-msg') || 'Hi Mahesh Electronics, I have an enquiry.';
      el.setAttribute('href', window.waLink(msg));
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener');
    });

    // Mobile nav toggle (with aria-expanded for screen readers)
    var toggle = document.querySelector('.nav-toggle');
    var menu = document.querySelector('.nav ul');
    if(toggle && menu){
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', 'primary-nav');
      menu.setAttribute('id', 'primary-nav');
      toggle.addEventListener('click', function(){
        var open = menu.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }

    // Scroll reveal
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){ e.target.classList.add('visible'); io.unobserve(e.target); }
      });
    },{threshold:0.12});
    document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });

    // Simple product filter chips (shop/gaming pages)
    document.querySelectorAll('[data-filter-group]').forEach(function(group){
      var chips = group.querySelectorAll('.fchip');
      var targetSel = group.getAttribute('data-filter-target');
      chips.forEach(function(chip){
        chip.addEventListener('click', function(){
          chips.forEach(function(c){ c.classList.remove('active'); });
          chip.classList.add('active');
          var val = chip.getAttribute('data-filter');
          document.querySelectorAll(targetSel).forEach(function(item){
            var tags = (item.getAttribute('data-tags')||'').toLowerCase();
            item.style.display = (val === 'all' || tags.indexOf(val.toLowerCase()) !== -1) ? '' : 'none';
          });
        });
      });
    });

    // Generic quote form → WhatsApp
    document.querySelectorAll('form[data-wa-form]').forEach(function(form){
      form.addEventListener('submit', function(e){
        e.preventDefault();
        var data = new FormData(form);
        var lines = [form.getAttribute('data-wa-form')];
        data.forEach(function(v,k){ if(v) lines.push(k + ': ' + v); });
        window.open(window.waLink(lines.join('\n')), '_blank');
      });
    });
  });
})();
