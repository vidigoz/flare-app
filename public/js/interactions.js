/* ── interactions.js — doLike, openReport, shareFlare, openMaps ── */

function shareFlare(id) {
  var pin = pins[id];
  if(!pin) return;
  var r = Math.max(0, new Date(pin.expires_at).getTime() - Date.now());
  var url = location.origin + location.pathname + '#flare-' + id;
  var textoBase = pin.emoji + ' ' + pin.title
    + (pin.bizName ? '\n🏪 ' + pin.bizName : '')
    + (pin.text ? '\n' + pin.text.slice(0, 100) + (pin.text.length > 100 ? '...' : '') : '')
    + '\n⏱ Vigente por ' + fmtT(r);

  if(typeof trackEvent==='function') trackEvent('flare_share', id);
  if(navigator.share) {
    navigator.share({
      title: pin.emoji + ' ' + pin.title,
      text: textoBase,
      url: url
    }).catch(function(){});
  } else {
    navigator.clipboard.writeText(textoBase + '\n\n📍 Ver en Flare → ' + url).then(function(){
      notif('📋 Copiado al portapapeles');
    }).catch(function(){
      notif('No se pudo compartir', 'err');
    });
  }
}

function openMaps(lat, lng) {
  var url = 'https://maps.google.com/?q='+lat+','+lng;
  var a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function doLike(id){
  var pin = pins[id];
  if(!pin) return;
  if(pin.liked){ notif('Ya le diste ❤️ a este flare 😉','err'); return; }
  if(pin._liking) return;

  // Tier 1 → crear identidad al dar el primer like
  var isFirstLike = (getTier() === 1);
  if (isFirstLike) {
    IDENTITY = createIdentity();
    saveIdentity(IDENTITY);
  }

  pin._liking = true;
  var likeBtn = document.querySelector('.pop-tray-boost.pop-like');
  if(likeBtn) likeBtn.disabled = true;

  postLike(id).then(function(data) {
    // Confirmado en DB — ahora actualizar estado local
    pin._liking = false;
    pin.liked = true;
    pin.likes = data.likes;
    pin.expires_at = data.expires_at;
    markLiked(id);

    var wasDying = getPinState(pin) === 'dying';
    var nowDying = false;
    var revived = wasDying && !nowDying;
    window._likeInProgress = true;
    if(!pin.marker.isPopupOpen()) refreshMk(pin, revived);
    refreshPop(pin);
    setTimeout(function(){
      if(!pin.marker.isPopupOpen()) pin.marker.openPopup();
      window._likeInProgress = false;
      var btn = document.querySelector('.pop-tray-boost.pop-like');
      if(btn){ btn.classList.add('like-fire'); setTimeout(function(){ btn.classList.remove('like-fire'); }, 700); }
    }, 0);
    if(panelOpen) refreshPanelLike(id);
    if(revived) notif('💚 "'+pin.title+'" fue salvado!','like');
    if(data.floins_earned > 0) {
      if(IDENTITY) { IDENTITY.floins = (IDENTITY.floins || 0) + data.floins_earned; saveIdentity(IDENTITY); }
      setTimeout(function(){ if(typeof showFloinsToast === 'function') showFloinsToast(data.floins_earned, data.floins_reason); }, 300);
    }
    if(isFirstLike) {
      setTimeout(function(){ if(typeof obCelebrateLike === 'function') obCelebrateLike(); }, 600);
    }
  }).catch(function(e) {
    if(isFirstLike) {
      // Revertir identidad si el like falló
      IDENTITY = null;
      localStorage.removeItem('flare_identity');
    }
    pin._liking = false;
    if(likeBtn) likeBtn.disabled = false;
    if(e.status === 429) {
      notif('Demasiados likes seguidos. Espera un momento 😅','err');
    } else {
      notif('No se pudo guardar el like. Intenta de nuevo.','err');
      console.error('like error:', e);
    }
  });
}

function doExtend(id) {
  if(getTier() === 1){ notif('Publica tu primer flare para usar Floins 🔥','err'); return; }
  var pin = pins[id];
  if(!pin) return;
  var balance = (IDENTITY && typeof IDENTITY.floins === 'number') ? IDENTITY.floins : 0;
  if(balance < 5){ notif('Necesitas 5 Floins para extender — tienes ' + balance,'err'); return; }
  if(pin._extending) return;
  pin._extending = true;

  var btn = document.querySelector('.pop-extend-fab');
  if(btn) btn.disabled = true;

  fetch('/api/extend-flare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      flare_id: id,
      uid: IDENTITY && IDENTITY.uid ? IDENTITY.uid : null,
      device_id: getDeviceFingerprint(),
    }),
  })
  .then(function(r){ return r.json().then(function(d){ return { ok: r.ok, status: r.status, data: d }; }); })
  .then(function(res){
    pin._extending = false;
    if(!res.ok){
      if(res.status === 402) notif('No tienes suficientes Floins 🪙','err');
      else if(res.status === 400) notif(res.data.error || 'No se puede extender más este flare','err');
      else notif('Error al extender. Intenta de nuevo.','err');
      var fab = document.querySelector('.pop-extend-fab');
      if(fab) fab.disabled = false;
      return;
    }
    pin.expires_at = res.data.expires_at;
    if(IDENTITY){ IDENTITY.floins = res.data.floins_balance; saveIdentity(IDENTITY); }
    refreshPop(pin);
    refreshMk(pin, false);
    notif('⏱️ +1 hora agregada al flare','like');
    if(typeof showFloinsToast === 'function') showFloinsToast(-5, 'extend_active');
  })
  .catch(function(){
    pin._extending = false;
    var fab = document.querySelector('.pop-extend-fab');
    if(fab) fab.disabled = false;
    notif('Error al extender. Intenta de nuevo.','err');
  });
}

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
