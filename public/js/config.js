/* ── config.js — globals, CATS, identity, helpers ── */

var CATS = [
  /* populated below */
];
/* ── IDENTIDAD ANÓNIMA ──────────────────────────── */
var WORDS = [
  'coyote','liebre','chispa','rayo','flama','brisa','aguila',
  'gecko','lobo','puma','zorro','halcon','vibora','iguana',
  'jaguar','ocelote','ceniza','vapor','destello','rafaga',
  'relampago','trueno','llama','brasa','fuego','humo'
];

var AVATAR_GROUPS = [
  ['avatars_extraidos1', ['09','10','11','12','23','24','25','26','27']],
  ['avatars_extraidos2', ['10','11','12','13','14','28','29','30','31','32']],
  ['avatars_extraidos3', ['12','13','14','15','16','32','33','34','35','36']],
  ['avatars_extraidos4', ['08','09','10','24','25','26']],
  ['avatars_extraidos5', ['09','10','11','12','13','27','28','29','30']],
  ['avatars_extraidos6', ['07','08','09','10','11','25','26','27','28']],
  ['avatars_extraidos7', ['10','26','29']]
];

var AVATAR_URLS = [];
AVATAR_GROUPS.forEach(function(group) {
  group[1].forEach(function(num) {
    AVATAR_URLS.push('/avatares/' + group[0] + '/avatar_' + num + '.png');
  });
});

function randomAvatarUrl() {
  return AVATAR_URLS[Math.floor(Math.random() * AVATAR_URLS.length)] || '';
}

function ensureIdentityAvatar(identity) {
  if (!identity) return identity;
  if (!identity.avatar_url) {
    identity.avatar_url = randomAvatarUrl();
    if (identity.username) saveIdentity(identity); // solo si ya tiene identidad real
  }
  return identity;
}

function generateUsername() {
  var word = WORDS[Math.floor(Math.random() * WORDS.length)];
  var code = Math.random().toString(36).substring(2, 8);
  return word + '_' + code;
}

function getDeviceFingerprint() {
  // Persistido en localStorage para que sea estable entre sesiones
  var stored = localStorage.getItem('flare_device_id');
  if (stored) return stored;
  var id = 'fp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  localStorage.setItem('flare_device_id', id);
  return id;
}

function getTier() {
  var identity = JSON.parse(localStorage.getItem('flare_identity') || 'null');
  if (!identity) return 1;
  return identity.tier === 3 ? 3 : 2;
}

function getOrCreateIdentity() {
  var identity = JSON.parse(localStorage.getItem('flare_identity') || 'null');
  if (identity && !identity.avatar_url) {
    ensureIdentityAvatar(identity);
    saveIdentity(identity);
  }
  return identity;
}

function createIdentity() {
  var identity = {
    username: generateUsername(),
    device_id: getDeviceFingerprint(),
    floins: 0,
    flares_hoy: 0,
    fecha_hoy: new Date().toDateString(),
    racha_dias: 0,
    avatar_url: randomAvatarUrl(),
    created_at: new Date().toISOString()
  };
  localStorage.setItem('flare_identity', JSON.stringify(identity));
  return identity;
}

function saveIdentity(identity) {
  localStorage.setItem('flare_identity', JSON.stringify(identity));
}

// IDENTITY es null si Tier 1, objeto si Tier 2
var IDENTITY = getOrCreateIdentity();

