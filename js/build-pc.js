// Build Your Own PC — component picker → WhatsApp quote
(function(){
  'use strict';

  var STEPS = [
    {key:'useCase', label:'Use Case', options:[
      {tier:'Pick one', name:'Gaming', spec:'High FPS, RGB, AAA titles', price:0},
      {tier:'Pick one', name:'Workstation', spec:'Rendering, CAD, video edit', price:0},
      {tier:'Pick one', name:'Office / Home', spec:'Docs, browsing, media', price:0},
      {tier:'Pick one', name:'Student', spec:'Coding, study, light games', price:0}
    ]},
    {key:'cpu', label:'Processor', options:[
      {tier:'Budget', name:'Intel Core i3-14100F', spec:'4c/8t · LGA1700', price:11500},
      {tier:'Balanced', name:'Intel Core i5-14400F', spec:'10c/16t · LGA1700', price:19500},
      {tier:'Balanced', name:'AMD Ryzen 5 7600', spec:'6c/12t · AM5', price:21500},
      {tier:'Premium', name:'Intel Core i7-14700K', spec:'20c/28t · LGA1700', price:39500},
      {tier:'Premium', name:'AMD Ryzen 7 7800X3D', spec:'8c/16t · Gaming king', price:44500}
    ]},
    {key:'mobo', label:'Motherboard', options:[
      {tier:'Budget', name:'ASUS Prime B760M-K', spec:'mATX · LGA1700 · DDR5', price:11000},
      {tier:'Balanced', name:'MSI B650M Pro', spec:'mATX · AM5 · DDR5', price:14500},
      {tier:'Premium', name:'ASUS ROG Strix Z790-F', spec:'ATX · LGA1700 · WiFi 6E', price:32000}
    ]},
    {key:'ram', label:'RAM', options:[
      {tier:'Budget', name:'16GB DDR5-5600 (1x16)', spec:'Crucial', price:4200},
      {tier:'Balanced', name:'32GB DDR5-6000 (2x16)', spec:'Corsair Vengeance', price:9800},
      {tier:'Premium', name:'64GB DDR5-6000 (2x32)', spec:'G.Skill Trident Z', price:21500}
    ]},
    {key:'storage', label:'Storage', options:[
      {tier:'Budget', name:'512GB NVMe SSD', spec:'Crucial P3 Plus', price:3600},
      {tier:'Balanced', name:'1TB NVMe Gen4 SSD', spec:'Samsung 980 Pro', price:7800},
      {tier:'Premium', name:'2TB NVMe Gen4 SSD', spec:'Samsung 990 Pro', price:15500}
    ]},
    {key:'gpu', label:'Graphics Card', options:[
      {tier:'None', name:'Integrated only', spec:'No dedicated GPU', price:0},
      {tier:'Budget', name:'RTX 4060 8GB', spec:'1080p gaming', price:32000},
      {tier:'Balanced', name:'RTX 4060 Ti 16GB', spec:'1440p gaming', price:46000},
      {tier:'Premium', name:'RTX 4070 Super 12GB', spec:'1440p max / 4K', price:64000},
      {tier:'Premium', name:'RTX 4080 Super 16GB', spec:'4K max settings', price:108000}
    ]},
    {key:'psu', label:'Power Supply', options:[
      {tier:'Budget', name:'Corsair CV550 550W', spec:'80+ Bronze', price:3800},
      {tier:'Balanced', name:'Corsair RM750e 750W', spec:'80+ Gold · Modular', price:8500},
      {tier:'Premium', name:'Corsair RM850x 850W', spec:'80+ Gold · Full Modular', price:13500}
    ]},
    {key:'cabinet', label:'Cabinet', options:[
      {tier:'Budget', name:'Ant Esports ICE-120AG', spec:'mATX · 3 ARGB fans', price:3200},
      {tier:'Balanced', name:'NZXT H5 Flow', spec:'ATX · High airflow', price:8500},
      {tier:'Premium', name:'Lian Li Lancool 216', spec:'ATX · Premium airflow', price:11500}
    ]},
    {key:'cooling', label:'Cooling', options:[
      {tier:'Standard', name:'Stock Cooler', spec:'CPU-included cooler', price:0},
      {tier:'Balanced', name:'DeepCool AK620', spec:'Dual-tower air cooler', price:4800},
      {tier:'Premium', name:'NZXT Kraken 240 AIO', spec:'240mm liquid cooler', price:13500}
    ]}
  ];

  var state = {};
  var current = 0;
  var root, summary, stepPills, quoteForm;

  // rupees() / total() removed — pricing intentionally hidden site-wide.
  // Final quote is given on WhatsApp.

  function renderStepNav(){
    stepPills.innerHTML = '';
    STEPS.forEach(function(s, i){
      var pill = document.createElement('button');
      pill.className = 'step-pill' + (i === current ? ' active' : (state[s.key] ? ' done' : ''));
      pill.textContent = (i+1) + '. ' + s.label;
      pill.onclick = function(){ current = i; render(); };
      stepPills.appendChild(pill);
    });
  }

  function renderOptions(){
    var step = STEPS[current];
    var wrap = document.getElementById('bp-options');
    wrap.innerHTML = '<h2 style="margin-bottom:6px">Step ' + (current+1) + ' · ' + step.label + '</h2><p class="muted">Pick the option that fits your need. We confirm pricing & availability over WhatsApp.</p>';
    var grid = document.createElement('div');
    grid.className = 'opt-grid';
    step.options.forEach(function(opt, idx){
      var card = document.createElement('div');
      var selected = state[step.key] && state[step.key].name === opt.name;
      card.className = 'opt' + (selected ? ' selected' : '');
      // Pricing intentionally hidden — final quote is given on WhatsApp.
      card.innerHTML = '<div class="tier">' + opt.tier + '</div>' +
        '<h4>' + opt.name + '</h4>' +
        '<div class="spec">' + opt.spec + '</div>';
      card.onclick = function(){
        state[step.key] = opt;
        renderStepNav(); renderOptions(); renderSummary();
      };
      grid.appendChild(card);
    });
    wrap.appendChild(grid);

    var btns = document.createElement('div');
    btns.className = 'step-btns';
    if(current > 0){
      var prev = document.createElement('button');
      prev.className = 'btn btn-g';
      prev.textContent = '‹ Back';
      prev.onclick = function(){ current--; render(); };
      btns.appendChild(prev);
    }
    if(current < STEPS.length - 1){
      var next = document.createElement('button');
      next.className = 'btn btn-navy';
      next.textContent = 'Next ›';
      next.onclick = function(){ current++; render(); };
      btns.appendChild(next);
    } else {
      var finish = document.createElement('button');
      finish.className = 'btn btn-p';
      finish.textContent = '✓ Finish & Review';
      finish.onclick = function(){ document.getElementById('bp-contact').scrollIntoView({behavior:'smooth'}); };
      btns.appendChild(finish);
    }
    wrap.appendChild(btns);
  }

  function renderSummary(){
    var list = '<h3 style="font-size:1rem;margin-bottom:8px">Your Build</h3><ul class="summary-list">';
    var hasAny = false;
    STEPS.forEach(function(s){
      if(state[s.key]){
        hasAny = true;
        list += '<li><span class="k">' + s.label + '</span><span class="v">' + state[s.key].name + '</span></li>';
      }
    });
    if(!hasAny) list += '<li><span class="muted" style="text-align:center;width:100%">Select components to see your build →</span></li>';
    list += '</ul>';
    list += '<p class="muted" style="font-size:.78rem;margin-top:12px">Send the build to WhatsApp for prices, assembly cost, OS & warranty options.</p>';
    summary.innerHTML = list;
  }

  function render(){
    renderStepNav();
    renderOptions();
    renderSummary();
    window.scrollTo({top: root.offsetTop - 70, behavior:'smooth'});
  }

  function buildMessage(form){
    var lines = ['*Custom PC Build Request — Mahesh Electronics*', ''];
    var data = new FormData(form);
    lines.push('Name: ' + (data.get('name')||''));
    lines.push('Phone: ' + (data.get('phone')||''));
    lines.push('Email: ' + (data.get('email')||''));
    lines.push('');
    lines.push('*Components:*');
    STEPS.forEach(function(s){
      if(state[s.key]){
        lines.push('• ' + s.label + ': ' + state[s.key].name);
      }
    });
    lines.push('');
    lines.push('Please share the final quote with assembly cost, OS, and warranty options.');
    var notes = data.get('notes');
    if(notes){ lines.push(''); lines.push('Notes: ' + notes); }
    return lines.join('\n');
  }

  document.addEventListener('DOMContentLoaded', function(){
    root = document.getElementById('bp-root');
    if(!root) return;
    stepPills = document.getElementById('bp-steps');
    summary = document.getElementById('bp-summary');
    quoteForm = document.getElementById('bp-form');
    if(quoteForm){
      quoteForm.addEventListener('submit', function(e){
        e.preventDefault();
        if(Object.keys(state).length < 3){
          alert('Please pick at least the Use Case, Processor, and a few more components first.');
          return;
        }
        var msg = buildMessage(quoteForm);
        window.open(window.waLink(msg), '_blank');
      });
    }
    render();
  });
})();
