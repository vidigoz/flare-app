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
  updateFilterBadge();
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
  var container = document.getElementById('hdr-cat-chips');
  if(!container) return;
  container.innerHTML = '';
  CATS.forEach(function(cat){
    var btn = document.createElement('div');
    if(cat.disabled){
      btn.className = 'hdr-chip hdr-cat hdr-cat-disabled';
      btn.title = cat.lbl + ' — Próximamente';
      btn.innerHTML = cat.icon + ' ' + cat.lbl.replace('\n',' ');
    } else {
      btn.className = 'hdr-chip hdr-cat' + (activeCat === cat.id ? ' on' : '');
      btn.dataset.cat = cat.id;
      btn.title = cat.lbl;
      btn.innerHTML = cat.icon + ' ' + cat.lbl.replace('\n',' ');
      if(activeCat === cat.id){
        btn.style.borderColor = cat.color;
        btn.style.background  = cat.color + '33';
        btn.style.color       = cat.color;
      }
      btn.addEventListener('click', function(){
        activeCat = (activeCat === cat.id) ? null : cat.id;
        buildHdrCatChips();
        applyVigFilter();
      });
    }
    container.appendChild(btn);
  });
  updateFilterBadge();
}
buildHdrCatChips();

/* ── Filter Drawer ── */
var _fdrTouchHandler = null;

function toggleFilterDrawer(){
  var fdr = document.getElementById('fdr');
  var isOpen = fdr.classList.contains('on');
  if(isOpen){ closeFilterDrawer(); } else { openFilterDrawer(); }
}

