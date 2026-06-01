/* ── markers.js — mkHTML, makeMarker, refreshMk, popHTML, refreshPop ── */

function mkHTML(pin, state, born){
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
  var ico = L.divIcon({className:'',html:mkHTML(pin, state, true),iconSize:[31,36],iconAnchor:[15,36]});
  var m = L.marker([pin.lat, pin.lng], {icon:ico});
  m.bindPopup(popHTML(pin), {maxWidth:300, autoPan:false});
  m.on('popupopen', function(){
    refreshPop(pin);
    var el = m.getElement();
    if(el) el.classList.add('mk-open');
  });
  m.on('popupclose', function(){
    var el = m.getElement();
    if(el) el.classList.remove('mk-open');
    setTimeout(fetchFlares, 50);
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
    +'<div>'+(pin.bizName?'<div class="pop-biz">🏪 '+esc(pin.bizName)+'</div>':'')+'<div class="pop-name">'+esc(pin.title)+'</div>'+(pin.username?'<div class="pop-username">@'+esc(pin.username)+'</div>':'')+'<div class="pop-cat" style="color:'+c+'">● '+(pin.catLbl||'Flare')+' · '+fmtT(r)+'</div></div></div>'
    +'<div class="pop-bar"><div class="pop-fill" style="width:'+pct+'%;background:linear-gradient(90deg,'+c+',var(--neon2))"></div></div>'
    +(pin.text?'<div class="pop-txt">'+richText(pin.text)+'</div>':'')
    +(getPinState(pin)==='dying'?'<div class="rescue-msg" style="margin-bottom:8px">🔴 ¡Por expirar! Dale ❤️ para salvarlo</div>':'')
    +'<div class="pop-foot">'
    +'<button class="pop-btn pop-like'+(pin.liked?' liked':'')+'" onclick="doLike(\''+pin.id+'\')">'
    +'<span class="pop-btn-ico">'+(pin.liked?'❤️':'🤍')+'</span>'
    +'<span class="pop-btn-lbl">+5 min</span>'
    +'</button>'
    +'<button class="pop-btn pop-gmaps" onclick="openMaps('+pin.lat+','+pin.lng+')" title="Ver en Maps">'
    +'<span class="pop-btn-ico">🗺️</span>'
    +'<span class="pop-btn-lbl" style="line-height:1.3">Google<br>Maps</span>'
    +'</button>'
    +'<button class="pop-btn pop-share" onclick="shareFlare(\''+pin.id+'\')" title="Compartir">'
    +'<span class="pop-btn-ico">↗</span>'
    +'<span class="pop-btn-lbl">Share</span>'
    +'</button>'
    +'<button class="pop-btn pop-report-btn" onclick="openReport(\''+pin.id+'\')" title="Reportar">'
    +'<span class="pop-btn-ico">🚩</span>'
    +'<span class="pop-btn-lbl">Report</span>'
    +'</button>'
    +'</div>'
    +'<div class="pop-id" onclick="navigator.clipboard.writeText(\''+pin.id+'\').then(function(){var el=document.querySelector(\'.pop-id[data-id=\\\'' +pin.id+ '\\\']\');if(el){el.textContent=\'✓ copiado\';setTimeout(function(){el.textContent=\'ID: '+pin.id+'\'},1500)}})" data-id="'+pin.id+'" title="Mantén presionado para copiar">ID: '+pin.id+'</div>'
    +'</div>';
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
