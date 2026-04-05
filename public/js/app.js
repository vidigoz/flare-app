/* ══════════════════════════════════════════════════════
   FLARE APP — con backend real (Netlify Functions + Neon)
   ══════════════════════════════════════════════════════ */

var CATS = [
  {id:'food', lbl:'Comida y Bebida', icon:'🍽️', color:'#ff9500', emojis:['🍕','🌮','🍔','🍜','🥗','🍺','☕','🍦','🥩','🍣']},
];

/*
var CATS = [
  {id:'food',     lbl:'Comida y Bebida',  icon:'🍽️', color:'#ff9500', emojis:['🍕','🌮','🍔','🍜','🥗','🍺','☕','🍦','🥩','🍣']},
  {id:'sale',     lbl:'Ventas',           icon:'🏷️', color:'#00c2ff', emojis:['🏷️','💸','🛒','🎁','💰','🛍️','🤑','💎','🔖','📦']},
  {id:'event',    lbl:'Evento',           icon:'🎉', color:'#a000f5', emojis:['🎉','🎵','🎸','🎭','🎪','🏆','🎤','🎬','🎊','🕺']},
  {id:'incident', lbl:'Suceso',           icon:'⚡', color:'#ff4060', emojis:['⚡','🚨','🚧','💥','🔥','🚑','⚠️','🌊','🌪️','🆘']},
  {id:'info',     lbl:'Información',      icon:'ℹ️', color:'#00f5a0', emojis:['ℹ️','📍','💡','📢','🗺️','🔍','📌','📣','🌐','✅']},
];
*/
var MAX = 60*60*1000; /* referencia visual de la barra de progreso: 1 hora base */
var pins = {}; /* id → pin object (includes marker) */
var placing = false, pending = null;
var selCat = CATS[0], selEmoji = CATS[0].emojis[0], selType = 'text', imgData = null;
var panelOpen = false, activeCat = null, expandedId = null, lastRowToggle = 0;
var vigFilter = 'all';
var map;
var pollTimer = null;
var clusterGroup = null;   /* L.markerClusterGroup instance */
var clusterEnabled = true; /* toggle state */
var myLocMarker = null;    /* marcador de posición del usuario */
var myWatchId = null;      /* watchPosition id */

/* ── User identity (anónima por dispositivo) ── */
var MY_ID = localStorage.getItem('flare_uid');
if (!MY_ID) { MY_ID = 'u' + Date.now() + Math.random().toString(36).slice(2,8); localStorage.setItem('flare_uid', MY_ID); }
var likedIds = JSON.parse(localStorage.getItem('flare_liked') || '[]');
function saveLiked() { localStorage.setItem('flare_liked', JSON.stringify(likedIds)); }
function hasLiked(id) { return likedIds.indexOf(id) !== -1; }
function markLiked(id) { if (!hasLiked(id)) { likedIds.push(id); saveLiked(); } }

var reportedIds = JSON.parse(localStorage.getItem('flare_reported') || '[]');
function hasReported(id) { return reportedIds.indexOf(id) !== -1; }
function markReported(id) { if (!hasReported(id)) { reportedIds.push(id); localStorage.setItem('flare_reported', JSON.stringify(reportedIds)); } }

/* ── helpers ── */
function esc(s){var d=document.createElement('div');d.appendChild(document.createTextNode(s));return d.innerHTML}
function fmtT(ms){if(ms<=0)return'0 min';var h=Math.floor(ms/3600000),m=Math.floor((ms%3600000)/60000);return h>0?h+'h '+m+'m':m+' min'}

