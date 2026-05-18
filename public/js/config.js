/* ── config.js — globals, CATS, identity, helpers ── */

var CATS = [
  {id:'food',     lbl:'Comida y Bebida',  icon:'🍽️', color:'#ff9500', emojis:['🍕','🌮','🍔','🍜','🥗','🍺','☕','🍦','🥩','🍣']},
  {id:'sale',     lbl:'Ventas',           icon:'🏷️', color:'#00c2ff', emojis:['🏷️','💸','🛒','🎁','💰','🛍️','🤑','💎','🔖','📦']},
  {id:'event',    lbl:'Evento',           icon:'🎉', color:'#a000f5', emojis:['🎉','🎵','🎸','🎭','🎪','🏆','🎤','🎬','🎊','🕺']},
  {id:'incident', lbl:'Suceso',           icon:'⚡', color:'#ff4060', emojis:['⚡','🚨','🚧','💥','🔥','🚑','⚠️','🌊','🌪️','🆘']},
  {id:'info',     lbl:'Información',      icon:'ℹ️', color:'#00f5a0', emojis:['ℹ️','📍','💡','📢','🗺️','🔍','📌','📣','🌐','✅']},
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

/* ── User identity ── */
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
