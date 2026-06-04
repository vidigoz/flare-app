/* ── panel.js — panel open/close, buildChips, renderPanel, myFlares, manual ── */

function togglePanel(){ panelOpen ? closePanel() : openPanel(); }
function openPanel(){
  panelOpen = true;
  obHideTips();
  document.getElementById('panel').classList.add('open');
  document.getElementById('pov').classList.add('on');
  document.getElementById('pbtn').style.display = 'none';
  document.getElementById('fab-wrap').style.display = 'none';
  buildChips(); renderPanel();
}
function closePanel(){
  panelOpen = false;
  goFlares();
  document.getElementById('panel').classList.remove('open');
  document.getElementById('pov').classList.remove('on');
  document.getElementById('pbtn').style.display = 'flex';
  document.getElementById('fab-wrap').style.display = 'flex';
  if(!localStorage.getItem('flare_onboarding_complete')){
    document.getElementById('ob-wrap').style.display = 'block';
    document.getElementById('ob-tip-fab').style.display = 'flex';
    document.getElementById('ob-tip-filters').style.display = 'block';
    document.getElementById('ob-skip-btn').style.display = 'block';
  }
}

function buildChips(){
  var vp = filteredVisible();
  var box = document.getElementById('chips');
  box.innerHTML = '';
  if(CATS.length <= 1) return;
  var all = document.createElement('div');
  all.className = 'chip' + (activeCat === null ? ' on' : '');
  if(activeCat === null){ all.style.background='var(--neon)'; all.style.borderColor='var(--neon)'; }
  all.innerHTML = '<span>Todos</span><span style="opacity:.7">'+vp.length+'</span>';
  all.addEventListener('click', function(){ activeCat=null; buildChips(); renderPanel(); });
  box.appendChild(all);
  CATS.forEach(function(cat){
    var cnt = vp.filter(function(p){ return p.cat===cat.id; }).length;
    var ch = document.createElement('div');
    ch.className = 'chip' + (activeCat===cat.id ? ' on' : '');
    if(activeCat===cat.id){ ch.style.background=cat.color; ch.style.borderColor=cat.color; }
    ch.innerHTML = '<div class="chip-dot" style="background:'+cat.color+'"></div><span>'+cat.icon+' '+cat.lbl.replace('\n',' ')+'</span><span style="opacity:.7">'+cnt+'</span>';
    ch.addEventListener('click', function(){ activeCat=(activeCat===cat.id)?null:cat.id; buildChips(); renderPanel(); });
    box.appendChild(ch);
  });
}

