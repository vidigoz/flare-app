/* ── panel.js — panel open/close, buildChips, renderPanel, myFlares, manual ── */

function refreshPanelLike(id){
  var pin = pins[id];
  if(!pin) return;
  // Actualiza el contador en la fila
  var likesEl = document.querySelector('#prow-'+id+' .plikes');
  if(likesEl){ likesEl.textContent = '❤️ '+pin.likes; likesEl.classList.toggle('plikes-active', pin.likes>0); }
  // Actualiza el botón de like en el detalle
  var likeBtn = document.querySelector('#pdet-'+id+' .pd-like');
  if(likeBtn){
    likeBtn.className = 'pd-like'+(pin.liked?' liked':'');
    var countEl = likeBtn.querySelector('.pd-like-count');
    if(countEl) countEl.textContent = pin.likes;
    likeBtn.childNodes[0].textContent = pin.liked ? '❤️' : '🤍';
    var lastText = likeBtn.lastChild;
    if(lastText && lastText.nodeType === 3) lastText.textContent = pin.liked ? ' Liked' : ' Me gusta';
  }
}

function togglePanel(){ panelOpen ? closePanel() : openPanel(); }

function updateProfileBar() {
  var card = document.getElementById('panel-profile-card');
  if (!card) return;
  if (!IDENTITY || !IDENTITY.username) { card.style.display = 'none'; return; }
  var nameEl  = document.getElementById('ppc-name');
  var tierEl  = document.getElementById('ppc-tier');
  var avatarEl = document.getElementById('ppc-avatar');
  var hoy = new Date().toDateString();
  var flaresHoy = (IDENTITY.fecha_hoy === hoy) ? (IDENTITY.flares_hoy || 0) : 0;
  if (nameEl)   nameEl.textContent  = '@' + IDENTITY.username;
  if (tierEl)   tierEl.textContent  = (IDENTITY.tier === 3 ? '✓ Verificado' : '○ Sin validar') + ' · ' + flaresHoy + ' flare' + (flaresHoy !== 1 ? 's' : '') + ' hoy';
  if (avatarEl) avatarEl.src        = IDENTITY.avatar_url || '';
  card.style.display = 'flex';
}

function openPanel(){
  panelOpen = true;
  obHideTips();
  document.getElementById('panel').classList.add('open');
  document.getElementById('pov').classList.add('on');
  document.getElementById('pbtn').style.display = 'none';
  document.getElementById('fab-wrap').style.display = 'none';
  updateProfileBar();
  buildChips(); renderPanel();
}
function closePanel(){
  panelOpen = false;
  goFlares();
  document.getElementById('panel').classList.remove('open');
  document.getElementById('pov').classList.remove('on');
  document.getElementById('pbtn').style.display = 'flex';
  document.getElementById('fab-wrap').style.display = 'flex';
  var hasOpenPopup = map && Object.values(pins).some(function(p){ return p.marker && p.marker.isPopupOpen(); });
  if(!localStorage.getItem('flare_onboarding_complete') && !localStorage.getItem('flare_identity') && !hasOpenPopup){
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
    if(cat.disabled){
      ch.className = 'chip chip-disabled';
      ch.innerHTML = '<div class="chip-dot" style="background:'+cat.color+';opacity:.35"></div><span>'+cat.icon+' '+cat.lbl.replace('\n',' ')+'</span>';
    } else {
      ch.className = 'chip' + (activeCat===cat.id ? ' on' : '');
      if(activeCat===cat.id){ ch.style.background=cat.color; ch.style.borderColor=cat.color; }
      ch.innerHTML = '<div class="chip-dot" style="background:'+cat.color+'"></div><span>'+cat.icon+' '+cat.lbl.replace('\n',' ')+'</span><span style="opacity:.7">'+cnt+'</span>';
      ch.addEventListener('click', function(){ activeCat=(activeCat===cat.id)?null:cat.id; buildChips(); renderPanel(); });
    }
    box.appendChild(ch);
  });
}

