// Laptop Finder — 4-step requirement form → recommendations + WhatsApp quote
(function(){
  'use strict';

  var LAPTOPS = [
    {brand:'HP', model:'Pavilion 14', use:['study','office'], budget:'40-60', specs:'i5 13th · 16GB · 512GB · 14"', price:62000, features:['lightweight']},
    {brand:'HP', model:'Victus 15', use:['gaming','programming'], budget:'60-90', specs:'Ryzen 5 · 16GB · RTX 3050 · 144Hz', price:72000, features:['gpu']},
    {brand:'HP', model:'Omen 16', use:['gaming','design'], budget:'90+', specs:'i7 · 32GB · RTX 4070 · 240Hz QHD', price:168000, features:['gpu','oled']},
    {brand:'Lenovo', model:'IdeaPad Slim 3', use:['study','office'], budget:'under-40', specs:'Ryzen 5 · 8GB · 512GB · 15"', price:38500, features:['lightweight']},
    {brand:'Lenovo', model:'ThinkPad E14', use:['office','business','programming'], budget:'60-90', specs:'i5 13th · 16GB · 512GB · MIL-STD', price:78000, features:['battery']},
    {brand:'Lenovo', model:'Legion 5 Pro', use:['gaming','design'], budget:'90+', specs:'Ryzen 7 · 16GB · RTX 4060 · 165Hz', price:124000, features:['gpu']},
    {brand:'Lenovo', model:'Yoga 7i', use:['design','study'], budget:'60-90', specs:'i5 · 16GB · OLED · 2-in-1', price:89000, features:['touch','2in1','oled']},
    {brand:'Dell', model:'Inspiron 15 3520', use:['office','study'], budget:'40-60', specs:'i5 12th · 16GB · 512GB', price:54000, features:['lightweight']},
    {brand:'Dell', model:'Latitude 5450', use:['business','office'], budget:'90+', specs:'i7 · 16GB · 512GB · 3yr ADP', price:112000, features:['battery']},
    {brand:'Dell', model:'G15 Gaming', use:['gaming'], budget:'60-90', specs:'Ryzen 7 · 16GB · RTX 4050 · 120Hz', price:88000, features:['gpu']},
    {brand:'Asus', model:'Vivobook 15', use:['study','office'], budget:'under-40', specs:'i3 · 8GB · 512GB · 15.6"', price:36500, features:['lightweight']},
    {brand:'Asus', model:'Zenbook 14 OLED', use:['design','business','office'], budget:'90+', specs:'i7 · 16GB · 14" OLED · 1kg', price:108000, features:['lightweight','oled','battery']},
    {brand:'Asus', model:'ROG Strix G16', use:['gaming','design'], budget:'90+', specs:'i9 · 16GB · RTX 4070 · 240Hz', price:185000, features:['gpu']},
    {brand:'Apple', model:'MacBook Air M3', use:['design','study','business'], budget:'90+', specs:'M3 · 8GB · 256GB · 13.6"', price:114900, features:['lightweight','battery']},
    {brand:'Apple', model:'MacBook Pro 14 M3', use:['design','programming'], budget:'90+', specs:'M3 Pro · 18GB · 512GB · XDR', price:199900, features:['battery']}
  ];

  var state = {use:null, budget:null, features:[], brand:null};
  var step = 1;
  var TOTAL_STEPS = 4;

  function $(s){ return document.querySelector(s); }
  function rupees(n){ return '₹' + n.toLocaleString('en-IN'); }

  function score(l){
    var s = 0;
    if(state.use && l.use.indexOf(state.use) !== -1) s += 5;
    if(state.budget === l.budget) s += 4;
    else if(state.budget && budgetNear(state.budget, l.budget)) s += 2;
    if(state.brand && state.brand !== 'any'){ if(l.brand.toLowerCase() === state.brand.toLowerCase()) s += 3; else s -= 2; }
    state.features.forEach(function(f){ if(l.features.indexOf(f) !== -1) s += 2; });
    return s;
  }
  function budgetNear(a,b){
    var order = ['under-40','40-60','60-90','90+'];
    return Math.abs(order.indexOf(a) - order.indexOf(b)) === 1;
  }

  function render(){
    for(var i=1;i<=TOTAL_STEPS;i++){
      var el = document.getElementById('lf-step-'+i);
      if(el) el.style.display = (i === step ? 'block' : 'none');
    }
    var results = $('#lf-results');
    if(results) results.style.display = (step > TOTAL_STEPS ? 'block' : 'none');

    document.querySelectorAll('#lf-nav .step-pill').forEach(function(p, idx){
      p.className = 'step-pill' + (idx+1 === step ? ' active' : (idx+1 < step ? ' done' : ''));
    });

    if(step > TOTAL_STEPS) renderResults();
    window.scrollTo({top: 200, behavior:'smooth'});
  }

  function renderResults(){
    var sorted = LAPTOPS.map(function(l){ return {l:l, s:score(l)}; })
      .sort(function(a,b){ return b.s - a.s; })
      .slice(0,3)
      .map(function(x){ return x.l; });

    var html = '<h2>Top matches for you</h2>' +
      '<p class="muted">Based on: ' + summaryLine() + '</p>' +
      '<div class="p-grid mt-3" style="grid-template-columns:repeat(3,1fr)">';
    sorted.forEach(function(l){
      html += '<div class="p-card"><div class="p-img">💻</div><div class="p-body">' +
        '<div class="p-brand">' + l.brand + '</div>' +
        '<div class="p-name">' + l.model + '</div>' +
        '<div class="p-desc">' + l.specs + '</div>' +
        '<div class="p-foot"><div class="p-price">' + rupees(l.price) + '<small>indicative</small></div></div>' +
        '</div></div>';
    });
    html += '</div>';
    html += '<div class="mt-4 center"><button class="btn btn-wa btn-lg" id="lf-wa">💬 Get Quote on WhatsApp</button> ' +
      '<button class="btn btn-g" id="lf-restart" style="margin-left:8px">Start over</button></div>';
    $('#lf-results').innerHTML = html;

    $('#lf-wa').onclick = function(){
      var lines = ['*Laptop Enquiry — Mahesh Electronics*', '', summaryLine(), '', '*Interested in:*'];
      sorted.forEach(function(l){ lines.push('• ' + l.brand + ' ' + l.model + ' (' + l.specs + ') — ' + rupees(l.price)); });
      window.open(window.waLink(lines.join('\n')), '_blank');
    };
    $('#lf-restart').onclick = function(){ state = {use:null,budget:null,features:[],brand:null}; step = 1; render(); document.querySelectorAll('.lf-opt').forEach(function(o){ o.classList.remove('selected'); }); };
  }

  function summaryLine(){
    var useMap = {study:'Study',office:'Office',design:'Design/Creative',gaming:'Gaming',programming:'Programming',business:'Business travel'};
    var bMap = {'under-40':'under ₹40k','40-60':'₹40–60k','60-90':'₹60–90k','90+':'₹90k+'};
    var parts = [];
    if(state.use) parts.push(useMap[state.use]);
    if(state.budget) parts.push('budget ' + bMap[state.budget]);
    if(state.features.length) parts.push('needs: ' + state.features.join(', '));
    if(state.brand && state.brand !== 'any') parts.push('prefers ' + state.brand);
    return parts.join(' · ') || '—';
  }

  document.addEventListener('DOMContentLoaded', function(){
    if(!document.getElementById('lf-root')) return;

    document.querySelectorAll('.lf-opt').forEach(function(opt){
      opt.addEventListener('click', function(){
        var key = opt.getAttribute('data-key');
        var val = opt.getAttribute('data-value');
        var s = opt.closest('[data-step]');
        if(key === 'features'){
          opt.classList.toggle('selected');
          state.features = Array.from(s.querySelectorAll('.lf-opt.selected')).map(function(o){ return o.getAttribute('data-value'); });
          return;
        }
        s.querySelectorAll('.lf-opt').forEach(function(o){ o.classList.remove('selected'); });
        opt.classList.add('selected');
        state[key] = val;
      });
    });

    document.querySelectorAll('[data-lf-next]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var reqKey = btn.getAttribute('data-lf-next');
        if(reqKey && reqKey !== 'features' && !state[reqKey]){
          alert('Please pick an option to continue.'); return;
        }
        step++; render();
      });
    });
    document.querySelectorAll('[data-lf-back]').forEach(function(btn){
      btn.addEventListener('click', function(){ step = Math.max(1, step-1); render(); });
    });

    render();
  });
})();