function renderPanel(){
  var q = (document.getElementById('srch').value||'').toLowerCase();
  var vp = filteredVisible();
  if(activeCat) vp = vp.filter(function(p){ return p.cat===activeCat; });
  if(q) vp = vp.filter(function(p){ return p.title.toLowerCase().includes(q)||(p.text||'').toLowerCase().includes(q)||(p.bizName||'').toLowerCase().includes(q); });

  var vigLabels = {nuevo:'🟢 Nuevo',maduro:'🟡 Maduro',expirando:'🔴 Expirando'};
  var vigSuffix = vigFilter!=='all' ? ' · '+vigLabels[vigFilter] : '';
  if(document.getElementById('panel-flares').style.display !== 'none') {
    document.getElementById('ph-sub').textContent = vp.length+' flare'+(vp.length!==1?'s':'')+' en vista'+vigSuffix;
  }

  var box = document.getElementById('plist');
  if(!vp.length){
    expandedId = null;
    var emptyMsg = (q||activeCat||vigFilter!=='all') ? 'Sin resultados para este filtro.' : 'No hay flares en esta área.<br>¡Mueve el mapa o crea uno!';
    box.innerHTML = '<div class="pempty"><div class="pe-ico">🔭</div>'+emptyMsg+'</div>';
    return;
  }

  vp.sort(function(a,b){ return new Date(b.expires_at)-new Date(a.expires_at); });
  var tl = {text:'💬 Texto',image:'🖼️ Foto',video:'🎬 Video'};
  var html = '';

  vp.forEach(function(pin){
    var r = Math.max(0, new Date(pin.expires_at).getTime() - Date.now());
    var pct = Math.min(100, (r/MAX)*100);
    var bc = r<10*60*1000?'var(--danger)':r<30*60*1000?'var(--amber)':'var(--neon)';
    var cat = CATS.find(function(c){ return c.id===pin.cat; })||CATS[0];
    var isOpen = (pin.id===expandedId);

    var isDying = getPinState(pin) === 'dying';
    html += '<div class="prow'+(isOpen?' open':'')+(isDying?' prow-dying':'')+'" id="prow-'+pin.id+'" data-pid="'+pin.id+'">'
      +'<div class="prow-hdr">'
      +'<div class="prow-ico" style="background:'+cat.color+'18;border-color:'+cat.color+'55">'+pin.emoji+'</div>'
      +(pin.image?'<img class="prow-thumb" src="'+esc(pin.image)+'" alt="Foto" loading="lazy">':'')
      +'<div class="prow-body">'
      +(pin.bizName?'<div class="prow-biz">🏪 '+esc(pin.bizName)+'</div>':'')
      +'<div class="prow-name">'+esc(pin.title)+'</div>'
      +(pin.username?'<div class="prow-username">@'+esc(pin.username)+'</div>':'')
      +'<div class="prow-tags">'
      +'<span class="ptag cat" style="border-color:'+cat.color+'55;color:'+cat.color+'">'+cat.icon+' '+cat.lbl.replace('\n',' ')+'</span>'
      +'<span class="ptag">'+tl[pin.type]+'</span>'
      +'<span class="ptime" style="color:'+bc+'">⏱ '+fmtT(r)+'</span>'
      +'<span class="plikes'+(pin.likes>0?' plikes-active':'')+'">❤️ '+pin.likes+'</span>'
      +'</div>'
      +'<div class="prow-bar"><div class="prow-fill" style="width:'+pct+'%;background:'+bc+'"></div></div>'
      +'</div>'
      +'<div class="prow-arrow">▶</div>'
      +'</div>'
      +'</div>';

    var html_detail = '<div class="pdetail" id="pdet-'+pin.id+'" style="border-left-color:'+cat.color+'">'
      +(isDying?'<div class="rescue-msg">🔴 Este flare está por expirar — ¡dale like para salvarlo!</div>':'')
      +(pin.bizName?'<div class="pd-biz">🏪 '+esc(pin.bizName)+'</div>':'')
      +(pin.text?'<div class="pd-txt">'+richText(pin.text)+'</div>':'')
      +(pin.image?'<img class="pd-img" src="'+esc(pin.image)+'" alt="Foto del flare" loading="lazy">':'')
      +'<div class="pd-acts">'
      +'<button class="pd-like'+(pin.liked?' liked':'')+'" data-lid="'+pin.id+'">'
      +(pin.liked?'❤️':'🤍')+' <span class="pd-like-count">'+pin.likes+'</span>'
      +(pin.liked?' Liked':' Me gusta')
      +'</button>'
      +'<button class="pd-map" data-fid="'+pin.id+'">📍 Ver aquí</button>'
      +'<button class="pd-gmaps" onclick="openMaps('+pin.lat+','+pin.lng+')">🗺️ Cómo llegar</button>'
      +'<button class="pd-share" onclick="shareFlare(\''+pin.id+'\')">↗ Compartir</button>'
      +'<button class="pd-report" data-report-id="'+pin.id+'">🚩 Reportar</button>'
      +'</div>'
      +'</div>';
    html += html_detail;
  });

  box.innerHTML = html;
  box.onclick = function(e){
    var lb = e.target.closest('[data-lid]');
    if(lb){ e.stopPropagation(); doLike(lb.dataset.lid); return; }
    var fb = e.target.closest('[data-fid]');
    if(fb){ e.stopPropagation(); flyToPin(fb.dataset.fid); return; }
    var rb = e.target.closest('[data-report-id]');
    if(rb){ e.stopPropagation(); openReport(rb.dataset.reportId); return; }
    var ico = e.target.closest('.prow-ico');
    if(ico){ var prow=ico.closest('.prow'); if(prow){ e.stopPropagation(); flyToPin(prow.dataset.pid); return; } }
    var row = e.target.closest('.prow');
    if(row){
      var now = Date.now();
      if(now - lastRowToggle < 350) return;
      lastRowToggle = now;
      var pid = row.dataset.pid;
      expandedId = (expandedId===pid) ? null : pid;
      renderPanel();
      if(expandedId){ setTimeout(function(){ var el=document.getElementById('prow-'+expandedId); if(el)el.scrollIntoView({behavior:'smooth',block:'nearest'}); },50); }
    }
  };
}