function renderPanel(){
  var q = (document.getElementById('srch').value||'').toLowerCase();
  var vp = filteredVisible();
  if(activeCat) vp = vp.filter(function(p){ return p.cat===activeCat; });
  if(activeFlareType) vp = vp.filter(function(p){ return (p.flareType||'flama')===activeFlareType; });
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
      +(pin.image?'<img class="pd-img img-zoomable" src="'+esc(pin.image)+'" alt="Foto del flare" loading="lazy" onclick="openLightbox(\''+esc(pin.image)+'\')">':'')
      +'<div class="pd-acts">'
      +'<button class="pd-like'+(pin.liked?' liked':'')+'" data-lid="'+pin.id+'">'
      +(pin.liked?'❤️':'♥')+' +5 min'
      +'</button>'
      +'<button class="pd-map" data-fid="'+pin.id+'">📍 Ver aquí</button>'
      +'<button class="pd-gmaps" onclick="openMaps('+pin.lat+','+pin.lng+')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 20l-5 2V6l5-2 6 2 5-2v16l-5 2-6-2z"/><path d="M9 4v16M15 6v16"/></svg> Llegar</button>'
      +'<button class="pd-share" onclick="shareFlare(\''+pin.id+'\')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="2.4"/><circle cx="17" cy="6" r="2.4"/><circle cx="17" cy="18" r="2.4"/><path d="M8.1 10.9l6.8-3.7M8.1 13.1l6.8 3.7"/></svg> Compartir</button>'
      +'<button class="pd-report" data-report-id="'+pin.id+'"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg> Reportar</button>'
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
      if(expandedId){
        setTimeout(function(){ var el=document.getElementById('prow-'+expandedId); if(el)el.scrollIntoView({behavior:'smooth',block:'nearest'}); },50);
        // Verificar like en DB si no está marcado localmente
        var expandedPin = pins[expandedId];
        if(expandedPin && !expandedPin.liked && IDENTITY && IDENTITY.uid){
          fetch('/api/likes?uid=' + encodeURIComponent(IDENTITY.uid) + '&flare_id=' + encodeURIComponent(expandedId))
            .then(function(r){ return r.ok ? r.json() : null; })
            .then(function(data){
              if(!data || !Array.isArray(data.liked) || data.liked.length === 0) return;
              expandedPin.liked = true;
              markLiked(expandedId);
              renderPanel();
            })
            .catch(function(){});
        }
      }
    }
  };
}

