/* ── markers.js — mkHTML, makeMarker, refreshMk, popHTML, refreshPop ── */

function mkHTML(pin, state, born){
  var dying = state === 'dying';
  var ghost = state === 'ghost';
  var c = ghost ? '#888' : dying ? 'var(--danger)' : (pin.catColor || 'var(--neon)');
  var cls = 'mk' + (dying ? ' mk-dying' : state === 'revived' ? ' mk-revived' : ghost ? ' mk-ghost' : '') + (born ? ' mk-born' : '');
  var label = pin.bizName ? '<div class="mk-label">'+esc(pin.bizName)+'</div>' : '';
  return '<div class="'+cls+'">'+label+'<div class="mk-b" style="color:'+c+';border-color:'+c+';box-shadow:0 0 18px '+c+'55,0 4px 16px rgba(0,0,0,.5)"><span class="mk-e">'+pin.emoji+'</span><div class="mk-r" style="border-color:'+c+'44"></div></div></div>';
}

function getPinState(pin){
  var r = new Date(pin.expires_at).getTime() - Date.now();
  return r < 10*60*1000 ? 'dying' : 'normal';
}

function makeMarker(pin){
  var state = getPinState(pin);
  var ico = L.divIcon({className:'',html:mkHTML(pin, state, true),iconSize:[31,36],iconAnchor:[15,36]});
  var m = L.marker([pin.lat, pin.lng], {icon:ico});
  m.bindPopup(popHTML(pin), {maxWidth:320, autoPan:false});
  m.on('popupopen', function(){
    refreshPop(pin);
    if(typeof trackEvent==='function') trackEvent('flare_view', pin.id);
    fetch('/api/view?id=' + encodeURIComponent(pin.id), {method:'POST'})
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(data){ if(data && typeof data.views==='number'){ pin.views=data.views; refreshPop(pin); } })
      .catch(function(){});
    var el = m.getElement();
    if(el) el.classList.add('mk-open');
    // Si el usuario aún no tiene like marcado localmente, consultar DB por si acá abrió
    // desde otro dispositivo o la sync del arranque no había terminado
    if (!pin.liked && IDENTITY && IDENTITY.uid) {
      fetch('/api/likes?uid=' + encodeURIComponent(IDENTITY.uid) + '&flare_id=' + encodeURIComponent(pin.id))
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(data) {
          if (!data || !Array.isArray(data.liked) || data.liked.length === 0) return;
          pin.liked = true;
          markLiked(pin.id);
          refreshPop(pin);
        })
        .catch(function() {});
    }
  });
  m.on('popupclose', function(){
    var el = m.getElement();
    if(el) el.classList.remove('mk-open');
    if(!window._likeInProgress) setTimeout(fetchFlares, 50);
  });
  clusterGroup.addLayer(m);
  setTimeout(function(){
    var el = m.getElement();
    if(el){ var mk = el.querySelector('.mk'); if(mk) mk.classList.remove('mk-born'); }
  }, 1000);
  return m;
}

function refreshMk(pin, revived){
  var wasOpen = pin.marker.isPopupOpen();
  var state = revived ? 'revived' : getPinState(pin);
  if(wasOpen){
    var el = pin.marker.getElement();
    if(el){ el.innerHTML = mkHTML(pin, state); }
  } else {
    pin.marker.setIcon(L.divIcon({className:'',html:mkHTML(pin, state),iconSize:[31,36],iconAnchor:[15,36]}));
  }
  if(revived){
    setTimeout(function(){ refreshMk(pin, false); }, 900);
  }
}