/* Convierte texto plano en HTML con links, teléfonos y saltos de línea */
function richText(raw) {
  if(!raw) return '';
  /* 1. Escapar HTML */
  var s = esc(raw);
  /* 2. Detectar URLs y teléfonos en un solo pass para evitar que el regex de
        teléfonos corrompa el interior de un <a> ya generado (e.g. ?id=6156919351) */
  s = s.replace(/(https?:\/\/[^\s<>"]+)|(\+?52[\s\-]?)?(\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4})/g, function(match, url){
    if(url) {
      var display = url.replace(/^https?:\/\/(www\.)?/,'').replace(/\/$/,'');
      if(display.length > 40) display = display.slice(0,38)+'…';
      return '<a href="'+url+'" target="_blank" rel="noopener" class="rich-link">🔗 '+display+'</a>';
    }
    var digits = match.replace(/\D/g,'');
    if(digits.length < 10) return match;
    var tel = digits.length === 10 ? '+52'+digits : '+'+digits;
    return '<a href="tel:'+tel+'" class="rich-link">📞 '+match+'</a>';
  });
  /* 3. Saltos de línea */
  s = s.replace(/\n/g,'<br>');
  return s;
}

function mapsUrl(lat, lng) {
  return 'https://maps.google.com/?q='+lat+','+lng;
}
function shareFlare(id) {
  var pin = pins[id];
  if(!pin) return;
  var r = Math.max(0, new Date(pin.expires_at).getTime() - Date.now());
  var url = location.origin + location.pathname + '#flare-' + id;
  var texto = pin.emoji + ' ' + pin.title
    + (pin.bizName ? '\n🏪 ' + pin.bizName : '')
    + (pin.text ? '\n' + pin.text.slice(0, 100) + (pin.text.length > 100 ? '...' : '') : '')
    + '\n⏱ Vigente por ' + fmtT(r)
    + '\n\n📍 Ver en Flare → ' + url;

  if(navigator.share) {
    navigator.share({
      title: pin.emoji + ' ' + pin.title,
      text: texto,
      url: url
    }).catch(function(){});
  } else {
    navigator.clipboard.writeText(texto).then(function(){
      notif('📋 Copiado al portapapeles');
    }).catch(function(){
      notif('No se pudo compartir', 'err');
    });
  }
}

function openMaps(lat, lng) {
  var url = 'https://maps.google.com/?q='+lat+','+lng;
  /* En iOS intenta abrir Apple Maps nativo primero, luego Google Maps */
  var a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
function notif(msg,t){var c=document.getElementById('notifs'),n=document.createElement('div');n.className='ntf '+(t||'');n.textContent=msg;c.appendChild(n);setTimeout(function(){n.remove()},3500)}
function setSyncState(state, txt) {
  var el = document.getElementById('sync');
  el.className = state; // '', 'loading', 'error'
  document.getElementById('sync-txt').textContent = txt;
}

function getPinStatus(pin){
  var r = new Date(pin.expires_at).getTime() - Date.now();
  if(r < 10*60*1000) return 'expirando';
  if(r < 30*60*1000) return 'maduro';
  return 'nuevo';
}
function visiblePins(){
  if(!map) return [];
  var b = map.getBounds();
  return Object.values(pins).filter(function(p){ return b.contains([p.lat, p.lng]); });
}
function filteredVisible(){
  var vp = visiblePins();
  if(vigFilter !== 'all') vp = vp.filter(function(p){ return getPinStatus(p) === vigFilter; });
  return vp;
}
function refreshBadge(){ document.getElementById('pbadge').textContent = filteredVisible().length; }

/* ══════════════════════════════════════════════════════
   API CALLS
   ══════════════════════════════════════════════════════ */

function apiFetch(url, opts) {
  return fetch(url, opts).then(function(r) {
    if (!r.ok) return r.json().then(function(d){
      var e = new Error(d.error || r.statusText);
      e.status = r.status;
      throw e;
    });
    return r.json();
  });
}

/* Poll server for flares in current bbox */
function fetchFlares() {
  if (!map) return;
  var b = map.getBounds();
  var params = new URLSearchParams({
    minLat: b.getSouth().toFixed(6),
    maxLat: b.getNorth().toFixed(6),
    minLng: b.getWest().toFixed(6),
    maxLng: b.getEast().toFixed(6),
    zoom:   Math.round(map.getZoom()),
  });
  setSyncState('loading', 'actualizando...');
  apiFetch('/api/flares?' + params)
    .then(function(rows) {
      setSyncState('', 'sincronizado');
      reconcilePins(rows);
    })
    .catch(function(e) {
      setSyncState('error', 'sin conexión');
      console.error('fetchFlares:', e);
    });
}

/* Smart reconcile: add new, update existing, remove expired */
function reconcilePins(rows) {
  var now = Date.now();
  var serverIds = {};

  rows.forEach(function(row) {
    serverIds[row.id] = true;
    var exp = new Date(row.expires_at).getTime();
    if (exp <= now) return; /* skip already-expired from server */

    if (pins[row.id]) {
      /* Update existing pin data (likes, expires_at may have changed) */
      var pin = pins[row.id];
      var wasDying = getPinState(pin) === 'dying';
      pin.expires_at = row.expires_at;
      pin.likes = row.likes;
      pin.liked = hasLiked(row.id);
      var nowDying = getPinState(pin) === 'dying';
      /* Detectar revivido: estaba muriendo y ahora no */
      var revived = wasDying && !nowDying;
      refreshMk(pin, revived);
      refreshPop(pin);
      if(revived) notif('💚 "'+pin.title+'" fue salvado!','like');
    } else {
      /* New pin from server */
      var pin = rowToPin(row);
      pin.marker = makeMarker(pin);
      pins[row.id] = pin;
    }
  });

  /* Remove pins no longer on server */
  Object.keys(pins).forEach(function(id) {
    if (!serverIds[id]) {
      clusterGroup.removeLayer(pins[id].marker);
      delete pins[id];
    }
  });

  
  applyVigFilter();
  refreshBadge();
  if (panelOpen) { buildChips(); renderPanel(); }
  checkDeepLink();
}

function rowToPin(row) {
  var bizName = row.biz_name || null;
  var bodyText = row.body_text || '';
  if(!bizName && bodyText.startsWith('🏪 ')){
    var lines = bodyText.split('\n');
    bizName = lines[0].replace('🏪 ', '');
    bodyText = lines.slice(1).join('\n');
  }
  return {
    id: row.id,
    lat: parseFloat(row.lat),
    lng: parseFloat(row.lng),
    title: row.title,
    emoji: row.emoji,
    cat: row.cat,
    catLbl: row.cat_lbl,
    catColor: row.cat_color,
    catIcon: row.cat_icon,
    type: row.type,
    text: bodyText,
    bizName: bizName,
    image: row.image_url || null,
    video: row.video_url || null,
    createdAt: new Date(row.created_at).getTime(),
    expires_at: row.expires_at,
    likes: row.likes,
    liked: hasLiked(row.id),
    marker: null,
  };
}

/* Post new flare to server */
function postFlare(data) {
  return apiFetch('/api/flares', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

/* Like a flare on server */
function postLike(id) {
  return apiFetch('/api/like?id=' + encodeURIComponent(id), { method: 'PATCH' });
}

/* Start polling every 15 seconds */
function startPoll() {
  fetchFlares();
  pollTimer = setInterval(fetchFlares, 15000);

  /* Si hay deep link, intentar cargar el flare por ID directo sin depender del bbox */
  var hash = location.hash;
  if(hash && hash.startsWith('#flare-')) {
    var dlId = hash.replace('#flare-', '');
    apiFetch('/api/flares?id=' + encodeURIComponent(dlId))
      .then(function(row) {
        if(!row) {
          history.replaceState(null, '', location.pathname);
          notif('⏱️ Este flare ya expiró o no existe', 'err');
          return;
        }
        if(!pins[row.id]) {
          var pin = rowToPin(row);
          pin.marker = makeMarker(pin);
          pins[row.id] = pin;
          applyVigFilter();
        }
        deepLinkHandled = true;
        history.replaceState(null, '', location.pathname);
        map.flyTo([pins[row.id].lat, pins[row.id].lng], 17, {duration: 1});
        setTimeout(function(){
          if(clusterEnabled && clusterGroup.zoomToShowLayer) {
            clusterGroup.zoomToShowLayer(pins[row.id].marker, function(){
              pins[row.id].marker.openPopup();
            });
          } else {
            pins[row.id].marker.openPopup();
          }
        }, 1100);
      })
      .catch(function(){
        history.replaceState(null, '', location.pathname);
        notif('⏱️ Este flare ya expiró o no existe', 'err');
      });
  }
}

var deepLinkHandled = false;
function checkDeepLink() {
  if(deepLinkHandled) return;
  var hash = location.hash;
  if(!hash || !hash.startsWith('#flare-')) return;
  var id = hash.replace('#flare-', '');
  if(!pins[id]) return;
  deepLinkHandled = true;
  history.replaceState(null, '', location.pathname);
  map.flyTo([pins[id].lat, pins[id].lng], 17, {duration: 1});
  setTimeout(function(){
    if(clusterEnabled && clusterGroup.zoomToShowLayer) {
      clusterGroup.zoomToShowLayer(pins[id].marker, function(){
        pins[id].marker.openPopup();
      });
    } else {
      pins[id].marker.openPopup();
    }
  }, 1100);
}

/* ── marker ── */
function mkHTML(pin, state, born){
  /* state: 'dying' | 'revived' | 'normal' */
  var dying = state === 'dying';
  var c = dying ? 'var(--danger)' : (pin.catColor || 'var(--neon)');
  var cls = 'mk' + (dying ? ' mk-dying' : state === 'revived' ? ' mk-revived' : '') + (born ? ' mk-born' : '');
  var label = pin.bizName ? '<div class="mk-label">'+esc(pin.bizName)+'</div>' : '';
  return '<div class="'+cls+'">'+label+'<div class="mk-b" style="color:'+c+';border-color:'+c+';box-shadow:0 0 18px '+c+'55,0 4px 16px rgba(0,0,0,.5)"><span class="mk-e">'+pin.emoji+'</span><div class="mk-r" style="border-color:'+c+'44"></div></div></div>';
}
function getPinState(pin){
  var r = new Date(pin.expires_at).getTime() - Date.now();
  return r < 10*60*1000 ? 'dying' : 'normal';
}
function makeMarker(pin){
  var state = getPinState(pin);
  var ico = L.divIcon({className:'',html:mkHTML(pin, state, true),iconSize:[44,52],iconAnchor:[22,52]});
  var m = L.marker([pin.lat, pin.lng], {icon:ico});
  m.bindPopup(popHTML(pin), {maxWidth:300});
  m.on('popupopen', function(){ refreshPop(pin); });
  clusterGroup.addLayer(m);
  setTimeout(function(){
    var el = m.getElement();
    if(el){ var mk = el.querySelector('.mk'); if(mk) mk.classList.remove('mk-born'); }
  }, 1000);
  return m;
}
function refreshMk(pin, revived){
  var state = revived ? 'revived' : getPinState(pin);
  pin.marker.setIcon(L.divIcon({className:'',html:mkHTML(pin, state),iconSize:[44,52],iconAnchor:[22,52]}));
  /* Si revivió, después de la animación volver al estado normal */
  if(revived){
    setTimeout(function(){ refreshMk(pin, false); }, 900);
  }
}

/* ── popup ── */
function popHTML(pin){
  var r = Math.max(0, new Date(pin.expires_at).getTime() - Date.now());
  var pct = Math.min(100, (r/MAX)*100);
  var c = pin.catColor || 'var(--neon)';
  return '<div class="pop">'
    +'<div class="pop-hdr"><div class="pop-emo" style="background:'+c+'18;border-color:'+c+'44">'+pin.emoji+'</div>'
    +'<div>'+(pin.bizName?'<div class="pop-biz">🏪 '+esc(pin.bizName)+'</div>':'')+'<div class="pop-name">'+esc(pin.title)+'</div><div class="pop-cat" style="color:'+c+'">● '+(pin.catLbl||'Flare')+' · '+fmtT(r)+'</div></div></div>'
    +'<div class="pop-bar"><div class="pop-fill" style="width:'+pct+'%;background:linear-gradient(90deg,'+c+',var(--neon2))"></div></div>'
    +(pin.text?'<div class="pop-txt">'+richText(pin.text)+'</div>':'')
    +(getPinState(pin)==='dying'?'<div class="rescue-msg" style="margin-bottom:8px">🔴 ¡Por expirar! Dale ❤️ para salvarlo</div>':'')
    +'<div class="pop-foot">'
    +'<button class="pop-like'+(pin.liked?' liked':'')+'" onclick="doLike(\''+pin.id+'\')">'
    +'<div style="display:flex;flex-direction:column;align-items:center;gap:2px">'
    +'<span style="font-size:20px;line-height:1">'+(pin.liked?'❤️':'🤍')+'</span>'
    +'<span style="font-size:9px;font-family:\'Space Mono\',monospace;opacity:.7;letter-spacing:.5px">+5min</span>'
    +'</div>'
    +'<span class="pop-like-count">'+pin.likes+'</span>'
    +'</button>'
    +'<div class="pop-foot-center">'
    +'<button class="pop-gmaps" onclick="openMaps('+pin.lat+','+pin.lng+')" title="Ver en Maps">🗺️</button>'
    +'<button class="pop-share" onclick="shareFlare(\''+pin.id+'\')" title="Compartir">↗</button>'
    +'</div>'
    +'<button class="pop-report-btn" onclick="openReport(\''+pin.id+'\')" title="Reportar">🚩</button>'
    +'</div>'
    +'<div class="pop-id" onclick="navigator.clipboard.writeText(\''+pin.id+'\').then(function(){var el=document.querySelector(\'.pop-id[data-id=\\\'' +pin.id+ '\\\']\');if(el){el.textContent=\'✓ copiado\';setTimeout(function(){el.textContent=\'ID: '+pin.id+'\'},1500)}})" data-id="'+pin.id+'" title="Mantén presionado para copiar">ID: '+pin.id+'</div>'
    +'</div>';
}
function refreshPop(pin){ if(pin.marker&&pin.marker.isPopupOpen()) pin.marker.setPopupContent(popHTML(pin)); }

/* ── like ── */
function doLike(id){
  var pin = pins[id];
  if(!pin) return;
  if(pin.liked){ notif('Ya le diste ❤️ a este flare 😉','err'); return; }
  var wasDying = getPinState(pin) === 'dying';
  /* Optimistic UI */
  pin.liked = true;
  pin.likes++;
  pin.expires_at = new Date(new Date(pin.expires_at).getTime() + 5*60*1000).toISOString();
  markLiked(id);
  notif('❤️ +5 min al flare "'+pin.title+'"','like');
  /* Detectar revivido instantáneamente */
  var nowDying = getPinState(pin) === 'dying';
  var revived = wasDying && !nowDying;
  refreshMk(pin, revived);
  if(revived) notif('💚 "'+pin.title+'" fue salvado!','like');
  refreshPop(pin);
  if(panelOpen) renderPanel();
  /* Persist to server */
  postLike(id).then(function(data) {
    pin.expires_at = data.expires_at;
    pin.likes = data.likes;
    refreshPop(pin);
  }).catch(function(e) {
    if(e.status === 429) notif('Demasiados likes seguidos. Espera un momento 😅','err');
    else console.error('like error:', e);
  });
}

/* ── report ── */
function openReport(id) {
  if(hasReported(id)) { notif('Ya reportaste este flare 🙏', 'err'); return; }
  var overlay = document.getElementById('report-overlay');
  overlay.style.display = 'flex';

  function closeReport() {
    overlay.style.display = 'none';
    overlay.removeEventListener('click', onOverlay);
    document.getElementById('report-cancel').removeEventListener('click', onCancel);
    overlay.querySelectorAll('.report-reason-btn').forEach(function(btn) {
      btn.removeEventListener('click', btn._reportHandler);
    });
  }

  function onOverlay(e) { if(e.target === overlay) closeReport(); }
  function onCancel() { closeReport(); }
  overlay.addEventListener('click', onOverlay);
  document.getElementById('report-cancel').addEventListener('click', onCancel);

  overlay.querySelectorAll('.report-reason-btn').forEach(function(btn) {
    btn._reportHandler = function() {
      var reason = btn.dataset.reason;
      closeReport();
      fetch('/api/report?id=' + encodeURIComponent(id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason }),
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if(data.error) { notif('Error al reportar','err'); return; }
        markReported(id);
        notif('Reporte enviado. Gracias 🙏');
        if(data.hidden) {
          notif('Este flare fue ocultado por la comunidad.');
          if(pins[id]) {
            clusterGroup.removeLayer(pins[id].marker);
            delete pins[id];
          }
          if(panelOpen) renderPanel();
        }
      })
      .catch(function() { notif('Error al reportar','err'); });
    };
    btn.addEventListener('click', btn._reportHandler);
  });
}

/* ── panel ── */
function togglePanel(){ panelOpen ? closePanel() : openPanel(); }
function openPanel(){
  panelOpen = true;
  document.getElementById('panel').classList.add('open');
  document.getElementById('pov').classList.add('on');
  document.getElementById('pbtn').style.display = 'none';
  buildChips(); renderPanel();
}
function closePanel(){
  panelOpen = false;
  document.getElementById('panel').classList.remove('open');
  document.getElementById('pov').classList.remove('on');
  document.getElementById('pbtn').style.display = 'flex';
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
    if(!cnt) return;
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
  document.getElementById('ph-sub').textContent = vp.length+' flare'+(vp.length!==1?'s':'')+' en vista'+vigSuffix;

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
      +'<div class="prow-body">'
      +(pin.bizName?'<div class="prow-biz">🏪 '+esc(pin.bizName)+'</div>':'')
      +'<div class="prow-name">'+esc(pin.title)+'</div>'
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
    /* If clustering is on, the marker may be inside a cluster — zoomToShowLayer reveals it */
    if(clusterEnabled && clusterGroup.zoomToShowLayer){
      clusterGroup.zoomToShowLayer(pin.marker, function(){
        pin.marker.openPopup();
      });
    } else {
      pin.marker.openPopup();
    }
  }, 900);
}