function flyToPin(id){
  var pin = pins[id];
  if(!pin) return;
  closePanel();
  map.flyTo([pin.lat, pin.lng], 17, {duration:.8});
  setTimeout(function(){
    if(clusterEnabled && clusterGroup.zoomToShowLayer){
      clusterGroup.zoomToShowLayer(pin.marker, function(){
        pin.marker.openPopup();
      });
    } else {
      pin.marker.openPopup();
    }
  }, 900);
}

function loadMyFlares(cb) {
  var box = document.getElementById('mine-list');
  box.innerHTML = '<div class="pempty" style="opacity:.6">Cargando...</div>';
  apiFetch('/api/flares?owner_uid=' + encodeURIComponent(getOwnerUid()))
    .then(function(rows) { cb(null, rows); })
    .catch(function(e) { cb(e, []); });
}

function deleteMyFlare(id) {
  if(!confirm('¿Eliminar este flare del mapa?')) return;
  fetch('/api/flares/delete?id=' + encodeURIComponent(id) + '&uid=' + encodeURIComponent(getOwnerUid()), {
    method: 'DELETE'
  })
  .then(function(r){ return r.json(); })
  .then(function(data){
    if(data.error){ notif('No se pudo eliminar: ' + data.error, 'err'); return; }
    if(pins[id]){ clusterGroup.removeLayer(pins[id].marker); delete pins[id]; }
    notif('Flare eliminado 🗑️');
    renderMyFlares();
    if (typeof renderMyFlaresInProfile === 'function' && profileOpen) renderMyFlaresInProfile();
    if(panelOpen) renderPanel();
  })
  .catch(function(){ notif('Error al eliminar', 'err'); });
}

function removeFromMineList(id) {
  var mine = JSON.parse(localStorage.getItem('flare_mine') || '[]');
  localStorage.setItem('flare_mine', JSON.stringify(mine.filter(function(x){ return x !== id; })));
  renderMyFlares();
}

function renderMyFlares() {
  loadMyFlares(function(err, rows) {
    var box = document.getElementById('mine-list');
    if(err) { box.innerHTML = '<div class="pempty">Error al cargar. Intenta de nuevo.</div>'; return; }
    if(!rows.length){
      box.innerHTML = '<div class="pempty"><div class="pe-ico">📍</div>No has publicado ningún flare todavía.</div>';
      return;
    }
    var html = '';
    rows.forEach(function(row){
      var pin = rowToPin(row);
      var expiresMs = new Date(pin.expires_at).getTime();
      var r = Math.max(0, expiresMs - Date.now());
      var isExpired = expiresMs <= Date.now();
      var cat = CATS.find(function(c){ return c.id===pin.cat; })||CATS[0];
      var bc = r<10*60*1000?'var(--danger)':r<30*60*1000?'var(--amber)':'var(--neon)';
      html += '<div class="prow profile-flare-row' + (isExpired ? ' profile-flare-expired' : '') + '">'
        +'<div class="prow-hdr">'
        +'<div class="prow-ico" style="background:'+cat.color+'18;border-color:'+cat.color+'55">'+pin.emoji+'</div>'
        +(pin.image?'<img class="prow-thumb" src="'+esc(pin.image)+'" alt="Foto" loading="lazy">':'')
        +'<div class="prow-body">'
        +(pin.bizName?'<div class="prow-biz">🏪 '+esc(pin.bizName)+'</div>':'')
        +'<div class="prow-name">'+esc(pin.title)+'</div>'
        +'<div class="prow-tags">'
        +(isExpired ? '<span class="ptime profile-expired-badge">Vencido</span>' : '<span class="ptime" style="color:'+bc+'">⏱ '+fmtT(r)+'</span>')
        +'<span class="plikes">❤️ '+pin.likes+'</span>'
        +'</div></div>'
        +'<div class="profile-flare-actions">'
        +(isExpired ? '<button class="profile-repost-btn" data-repost-id="'+pin.id+'" onclick="repostMyFlare(\''+pin.id+'\')" title="Republicar">↻ Republicar</button>' : '')
        +'<button class="pd-report" onclick="deleteMyFlare(\''+pin.id+'\')" title="Eliminar flare">🗑️</button>'
        +'</div>'
        +'</div></div>';
    });
    box.innerHTML = html;
  });
}