function popHTML(pin){
  var r = Math.max(0, new Date(pin.expires_at).getTime() - Date.now());
  var pct = Math.min(100, (r/MAX)*100);
  var c = pin.catColor || 'var(--neon)';
  return '<div class="pop">'
    +'<div class="pop-hdr"><div class="pop-emo" style="background:'+c+'18;border-color:'+c+'44">'+pin.emoji+'</div>'
    +'<div>'+(pin.bizName?'<div class="pop-biz">🏪 '+esc(pin.bizName)+'</div>':'')+'<div class="pop-name">'+esc(pin.title)+'</div>'+(pin.username?'<div class="pop-username">@'+esc(pin.username)+'</div>':'')+'<div class="pop-cat" style="color:'+c+'">● '+(pin.catLbl||'Flare')+' · '+fmtT(r)+(function(ft){if(ft==='chispa')return' · <span class="pop-ftype pop-ftype-chispa">⚡ Chispa</span>';if(ft==='flama')return' · <span class="pop-ftype pop-ftype-flama">🔥 Flama</span>';if(ft==='fogata')return' · <span class="pop-ftype pop-ftype-fogata">🪵 Fogata</span>';if(ft==='hoguera')return' · <span class="pop-ftype pop-ftype-hoguera">🏕️ Hoguera</span>';return'';})(pin.flareType)+'</div></div></div>'
    +'<div class="pop-bar"><div class="pop-fill" style="width:'+pct+'%;background:linear-gradient(90deg,'+c+',var(--neon2))"></div></div>'
    +(pin.text?'<div class="pop-txt">'+richText(pin.text)+'</div>':'')
    +(pin.image?'<img class="pop-img img-zoomable" src="'+esc(pin.image)+'" alt="Foto del flare" loading="lazy" onclick="event.stopPropagation();openLightbox(\''+esc(pin.image)+'\')">':'')
    +(getPinState(pin)==='dying'?'<div class="rescue-msg" style="margin-bottom:8px">🔴 ¡Por expirar! Dale ❤️ para salvarlo</div>':'')
    +'<div class="pop-tray">'
    +'<div class="pop-tray-eyebrow">MANTÉN VIVO EL FLARE</div>'
    +'<div class="pop-tray-boosts">'
    +'<button class="pop-tray-btn pop-tray-boost pop-like'+(pin.liked?' liked':'')+'" onclick="doLike(\''+pin.id+'\')">'
    +'<span class="pop-tray-chip pop-tray-chip-green">'+(pin.liked?'❤️':'♥')+'</span>'
    +'<div class="pop-tray-text"><span class="pop-tray-lbl">+5 min</span><span class="pop-tray-sub">Dale un like</span></div>'
    +'</button>'
    +'<button class="pop-tray-btn pop-tray-gold pop-extend-fab" onclick="doExtend(\''+pin.id+'\')" title="+1 hora · 5 Floins">'
    +'<span class="pop-tray-chip pop-tray-chip-gold"><img src="/icons/floin.png" class="pop-extend-ico" alt="🪙" onerror="this.replaceWith(\'🪙\')"></span>'
    +'<div class="pop-tray-text"><span class="pop-tray-lbl">+1 hora</span><span class="pop-tray-sub"><img src="/icons/floin.png" style="width:10px;height:10px;vertical-align:middle;margin-right:2px" onerror="this.replaceWith(\'🪙\')">5 Floins</span></div>'
    +'</button>'
    +'</div>'
    +'<div class="pop-tray-utils">'
    +'<button class="pop-tray-btn pop-tray-util pop-gmaps" onclick="openMaps('+pin.lat+','+pin.lng+')" title="Ver en Maps">'
    +'<span class="pop-tray-util-ico"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 20l-5 2V6l5-2 6 2 5-2v16l-5 2-6-2z"/><path d="M9 4v16M15 6v16"/></svg></span>'
    +'<span class="pop-tray-util-lbl">Llegar</span>'
    +'</button>'
    +'<button class="pop-tray-btn pop-tray-util pop-share" onclick="shareFlare(\''+pin.id+'\')" title="Compartir">'
    +'<span class="pop-tray-util-ico"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="2.4"/><circle cx="17" cy="6" r="2.4"/><circle cx="17" cy="18" r="2.4"/><path d="M8.1 10.9l6.8-3.7M8.1 13.1l6.8 3.7"/></svg></span>'
    +'<span class="pop-tray-util-lbl">Compartir</span>'
    +'</button>'
    +'<button class="pop-tray-btn pop-tray-report pop-report-btn" onclick="openReport(\''+pin.id+'\')" title="Reportar">'
    +'<span class="pop-tray-util-ico"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg></span>'
    +'<span class="pop-tray-util-lbl">Reportar</span>'
    +'</button>'
    +'</div>'
    +'</div>'
    +'<div class="pop-meta">'
    +'<span class="pop-views">🔍 '+(pin.views||0)+'</span>'
    +'<div class="pop-id" onclick="navigator.clipboard.writeText(\''+pin.id+'\').then(function(){var el=document.querySelector(\'.pop-id[data-id=\\\'' +pin.id+ '\\\']\');if(el){el.textContent=\'✓ copiado\';setTimeout(function(){el.textContent=\'ID: '+pin.id+'\'},1500)}})" data-id="'+pin.id+'" title="Mantén presionado para copiar">ID: '+pin.id+'</div>'
    +'</div>'
    +'</div>';
}

