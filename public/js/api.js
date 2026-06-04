/* ── api.js — apiFetch, fetchFlares, reconcilePins, postFlare, postLike ── */

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

function fetchFlares() {
  if (!map) return;
  if (map.hasLayer && Object.values(pins).some(function(p){ return p.marker && p.marker.isPopupOpen(); })) return;
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

function reconcilePins(rows) {
  var now = Date.now();
  var serverIds = {};

  rows.forEach(function(row) {
    serverIds[row.id] = true;
    var exp = new Date(row.expires_at).getTime();
    if (exp <= now) return;

    if (pins[row.id]) {
      var pin = pins[row.id];
      var wasDying = getPinState(pin) === 'dying';
      pin.expires_at = row.expires_at;
      pin.likes = row.likes;
      pin.liked = hasLiked(row.id);
      var nowDying = getPinState(pin) === 'dying';
      var revived = wasDying && !nowDying;
      refreshMk(pin, revived);
      refreshPop(pin);
      if(revived) notif('💚 "'+pin.title+'" fue salvado!','like');
    } else {
      var pin = rowToPin(row);
      pin.marker = makeMarker(pin);
      pins[row.id] = pin;
    }
  });

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
    username: row.username || null,
    image: row.image_url || null,
    video: row.video_url || null,
    createdAt: new Date(row.created_at).getTime(),
    expires_at: row.expires_at,
    likes: row.likes,
    liked: hasLiked(row.id),
    marker: null,
  };
}

function postFlare(data) {
  return apiFetch('/api/flares', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

function postMedia(data) {
  return apiFetch('/api/media', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

function repostFlare(id) {
  return apiFetch('/api/flares', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      repost_id: id,
      uid: MY_ID,
      owner_uid: getOwnerUid(),
      local_date: getLocalDateString(),
    }),
  });
}

function postLike(id) {
  return apiFetch('/api/like?id=' + encodeURIComponent(id), { method: 'PATCH' });
}

function postIdentity(identity) {
  return apiFetch('/api/identity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id: identity.device_id, username: identity.username, avatar_url: identity.avatar_url || null }),
  });
}

function fetchIdentity(deviceId) {
  return apiFetch('/api/identity?device_id=' + encodeURIComponent(deviceId));
}

function startPoll() {
  fetchFlares();
  pollTimer = setInterval(fetchFlares, 15000);

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