function loadManual() {
  document.getElementById('panel-manual').innerHTML = `
<h1>Manual de <span>Flare</span></h1>
<div class="m-sub">Guía completa · Versión 1.0 · El mapa que respira</div>
<nav class="m-nav">
  <a href="#m-overview" class="active">¿Qué es?</a>
  <a href="#m-crear">Crear</a>
  <a href="#m-categorias">Categorías</a>
  <a href="#m-vigencia">Vigencia</a>
  <a href="#m-panel">Panel</a>
  <a href="#m-tips">Tips</a>
</nav>
<div class="m-body" id="m-body">

<div class="m-section" id="m-overview">
  <div class="m-sec-hdr"><div class="m-sec-num">01</div><div class="m-sec-title">¿Qué es <span class="hl">Flare</span>?</div></div>
  <div class="m-card"><span class="m-card-icon">📍</span><div class="m-card-title">Mapa en Vivo</div><div class="m-card-desc">Coloca marcadores geolocalizados en cualquier parte del mapa con un solo toque.</div></div>
  <div class="m-card"><span class="m-card-icon">⏱️</span><div class="m-card-title">Eventos Efímeros</div><div class="m-card-desc">Cada flare dura 1 hora y desaparece solo. El mapa siempre está fresco y relevante.</div></div>
  <div class="m-card"><span class="m-card-icon">❤️</span><div class="m-card-title">Likes = Tiempo</div><div class="m-card-desc">Cada like suma +5 minutos de vida al flare. Sin límite — si la comunidad lo mantiene vivo, sigue en el mapa.</div></div>
  <div class="m-card"><span class="m-card-icon">🔗</span><div class="m-card-title">Links y Teléfonos</div><div class="m-card-desc">Los números y URLs en el texto se convierten automáticamente en hipervínculos para llamar o visitar.</div></div>
</div>

<div class="m-section" id="m-crear">
  <div class="m-sec-hdr"><div class="m-sec-num">02</div><div class="m-sec-title">Cómo <span class="hl">Crear</span> un Flare</div></div>
  <div class="m-step"><div class="m-step-num">1</div><div class="m-step-body"><div class="m-step-title">Presiona "＋ Crear Flare"</div><div class="m-step-desc">Aparece un menú con dos opciones: usar tu ubicación actual o elegir en el mapa.</div></div></div>
  <div class="m-step"><div class="m-step-num">2</div><div class="m-step-body"><div class="m-step-title">📍 Mi ubicación — o — 🗺️ Elegir en mapa</div><div class="m-step-desc">GPS automático o toca el punto exacto en el mapa con el crosshair rosa.</div><div class="m-tip">💡 GPS es la opción más rápida cuando estás en el lugar</div></div></div>
  <div class="m-step"><div class="m-step-num">3</div><div class="m-step-body"><div class="m-step-title">Elige categoría e ícono</div><div class="m-step-desc">5 categorías disponibles, cada una con 10 emojis específicos.</div></div></div>
  <div class="m-step"><div class="m-step-num">4</div><div class="m-step-body"><div class="m-step-title">Escribe título y descripción</div><div class="m-step-desc">Título obligatorio (máx. 60 caracteres). En la descripción puedes poner tu número de teléfono o un link y se vuelve clicable automáticamente.</div><div class="m-tip">📞 Escribe tu número para que te contacten directo</div></div></div>
  <div class="m-step"><div class="m-step-num">5</div><div class="m-step-body"><div class="m-step-title">⚡ Publicar Flare</div><div class="m-step-desc">El flare aparece en el mapa con 1 hora de vigencia. El mapa hace zoom automático a tu flare.</div></div></div>
</div>

<div class="m-section" id="m-categorias">
  <div class="m-sec-hdr"><div class="m-sec-num">03</div><div class="m-sec-title"><span class="hl">Categorías</span></div></div>
  <div class="m-cat" style="border-color:rgba(255,149,0,.3)"><div class="m-cat-icon">🍽️</div><div class="m-cat-info"><div class="m-cat-name" style="color:#ff9500">Comida y Bebida</div><div class="m-cat-desc">Tacos, food trucks, restaurantes, pop-ups</div><div class="m-cat-emojis">🍕🌮🍔🍜🥗🍺☕🍦🥩🍣</div></div></div>
  <div class="m-cat" style="border-color:rgba(0,194,255,.3)"><div class="m-cat-icon">🏷️</div><div class="m-cat-info"><div class="m-cat-name" style="color:#00c2ff">Ventas</div><div class="m-cat-desc">Garage sales, liquidaciones, ropa de paca</div><div class="m-cat-emojis">🏷️💸🛒🎁💰🛍️🤑💎🔖📦</div></div></div>
  <div class="m-cat" style="border-color:rgba(160,0,245,.3)"><div class="m-cat-icon">🎉</div><div class="m-cat-info"><div class="m-cat-name" style="color:#a000f5">Evento</div><div class="m-cat-desc">Conciertos, torneos, festivales, carreras</div><div class="m-cat-emojis">🎉🎵🎸🎭🎪🏆🎤🎬🎊🕺</div></div></div>
  <div class="m-cat" style="border-color:rgba(255,64,96,.3)"><div class="m-cat-icon">⚡</div><div class="m-cat-info"><div class="m-cat-name" style="color:#ff4060">Suceso</div><div class="m-cat-desc">Accidentes, retenes, bloqueos, alertas</div><div class="m-cat-emojis">⚡🚨🚧💥🔥🚑⚠️🌊🌪️🆘</div></div></div>
  <div class="m-cat" style="border-color:rgba(0,245,160,.3)"><div class="m-cat-icon">ℹ️</div><div class="m-cat-info"><div class="m-cat-name" style="color:var(--neon)">Información</div><div class="m-cat-desc">Avisos, cortes de agua/luz, ferias de empleo</div><div class="m-cat-emojis">ℹ️📍💡📢🗺️🔍📌📣🌐✅</div></div></div>
</div>

<div class="m-section" id="m-vigencia">
  <div class="m-sec-hdr"><div class="m-sec-num">04</div><div class="m-sec-title">Sistema de <span class="hl3">Vigencia</span></div></div>
  <div class="m-vig-row" style="background:rgba(0,245,160,.04)"><div class="m-vig-dot" style="background:var(--neon);box-shadow:0 0 6px var(--neon)"></div><div class="m-vig-info"><div class="m-vig-label" style="color:var(--neon)">Nuevo</div><div class="m-vig-desc">Flare recién publicado. Brilla en verde.</div></div><div class="m-vig-time" style="color:var(--neon)">&gt; 30 min</div></div>
  <div class="m-vig-row" style="background:rgba(255,179,0,.04)"><div class="m-vig-dot" style="background:var(--amber);box-shadow:0 0 6px var(--amber)"></div><div class="m-vig-info"><div class="m-vig-label" style="color:var(--amber)">Maduro</div><div class="m-vig-desc">Flare en su fase media.</div></div><div class="m-vig-time" style="color:var(--amber)">10–30 min</div></div>
  <div class="m-vig-row" style="background:rgba(255,64,96,.04)"><div class="m-vig-dot" style="background:var(--danger);box-shadow:0 0 6px var(--danger)"></div><div class="m-vig-info"><div class="m-vig-label" style="color:var(--danger)">Expirando</div><div class="m-vig-desc">Últimos minutos. Marcador rojo.</div></div><div class="m-vig-time" style="color:var(--danger)">&lt; 10 min</div></div>
  <div class="m-callout" style="margin-top:10px"><div class="m-callout-icon">❤️</div><div class="m-callout-body"><strong>Likes extienden la vida</strong><br>Cada ❤️ suma <strong style="color:var(--neon)">+5 minutos</strong>. Sin límite de tiempo — si la comunidad lo mantiene vivo, sigue en el mapa. Solo un like por flare.</div></div>
</div>

<div class="m-section" id="m-panel">
  <div class="m-sec-hdr"><div class="m-sec-num">05</div><div class="m-sec-title">El <span class="hl">Panel</span></div></div>
  <div class="m-card"><span class="m-card-icon">🔍</span><div class="m-card-title">Buscar lugar en el mapa</div><div class="m-card-desc">Escribe cualquier ciudad o dirección. El mapa vuela automáticamente a ese punto.</div></div>
  <div class="m-card"><span class="m-card-icon">⏱️</span><div class="m-card-title">Filtro de Vigencia</div><div class="m-card-desc">Filtra por Todos · Nuevo · Maduro · Expirando. También aplica a los marcadores del mapa.</div></div>
  <div class="m-card"><span class="m-card-icon">🏷️</span><div class="m-card-title">Chips de Categoría</div><div class="m-card-desc">Filtra por categoría. Combina con filtro de vigencia para búsquedas precisas.</div></div>
  <div class="m-callout hot"><div class="m-callout-icon">💡</div><div class="m-callout-body"><strong>Solo muestra flares del área visible</strong><br>Mueve o haz zoom en el mapa y el panel se actualiza automáticamente.</div></div>
</div>

<div class="m-section" id="m-tips">
  <div class="m-sec-hdr"><div class="m-sec-num">06</div><div class="m-sec-title">Tips y <span class="hl2">Trucos</span></div></div>
  <div class="m-card"><span class="m-card-icon">🎯</span><div class="m-card-title">Títulos específicos ganan más likes</div><div class="m-card-desc">"Tacos de carne asada con tortilla hecha a mano" > "Hay tacos aquí"</div></div>
  <div class="m-card"><span class="m-card-icon">🚧</span><div class="m-card-title">Retenes de alcoholímetro</div><div class="m-card-desc">Usa emoji 🚧 + categoría Suceso. La comunidad lo agradece y le da likes para mantenerlo vigente.</div></div>
  <div class="m-card"><span class="m-card-icon">📞</span><div class="m-card-title">Incluye tu número si vendes</div><div class="m-card-desc">Escribe tu número en la descripción. Se convierte en link para llamar con un toque desde el celular.</div></div>
  <div class="m-card"><span class="m-card-icon">⏱️</span><div class="m-card-title">Dale vida a los mejores flares</div><div class="m-card-desc">Si ves un flare útil expirando, dale ❤️ para extenderle 5 minutos más.</div></div>
  <div style="margin-top:16px;font-family:'Space Mono',monospace;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--dim);margin-bottom:8px">Gestos</div>
  <div class="m-sk">
    <div class="m-sk-row"><div class="m-sk-key">Toque en marcador</div><div class="m-sk-desc">Abre popup del flare</div></div>
    <div class="m-sk-row"><div class="m-sk-key">Toque emoji en panel</div><div class="m-sk-desc">Vuela al flare en el mapa</div></div>
    <div class="m-sk-row"><div class="m-sk-key">Toque fila en panel</div><div class="m-sk-desc">Expande / colapsa detalle</div></div>
    <div class="m-sk-row"><div class="m-sk-key">Scroll / pinch mapa</div><div class="m-sk-desc">Zoom · Panel se actualiza</div></div>
  </div>
</div>

</div>
<div class="m-footer">Hecho con <span>❤️</span> para la comunidad · <span>Flare</span></div>
`;

  var manualEl = document.getElementById('panel-manual');
  var mNavLinks = manualEl.querySelectorAll('.m-nav a');
  mNavLinks.forEach(function(a){
    a.addEventListener('click', function(e){
      e.preventDefault();
      var target = manualEl.querySelector(a.getAttribute('href'));
      if(target) target.scrollIntoView({behavior:'smooth', block:'start'});
    });
  });
}