function ghostPopHTML(pin){
  return '<div class="pop pop-ghost">'
    +'<div class="pop-ghost-banner">⏱ Expirado</div>'
    +'<div class="pop-hdr"><div class="pop-emo" style="background:#88888818;border-color:#88888844;opacity:0.6">'+pin.emoji+'</div>'
    +'<div>'+(pin.bizName?'<div class="pop-biz">🏪 '+esc(pin.bizName)+'</div>':'')+'<div class="pop-name" style="opacity:0.7">'+esc(pin.title)+'</div>'+(pin.username?'<div class="pop-username">@'+esc(pin.username)+'</div>':'')+'</div></div>'
    +(pin.text?'<div class="pop-txt" style="opacity:0.6">'+richText(pin.text)+'</div>':'')
    +(pin.image?'<img class="pop-img" src="'+esc(pin.image)+'" alt="Foto del flare" loading="lazy" style="opacity:0.5;filter:grayscale(0.5)">':'')
    +'<div class="pop-ghost-msg">Este flare ya no está activo.<br>Explora lo que hay cerca ahora 👇</div>'
    +'<div class="pop-foot">'
    +'<button class="pop-btn pop-gmaps" onclick="openMaps('+pin.lat+','+pin.lng+')">'
    +'<span class="pop-btn-ico">🗺️</span>'
    +'<span class="pop-btn-lbl" style="line-height:1.3">Cómo<br>llegar</span>'
    +'</button>'
    +'</div>'
    +'</div>';
}

function ghostMarkerHTML(pin){
  var label = pin.bizName ? '<div class="mk-label" style="color:#666">'+esc(pin.bizName)+'</div>' : '';
  return '<div class="mk mk-ghost">'+label
    +'<div class="mk-b" style="color:#555;border-color:#555;box-shadow:0 0 10px #33333366,0 4px 16px rgba(0,0,0,.4);filter:grayscale(1);opacity:0.5">'
    +'<span class="mk-e" style="filter:grayscale(1);opacity:0.7">'+pin.emoji+'</span>'
    +'<div class="mk-r" style="border-color:#44444444;animation:none"></div>'
    +'</div></div>';
}

function makeGhostMarker(pin){
  var ico = L.divIcon({className:'',html:ghostMarkerHTML(pin),iconSize:[31,36],iconAnchor:[15,36]});
  var m = L.marker([pin.lat, pin.lng], {icon:ico, zIndexOffset:-1000});
  m.bindPopup(ghostPopHTML(pin), {maxWidth:280, autoPan:false});
  m.on('popupopen', function(){
    var el = m.getElement();
    if(el) el.classList.add('mk-open');
  });
  m.on('popupclose', function(){
    var el = m.getElement();
    if(el) el.classList.remove('mk-open');
  });
  map.addLayer(m);
  return m;
}


function refreshPop(pin){
  if(!pin.marker || !pin.marker.isPopupOpen()) return;
  var popup = pin.marker.getPopup();
  if(!popup) return;
  var el = popup.getElement && popup.getElement();
  if(el){
    var content = el.querySelector('.leaflet-popup-content');
    if(content) content.innerHTML = popHTML(pin);
  }
}