function openFilterDrawer(){
  var fdr = document.getElementById('fdr');
  var overlay = document.getElementById('fdr-overlay');
  var btn = document.getElementById('hdr-filter-btn');
  fdr.classList.add('on');
  overlay.classList.add('on');
  btn.classList.add('active');
  // bloquear zoom del navegador mientras el drawer está abierto
  document.querySelector('meta[name=viewport]').setAttribute('content',
    'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
  // cualquier toque fuera del drawer lo cierra
  _fdrTouchHandler = function(e){
    if(!fdr.contains(e.target) && e.target !== btn && !btn.contains(e.target)){
      closeFilterDrawer();
    }
  };
  setTimeout(function(){ document.addEventListener('touchstart', _fdrTouchHandler, {passive:true}); }, 50);
}

function closeFilterDrawer(){
  var fdr = document.getElementById('fdr');
  var overlay = document.getElementById('fdr-overlay');
  var btn = document.getElementById('hdr-filter-btn');
  fdr.classList.remove('on');
  overlay.classList.remove('on');
  btn.classList.remove('active');
  // restaurar viewport normal
  document.querySelector('meta[name=viewport]').setAttribute('content',
    'width=device-width, initial-scale=1.0, viewport-fit=cover');
  if(_fdrTouchHandler){
    document.removeEventListener('touchstart', _fdrTouchHandler);
    _fdrTouchHandler = null;
  }
}

function resetFilters(){
  vigFilter = 'all';
  activeCat = null;
  applyVigFilter();
}

function updateFilterBadge(){
  var badge = document.getElementById('hdr-filter-badge');
  if(!badge) return;
  var count = 0;
  if(vigFilter !== 'all') count++;
  if(activeCat !== null) count++;
  if(count > 0){
    badge.textContent = count;
    badge.style.display = 'block';
  } else {
    badge.style.display = 'none';
  }
}

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

  // Carga token de Mapbox al inicio (fallback de último nivel)
  var mapboxToken = null;
  fetch('/api/mapbox-config').then(function(r){ return r.json(); }).then(function(d){ mapboxToken = d.token || null; }).catch(function(){});

  inp.addEventListener('input',function(){ clearTimeout(timer); var q=inp.value.trim(); if(!q){res.classList.remove('on');res.innerHTML='';return;} res.innerHTML='<div class="geo-msg">Buscando...</div>'; res.classList.add('on'); timer=setTimeout(function(){search(q);},380); });
  inp.addEventListener('keydown',function(e){ if(e.key==='Escape'){res.classList.remove('on');inp.value='';} if(e.key==='Enter'){var f=res.querySelector('.gitem');if(f)f.click();} });
  document.addEventListener('click',function(e){ if(!inp.contains(e.target)&&!res.contains(e.target)) res.classList.remove('on'); });

  var geoPin = null;
  function clearGeoPin(){ if(geoPin){ map.removeLayer(geoPin); geoPin=null; } }

  function flyTo(lat,lng,zoom,name){
    if(!map) return;
    clearGeoPin();
    map.flyTo([lat,lng],zoom||14,{duration:1.2});
    if(name){
      geoPin = L.marker([lat,lng], {
        icon: L.divIcon({
          className:'',
          html:'<div class="geo-pin"><div class="geo-pin-dot"></div><div class="geo-pin-label">'+name+'</div></div>',
          iconSize:[12,12], iconAnchor:[6,6]
        }),
        zIndexOffset: 500
      });
      geoPin.bindPopup(
        '<div style="padding:4px 2px;text-align:center">'
        +'<div style="font-size:12px;font-weight:700;margin-bottom:8px">📍 '+name+'</div>'
        +'<button onclick="setPending('+lat+','+lng+');openModal();if(geoPin){map.closePopup()}" '
        +'style="background:var(--neon);color:#000;border:none;border-radius:8px;padding:7px 14px;font-family:\'Space Mono\',monospace;font-size:11px;font-weight:700;cursor:pointer;width:100%">'
        +'＋ Poner flare aquí</button>'
        +'</div>',
        {maxWidth:200, autoPan:true}
      );
      geoPin.addTo(map);
    }
  }

  function addItem(lat,lng,name,sub,ic,badge){
    var el=document.createElement('div'); el.className='gitem';
    el.innerHTML='<div class="gitem-ic">'+ic+'</div><div style="flex:1"><div class="gitem-name">'+name+'</div><div class="gitem-sub">'+sub+'</div></div>'+(badge?'<div class="gitem-badge">'+badge+'</div>':'');
    // Flares: vuela al pin existente sin crear geoPin
    var isFlare = !!badge;
    el.addEventListener('click',function(){
      inp.value=name; res.classList.remove('on');
      if(typeof closePanel==='function') closePanel();
      flyTo(lat,lng,isFlare?17:14,isFlare?null:name);
    });
    res.appendChild(el);
  }

  // Limpiar geoPin al escribir nueva búsqueda
  inp.addEventListener('input',function(){ clearGeoPin(); });

  function search(q){
    res.innerHTML='';
    var ql=q.toLowerCase();

    // 1 — Flares activos
    var flareHits=[];
    if(typeof pins!=='undefined'){
      Object.values(pins).forEach(function(p){
        if(p.ghost) return;
        var hay=(p.title||'')+(p.bizName||'')+(p.catLbl||'')+(p.text||'');
        if(hay.toLowerCase().indexOf(ql)!==-1) flareHits.push(p);
      });
    }
    if(flareHits.length){
      flareHits.slice(0,4).forEach(function(p){
        var sub=(p.bizName?p.bizName+' · ':'')+( p.catLbl||'');
        addItem(p.lat,p.lng,p.title,sub,p.emoji||'📍','Flare');
      });
      if(flareHits.length>=4){ res.classList.add('on'); return; }
    }

    // 2 — Nominatim
    fetch('https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=1&q='+encodeURIComponent(q),{headers:{'Accept-Language':'es'}})
      .then(function(r){ return r.json(); })
      .then(function(data){
        if(data.length){
          data.forEach(function(item){
            var name=item.name||item.display_name.split(',')[0];
            var sub=item.display_name.replace(name+', ','').split(',').slice(0,2).join(', ');
            addItem(parseFloat(item.lat),parseFloat(item.lon),name,sub,geoIcon(item.type,item.class));
          });
          res.classList.add('on');
        } else {
          searchMapbox(q);
        }
      })
      .catch(function(){ searchMapbox(q); });
  }

  function searchMapbox(q){
    if(!mapboxToken){ res.innerHTML+='<div class="geo-msg">Sin resultados</div>'; res.classList.add('on'); return; }
    fetch('https://api.mapbox.com/geocoding/v5/mapbox.places/'+encodeURIComponent(q)+'.json?access_token='+mapboxToken+'&language=es&limit=5')
      .then(function(r){ return r.json(); })
      .then(function(data){
        if(!data.features||!data.features.length){ res.innerHTML+='<div class="geo-msg">Sin resultados</div>'; res.classList.add('on'); return; }
        data.features.forEach(function(f){
          var coords=f.center;
          var sub=f.place_name.replace(f.text+', ','').split(',').slice(0,2).join(', ');
          addItem(coords[1],coords[0],f.text,sub,'📍');
        });
        res.classList.add('on');
      })
      .catch(function(){ res.innerHTML+='<div class="geo-msg">Sin resultados</div>'; res.classList.add('on'); });
  }

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

    if(!localStorage.getItem('flare_onboarding_complete') && !localStorage.getItem('flare_identity')){
      setTimeout(obStart, 800);
    }
  });
});