/* ── My location marker ── */
function myLocHTML(){
  return '<div class="my-loc"><div class="my-loc-pulse"></div><div class="my-loc-dot"></div></div>';
}

function setMyLocation(lat, lng){
  if(!map) return;
  if(!myLocMarker){
    var ico = L.divIcon({className:'', html:myLocHTML(), iconSize:[40,40], iconAnchor:[20,20]});
    myLocMarker = L.marker([lat, lng], {icon:ico, zIndexOffset:500, interactive:false});
    myLocMarker.addTo(map);
  } else {
    myLocMarker.setLatLng([lat, lng]);
  }
}

function startMyLocation(flyTo){
  if(!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(function(pos){
    setMyLocation(pos.coords.latitude, pos.coords.longitude);
    if(flyTo) map.flyTo([pos.coords.latitude, pos.coords.longitude], 15, {duration:1.2});
    document.getElementById('loc-btn').classList.add('tracking');
  }, function(){}, {enableHighAccuracy:true, timeout:8000});

  if(myWatchId === null){
    myWatchId = navigator.geolocation.watchPosition(function(pos){
      setMyLocation(pos.coords.latitude, pos.coords.longitude);
    }, function(){}, {enableHighAccuracy:true, maximumAge:5000});
  }
}

/* ── FAB menu ── */
var fabMenuOpen = false;
var fab = document.getElementById('fab');
var fabMenu = document.getElementById('fab-menu');

fab.addEventListener('click', function(e){
  e.stopPropagation();
  if(placing){ stopPlace(); return; }
  fabMenuOpen = !fabMenuOpen;
  fabMenu.classList.toggle('on', fabMenuOpen);
  fab.textContent = fabMenuOpen ? '✕  Cancelar' : '＋ Crear Flare';
});

document.addEventListener('click', function(){
  if(fabMenuOpen){ fabMenuOpen=false; fabMenu.classList.remove('on'); fab.textContent='＋ Crear Flare'; }
});

/* 📍 Mi ubicación */
document.getElementById('fab-gps').addEventListener('click', function(e){
  e.stopPropagation();
  fabMenuOpen=false; fabMenu.classList.remove('on'); fab.textContent='＋ Crear Flare';

  /* Si ya tenemos la posición cacheada del watchPosition, usarla directo */
  if(myLocMarker){
    var ll = myLocMarker.getLatLng();
    map.flyTo([ll.lat, ll.lng], 16, {duration:1});
    setPending(ll.lat, ll.lng);
    openModal();
    return;
  }

  fab.textContent='⏳ Obteniendo...'; fab.disabled=true;
  if(!navigator.geolocation){ notif('Tu browser no soporta geolocalización','err'); fab.textContent='＋ Crear Flare'; fab.disabled=false; return; }
  navigator.geolocation.getCurrentPosition(
    function(pos){
      fab.textContent='＋ Crear Flare'; fab.disabled=false;
      map.flyTo([pos.coords.latitude, pos.coords.longitude], 16, {duration:1});
      setPending(pos.coords.latitude, pos.coords.longitude);
      openModal();
    },
    function(){
      fab.textContent='＋ Crear Flare'; fab.disabled=false;
      notif('No se pudo obtener tu ubicación','err');
    },
    {enableHighAccuracy:true, timeout:8000}
  );
});

/* 🗺️ Elegir en mapa */
document.getElementById('fab-map').addEventListener('click', function(e){
  e.stopPropagation();
  fabMenuOpen=false; fabMenu.classList.remove('on');
  fab.textContent='✕  Cancelar';
  startPlace();
});

function startPlace(){ placing=true; fab.classList.add('placing'); document.getElementById('hint').style.display='flex'; document.getElementById('xhair').classList.add('on'); map&&(map.getContainer().style.cursor='crosshair'); }
function stopPlace(){ placing=false; fab.classList.remove('placing'); fab.textContent='＋ Crear Flare'; fab.disabled=false; document.getElementById('hint').style.display='none'; document.getElementById('xhair').classList.remove('on'); map&&(map.getContainer().style.cursor=''); }

/* ── modal ── */
function setPending(lat, lng){
  pending = {lat:lat, lng:lng};
  document.getElementById('ctxt').textContent = lat.toFixed(5)+', '+lng.toFixed(5);
}
function openModal(){
  /* Quitar spotlight del onboarding al abrir el modal */
  document.getElementById('fab-wrap').classList.remove('ob-spotlight');
  /* Ocultar el toast del paso 3 para que no tape el modal */
  var toast = document.querySelector('#ob-3 .ob-toast');
  if(toast) toast.style.visibility = 'hidden';
  buildCG(); buildEG();
  document.getElementById('ctxt').textContent = pending ? pending.lat.toFixed(5)+', '+pending.lng.toFixed(5) : '—';
  document.getElementById('mover').classList.add('on');
}
function openDailyLimitModal(){
  document.getElementById('daily-limit-modal').style.display = 'flex';
}
function closeDailyLimitModal(){
  document.getElementById('daily-limit-modal').style.display = 'none';
}

function closeModal(){
  document.getElementById('mover').classList.remove('on');
  /* Restaurar el toast del paso 3 si el onboarding sigue activo */
  var toast = document.querySelector('#ob-3 .ob-toast');
  if(toast) toast.style.visibility = '';
  pending=null;
  document.getElementById('f-biz').value='';
  document.getElementById('f-ttl').value='';
  document.getElementById('f-txt').value='';
  var plus = document.querySelector('.ebtn-plus');
  if(plus){ plus.textContent='+'; plus.classList.remove('sel'); plus.style.borderColor=''; plus.style.background=''; plus.style.fontSize=''; }
  stopPlace();
}
document.getElementById('modal-x').addEventListener('click', closeModal);
document.getElementById('mover').addEventListener('click', function(e){ if(e.target===this) closeModal(); });
document.getElementById('modal-x').addEventListener('click', closeModal);
document.getElementById('mover').addEventListener('click', function(e){ if(e.target===this) closeModal(); });

function buildCG(){
  var g = document.getElementById('cgrid'); if(!g) return; g.innerHTML='';
  CATS.forEach(function(cat){
    var b = document.createElement('div'); b.className='cbtn'+(cat.id===selCat.id?' sel':''); b.style.setProperty('--cc', cat.color);
    b.innerHTML='<div class="cb-ic">'+cat.icon+'</div><div class="cb-lb">'+cat.lbl.replace('\n','<br>')+'</div>';
    b.addEventListener('click', function(){ selCat=cat; selEmoji=cat.emojis[0]; buildCG(); buildEG(); });
    g.appendChild(b);
  });
}
function buildEG(){
  var g = document.getElementById('egrid'); g.innerHTML='';
  selCat.emojis.forEach(function(e){
    var b = document.createElement('button'); var a=(e===selEmoji); b.className='ebtn'+(a?' sel':''); b.textContent=e;
    if(a){ b.style.borderColor=selCat.color; b.style.background=selCat.color+'22'; }
    b.addEventListener('click', function(){
      g.querySelectorAll('.ebtn').forEach(function(x){ x.classList.remove('sel'); x.style.borderColor=''; x.style.background=''; });
      b.classList.add('sel'); b.style.borderColor=selCat.color; b.style.background=selCat.color+'22'; selEmoji=e;
    });
    g.appendChild(b);
  });

  /* Botón + para emoji personalizado */
  var plus = document.createElement('button');
  plus.className = 'ebtn ebtn-plus';
  plus.textContent = '+';
  plus.title = 'Usar otro emoji';
  plus.addEventListener('click', function(e){
    e.preventDefault();
    document.getElementById('emoji-custom-inp').value = '';
    document.getElementById('emoji-custom-inp').focus();
  });
  g.appendChild(plus);

  /* Input invisible que captura el emoji del teclado nativo */
  var inp = document.getElementById('emoji-custom-inp');
  if(!inp){
    inp = document.createElement('input');
    inp.type = 'text';
    inp.id = 'emoji-custom-inp';
    inp.setAttribute('inputmode', 'text');
    inp.style.cssText = 'position:absolute;opacity:0;width:1px;height:1px;pointer-events:none;';
    document.body.appendChild(inp);
  }
  inp.oninput = function(){
    var val = inp.value;
    var match = val.match(/\p{Emoji_Presentation}|\p{Extended_Pictographic}/u);
    if(!match) return;
    var emoji = match[0];
    selEmoji = emoji;
    inp.value = '';
    g.querySelectorAll('.ebtn').forEach(function(b){
      b.classList.remove('sel'); b.style.borderColor=''; b.style.background=''; b.style.fontSize='';
    });
    plus.classList.add('sel');
    plus.textContent = emoji;
    plus.style.borderColor = selCat.color;
    plus.style.background = selCat.color+'22';
    plus.style.fontSize = '20px';
  };
}


document.getElementById('bsub').addEventListener('click', function(){
  if(!pending){ notif('Selecciona un punto en el mapa primero.','err'); return; }
  var ttl = document.getElementById('f-ttl').value.trim();
  if(!ttl){ notif('Ponle un título a tu flare.','err'); return; }

  var btn = document.getElementById('bsub');
  btn.disabled = true;
  btn.textContent = '⏳ Publicando...';

  var payload = {
    lat: pending.lat,
    lng: pending.lng,
    title: ttl,
    emoji: selEmoji,
    cat: selCat.id,
    cat_lbl: selCat.lbl.replace('\n',' '),
    cat_color: selCat.color,
    cat_icon: selCat.icon,
    type: 'text',
    uid: MY_ID,
    owner_uid: MY_ID,
    local_date: (function(){ var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); })(),
    biz_name: document.getElementById('f-biz').value.trim() || null,
    body_text: document.getElementById('f-txt').value.trim() || null,
    dur_min: 60,
  };

  postFlare(payload)
    .then(function(row) {
      btn.disabled = false;
      btn.textContent = '⚡ Publicar Flare (1 hora)';
      var pin = rowToPin(row);
      pin.marker = makeMarker(pin);
      pins[pin.id] = pin;
      
      closeModal();
      map.flyTo([pin.lat, pin.lng], 15, {duration:1});
      notif(pin.emoji+' "'+pin.title+'" lanzado por 1 hora!');
      applyVigFilter();
      /* Guardar ID en lista de mis flares */
      var mine = JSON.parse(localStorage.getItem('flare_mine') || '[]');
      mine.push(row.id);
      if(mine.length > 50) mine = mine.slice(-50);
      localStorage.setItem('flare_mine', JSON.stringify(mine));
      /* Onboarding: celebrar primer flare */
      if(obCurrentStep===3 || !localStorage.getItem('flare_first_published')){
        obCelebrate();
      }
    })
    .catch(function(e) {
      btn.disabled = false;
      btn.textContent = '⚡ Publicar Flare (1 hora)';
      if(e.status === 429 && e.message === 'daily_limit') { closeModal(); openDailyLimitModal(); }
      else if(e.status === 429) notif('Límite alcanzado. Intenta en unos minutos.','err');
      else if(e.status === 400 && e.message.includes('normas')) notif('Contenido no permitido. Revisa el texto de tu flare.','err');
      else notif('Error al publicar: '+e.message,'err');
    });
});