// Si es Tier 3, sincronizar avatar_url y username desde la DB al arrancar
(function() {
  if (!IDENTITY || IDENTITY.tier !== 3 || !IDENTITY.phone) return;
  var phone = IDENTITY.phone;
  fetch('/api/identity?phone=' + encodeURIComponent(phone))
    .then(function(r) { return r.json(); })
    .then(function(profiles) {
      var p = Array.isArray(profiles) ? profiles[0] : null;
      if (!p) return;
      var changed = false;
      if (p.id && p.id !== IDENTITY.uid) {
        IDENTITY.uid = p.id;
        changed = true;
      }
      if (p.avatar_url && p.avatar_url !== IDENTITY.avatar_url) {
        IDENTITY.avatar_url = p.avatar_url;
        changed = true;
      }
      if (p.username && p.username !== IDENTITY.username) {
        IDENTITY.username = p.username;
        changed = true;
      }
      if (changed) {
        saveIdentity(IDENTITY);
        if (typeof updateProfileBar === 'function') updateProfileBar();
        if (typeof renderProfile === 'function' && typeof profileOpen !== 'undefined' && profileOpen) renderProfile();
      }
    })
    .catch(function() {});
})();

// La recuperación de perfil solo se hace por teléfono (Tier 3) vía "Ingresar con mi número".
// No se busca por device_id — el device_id ya no identifica al usuario.
var PENDING_PROFILES = null;

var DEV_CAT = {id:'dev', lbl:'DEV', icon:'🧪', color:'#ff4060', emojis:['🧪','⚙️','🛠️','⏱️','🔥','⚡','📍','🧭','🔧','✅']};

CATS = [
  {id:'food',     lbl:'Antojos',      icon:'🍽️', color:'#ff9500', emojis:['🍕','🌮','🍔','🍜','🥗','🍺','☕','🍦','🥩','🍣'],
    bizLbl:'Nombre del lugar', phBiz:'Ej: Tacos El Güero, La Michoacana...', phTtl:'¿Qué antojo encuentras aquí?', phTxt:'Horario, precios, qué pedir... puedes poner links o teléfono.'},
  {id:'sale',     lbl:'Ventas',       icon:'🏷️', color:'#00c2ff', emojis:['🏷️','💸','🛒','🎁','💰','🛍️','🤑','💎','🔖','📦'],
    bizLbl:'Nombre del vendedor', phBiz:'Ej: Garage Sale Calle 5, Ropa de Paca...', phTtl:'¿Qué se vende?', phTxt:'Precios, ubicación exacta, horario... puedes poner links o teléfono.'},
  {id:'event',    lbl:'Evento',       icon:'🎉', color:'#a000f5', emojis:['🎉','🎵','🎸','🎭','🎪','🏆','🎤','🎬','🎊','🕺'], disabled:true},
  {id:'incident', lbl:'Suceso',       icon:'⚡', color:'#ff4060', emojis:['⚡','🚨','🚧','💥','🔥','🚑','⚠️','🌊','🌪️','🆘'], disabled:true},
  {id:'info',     lbl:'Información',  icon:'ℹ️', color:'#00f5a0', emojis:['ℹ️','📍','💡','📢','🗺️','🔍','📌','📣','🌐','✅'], disabled:true},
];
var MAX = 60*60*1000;
var pins = {};
var placing = false, pending = null;
var selCat = CATS[0], selEmoji = CATS[0].emojis[0], selType = 'text', imgData = null;
var panelOpen = false, activeCat = null, expandedId = null, lastRowToggle = 0;
var vigFilter = 'all';
var map;
var pollTimer = null;
var clusterGroup = null;
var clusterEnabled = true;
var myLocMarker = null;
var myWatchId = null;
var TILES = {};
var mapMode = localStorage.getItem('flare_mapmode') || 'night';
var popupInteracting = false;
var DEV_DURATION_MODE = false;

function setDevDurationMode(enabled) {
  DEV_DURATION_MODE = !!enabled;
  var hasDev = CATS.some(function(cat){ return cat.id === DEV_CAT.id; });
  if (DEV_DURATION_MODE && !hasDev) CATS.push(DEV_CAT);
  if (!DEV_DURATION_MODE && hasDev) {
    CATS = CATS.filter(function(cat){ return cat.id !== DEV_CAT.id; });
    if (selCat && selCat.id === DEV_CAT.id) {
      selCat = CATS[0];
      selEmoji = selCat.emojis[0];
    }
  }
  if (typeof buildCG === 'function' && document.getElementById('mover') && document.getElementById('mover').classList.contains('on')) {
    buildCG();
    buildEG();
    if (typeof updateDevDurationFields === 'function') updateDevDurationFields();
  }
}