function flyToLikedFlare(id, lat, lng){
  closePanel();
  map.flyTo([lat, lng], 17, {duration:.8});
  setTimeout(function(){
    if (pins[id]) {
      // ya está en memoria — abrir popup directo
      if(clusterEnabled && clusterGroup.zoomToShowLayer){
        clusterGroup.zoomToShowLayer(pins[id].marker, function(){ pins[id].marker.openPopup(); });
      } else {
        pins[id].marker.openPopup();
      }
    } else {
      // no está en el viewport aún — fetch y agregar al mapa
      apiFetch('/api/flares?id=' + encodeURIComponent(id))
        .then(function(row){
          if(!row) return;
          var pin = rowToPin(row);
          pin.marker = makeMarker(pin);
          pins[pin.id] = pin;
          applyVigFilter();
          if(clusterEnabled && clusterGroup.zoomToShowLayer){
            clusterGroup.zoomToShowLayer(pin.marker, function(){ pin.marker.openPopup(); });
          } else {
            pin.marker.openPopup();
          }
        })
        .catch(function(){});
    }
  }, 900);
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
  var uid = getOwnerUid();
  if (!uid) { cb(null, []); return; }
  box.innerHTML = '<div class="pempty" style="opacity:.6">Cargando...</div>';
  apiFetch('/api/flares?owner_uid=' + encodeURIComponent(uid))
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
<div class="m-sub">Guía completa · Versión 1.5 · El mapa que respira</div>
<nav class="m-nav">
  <a href="#m-overview" class="active">¿Qué es?</a>
  <a href="#m-crear">Crear</a>
  <a href="#m-duraciones">Duración</a>
  <a href="#m-categorias">Categorías</a>
  <a href="#m-vigencia">Vigencia</a>
  <a href="#m-floins">Floins</a>
  <a href="#m-tiers">Niveles</a>
  <a href="#m-panel">Panel</a>
  <a href="#m-tips">Tips</a>
</nav>
<div class="m-body" id="m-body">

<div class="m-section" id="m-overview">
  <div class="m-sec-hdr"><div class="m-sec-num">01</div><div class="m-sec-title">¿Qué es <span class="hl">Flare</span>?</div></div>
  <div class="m-card"><span class="m-card-icon">📍</span><div class="m-card-title">Mapa en Vivo</div><div class="m-card-desc">Coloca marcadores geolocalizados en cualquier parte del mapa con un solo toque. Lo que ves es lo que pasa ahora mismo en tu zona.</div></div>
  <div class="m-card"><span class="m-card-icon">⏱️</span><div class="m-card-title">Eventos Efímeros</div><div class="m-card-desc">Los flares duran entre 1 y 12 horas y desaparecen solos. El mapa siempre está fresco y relevante.</div></div>
  <div class="m-card"><span class="m-card-icon">❤️</span><div class="m-card-title">Likes = Tiempo</div><div class="m-card-desc">Cada like suma +5 minutos de vida al flare. Sin límite — si la comunidad lo mantiene vivo, sigue en el mapa.</div></div>
  <div class="m-card"><span class="m-card-icon"><img src="/icons/floin.png" class="m-floin-ico m-floin-ico--lg" onerror="this.replaceWith('🪙')"></span><div class="m-card-title">Floins</div><div class="m-card-desc">La moneda de Flare. Gánalos publicando y dando likes. Úsalos para publicar flares de mayor duración.</div></div>
  <div class="m-card"><span class="m-card-icon">🔗</span><div class="m-card-title">Links y Teléfonos</div><div class="m-card-desc">Los números y URLs en el texto se convierten automáticamente en hipervínculos para llamar o visitar.</div></div>
</div>

<div class="m-section" id="m-crear">
  <div class="m-sec-hdr"><div class="m-sec-num">02</div><div class="m-sec-title">Cómo <span class="hl">Crear</span> un Flare</div></div>
  <div class="m-step"><div class="m-step-num">1</div><div class="m-step-body"><div class="m-step-title">Presiona "＋ Crear Flare"</div><div class="m-step-desc">El botón flotante en la parte inferior de la pantalla. Aparece un menú con dos opciones de ubicación.</div></div></div>
  <div class="m-step"><div class="m-step-num">2</div><div class="m-step-body"><div class="m-step-title">📍 Mi ubicación — o — 🗺️ Elegir en mapa</div><div class="m-step-desc">GPS automático, o toca el punto exacto en el mapa con el crosshair.</div><div class="m-tip">💡 GPS es la opción más rápida cuando estás en el lugar</div></div></div>
  <div class="m-step"><div class="m-step-num">3</div><div class="m-step-body"><div class="m-step-title">Elige categoría e ícono</div><div class="m-step-desc">2 categorías activas: Antojos y Ventas. Cada una tiene 10 emojis específicos para elegir.</div></div></div>
  <div class="m-step"><div class="m-step-num">4</div><div class="m-step-body"><div class="m-step-title">Escribe título y descripción</div><div class="m-step-desc">Título obligatorio (máx. 60 caracteres). En la descripción puedes poner número de teléfono o link — se vuelve clicable automáticamente.</div><div class="m-tip">📞 Escribe tu número para que te contacten directo</div></div></div>
  <div class="m-step"><div class="m-step-num">5</div><div class="m-step-body"><div class="m-step-title">📸 Foto opcional</div><div class="m-step-desc">Agrega una imagen JPG, PNG o WebP. Se comprime automáticamente. Ideal para mostrar el producto o lugar.</div></div></div>
  <div class="m-step"><div class="m-step-num">6</div><div class="m-step-body"><div class="m-step-title">Elige la duración</div><div class="m-step-desc">Chispa (1h), Flama (3h), Fogata (6h) o Hoguera (12h). Las duraciones largas requieren Floins.</div></div></div>
  <div class="m-step"><div class="m-step-num">7</div><div class="m-step-body"><div class="m-step-title">⚡ Publicar Flare</div><div class="m-step-desc">El flare aparece en el mapa al instante. El mapa hace zoom automático a tu flare.</div></div></div>
  <div class="m-callout hot"><div class="m-callout-icon">📊</div><div class="m-callout-body"><strong>Límite diario</strong><br>Puedes publicar hasta <strong>10 flares por día</strong>. Los usuarios verificados con número no tienen límite diario.</div></div>
</div>

<div class="m-section" id="m-duraciones">
  <div class="m-sec-hdr"><div class="m-sec-num">03</div><div class="m-sec-title">Tipos de <span class="hl2">Duración</span></div></div>
  <div class="m-vig-row" style="background:rgba(0,245,160,.04)">
    <div style="font-size:20px;width:32px;text-align:center;flex-shrink:0">⚡</div>
    <div class="m-vig-info"><div class="m-vig-label" style="color:var(--neon)">Chispa</div><div class="m-vig-desc">Lo verdaderamente urgente. "Queda poca birria", "última hora de happy hour".</div></div>
    <div class="m-vig-time" style="color:var(--neon)">1h · gratis</div>
  </div>
  <div class="m-vig-row" style="background:rgba(255,149,0,.04)">
    <div style="font-size:20px;width:32px;text-align:center;flex-shrink:0">🔥</div>
    <div class="m-vig-info"><div class="m-vig-label" style="color:#ff9500">Flama</div><div class="m-vig-desc">Un bloque de actividad. "Servicio de comida de 1 a 4", "puesto de tamales toda la mañana".</div></div>
    <div class="m-vig-time" style="color:#ff9500">3h · gratis</div>
  </div>
  <div class="m-vig-row" style="background:rgba(245,196,0,.04)">
    <div style="font-size:20px;width:32px;text-align:center;flex-shrink:0">🪵</div>
    <div class="m-vig-info"><div class="m-vig-label" style="color:#f5c400">Fogata</div><div class="m-vig-desc">Tu turno completo sin republicar. Swap meet, medio día de ventas, evento de mañana completa.</div></div>
    <div class="m-vig-time" style="color:#f5c400">6h · 5 <img src="/icons/floin.png" class="m-floin-ico" onerror="this.replaceWith('🪙')"></div>
  </div>
  <div class="m-vig-row" style="background:rgba(255,64,96,.04)">
    <div style="font-size:20px;width:32px;text-align:center;flex-shrink:0">🏕️</div>
    <div class="m-vig-info"><div class="m-vig-label" style="color:#ff4060">Hoguera</div><div class="m-vig-desc">Presencia de día completo. Abierto todo el día, evento que dura toda la jornada.</div></div>
    <div class="m-vig-time" style="color:#ff4060">12h · 10 <img src="/icons/floin.png" class="m-floin-ico" onerror="this.replaceWith('🪙')"></div>
  </div>
  <div class="m-callout" style="margin-top:10px"><div class="m-callout-icon">💡</div><div class="m-callout-body"><strong>Chispa y Flama son gratis</strong><br>Fogata y Hoguera requieren Floins — la moneda que ganas usando Flare. Sin costo real, solo actividad.</div></div>
</div>

<div class="m-section" id="m-categorias">
  <div class="m-sec-hdr"><div class="m-sec-num">04</div><div class="m-sec-title"><span class="hl">Categorías</span></div></div>
  <div class="m-cat" style="border-color:rgba(255,149,0,.3)"><div class="m-cat-icon">🍽️</div><div class="m-cat-info"><div class="m-cat-name" style="color:#ff9500">Antojos</div><div class="m-cat-desc">Tacos, food trucks, restaurantes, pop-ups, puestos de comida</div><div class="m-cat-emojis">🍕🌮🍔🍜🥗🍺☕🍦🥩🍣</div></div></div>
  <div class="m-cat" style="border-color:rgba(0,194,255,.3)"><div class="m-cat-icon">🏷️</div><div class="m-cat-info"><div class="m-cat-name" style="color:#00c2ff">Ventas</div><div class="m-cat-desc">Garage sales, liquidaciones, ropa de paca, rematerías, bazares</div><div class="m-cat-emojis">🏷️💸🛒🎁💰🛍️🤑💎🔖📦</div></div></div>
  <div class="m-cat" style="border-color:rgba(160,0,245,.2);opacity:.55"><div class="m-cat-icon">🎉</div><div class="m-cat-info"><div class="m-cat-name" style="color:#a000f5">Evento</div><div class="m-cat-desc">Conciertos, torneos, festivales, carreras — <em>próximamente</em></div></div></div>
  <div class="m-cat" style="border-color:rgba(255,64,96,.2);opacity:.55"><div class="m-cat-icon">⚡</div><div class="m-cat-info"><div class="m-cat-name" style="color:#ff4060">Suceso</div><div class="m-cat-desc">Accidentes, retenes, bloqueos, alertas — <em>próximamente</em></div></div></div>
  <div class="m-cat" style="border-color:rgba(0,245,160,.2);opacity:.55"><div class="m-cat-icon">ℹ️</div><div class="m-cat-info"><div class="m-cat-name" style="color:var(--neon)">Información</div><div class="m-cat-desc">Avisos, cortes de agua/luz, ferias de empleo — <em>próximamente</em></div></div></div>
</div>

<div class="m-section" id="m-vigencia">
  <div class="m-sec-hdr"><div class="m-sec-num">05</div><div class="m-sec-title">Estados de <span class="hl3">Vigencia</span></div></div>
  <div class="m-vig-row" style="background:rgba(0,245,160,.04)"><div class="m-vig-dot" style="background:var(--neon);box-shadow:0 0 6px var(--neon)"></div><div class="m-vig-info"><div class="m-vig-label" style="color:var(--neon)">Nuevo</div><div class="m-vig-desc">Flare fresco. Marcador verde brillante.</div></div><div class="m-vig-time" style="color:var(--neon)">&gt; 30 min</div></div>
  <div class="m-vig-row" style="background:rgba(255,179,0,.04)"><div class="m-vig-dot" style="background:var(--amber);box-shadow:0 0 6px var(--amber)"></div><div class="m-vig-info"><div class="m-vig-label" style="color:var(--amber)">Maduro</div><div class="m-vig-desc">Flare en su fase media.</div></div><div class="m-vig-time" style="color:var(--amber)">10–30 min</div></div>
  <div class="m-vig-row" style="background:rgba(255,64,96,.04)"><div class="m-vig-dot" style="background:var(--danger);box-shadow:0 0 6px var(--danger)"></div><div class="m-vig-info"><div class="m-vig-label" style="color:var(--danger)">Expirando</div><div class="m-vig-desc">Últimos minutos. Marcador rojo.</div></div><div class="m-vig-time" style="color:var(--danger)">&lt; 10 min</div></div>
  <div class="m-callout" style="margin-top:10px"><div class="m-callout-icon">❤️</div><div class="m-callout-body"><strong>Likes extienden la vida</strong><br>Cada ❤️ suma <strong style="color:var(--neon)">+5 minutos</strong> al flare. Sin límite de tiempo — si la comunidad lo mantiene vivo, sigue en el mapa. Solo un like por flare por persona.</div></div>
  <div class="m-callout" style="margin-top:8px"><div class="m-callout-icon">⏱️</div><div class="m-callout-body"><strong>Extender tu propio flare</strong><br>Desde el popup de tu flare puedes pagar <strong style="color:#f5c400">5 Floins</strong> para añadirle <strong>+1 hora</strong> directamente.</div></div>
</div>

<div class="m-section" id="m-floins">
  <div class="m-sec-hdr"><div class="m-sec-num">06</div><div class="m-sec-title"><span class="hl2">Floins</span> <img src="/icons/floin.png" class="m-floin-ico m-floin-ico--lg" onerror="this.replaceWith('🪙')"></div></div>
  <div class="m-card"><span class="m-card-icon"><img src="/icons/floin.png" class="m-floin-ico m-floin-ico--lg" onerror="this.replaceWith('🪙')"></span><div class="m-card-title">¿Qué son los Floins?</div><div class="m-card-desc">La moneda interna de Flare. Se ganan siendo activo en la comunidad y se usan para publicar flares de mayor duración.</div></div>
  <div style="margin-top:12px;margin-bottom:6px;font-family:'Space Mono',monospace;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--dim)">Cómo ganarlos</div>
  <div class="m-sk">
    <div class="m-sk-row"><div class="m-sk-key">🔥 Primer flare</div><div class="m-sk-desc"><strong style="color:#f5c400">+10 Floins</strong> — una sola vez</div></div>
    <div class="m-sk-row"><div class="m-sk-key">📍 Publicar flare</div><div class="m-sk-desc"><strong style="color:#f5c400">+2 Floins</strong> por publicación</div></div>
    <div class="m-sk-row"><div class="m-sk-key">❤️ Dar like</div><div class="m-sk-desc"><strong style="color:#f5c400">+1 Floin</strong> por like dado</div></div>
    <div class="m-sk-row"><div class="m-sk-key">🏆 Tu flare recibe 5 likes</div><div class="m-sk-desc"><strong style="color:#f5c400">+3 Floins</strong> por cada 5 likes</div></div>
  </div>
  <div style="margin-top:12px;margin-bottom:6px;font-family:'Space Mono',monospace;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--dim)">Cómo gastarlos</div>
  <div class="m-sk">
    <div class="m-sk-row"><div class="m-sk-key">🪵 Fogata (6h)</div><div class="m-sk-desc"><strong style="color:#ff4060">−5 Floins</strong></div></div>
    <div class="m-sk-row"><div class="m-sk-key">🏕️ Hoguera (12h)</div><div class="m-sk-desc"><strong style="color:#ff4060">−10 Floins</strong></div></div>
    <div class="m-sk-row"><div class="m-sk-key">⏱️ Extender +1h</div><div class="m-sk-desc"><strong style="color:#ff4060">−5 Floins</strong></div></div>
  </div>
  <div class="m-callout" style="margin-top:10px"><div class="m-callout-icon">📊</div><div class="m-callout-body"><strong>Tu saldo siempre visible</strong><br>El número de Floins aparece en la barra superior. Tócalo para ver tu historial completo de transacciones.</div></div>
</div>

<div class="m-section" id="m-tiers">
  <div class="m-sec-hdr"><div class="m-sec-num">07</div><div class="m-sec-title">Niveles de <span class="hl">Usuario</span></div></div>
  <div class="m-vig-row" style="background:rgba(255,255,255,.03);margin-bottom:8px;border-radius:10px;padding:12px">
    <div style="font-size:22px;width:32px;text-align:center;flex-shrink:0">👻</div>
    <div class="m-vig-info">
      <div class="m-vig-label" style="color:var(--dim)">Visitante</div>
      <div class="m-vig-desc">Puedes ver todos los flares del mapa y compartirlos. Para publicar o dar like necesitas crear tu perfil.</div>
    </div>
  </div>
  <div class="m-vig-row" style="background:rgba(0,245,160,.04);margin-bottom:8px;border-radius:10px;padding:12px">
    <div style="font-size:22px;width:32px;text-align:center;flex-shrink:0">⚡</div>
    <div class="m-vig-info">
      <div class="m-vig-label" style="color:var(--neon)">Usuario</div>
      <div class="m-vig-desc">Al publicar tu primer flare o dar tu primer like se crea tu perfil automáticamente. Puedes publicar, dar likes y acumular Floins. Límite de 10 flares por día.</div>
    </div>
  </div>
  <div class="m-vig-row" style="background:rgba(245,196,0,.04);border-radius:10px;padding:12px">
    <div style="font-size:22px;width:32px;text-align:center;flex-shrink:0">✅</div>
    <div class="m-vig-info">
      <div class="m-vig-label" style="color:#f5c400">Verificado</div>
      <div class="m-vig-desc">Validas tu perfil con tu número de celular. Obtienes un nombre personalizado, sin límite diario de flares y tu perfil se sincroniza entre dispositivos.</div>
    </div>
  </div>
  <div class="m-callout" style="margin-top:10px"><div class="m-callout-icon">📱</div><div class="m-callout-body"><strong>Verificar es gratis</strong><br>Ve a tu perfil (icono 👤 en el panel) y toca "Verificar con número". Solo se usa para identificar tu cuenta — sin spam.</div></div>
</div>

<div class="m-section" id="m-panel">
  <div class="m-sec-hdr"><div class="m-sec-num">08</div><div class="m-sec-title">El <span class="hl">Panel</span> Lateral</div></div>
  <div class="m-card"><span class="m-card-icon">🔍</span><div class="m-card-title">Flares en Vista</div><div class="m-card-desc">Lista todos los flares activos en el área visible del mapa. Mueve o haz zoom y la lista se actualiza automáticamente.</div></div>
  <div class="m-card"><span class="m-card-icon">🎛️</span><div class="m-card-title">Filtros</div><div class="m-card-desc">Filtra por vigencia (Todos · Nuevo · Maduro · Expirando) y por categoría. Los filtros también aplican a los marcadores del mapa.</div></div>
  <div class="m-card"><span class="m-card-icon">👤</span><div class="m-card-title">Mi Perfil</div><div class="m-card-desc">Ve tu nombre, avatar, nivel y balance de Floins. Desde aquí puedes verificar tu cuenta con tu número.</div></div>
  <div class="m-card"><span class="m-card-icon"><img src="/icons/floin.png" class="m-floin-ico m-floin-ico--lg" onerror="this.replaceWith('🪙')"></span><div class="m-card-title">Mis Floins</div><div class="m-card-desc">Historial completo de Floins ganados y gastados, con el motivo de cada transacción.</div></div>
  <div class="m-card"><span class="m-card-icon">❓</span><div class="m-card-title">Tutorial</div><div class="m-card-desc">Este manual. También accesible desde el botón ❓ junto al contador de Floins en la barra superior.</div></div>
</div>

<div class="m-section" id="m-tips">
  <div class="m-sec-hdr"><div class="m-sec-num">09</div><div class="m-sec-title">Tips y <span class="hl2">Trucos</span></div></div>
  <div class="m-card"><span class="m-card-icon">🎯</span><div class="m-card-title">Títulos específicos ganan más likes</div><div class="m-card-desc">"Tacos de carne asada con tortilla hecha a mano — $25" funciona mejor que "Hay tacos aquí"</div></div>
  <div class="m-card"><span class="m-card-icon">📸</span><div class="m-card-title">Una foto vale más que mil palabras</div><div class="m-card-desc">Los flares con foto reciben más atención. Muestra el producto, el lugar o lo que estás vendiendo.</div></div>
  <div class="m-card"><span class="m-card-icon">🔗</span><div class="m-card-title">Comparte tus flares</div><div class="m-card-desc">Toca el ícono de compartir en el popup de cualquier flare para enviar el link directo por WhatsApp, redes sociales o donde quieras.</div></div>
  <div class="m-card"><span class="m-card-icon">📞</span><div class="m-card-title">Incluye tu número si vendes</div><div class="m-card-desc">Escribe tu número en la descripción. Se convierte en link para llamar con un toque desde el celular.</div></div>
  <div class="m-card"><span class="m-card-icon">⏱️</span><div class="m-card-title">Dale vida a los mejores flares</div><div class="m-card-desc">Si ves un flare útil expirando, dale ❤️ para extenderle +5 minutos. Además ganas 1 Floin por cada like.</div></div>
  <div class="m-card"><span class="m-card-icon"><img src="/icons/floin.png" class="m-floin-ico m-floin-ico--lg" onerror="this.replaceWith('🪙')"></span><div class="m-card-title">Acumula Floins desde el inicio</div><div class="m-card-desc">Tu primer flare te da 10 Floins — suficiente para una Fogata (6h). Empieza con Chispa o Flama y ahorra para duraciones largas.</div></div>
  <div style="margin-top:16px;font-family:'Space Mono',monospace;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--dim);margin-bottom:8px">Gestos</div>
  <div class="m-sk">
    <div class="m-sk-row"><div class="m-sk-key">Toque en marcador</div><div class="m-sk-desc">Abre popup del flare</div></div>
    <div class="m-sk-row"><div class="m-sk-key">Toque emoji en panel</div><div class="m-sk-desc">Vuela al flare en el mapa</div></div>
    <div class="m-sk-row"><div class="m-sk-key">Toque fila en panel</div><div class="m-sk-desc">Expande / colapsa detalle</div></div>
    <div class="m-sk-row"><div class="m-sk-key">Scroll / pinch mapa</div><div class="m-sk-desc">Zoom · Panel se actualiza</div></div>
    <div class="m-sk-row"><div class="m-sk-key">Toque fuera del popup</div><div class="m-sk-desc">Cierra el popup del flare</div></div>
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
  ['panel-flares','panel-manual','panel-mine','panel-profile','panel-floins'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  var target = document.getElementById(viewId);
  if (target) target.style.display = (viewId === 'panel-manual') ? 'block' : 'flex';
}

function showFloinsPanel() {
  if(!panelOpen) openPanel();
  showView('panel-floins');
  document.getElementById('ph-ttl').innerHTML = 'Mis <span>Floins</span>';
  document.getElementById('ph-sub').textContent = 'Economía del mapa';
  setActiveNav('pnav-floins');
  renderFloinsPanel();
}

function renderFloinsPanel() {
  var box = document.getElementById('floins-content');
  if (!box) return;
  var balance = (IDENTITY && typeof IDENTITY.floins === 'number') ? IDENTITY.floins : 0;

  box.innerHTML =
    '<div class="fp-hero">' +
      '<img src="/icons/floin.png" class="fp-hero-ico" onerror="this.replaceWith(document.createTextNode(\'🪙\'))">' +
      '<div class="fp-hero-balance" id="fp-balance">' + balance + '</div>' +
      '<div class="fp-hero-lbl">Floins disponibles</div>' +
    '</div>' +

    '<div class="fp-section">' +
      '<div class="fp-section-title">Últimos movimientos</div>' +
      '<div id="fp-history"><div class="fp-empty">Cargando...</div></div>' +
    '</div>' +

    '<div class="fp-section">' +
      '<div class="fp-section-title">Cómo ganar Floins</div>' +
      '<div class="fp-guide">' +
        '<div class="fp-guide-row"><span class="fp-guide-ico">🔥</span><div class="fp-guide-body"><div class="fp-guide-lbl">Primer flare</div><div class="fp-guide-desc">Publica tu primer flare</div></div><span class="fp-guide-val gain">+10</span></div>' +
        '<div class="fp-guide-row"><span class="fp-guide-ico">📍</span><div class="fp-guide-body"><div class="fp-guide-lbl">Publicar flare</div><div class="fp-guide-desc">Cada vez que publicas</div></div><span class="fp-guide-val gain">+2</span></div>' +
        '<div class="fp-guide-row"><span class="fp-guide-ico">❤️</span><div class="fp-guide-body"><div class="fp-guide-lbl">Dar 10 likes</div><div class="fp-guide-desc">Máximo 2 Floins por día</div></div><span class="fp-guide-val gain">+1</span></div>' +
        '<div class="fp-guide-row"><span class="fp-guide-ico">⭐</span><div class="fp-guide-body"><div class="fp-guide-lbl">Recibir 5 likes</div><div class="fp-guide-desc">Tu flare recibe cada 5 likes</div></div><span class="fp-guide-val gain">+3</span></div>' +
        '<div class="fp-guide-row"><span class="fp-guide-ico">📱</span><div class="fp-guide-body"><div class="fp-guide-lbl">Verificar teléfono</div><div class="fp-guide-desc">Una sola vez al registrarte</div></div><span class="fp-guide-val gain">+25</span></div>' +
      '</div>' +
    '</div>' +

    '<div class="fp-section">' +
      '<div class="fp-section-title">Cómo gastar Floins</div>' +
      '<div class="fp-guide">' +
        '<div class="fp-guide-row"><span class="fp-guide-ico">🪵</span><div class="fp-guide-body"><div class="fp-guide-lbl">Fogata — 6 horas</div><div class="fp-guide-desc">Todo tu turno sin republicar</div></div><span class="fp-guide-val spend">−5</span></div>' +
        '<div class="fp-guide-row"><span class="fp-guide-ico">🏕️</span><div class="fp-guide-body"><div class="fp-guide-lbl">Hoguera — 12 horas</div><div class="fp-guide-desc">Presencia de día completo</div></div><span class="fp-guide-val spend">−10</span></div>' +
        '<div class="fp-guide-row"><span class="fp-guide-ico">⏱️</span><div class="fp-guide-body"><div class="fp-guide-lbl">Extender flare +1h</div><div class="fp-guide-desc">Desde el popup de tu flare</div></div><span class="fp-guide-val spend">−5</span></div>' +
      '</div>' +
    '</div>';

  // Cargar historial real desde servidor
  if (IDENTITY && IDENTITY.uid) {
    fetch('/api/floins-balance?uid=' + encodeURIComponent(IDENTITY.uid))
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(data){
        if (!data) return;
        if (IDENTITY) { IDENTITY.floins = data.balance; saveIdentity(IDENTITY); }
        var balEl = document.getElementById('fp-balance');
        if (balEl) balEl.textContent = data.balance;
        var histEl = document.getElementById('fp-history');
        if (!histEl) return;
        if (!data.recent || !data.recent.length) {
          histEl.innerHTML = '<div class="fp-empty">Aún no tienes movimientos</div>';
          return;
        }
        histEl.innerHTML = data.recent.map(function(t) {
          var d = new Date(t.created_at);
          var fecha = d.toLocaleDateString('es-MX', { day:'numeric', month:'short' }) + ' ' + d.toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' });
          return '<div class="fp-tx">' +
            '<div class="fp-tx-body">' +
              '<div class="fp-tx-lbl">' + esc(t.label) + '</div>' +
              '<div class="fp-tx-date">' + fecha + '</div>' +
            '</div>' +
            '<span class="fp-tx-amt ' + (t.amount > 0 ? 'gain' : 'spend') + '">' +
              (t.amount > 0 ? '+' : '') + t.amount +
            '</span>' +
          '</div>';
        }).join('');
      })
      .catch(function(){
        var histEl = document.getElementById('fp-history');
        if (histEl) histEl.innerHTML = '<div class="fp-empty">No se pudo cargar el historial</div>';
      });
  } else {
    var histEl = document.getElementById('fp-history');
    if (histEl) histEl.innerHTML = '<div class="fp-empty">Verifica tu cuenta para ver tu historial</div>';
  }
}