/* ── vigencia + cat filter ── */
function applyVigFilter(){
  clusterGroup.clearLayers();
  Object.values(pins).forEach(function(pin){
    if(!pin.marker) return;
    var vigOk = (vigFilter==='all') || (getPinStatus(pin)===vigFilter);
    var catOk = (activeCat===null) || (pin.cat===activeCat);
    if(vigOk && catOk){
      if(clusterEnabled) clusterGroup.addLayer(pin.marker);
      else pin.marker.addTo(clusterGroup);
    }
  });

  /* Sync leyenda lateral */
  ['nuevo','maduro','expirando','all'].forEach(function(f){
    var row = document.getElementById('leg-'+(f==='all'?'all':f));
    if(row) row.classList.toggle('active', vigFilter===f);
  });

  /* Sync filtros panel */
  ['all','nuevo','maduro','exp'].forEach(function(k){
    var el = document.getElementById('pvig-'+k);
    if(!el) return;
    var fval = k==='exp'?'expirando':k;
    el.classList.toggle('on', vigFilter===fval);
  });

  /* Sync chips de vigencia en header */
  ['all','nuevo','maduro','exp'].forEach(function(k){
    var el = document.getElementById('hf-'+k);
    if(!el) return;
    var fval = k==='exp'?'expirando':k;
    el.classList.toggle('on', vigFilter===fval);
  });

  /* Sync chips de categoría en header */
  ['food','sale','event','incident','info'].forEach(function(c){
    var el = document.getElementById('hf-'+c);
    if(el) el.classList.toggle('on', activeCat===c);
  });

  refreshBadge();
  if(panelOpen){ buildChips(); renderPanel(); }
}


