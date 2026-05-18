/* ── modal.js — FAB, modal, support, daily limit, buildCG/buildEG ── */

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

document.getElementById('fab-gps').addEventListener('click', function(e){
  e.stopPropagation();
  fabMenuOpen=false; fabMenu.classList.remove('on'); fab.textContent='＋ Crear Flare';

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

document.getElementById('fab-map').addEventListener('click', function(e){
  e.stopPropagation();
  fabMenuOpen=false; fabMenu.classList.remove('on');
  fab.textContent='✕  Cancelar';
  startPlace();
});

function startPlace(){ placing=true; fab.classList.add('placing'); document.getElementById('hint').style.display='flex'; document.getElementById('xhair').classList.add('on'); map&&(map.getContainer().style.cursor='crosshair'); }
function stopPlace(){ placing=false; fab.classList.remove('placing'); fab.textContent='＋ Crear Flare'; fab.disabled=false; document.getElementById('hint').style.display='none'; document.getElementById('xhair').classList.remove('on'); map&&(map.getContainer().style.cursor=''); }

function setPending(lat, lng){
  pending = {lat:lat, lng:lng};
  document.getElementById('ctxt').textContent = lat.toFixed(5)+', '+lng.toFixed(5);
}

function openModal(){
  document.getElementById('fab-wrap').classList.remove('ob-spotlight');
  document.getElementById('fab-wrap').style.display = 'none';
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
  document.getElementById('fab-wrap').style.display = 'flex';
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
      var mine = JSON.parse(localStorage.getItem('flare_mine') || '[]');
      mine.push(row.id);
      if(mine.length > 50) mine = mine.slice(-50);
      localStorage.setItem('flare_mine', JSON.stringify(mine));
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

/* ── Support modal ── */
function openSupportModal() {
  document.getElementById('support-overlay').style.display = 'flex';
  document.getElementById('sup-err').style.display = 'none';
  document.getElementById('sup-btn').disabled = false;
  document.getElementById('sup-btn').textContent = 'Enviar mensaje';
}
function closeSupportModal() {
  document.getElementById('support-overlay').style.display = 'none';
  document.getElementById('sup-motivo').value = '';
  document.getElementById('sup-desc').value = '';
  document.getElementById('sup-email').value = '';
  document.getElementById('sup-flareid').value = '';
  document.getElementById('sup-err').style.display = 'none';
}
function submitSupport() {
  var motivo  = document.getElementById('sup-motivo').value.trim();
  var desc    = document.getElementById('sup-desc').value.trim();
  var email   = document.getElementById('sup-email').value.trim();
  var flareId = document.getElementById('sup-flareid').value.trim() || null;
  var errEl   = document.getElementById('sup-err');
  var btn     = document.getElementById('sup-btn');

  if(!motivo || !desc || !email) {
    errEl.textContent = 'Por favor completa todos los campos requeridos.';
    errEl.style.display = 'block'; return;
  }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errEl.textContent = 'Correo electrónico no válido.';
    errEl.style.display = 'block'; return;
  }
  errEl.style.display = 'none';
  btn.disabled = true;
  btn.textContent = '⏳ Enviando...';

  fetch('/api/support', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ motivo: motivo, descripcion: desc, email: email, flare_id: flareId }),
  })
  .then(function(r){ return r.json(); })
  .then(function(d) {
    if(d.error) { errEl.textContent = d.error; errEl.style.display = 'block'; btn.disabled = false; btn.textContent = 'Enviar mensaje'; return; }
    closeSupportModal();
    if(d.emailSent === false) {
      notif('✉ Ticket guardado pero el email falló (' + (d.emailError||'error') + ')', 'err');
    } else {
      notif('✉ Mensaje enviado. Te responderemos pronto 🙏');
    }
  })
  .catch(function() { errEl.textContent = 'Error de red. Intenta de nuevo.'; errEl.style.display = 'block'; btn.disabled = false; btn.textContent = 'Enviar mensaje'; });
}