function setActiveNav(id) {
  ['pnav-flares','pnav-profile','pnav-floins'].forEach(function(b){
    var el = document.getElementById(b);
    if(el) el.classList.toggle('active', b === id);
  });
}

function goFlares() {
  manualOpen = false; mineOpen = false;
  showView('panel-flares');
  document.getElementById('ph-ttl').innerHTML = 'Flares en <span>Vista</span>';
  document.getElementById('ph-sub').textContent = filteredVisible().length + ' flares en vista';
  setActiveNav('pnav-flares');
}

function goProfile() {
  showView('panel-profile');
  document.getElementById('ph-ttl').innerHTML = 'Mi <span>Perfil</span>';
  var t = typeof getTier === 'function' ? getTier() : 1;
  document.getElementById('ph-sub').textContent = t === 1 ? 'Visitante' : t === 3 ? '✓ Verificado' : 'Sin validar';
  setActiveNav('pnav-profile');
  if(typeof renderProfile === 'function') renderProfile();
}

/* ── panel button listeners ── */
document.getElementById('pbtn').addEventListener('click', function(){ togglePanel(); });
document.getElementById('pov').addEventListener('click', function(){ closePanel(); });
document.getElementById('panel-close').addEventListener('click', function(){ closePanel(); });
document.getElementById('srch').addEventListener('input', function(){ renderPanel(); });


/* ── Versión de la app ── */
fetch('/version.json').then(function(r){ return r.json(); }).then(function(d){
  var el = document.getElementById('app-version');
  if(el) el.textContent = 'Flare v' + d.version;
}).catch(function(){});