function buildClusterGroup(){
  return L.markerClusterGroup({
    chunkedLoading: true,        /* process in chunks → no UI freeze */
    chunkInterval: 200,
    chunkDelay: 50,
    maxClusterRadius: 60,        /* px antes de agrupar */
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    disableClusteringAtZoom: 17, /* zoom 17+ = pins individuales */
    iconCreateFunction: function(cluster){
      var count = cluster.getChildCount();
      var cls = count < 10 ? 'flare-cluster'
              : count < 50 ? 'flare-cluster flare-cluster-medium'
              : 'flare-cluster flare-cluster-large';
      var size = count < 10 ? 48 : count < 50 ? 54 : 62;
      return L.divIcon({
        html: '<div class="'+cls+'">'+count+'</div>',
        className: '',
        iconSize: L.point(size, size),
        iconAnchor: L.point(size/2, size/2)
      });
    }
  });
}

document.getElementById('leg-hdr').addEventListener('click', function(){
  document.getElementById('legend').classList.toggle('collapsed');
});
['leg-nuevo','leg-maduro','leg-expirando','leg-all'].forEach(function(id){
  var el = document.getElementById(id);
  if(!el||!el.dataset.filter) return;
  el.addEventListener('click', function(e){ e.stopPropagation(); vigFilter=el.dataset.filter; applyVigFilter(); });
});
document.querySelectorAll('.pvig-opt').forEach(function(btn){
  btn.addEventListener('click', function(){ vigFilter=btn.dataset.vf; applyVigFilter(); });
});

