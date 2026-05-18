/* ── map.js — Leaflet init, clusters, filters, location, map modes ── */

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

  ['nuevo','maduro','expirando','all'].forEach(function(f){
    var row = document.getElementById('leg-'+(f==='all'?'all':f));
    if(row) row.classList.toggle('active', vigFilter===f);
  });

  ['all','nuevo','maduro','exp'].forEach(function(k){
    var el = document.getElementById('pvig-'+k);
    if(!el) return;
    var fval = k==='exp'?'expirando':k;
    el.classList.toggle('on', vigFilter===fval);
  });

  ['all','nuevo','maduro','exp'].forEach(function(k){
    var el = document.getElementById('hf-'+k);
    if(!el) return;
    var fval = k==='exp'?'expirando':k;
    el.classList.toggle('on', vigFilter===fval);
  });

  buildHdrCatChips();
  refreshBadge();
  if(panelOpen){ buildChips(); renderPanel(); }
}

function buildClusterGroup(){
  return L.markerClusterGroup({
    chunkedLoading: true,
    chunkInterval: 200,
    chunkDelay: 50,
    maxClusterRadius: 60,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    disableClusteringAtZoom: 17,
    iconCreateFunction: function(cluster){
      var count = cluster.getChildCount();
      var cls = count < 10 ? 'flare-cluster'
              : count < 50 ? 'flare-cluster flare-cluster-medium'
              : 'flare-cluster flare-cluster-large';
      var size = count < 10 ? 34 : count < 50 ? 38 : 43;
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

function buildHdrCatChips(){
  document.querySelectorAll('.hdr-cat').forEach(function(el){ el.remove(); });
  var sep = document.querySelector('.hf-sep');
  if(!sep) return;
  CATS.forEach(function(cat){
    var btn = document.createElement('div');
    btn.className = 'hdr-chip hdr-cat' + (activeCat === cat.id ? ' on' : '');
    btn.dataset.cat = cat.id;
    btn.title = cat.lbl;
    btn.innerHTML = cat.icon + '<span class="hf-lbl"> ' + cat.lbl + '</span>';
    if(activeCat === cat.id){
      btn.style.borderColor = cat.color;
      btn.style.background  = cat.color + '33';
    }
    btn.addEventListener('click', function(){
      activeCat = (activeCat === cat.id) ? null : cat.id;
      buildHdrCatChips();
      applyVigFilter();
    });
    sep.parentNode.insertBefore(btn, sep);
  });
}
buildHdrCatChips();

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

/* ── Map mode toggle ── */
document.getElementById('toggle-mapmode').addEventListener('click', function(){
  var mapEl = document.getElementById('map');
  if(mapMode === 'night'){
    map.removeLayer(TILES.night);
    TILES.day.addTo(map);
    mapMode = 'day';
    mapEl.classList.remove('map-night');
    this.classList.remove('on');
    this.innerHTML = '☀️ <span class="hf-lbl">Día</span>';
  } else {
    map.removeLayer(TILES.day);
    TILES.night.addTo(map);
    mapMode = 'night';
    mapEl.classList.add('map-night');
    this.classList.add('on');
    this.innerHTML = '🌙 <span class="hf-lbl">Noche</span>';
  }
  localStorage.setItem('flare_mapmode', mapMode);
});

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
    map = L.map('map', {center:[32.5720,-116.6280], zoom:14, zoomControl:false, closePopupOnClick:false});
    TILES.night = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution:''});
    TILES.day   = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution:''});
    TILES[mapMode].addTo(map);
    if(mapMode === 'night') document.getElementById('map').classList.add('map-night');
    (function syncMapModeBtn(){
      var btn = document.getElementById('toggle-mapmode');
      if(!btn) return;
      if(mapMode === 'night'){ btn.classList.add('on'); btn.innerHTML = '🌙 <span class="hf-lbl">Noche</span>'; }
      else { btn.classList.remove('on'); btn.innerHTML = '☀️ <span class="hf-lbl">Día</span>'; }
    })();

    if(L.MarkerClusterGroup){
      clusterGroup = buildClusterGroup();
    } else {
      clusterEnabled = false;
      clusterGroup = L.layerGroup();
    }
    map.addLayer(clusterGroup);

    map.on('moveend zoomend', function(){
      refreshBadge();
      if(panelOpen){ buildChips(); renderPanel(); }
      clearTimeout(pollTimer);
      pollTimer = setTimeout(fetchFlares, 500);
      var b = map.getBounds();
      Object.values(pins).forEach(function(p){
        if(p.marker && p.marker.isPopupOpen() && !b.contains([p.lat, p.lng])){
          p.marker.closePopup();
        }
      });
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

    document.getElementById('map').addEventListener('click', function(e){
      if(!e.target.closest('.leaflet-popup') && !e.target.closest('.leaflet-marker-icon')){
        map.closePopup();
      }
    });

    var hasDeepLink = location.hash.startsWith('#flare-');
    startMyLocation(!hasDeepLink);

    document.getElementById('loc-btn').addEventListener('click', function(){
      startMyLocation(true);
    });

    startPoll();

    if(!localStorage.getItem('flare_onboarding_complete')){
      setTimeout(obStart, 800);
    }
  });
});
