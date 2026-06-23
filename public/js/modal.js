/* ── modal.js — FAB, modal, support, daily limit, buildCG/buildEG ── */

var fabMenuOpen = false;
var fab = document.getElementById('fab');
var fabMenu = document.getElementById('fab-menu');
var MEDIA_MAX_BYTES = 3 * 1024 * 1024;
var mediaPreviewObjectUrl = null;
var selFlareType = 'flama';

var FLARE_TYPES = {
  chispa:  { label: 'Chispa',  icon: '⚡',  dur: '1 hora',   min: 60,  floins: 0,  hint: 'Ideal para algo que se acaba pronto. "Queda poca birria", "última hora de happy hour", "remato lo que queda antes de cerrar". Lo verdaderamente urgente.' },
  flama:   { label: 'Flama',   icon: '🔥',  dur: '3 horas',  min: 180, floins: 0,  hint: 'Ideal para tu rato de ventas de hoy. "Servicio de comida de 1 a 4", "puesto de tamales toda la mañana", "estoy en la sobrerueda este rato". Lo más común — un bloque de actividad.' },
  fogata:  { label: 'Fogata',  icon: '🪵',  dur: '6 horas',  min: 360, floins: 5,  hint: 'Ideal para todo tu turno sin republicar. Swap meet, medio día de ventas, evento de mañana completa.' },
  hoguera: { label: 'Hoguera', icon: '🏕️', dur: '12 horas', min: 720, floins: 10, hint: 'Presencia de día completo. Abierto todo el día, un evento que dura toda la jornada.' },
};

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

function startPlace(){ placing=true; fab.classList.add('placing'); document.getElementById('xhair').classList.add('on'); map&&(map.getContainer().style.cursor='crosshair'); obSkipBtnSetVisible(true); }
function stopPlace(){ placing=false; fab.classList.remove('placing'); fab.textContent='＋ Crear Flare'; fab.disabled=false; document.getElementById('xhair').classList.remove('on'); map&&(map.getContainer().style.cursor=''); if(typeof obCurrentStep!=='undefined'&&obCurrentStep>0){ obStart(); }else{ obSkipBtnSetVisible(false); } }

function setPending(lat, lng){
  pending = {lat:lat, lng:lng};
  document.getElementById('ctxt').textContent = lat.toFixed(5)+', '+lng.toFixed(5);
}

