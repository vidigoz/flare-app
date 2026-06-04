/* ── modal.js — FAB, modal, support, daily limit, buildCG/buildEG ── */

var fabMenuOpen = false;
var fab = document.getElementById('fab');
var fabMenu = document.getElementById('fab-menu');
var MEDIA_MAX_BYTES = 3 * 1024 * 1024;
var mediaPreviewObjectUrl = null;

function obSkipBtnSetVisible(visible){
  var btn = document.getElementById('ob-skip-btn');
  if(!btn) return;
  if(localStorage.getItem('flare_onboarding_complete')) return;
  btn.style.display = visible ? 'block' : 'none';
}

fab.addEventListener('click', function(e){
  e.stopPropagation();
  if(placing){ stopPlace(); obSkipBtnSetVisible(true); return; }
  fabMenuOpen = !fabMenuOpen;
  fabMenu.classList.toggle('on', fabMenuOpen);
  fab.textContent = fabMenuOpen ? '✕  Cancelar' : '＋ Crear Flare';
  obSkipBtnSetVisible(!fabMenuOpen);
});

document.addEventListener('click', function(){
  if(fabMenuOpen){ fabMenuOpen=false; fabMenu.classList.remove('on'); fab.textContent='＋ Crear Flare'; obSkipBtnSetVisible(true); }
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
  obHideTips();
  document.getElementById('fab-wrap').style.display = 'none';
  if (typeof loadPublicConfig === 'function') loadPublicConfig();
  buildCG(); buildEG();
  updateDevDurationFields();
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
  if(!localStorage.getItem('flare_onboarding_complete')){
    document.getElementById('ob-skip-btn').style.display = 'block';
  }
  pending=null;
  document.getElementById('f-biz').value='';
  document.getElementById('f-ttl').value='';
  document.getElementById('f-txt').value='';
  resetImagePicker();
  document.getElementById('f-dev-dur').value='';
  document.getElementById('f-dev-secret').value='';
  updateDevDurationFields();
  var plus = document.querySelector('.ebtn-plus');
  if(plus){ plus.textContent='+'; plus.classList.remove('sel'); plus.style.borderColor=''; plus.style.background=''; plus.style.fontSize=''; }
  stopPlace();
}

document.getElementById('modal-x').addEventListener('click', closeModal);
document.getElementById('mover').addEventListener('click', function(e){ if(e.target===this) closeModal(); });

var mediaInput = document.getElementById('f-img');
var mediaRemove = document.getElementById('media-remove');
var mediaPickBtn = document.getElementById('media-pick-btn');
if (mediaInput) mediaInput.addEventListener('change', handleImagePicked);
if (mediaRemove) mediaRemove.addEventListener('click', resetImagePicker);
if (mediaPickBtn && mediaInput) mediaPickBtn.addEventListener('click', function(){ mediaInput.click(); });

function getSelectedImageFile(){
  var input = document.getElementById('f-img');
  return input && input.files && input.files[0] ? input.files[0] : null;
}

function validateImageFile(file){
  if (!file) return null;
  var okTypes = ['image/jpeg','image/png','image/webp'];
  if (okTypes.indexOf(file.type) === -1) return 'Usa una imagen JPG, PNG o WebP.';
  if (file.size > MEDIA_MAX_BYTES) return 'La foto debe pesar máximo 3 MB.';
  return null;
}

function handleImagePicked(){
  var file = getSelectedImageFile();
  if (!file) { resetImagePicker(); return; }
  var err = validateImageFile(file);
  if (err) { notif(err, 'err'); resetImagePicker(); return; }

  if (mediaPreviewObjectUrl) URL.revokeObjectURL(mediaPreviewObjectUrl);
  mediaPreviewObjectUrl = URL.createObjectURL(file);
  document.getElementById('media-preview-img').src = mediaPreviewObjectUrl;
  document.getElementById('media-preview-name').textContent = file.name || 'Foto seleccionada';
  document.getElementById('media-preview').style.display = 'flex';
}

function resetImagePicker(){
  var input = document.getElementById('f-img');
  var preview = document.getElementById('media-preview');
  var img = document.getElementById('media-preview-img');
  if (input) input.value = '';
  if (preview) preview.style.display = 'none';
  if (img) img.removeAttribute('src');
  if (mediaPreviewObjectUrl) {
    URL.revokeObjectURL(mediaPreviewObjectUrl);
    mediaPreviewObjectUrl = null;
  }
}

function fileToDataUrl(file){
  return new Promise(function(resolve, reject){
    console.log('[flare] fileToDataUrl start, file:', file.name, file.size, file.type);
    var img = new Image();
    var url = URL.createObjectURL(file);
    img.onload = function(){
      URL.revokeObjectURL(url);
      var MAX = 1280;
      var w = img.width, h = img.height;
      console.log('[flare] img loaded', w, 'x', h);
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      try {
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        var dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        console.log('[flare] canvas ok, dataUrl length:', dataUrl.length);
        resolve(dataUrl);
      } catch(ex) {
        console.error('[flare] canvas error:', ex);
        reject(new Error('No se pudo comprimir la imagen: ' + ex.message));
      }
    };
    img.onerror = function(e){ URL.revokeObjectURL(url); console.error('[flare] img error', e); reject(new Error('No se pudo leer la imagen.')); };
    img.src = url;
  });
}

function buildCG(){
  var g = document.getElementById('cgrid'); if(!g) return; g.innerHTML='';
  CATS.forEach(function(cat){
    var b = document.createElement('div'); b.className='cbtn'+(cat.id===selCat.id?' sel':''); b.style.setProperty('--cc', cat.color);
    b.innerHTML='<div class="cb-ic">'+cat.icon+'</div><div class="cb-lb">'+cat.lbl.replace('\n','<br>')+'</div>';
    b.addEventListener('click', function(){ selCat=cat; selEmoji=cat.emojis[0]; buildCG(); buildEG(); updateDevDurationFields(); });
    g.appendChild(b);
  });
}

function updateDevDurationFields(){
  var fields = document.getElementById('dev-duration-fields');
  if (!fields) return;
  fields.style.display = selCat && selCat.id === 'dev' ? 'block' : 'none';
  var btn = document.getElementById('bsub');
  if (btn && !btn.disabled) btn.textContent = getPublishButtonText();
}

function getPublishButtonText(){
  return selCat && selCat.id === 'dev' ? '🧪 Publicar Flare DEV' : '⚡ Publicar Flare (1 hora)';
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
  var isDev = selCat.id === 'dev';
  var devDur = 60;
  var devSecret = '';
  if (isDev) {
    devDur = parseInt(document.getElementById('f-dev-dur').value, 10);
    devSecret = document.getElementById('f-dev-secret').value;
    if (!devDur || devDur < 1 || devDur > 720) { notif('Pon una duración DEV entre 1 y 720 minutos.','err'); return; }
    if (!devSecret) { notif('Ingresa la contraseña admin para publicar DEV.','err'); return; }
  }
  var imageFile = getSelectedImageFile();
  var imageError = validateImageFile(imageFile);
  if (imageError) { notif(imageError, 'err'); return; }
  var bodyText = document.getElementById('f-txt').value.trim() || null;
  var bizName = document.getElementById('f-biz').value.trim() || null;

  var btn = document.getElementById('bsub');
  btn.disabled = true;
  btn.textContent = imageFile ? '🛡️ Verificando foto...' : '⏳ Publicando...';

  // Crear identidad si es el primer flare (Tier 1 → Tier 2)
  var isFirstFlare = !IDENTITY;
  if (!IDENTITY) {
    IDENTITY = createIdentity();
    // Registrar en DB de forma asíncrona — no bloquea la publicación
    postIdentity(IDENTITY).catch(function() {});
  }

  var payload = {
    lat: pending.lat,
    lng: pending.lng,
    title: ttl,
    emoji: selEmoji,
    cat: selCat.id,
    cat_lbl: selCat.lbl.replace('\n',' '),
    cat_color: selCat.color,
    cat_icon: selCat.icon,
    type: imageFile ? 'image' : 'text',
    uid: MY_ID,
    owner_uid: getOwnerUid(),
    username: IDENTITY.username,
    local_date: getLocalDateString(),
    biz_name: bizName,
    body_text: bodyText,
    dur_min: isDev ? devDur : 60,
  };
  if (isDev) payload.admin_secret = devSecret;

  var publishTask = imageFile
    ? fileToDataUrl(imageFile)
        .then(function(dataUrl){
          console.log('[flare] dataUrl ok, size:', dataUrl.length, 'mime:', dataUrl.slice(0,30));
          btn.textContent = '🛡️ Verificando foto...';
          return postMedia({
            data_url: dataUrl,
            title: ttl,
            body_text: bodyText,
            uid: MY_ID,
          });
        })
        .then(function(media){
          console.log('[flare] media ok:', media.image_url);
          payload.image_url = media.image_url;
          btn.textContent = '⏳ Publicando...';
          return postFlare(payload);
        })
    : postFlare(payload);

  publishTask
    .then(function(row) {
      noteIdentityFlarePublished();
      btn.disabled = false;
      btn.textContent = getPublishButtonText();
      var pin = rowToPin(row);
      pin.marker = makeMarker(pin);
      pins[pin.id] = pin;
      closeModal();
      map.flyTo([pin.lat, pin.lng], 15, {duration:1});
      notif(pin.emoji+' "'+pin.title+'" lanzado por '+(isDev ? devDur+' min' : '1 hora')+'!');
      applyVigFilter();
      var mine = JSON.parse(localStorage.getItem('flare_mine') || '[]');
      mine.push(row.id);
      if(mine.length > 50) mine = mine.slice(-50);
      localStorage.setItem('flare_mine', JSON.stringify(mine));
      if(isFirstFlare || !localStorage.getItem('flare_first_published')){
        obCelebrate(isFirstFlare);
      }
    })
    .catch(function(e) {
      console.error('[flare] error:', e.status, e.message, e);
      btn.disabled = false;
      btn.textContent = getPublishButtonText();
      if(e.status === 429 && e.message === 'daily_limit') { closeModal(); openDailyLimitModal(); }
      else if(e.status === 429 && e.message && e.message.includes('OpenAI')) notif(e.message, 'err');
      else if(e.status === 429) notif('Límite alcanzado. Intenta en unos minutos.','err');
      else if(e.status === 401) notif('Contraseña admin incorrecta.','err');
      else if(e.status === 403) notif('Modo DEV desactivado o no permitido.','err');
      else if(e.status === 413) notif(e.message, 'err');
      else if(e.message && e.message.toLowerCase().includes('imagen')) notif(e.message, 'err');
      else if(e.status === 400 && e.message.includes('normas')) notif('Contenido no permitido. Revisa el texto de tu flare.','err');
      else notif(e.message || 'Error al publicar. Intenta de nuevo.','err');
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