/* ── Header filter chips ── */
document.querySelectorAll('.hdr-vig').forEach(function(btn){
  btn.addEventListener('click', function(){
    vigFilter = btn.dataset.vf;
    applyVigFilter();
  });
});
document.querySelectorAll('.hdr-cat').forEach(function(btn){
  btn.addEventListener('click', function(){
    var cat = btn.dataset.cat;
    activeCat = (activeCat === cat) ? null : cat;
    applyVigFilter();
  });
});

/* ── Cluster toggle ── */
document.getElementById('cluster-toggle').addEventListener('click', function(){
  clusterEnabled = !clusterEnabled;
  this.classList.toggle('on', clusterEnabled);
  clusterGroup.clearLayers();
  map.removeLayer(clusterGroup);
  if(clusterEnabled){
    clusterGroup = buildClusterGroup();
    map.addLayer(clusterGroup);
    applyVigFilter();
    notif('⬡ Clusters activados');
  } else {
    clusterGroup = L.layerGroup().addTo(map);
    applyVigFilter();
    notif('📍 Flares individuales');
  }
});

/* ── Labels toggle ── */
document.getElementById('toggle-labels').addEventListener('click', function(){
  this.classList.toggle('on');
  document.getElementById('map').classList.toggle('labels-hidden');
});

/* ── panel buttons ── */
document.getElementById('pbtn').addEventListener('click', function(){ togglePanel(); });
document.getElementById('pov').addEventListener('click', function(){ closePanel(); });
document.getElementById('panel-close').addEventListener('click', function(){ closePanel(); });
document.getElementById('srch').addEventListener('input', function(){ renderPanel(); });

/* ── Manual toggle ── */
var manualOpen = false;
document.getElementById('ph-help').addEventListener('click', function(){
  manualOpen = !manualOpen;
  if(manualOpen) { mineOpen = false; document.getElementById('ph-mine').classList.remove('active'); }
  this.classList.toggle('active', manualOpen);
  document.getElementById('panel-flares').style.display  = manualOpen ? 'none' : 'flex';
  document.getElementById('panel-manual').style.display  = manualOpen ? 'block' : 'none';
  document.getElementById('panel-mine').style.display    = 'none';
  document.getElementById('ph-ttl').innerHTML = manualOpen
    ? 'Manual de <span>Uso</span>'
    : 'Flares en <span>Vista</span>';
  document.getElementById('ph-sub').textContent = manualOpen
    ? 'Guía completa de Flare'
    : (Object.keys(pins).length + ' flares activos');
  if(manualOpen && !document.getElementById('panel-manual').dataset.loaded) {
    loadManual();
    document.getElementById('panel-manual').dataset.loaded = '1';
  }
});

/* ── Mis Flares toggle ── */
var mineOpen = false;
document.getElementById('ph-mine').addEventListener('click', function(){
  mineOpen = !mineOpen;
  if(mineOpen) { manualOpen = false; document.getElementById('ph-help').classList.remove('active'); }
  this.classList.toggle('active', mineOpen);
  document.getElementById('panel-flares').style.display  = mineOpen ? 'none' : 'flex';
  document.getElementById('panel-manual').style.display  = 'none';
  document.getElementById('panel-mine').style.display    = mineOpen ? 'flex' : 'none';
  document.getElementById('ph-ttl').innerHTML = mineOpen
    ? 'Mis <span>Flares</span>'
    : 'Flares en <span>Vista</span>';
  document.getElementById('ph-sub').textContent = mineOpen
    ? 'Tus flares publicados'
    : (Object.keys(pins).length + ' flares activos');
  if(mineOpen) renderMyFlares();
});