/* ── helpers de navegación del panel ── */
var manualOpen = false;
var mineOpen   = false;

function showView(viewId) {
  ['panel-flares','panel-manual','panel-mine','panel-profile'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  var target = document.getElementById(viewId);
  if (target) target.style.display = (viewId === 'panel-manual') ? 'block' : 'flex';
}

function goFlares() {
  manualOpen = false; mineOpen = false;
  showView('panel-flares');
  document.getElementById('ph-ttl').innerHTML = 'Flares en <span>Vista</span>';
  document.getElementById('ph-sub').textContent = filteredVisible().length + ' flares en vista';
  document.getElementById('ph-gear').classList.remove('active');
}

/* ── panel button listeners ── */
document.getElementById('pbtn').addEventListener('click', function(){ togglePanel(); });
document.getElementById('pov').addEventListener('click', function(){ closePanel(); });
document.getElementById('panel-close').addEventListener('click', function(){ closePanel(); });
document.getElementById('srch').addEventListener('input', function(){ renderPanel(); });

/* ── Perfil: abre/cierra vista de perfil ── */
document.getElementById('ph-gear').addEventListener('click', function() {
  var profileActive = this.classList.contains('active');
  if (profileActive) {
    goFlares();
  } else {
    showView('panel-profile');
    document.getElementById('ph-ttl').innerHTML = 'Mi <span>Perfil</span>';
    document.getElementById('ph-sub').textContent = typeof getTier === 'function' ? (getTier() === 1 ? 'Visitante' : 'Sin validar') : '';
    this.classList.add('active');
    if (typeof renderProfile === 'function') renderProfile();
  }
});

/* ── Versión de la app ── */
fetch('/version.json').then(function(r){ return r.json(); }).then(function(d){
  var el = document.getElementById('app-version');
  if(el) el.textContent = 'Flare v' + d.version;
}).catch(function(){});