function loadPublicConfig() {
  fetch('/api/admin/config?public=1')
    .then(function(r){ if(!r.ok) throw new Error('config'); return r.json(); })
    .then(function(d){ setDevDurationMode(!!d.dev_duration_mode); })
    .catch(function(){ setDevDurationMode(false); });
}

loadPublicConfig();

/* ── User identity ── */
var MY_ID = localStorage.getItem('flare_uid');
if (!MY_ID) { MY_ID = 'u' + Date.now() + Math.random().toString(36).slice(2,8); localStorage.setItem('flare_uid', MY_ID); }

// owner_uid de un usuario = su users.id (uid). null si aún no tiene perfil (Tier 1).
function getOwnerUid() {
  return (IDENTITY && IDENTITY.uid) ? IDENTITY.uid : null;
}

function getLocalDateString() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function noteIdentityFlarePublished() {
  if (!IDENTITY) return;
  var hoy = new Date().toDateString();
  if (IDENTITY.fecha_hoy !== hoy) {
    IDENTITY.flares_hoy = 0;
    IDENTITY.fecha_hoy = hoy;
  }
  IDENTITY.flares_hoy++;
  saveIdentity(IDENTITY);
}

var likedIds = JSON.parse(localStorage.getItem('flare_liked') || '[]');
function saveLiked() { localStorage.setItem('flare_liked', JSON.stringify(likedIds)); }
function hasLiked(id) { return likedIds.indexOf(id) !== -1; }
function markLiked(id) { if (!hasLiked(id)) { likedIds.push(id); saveLiked(); } }

// Al arrancar en Tier 2+, sincronizar likes desde DB para que funcionen entre dispositivos
(function() {
  if (!IDENTITY || !IDENTITY.uid) return;
  fetch('/api/likes?uid=' + encodeURIComponent(IDENTITY.uid))
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
      if (!data || !Array.isArray(data.liked)) return;
      var changed = false;
      data.liked.forEach(function(id) {
        if (likedIds.indexOf(id) === -1) { likedIds.push(id); changed = true; }
      });
      if (!changed) return;
      saveLiked();
      // Actualizar pins que ya están en memoria para que muestren el corazón marcado
      if (typeof pins !== 'undefined') {
        Object.values(pins).forEach(function(pin) {
          if (hasLiked(pin.id) && !pin.liked) {
            pin.liked = true;
            if (typeof refreshPop === 'function') refreshPop(pin);
            if (typeof refreshMk === 'function') refreshMk(pin, false);
          }
        });
      }
    })
    .catch(function() {});
})();

var reportedIds = JSON.parse(localStorage.getItem('flare_reported') || '[]');
function hasReported(id) { return reportedIds.indexOf(id) !== -1; }
function markReported(id) { if (!hasReported(id)) { reportedIds.push(id); localStorage.setItem('flare_reported', JSON.stringify(reportedIds)); } }

/* ── helpers ── */
function esc(s){var d=document.createElement('div');d.appendChild(document.createTextNode(s));return d.innerHTML}
function fmtT(ms){if(ms<=0)return'0 min';var h=Math.floor(ms/3600000),m=Math.floor((ms%3600000)/60000);return h>0?h+'h '+m+'m':m+' min'}

function richText(raw) {
  if(!raw) return '';
  var s = esc(raw);
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
  s = s.replace(/\n/g,'<br>');
  return s;
}

function mapsUrl(lat, lng) {
  return 'https://maps.google.com/?q='+lat+','+lng;
}

function notif(msg,t){var c=document.getElementById('notifs'),n=document.createElement('div');n.className='ntf '+(t||'');n.textContent=msg;c.appendChild(n);setTimeout(function(){n.remove()},3500)}
function setSyncState(state, txt) {
  var el = document.getElementById('sync');
  el.className = state;
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