function openModal(){
  obHideTips();
  document.getElementById('fab-wrap').style.display = 'none';
  if (typeof loadPublicConfig === 'function') loadPublicConfig();
  buildCG(); buildEG();
  selFlareType = 'flama';
  updateDevDurationFields(); updateFieldsByCat(); buildFlareTypeSelector();
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

var mediaInput    = document.getElementById('f-img');
var mediaInputCam = document.getElementById('f-img-cam');
var mediaRemove   = document.getElementById('media-remove');
if (mediaInput)    mediaInput.addEventListener('change', function(){ handleImagePicked(mediaInput); });
if (mediaInputCam) mediaInputCam.addEventListener('change', function(){ handleImagePicked(mediaInputCam); });
if (mediaRemove)   mediaRemove.addEventListener('click', resetImagePicker);

document.getElementById('media-btn-gallery').addEventListener('click', function(){ mediaInput.click(); });
document.getElementById('media-btn-camera').addEventListener('click', function(){ mediaInputCam.click(); });

var _selectedImageFile = null;

function getSelectedImageFile(){
  return _selectedImageFile;
}

function validateImageFile(file){
  if (!file) return null;
  var okTypes = ['image/jpeg','image/png','image/webp','image/heic','image/heif'];
  if (okTypes.indexOf(file.type) === -1 && file.type !== '') return 'Usa una imagen JPG, PNG o WebP.';
  return null;
}

function handleImagePicked(input){
  var file = input && input.files && input.files[0] ? input.files[0] : null;
  if (!file) { resetImagePicker(); return; }
  var err = validateImageFile(file);
  if (err) { notif(err, 'err'); resetImagePicker(); return; }

  if (mediaPreviewObjectUrl) URL.revokeObjectURL(mediaPreviewObjectUrl);
  mediaPreviewObjectUrl = URL.createObjectURL(file);
  document.getElementById('media-preview-img').src = mediaPreviewObjectUrl;
  document.getElementById('media-preview-name').textContent = file.name || 'Foto seleccionada';
  document.getElementById('media-preview').style.display = 'flex';
  _selectedImageFile = file;
}

function resetImagePicker(){
  if (mediaInput) mediaInput.value = '';
  if (mediaInputCam) mediaInputCam.value = '';
  var preview = document.getElementById('media-preview');
  var img = document.getElementById('media-preview-img');
  if (preview) preview.style.display = 'none';
  if (img) img.removeAttribute('src');
  if (mediaPreviewObjectUrl) {
    URL.revokeObjectURL(mediaPreviewObjectUrl);
    mediaPreviewObjectUrl = null;
  }
  _selectedImageFile = null;
}

var COMPRESS_MAX_PX = 1920;
var COMPRESS_QUALITY = 0.82;

function fileToDataUrl(file){
  return new Promise(function(resolve, reject){
    var reader = new FileReader();
    reader.onerror = function(){ reject(new Error('No se pudo leer la imagen.')); };
    reader.onload = function(){
      var img = new Image();
      img.onerror = function(){ reject(new Error('No se pudo procesar la imagen.')); };
      img.onload = function(){
        var w = img.naturalWidth, h = img.naturalHeight;
        if (w > COMPRESS_MAX_PX || h > COMPRESS_MAX_PX) {
          var ratio = Math.min(COMPRESS_MAX_PX / w, COMPRESS_MAX_PX / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', COMPRESS_QUALITY));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function buildCG(){
  var g = document.getElementById('cgrid'); if(!g) return; g.innerHTML='';
  var hasDisabled = CATS.some(function(c){ return c.disabled; });
  var wrap = document.createElement('div'); wrap.style.cssText='display:contents';
  var disabledWrap = null;
  if(hasDisabled){
    disabledWrap = document.createElement('div'); disabledWrap.className='cbtn-disabled-group';
    disabledWrap.innerHTML='<span class="cbtn-soon-lbl">Próximamente</span>';
  }
  CATS.forEach(function(cat){
    var b = document.createElement('div');
    if(cat.disabled){
      b.className='cbtn cbtn-disabled'; b.style.setProperty('--cc', cat.color);
      b.innerHTML='<div class="cb-ic">'+cat.icon+'</div><div class="cb-lb">'+cat.lbl.replace('\n','<br>')+'</div>';
      disabledWrap.appendChild(b);
    } else {
      b.className='cbtn'+(cat.id===selCat.id?' sel':''); b.style.setProperty('--cc', cat.color);
      b.innerHTML='<div class="cb-ic">'+cat.icon+'</div><div class="cb-lb">'+cat.lbl.replace('\n','<br>')+'</div>';
      b.addEventListener('click', function(){ selCat=cat; selEmoji=cat.emojis[0]; buildCG(); buildEG(); updateDevDurationFields(); updateFieldsByCat(); });
      g.appendChild(b);
    }
  });
  if(disabledWrap) g.appendChild(disabledWrap);
}

function updateFieldsByCat(){
  var cat = selCat;
  if(!cat) return;
  var rgb = hexToRgb(cat.color);
  var mover = document.getElementById('mover');
  if(mover){ mover.style.setProperty('--cat-color', cat.color); mover.style.setProperty('--cat-color-rgb', rgb); }
  var fields = ['f-biz','f-ttl','f-txt'];
  var phs = [cat.phBiz, cat.phTtl, cat.phTxt];
  var defaults = ['Ej: Tacos El Güero','¿Qué está pasando?','Cuéntanos más... puedes poner links, teléfonos, etc.'];
  fields.forEach(function(id, i){
    var el = document.getElementById(id);
    if(!el) return;
    el.placeholder = phs[i] || defaults[i];
    el.style.borderColor = 'rgba('+rgb+',0.5)';
  });
  var fBiz = document.getElementById('f-biz');
  if(fBiz){
    var lbl = fBiz.closest('.fg') && fBiz.closest('.fg').querySelector('label');
    if(lbl){
      var span = lbl.querySelector('span');
      var spanHtml = span ? ' '+span.outerHTML : '';
      lbl.innerHTML = (cat.bizLbl || 'Nombre del negocio') + spanHtml;
    }
  }
}

function hexToRgb(hex){
  var r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return r+','+g+','+b;
}

function updateDevDurationFields(){
  var fields = document.getElementById('dev-duration-fields');
  if (!fields) return;
  fields.style.display = selCat && selCat.id === 'dev' ? 'block' : 'none';
  var btn = document.getElementById('bsub');
  if (btn && !btn.disabled) btn.textContent = getPublishButtonText();
}

function getPublishButtonText(){
  if(selCat && selCat.id === 'dev') return '🧪 Publicar Flare DEV';
  var ft = FLARE_TYPES[selFlareType] || FLARE_TYPES.flama;
  return ft.icon + ' Publicar Flare (' + ft.dur + ')';
}

function toggleFloinsHint(){
  var hint = document.getElementById('ftype-earn-hint');
  if(!hint) return;
  var visible = hint.style.display !== 'none';
  hint.style.display = visible ? 'none' : 'block';
  if(!visible) setTimeout(function(){ hint.style.display = 'none'; }, 4000);
}

function getFloinsBalance(){
  return (IDENTITY && typeof IDENTITY.floins === 'number') ? IDENTITY.floins : 0;
}

function buildFlareTypeSelector(){
  var balance = getFloinsBalance();
  var balVal = document.getElementById('ftype-balance-val');
  if(balVal) balVal.textContent = balance;
  Object.keys(FLARE_TYPES).forEach(function(type){
    var btn = document.getElementById('ftype-' + type);
    if(!btn) return;
    var ft = FLARE_TYPES[type];
    var canAfford = ft.floins === 0 || balance >= ft.floins;
    btn.classList.toggle('sel', type === selFlareType);
    btn.classList.toggle('ftype-disabled', !canAfford);

    // Etiqueta de costo
    var durEl = btn.querySelector('.ftype-dur');
    if(durEl){
      if(ft.floins > 0){
        var floinIcon = '<img src="/icons/floin.png" class="ftype-floin-ico" onerror="this.replaceWith(\'🪙\')">';
        var shortLbl = canAfford ? '' : '<span class="ftype-short">+' + (ft.floins - balance) + ' faltan</span>';
        durEl.innerHTML = '<span class="ftype-dur-line">' + ft.dur + '</span>'
          + '<span class="ftype-dur-line ftype-dur-cost">' + ft.floins + ' ' + floinIcon + shortLbl + '</span>';
      } else {
        durEl.textContent = ft.dur;
      }
    }

    btn.onclick = function(){
      if(!canAfford){ notif('Necesitas ' + ft.floins + ' Floins para ' + ft.label + ' — te faltan ' + (ft.floins - balance), 'err'); return; }
      selFlareType = type;
      buildFlareTypeSelector();
      var bsub = document.getElementById('bsub');
      if(bsub && !bsub.disabled) bsub.textContent = getPublishButtonText();
    };
  });
  var hint = document.getElementById('ftype-hint');
  if(hint) hint.textContent = FLARE_TYPES[selFlareType].hint;
}

function showFloinsToast(amount, reason){
  var labels = {
    first_flare:    '🔥 ¡Primer flare!',
    publish:        'publicaste un flare',
    register_phone: '📱 teléfono verificado',
    likes_given:    '❤️ 10 likes dados',
    extend_active:  '⏱️ flare extendido +1h',
  };
  var label = labels[reason] || '';
  var sign = amount > 0 ? '+' : '';
  var html = sign + amount + ' <img src="/icons/floin.png" onerror="this.replaceWith(\'🪙\')" style="width:13px;height:13px;vertical-align:middle;margin:0 1px"> Floins'
    + (label ? ' · ' + label : '');
  notif(html, 'floins');
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

  var plusWrap = document.createElement('div');
  plusWrap.className = 'ebtn-plus-wrap';
  var plus = document.createElement('button');
  plus.className = 'ebtn ebtn-plus';
  plus.textContent = '+';
  plus.title = 'Agregar tu propio emoji';
  var plusLbl = document.createElement('div');
  plusLbl.className = 'ebtn-plus-lbl';
  plusLbl.textContent = 'tu emoji';
  plusWrap.appendChild(plus);
  plusWrap.appendChild(plusLbl);
  plus.addEventListener('click', function(e){
    e.preventDefault();
    document.getElementById('emoji-custom-inp').value = '';
    document.getElementById('emoji-custom-inp').focus();
  });
  g.appendChild(plusWrap);

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
    plus.innerHTML = emoji;
    plus.style.borderColor = selCat.color;
    plus.style.background = selCat.color+'22';
    plus.style.fontSize = '22px';
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
    users_id: IDENTITY.uid || null,
    device_id: getDeviceFingerprint(),
    username: IDENTITY.username,
    local_date: getLocalDateString(),
    biz_name: bizName,
    body_text: bodyText,
    flare_type: isDev ? 'dev' : selFlareType,
    dur_min: isDev ? devDur : undefined,
    is_first_flare: isFirstFlare,
  };
  if (isDev) payload.admin_secret = devSecret;

  // Si es el primer flare, subir avatar a R2 antes de publicar
  var avatarUploadTask = isFirstFlare && IDENTITY.avatar_url && !IDENTITY.uid
    ? (function() {
        btn.textContent = '🖼️ Preparando perfil...';
        return fetch(IDENTITY.avatar_url)
          .then(function(r) { return r.blob(); })
          .then(function(blob) {
            return new Promise(function(resolve, reject) {
              var reader = new FileReader();
              reader.onload = function() { resolve(reader.result); };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          })
          .then(function(dataUrl) {
            return postMedia({ data_url: dataUrl, title: 'Avatar', uid: MY_ID });
          })
          .then(function(res) {
            console.log('[avatar-upload] ok:', res.image_url);
            IDENTITY.avatar_url = res.image_url;
            payload.avatar_url = res.image_url;
            saveIdentity(IDENTITY);
          })
          .catch(function(e) { console.error('[avatar-upload]', e && e.message); }); // si falla el avatar no bloquea el flare
      })()
    : Promise.resolve();

  var publishTask = avatarUploadTask.then(function() {
    return imageFile
      ? fileToDataUrl(imageFile)
          .then(function(dataUrl){
            return postMedia({
              data_url: dataUrl,
              title: ttl,
              body_text: bodyText,
              uid: MY_ID,
            });
          })
          .then(function(media){
            payload.image_url = media.image_url;
            btn.textContent = '⏳ Publicando...';
            return postFlare(payload);
          })
      : postFlare(payload);
  });

  publishTask
    .then(function(row) {
      // Guardar users_id en IDENTITY
      if (row.users_id && IDENTITY) {
        IDENTITY.uid = row.users_id;
        if (row.existing_profile) {
          IDENTITY.username = row.existing_profile.username;
          IDENTITY.avatar_url = row.existing_profile.avatar_url || IDENTITY.avatar_url;
        }
        // Actualizar balance de Floins en IDENTITY
        if (typeof row.floins_balance === 'number') {
          IDENTITY.floins = row.floins_balance;
        } else if (row.floins_earned) {
          IDENTITY.floins = (IDENTITY.floins || 0) + row.floins_earned;
        }
        saveIdentity(IDENTITY);
      }
      noteIdentityFlarePublished();
      btn.disabled = false;
      btn.textContent = getPublishButtonText();
      var pin = rowToPin(row);
      pin.marker = makeMarker(pin);
      pins[pin.id] = pin;
      closeModal();
      map.flyTo([pin.lat, pin.lng], 15, {duration:1});
      var ft = FLARE_TYPES[selFlareType] || FLARE_TYPES.flama;
      notif(pin.emoji+' "'+pin.title+'" lanzado por '+(isDev ? devDur+' min' : ft.dur)+'!');
      // Toast de Floins ganados
      if (row.floins_earned > 0) {
        setTimeout(function(){ showFloinsToast(row.floins_earned, row.floins_reason); }, 600);
      }
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
      btn.disabled = false;
      btn.textContent = getPublishButtonText();
      if(e.status === 402) notif('No tienes suficientes Floins para esta duración 🪙','err');
      else if(e.status === 429 && e.message === 'daily_limit') { closeModal(); openDailyLimitModal(); }
      else if(e.status === 429 && e.message && e.message.includes('OpenAI')) notif(e.message, 'err');
      else if(e.status === 429) notif('Límite alcanzado. Intenta en unos minutos.','err');
      else if(e.status === 401) notif('Contraseña admin incorrecta.','err');
      else if(e.status === 403) notif('Modo DEV desactivado o no permitido.','err');
      else if(e.status === 413) notif(e.message, 'err');
      else if(e.message && e.message.toLowerCase().includes('imagen')) notif(e.message, 'err');
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
