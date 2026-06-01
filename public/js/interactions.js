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
  if (getTier() === 1) {
    notif('Publica tu primer flare para dar likes 🔥', 'err');
    return;
  }
  var pin = pins[id];
  if(!pin) return;
  if(pin.liked){ notif('Ya le diste ❤️ a este flare 😉','err'); return; }
  var wasDying = getPinState(pin) === 'dying';
  pin.liked = true;
  pin.likes++;
  pin.expires_at = new Date(new Date(pin.expires_at).getTime() + 5*60*1000).toISOString();
  markLiked(id);
  var nowDying = getPinState(pin) === 'dying';
  var revived = wasDying && !nowDying;
  if(!pin.marker.isPopupOpen()) refreshMk(pin, revived);
  refreshPop(pin);
  setTimeout(function(){
    if(!pin.marker.isPopupOpen()) pin.marker.openPopup();
    var likeBtn = document.querySelector('.pop-like');
    if(likeBtn){ likeBtn.classList.add('like-fire'); setTimeout(function(){ likeBtn.classList.remove('like-fire'); }, 700); }
  }, 0);
  if(panelOpen) renderPanel();
  postLike(id).then(function(data) {
    pin.expires_at = data.expires_at;
    pin.likes = data.likes;
    refreshPop(pin);
  }).catch(function(e) {
    if(e.status === 429) {
      pin.liked = false;
      pin.likes--;
      pin.expires_at = new Date(new Date(pin.expires_at).getTime() - 5*60*1000).toISOString();
      likedIds = likedIds.filter(function(x){ return x !== id; });
      saveLiked();
      refreshPop(pin);
      notif('Demasiados likes seguidos. Espera un momento 😅','err');
    } else {
      console.error('like error:', e);
    }
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