function loadMyFlares() {
  var mine = JSON.parse(localStorage.getItem('flare_mine') || '[]');
  return mine.map(function(id) {
    return pins[id] ? pins[id] : { id: id, expired: true };
  });
}

function deleteMyFlare(id) {
  if(!confirm('¿Eliminar este flare del mapa?')) return;
  fetch('/api/flares/delete?id=' + encodeURIComponent(id) + '&uid=' + encodeURIComponent(MY_ID), {
    method: 'DELETE'
  })
  .then(function(r){ return r.json(); })
  .then(function(data){
    if(data.error){ notif('No se pudo eliminar: ' + data.error, 'err'); return; }
    if(pins[id]){ clusterGroup.removeLayer(pins[id].marker); delete pins[id]; }
    var mine = JSON.parse(localStorage.getItem('flare_mine') || '[]');
    localStorage.setItem('flare_mine', JSON.stringify(mine.filter(function(x){ return x !== id; })));
    notif('Flare eliminado 🗑️');
    renderMyFlares();
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
  var items = loadMyFlares();
  var box = document.getElementById('mine-list');
  if(!items.length){
    box.innerHTML = '<div class="pempty"><div class="pe-ico">📍</div>No has publicado ningún flare todavía.</div>';
    return;
  }
  var html = '';
  items.forEach(function(pin){
    if(pin.expired){
      html += '<div class="prow" style="opacity:.45">'
        +'<div class="prow-hdr">'
        +'<div class="prow-ico">⌛</div>'
        +'<div class="prow-body">'
        +'<div class="prow-name">Flare expirado</div>'
        +'<div class="prow-tags"><span class="ptag">Ya no visible en el mapa</span></div>'
        +'</div>'
        +'<button class="pd-report" onclick="removeFromMineList(\''+pin.id+'\')" title="Quitar de la lista">✕</button>'
        +'</div></div>';
      return;
    }
    var r = Math.max(0, new Date(pin.expires_at).getTime() - Date.now());
    var cat = CATS.find(function(c){ return c.id===pin.cat; })||CATS[0];
    var bc = r<10*60*1000?'var(--danger)':r<30*60*1000?'var(--amber)':'var(--neon)';
    html += '<div class="prow">'
      +'<div class="prow-hdr">'
      +'<div class="prow-ico" style="background:'+cat.color+'18;border-color:'+cat.color+'55">'+pin.emoji+'</div>'
      +'<div class="prow-body">'
      +(pin.bizName?'<div class="prow-biz">🏪 '+esc(pin.bizName)+'</div>':'')
      +'<div class="prow-name">'+esc(pin.title)+'</div>'
      +'<div class="prow-tags">'
      +'<span class="ptime" style="color:'+bc+'">⏱ '+fmtT(r)+'</span>'
      +'<span class="plikes">❤️ '+pin.likes+'</span>'
      +'</div></div>'
      +'<button class="pd-report" onclick="deleteMyFlare(\''+pin.id+'\')" title="Eliminar flare">🗑️</button>'
      +'</div></div>';
  });
  box.innerHTML = html;
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

  /* Nav activo al hacer scroll dentro del manual */
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

/* ── GEOCODER ── */
(function(){
  var inp=document.getElementById('pgeo-inp'), res=document.getElementById('pgeo-res'), timer=null;
  inp.addEventListener('input',function(){ clearTimeout(timer); var q=inp.value.trim(); if(!q){res.classList.remove('on');res.innerHTML='';return;} res.innerHTML='<div class="geo-msg">Buscando...</div>'; res.classList.add('on'); timer=setTimeout(function(){search(q)},380); });
  inp.addEventListener('keydown',function(e){ if(e.key==='Escape'){res.classList.remove('on');inp.value='';} if(e.key==='Enter'){var f=res.querySelector('.gitem');if(f)f.click();} });
  document.addEventListener('click',function(e){ if(!inp.contains(e.target)&&!res.contains(e.target)) res.classList.remove('on'); });
  function search(q){ fetch('https://nominatim.openstreetmap.org/search?format=json&limit=6&addressdetails=1&q='+encodeURIComponent(q),{headers:{'Accept-Language':'es'}}).then(function(r){return r.json()}).then(function(data){ if(!data.length){res.innerHTML='<div class="geo-msg">Sin resultados</div>';return;} res.innerHTML=''; data.forEach(function(item){ var name=item.name||item.display_name.split(',')[0]; var sub=item.display_name.replace(name+', ','').split(',').slice(0,2).join(', '); var ic=geoIcon(item.type,item.class); var el=document.createElement('div'); el.className='gitem'; el.innerHTML='<div class="gitem-ic">'+ic+'</div><div><div class="gitem-name">'+name+'</div><div class="gitem-sub">'+sub+'</div></div>'; el.addEventListener('click',function(){ inp.value=name; res.classList.remove('on'); if(map)map.flyTo([parseFloat(item.lat),parseFloat(item.lon)],14,{duration:1.2}); }); res.appendChild(el); }); }).catch(function(){res.innerHTML='<div class="geo-msg">Error de búsqueda.</div>';}); }
  function geoIcon(type,cls){ if(cls==='boundary'||type==='administrative')return'🏙️'; if(cls==='place')return type==='city'?'🏙️':type==='town'?'🌆':type==='village'?'🏘️':'📍'; if(cls==='amenity')return type==='restaurant'?'🍽️':type==='hospital'?'🏥':type==='school'?'🏫':'🏛️'; if(cls==='tourism')return'🗺️'; if(cls==='natural')return'🌿'; if(cls==='highway')return'🛣️'; return'📍'; }
})();

/* ── LEAFLET BOOT ── */
function loadLeaflet(cb){ if(window.L){cb();return} var s=document.createElement('script');s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';s.onload=cb;s.onerror=function(){alert('Error cargando el mapa.')};document.head.appendChild(s); }

function loadMarkerCluster(cb){
  if(window.L && L.MarkerClusterGroup){cb();return;}
  var s=document.createElement('script');
  s.src='https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js';
  s.onload=cb;
  s.onerror=function(){ console.warn('MarkerCluster no disponible, usando modo individual'); cb(); };
  document.head.appendChild(s);
}

loadLeaflet(function(){
  loadMarkerCluster(function(){
    map = L.map('map', {center:[32.5720,-116.6280], zoom:14, zoomControl:false});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution:''}).addTo(map);
    /*L.control.zoom({position:'bottomright'}).addTo(map);*/

    /* Init cluster group */
    if(L.MarkerClusterGroup){
      clusterGroup = buildClusterGroup();
    } else {
      /* Fallback si MarkerCluster no cargó */
      clusterEnabled = false;
      clusterGroup = L.layerGroup();
      
    }
    map.addLayer(clusterGroup);

    map.on('moveend zoomend', function(){
      refreshBadge();
      if(panelOpen){ buildChips(); renderPanel(); }
      clearTimeout(pollTimer);
      pollTimer = setTimeout(fetchFlares, 500);
      /* Auto-ocultar etiquetas en zoom lejano */
      var zoom = map.getZoom();
      var mapEl = document.getElementById('map');
      var lblBtn = document.getElementById('toggle-labels');
      if(zoom < 14){
        mapEl.classList.add('labels-hidden');
      } else if(lblBtn.classList.contains('on')){
        mapEl.classList.remove('labels-hidden');
      }
    });

    map.on('click', function(e){
      if(!placing) return;
      stopPlace();
      setPending(e.latlng.lat, e.latlng.lng);
      openModal();
    });

    var hasDeepLink = location.hash.startsWith('#flare-');
    startMyLocation(!hasDeepLink);

    document.getElementById('loc-btn').addEventListener('click', function(){
      startMyLocation(true);
    });

    startPoll();

    /* Iniciar onboarding si es primera visita */
    if(!localStorage.getItem('flare_onboarding_complete')){
      setTimeout(obStart, 800);
    }
  });
});

/* ══ ONBOARDING JS ══════════════════════════════════════ */
var obCurrentStep = 0;

function obStart(){
  obCurrentStep = 1;
  var wrap = document.getElementById('ob-wrap');
  wrap.style.display = 'block';
  setTimeout(function(){ wrap.classList.add('active'); }, 10);
  obShowStep(1);
}

function obShowStep(n){
  /* Ocultar todos los steps */
  [1,2,3,4].forEach(function(i){
    var el = document.getElementById('ob-'+i);
    if(el) el.style.display = 'none';
  });
  var step = document.getElementById('ob-'+n);
  if(!step) return;
  step.style.display = 'flex';

  /* Efectos por paso */
  document.getElementById('fab-wrap').classList.remove('ob-spotlight');
  document.querySelectorAll('.mk').forEach(function(el){ el.classList.remove('ob-pins-pulse'); });

  if(n===2){
    /* Pulsar todos los pins visibles */
    setTimeout(function(){
      document.querySelectorAll('.mk-b').forEach(function(el){ el.style.animation='pulse-danger .8s ease-in-out infinite alternate'; });
    }, 300);
  }
  if(n===3){
    /* El overlay completo deja pasar todos los toques */
    document.getElementById('ob-wrap').style.pointerEvents = 'none';
    /* Solo el FAB y la card son interactivos */
    document.getElementById('fab-wrap').classList.add('ob-spotlight');
    step.style.pointerEvents = 'none';
    step.style.background = 'transparent';
    step.style.backdropFilter = 'none';
    var card = step.querySelector('.ob-card');
    if(card) card.style.pointerEvents = 'all';
    /* Step 3 usa ob-toast — el fab-wrap.ob-spotlight tiene z-index:9500 y
       está encima del ob-wrap (9000), interceptando touches al botón Saltar.
       Subir el toast a z-index:9600 para que quede encima del FAB. */
    var toast = step.querySelector('.ob-toast');
    if(toast){
      toast.style.pointerEvents = 'all';
      toast.style.position = 'relative';
      toast.style.zIndex = '9600';
      var skipBtn = toast.querySelector('.ob-btn-skip');
      if(skipBtn && !skipBtn._touchBound){
        skipBtn._touchBound = true;
        skipBtn.addEventListener('touchend', function(e){ e.preventDefault(); e.stopPropagation(); obSkip(); });
      }
    }
  } else {
    /* Resto de pasos: overlay normal bloqueante */
    document.getElementById('ob-wrap').style.pointerEvents = 'all';
    var allSteps = document.querySelectorAll('.ob-step');
    allSteps.forEach(function(s){ s.style.background=''; s.style.backdropFilter=''; s.style.pointerEvents=''; });
  }
}

function obComplete(){
  localStorage.setItem('flare_onboarding_complete','1');
  var wrap = document.getElementById('ob-wrap');
  wrap.classList.remove('active');
  wrap.style.pointerEvents = 'none';
  document.getElementById('fab-wrap').classList.remove('ob-spotlight');
  document.querySelectorAll('.mk-b').forEach(function(el){ el.style.animation=''; });
  setTimeout(function(){ wrap.style.display='none'; }, 400);
}

function obSkip(){
  obComplete();
}

function obCelebrate(){
  if(localStorage.getItem('flare_first_published')) return;
  localStorage.setItem('flare_first_published','1');
  obCurrentStep = 4;

  /* Restaurar estado */
  document.getElementById('fab-wrap').classList.remove('ob-spotlight');
  document.querySelectorAll('.mk-b').forEach(function(el){ el.style.animation=''; });
  document.getElementById('ob-wrap').style.pointerEvents = 'all';

  obShowStep(4);
  obLaunchConfetti();

  /* Barra de progreso */
  setTimeout(function(){
    var fill = document.getElementById('ob-progress-fill');
    if(fill) fill.style.width = '100%';
  }, 100);

  /* Auto cerrar en 4s */
  setTimeout(function(){ obComplete(); }, 4200);
}

function obLaunchConfetti(){
  var container = document.getElementById('ob-confetti');
  var colors = ['#00f5a0','#f500a0','#ffb300','#ff4060','#ffffff','#00c8ff'];
  for(var i=0; i<80; i++){
    (function(i){
      setTimeout(function(){
        var p = document.createElement('div');
        p.className = 'ob-particle';
        p.style.left = Math.random()*100+'vw';
        p.style.background = colors[Math.floor(Math.random()*colors.length)];
        p.style.width = (6+Math.random()*8)+'px';
        p.style.height = (6+Math.random()*8)+'px';
        p.style.borderRadius = Math.random()>.5 ? '50%' : '2px';
        p.style.animationDuration = (1.5+Math.random()*2)+'s';
        p.style.animationDelay = '0s';
        container.appendChild(p);
        setTimeout(function(){ p.remove(); }, 3500);
      }, i*30);
    })(i);
  }
}

/* Listeners de botones de onboarding */
document.addEventListener('click', function(e){
  var next = e.target.closest('.ob-btn-next');
  if(next){
    var n = parseInt(next.dataset.next);
    obCurrentStep = n;
    obShowStep(n);
    return;
  }
  var skip = e.target.closest('.ob-btn-skip');
  if(skip){ obSkip(); return; }
});
