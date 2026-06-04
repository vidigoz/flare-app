/* ── profile.js — panel de perfil de usuario ── */

var profileOpen = false;

function openProfile() {
  profileOpen = true;
  renderProfile();
}

function closeProfile() {
  profileOpen = false;
}

function profileQuickLinks() {
  return '<div class="profile-divider"></div>' +
    '<div class="profile-quick-links">' +
      '<button class="profile-quick-btn" onclick="openSupportModal()">' +
        '<span class="profile-quick-ico">📨</span>' +
        '<span class="profile-quick-lbl">Contacto</span>' +
      '</button>' +
      '<button class="profile-quick-btn" onclick="openTutorial()">' +
        '<span class="profile-quick-ico">📖</span>' +
        '<span class="profile-quick-lbl">Tutorial</span>' +
      '</button>' +
    '</div>';
}

function openTutorial() {
  if (typeof showView === 'function') {
    showView('panel-manual');
    document.getElementById('ph-ttl').innerHTML = 'Tutorial de <span>Flare</span>';
    document.getElementById('ph-sub').textContent = 'Guía completa';
    document.getElementById('ph-gear').classList.remove('active');
    if (typeof manualOpen !== 'undefined') manualOpen = true;
    if (!document.getElementById('panel-manual').dataset.loaded) {
      if (typeof loadManual === 'function') loadManual();
      document.getElementById('panel-manual').dataset.loaded = '1';
    }
  }
}

function renderProfile() {
  var box = document.getElementById('profile-content');
  if (!box) return;

  var tier = getTier();

  if (tier === 1) {
    // ¿Hay perfiles en DB pendientes de selección?
    if (typeof PENDING_PROFILES !== 'undefined' && PENDING_PROFILES && PENDING_PROFILES.length) {
      renderProfileSelector(box, PENDING_PROFILES);
      return;
    }
    box.innerHTML =
      '<div class="profile-tier-badge tier1">' +
        '<span class="tier-icon">👻</span>' +
        '<span class="tier-label">Visitante</span>' +
      '</div>' +
      '<div class="profile-cta">' +
        '<div class="profile-cta-title">Publica tu primer flare</div>' +
        '<div class="profile-cta-desc">Al publicar un flare se te asigna un nombre automáticamente y puedes dar likes a los flares de la comunidad.</div>' +
        '<button class="profile-cta-btn" onclick="closePanel();setTimeout(function(){document.getElementById(\'fab\').click()},200)">' +
          '⚡ Crear mi primer flare' +
        '</button>' +
      '</div>' +
      profileQuickLinks();
    return;
  }

  var identity = ensureIdentityAvatar(IDENTITY || {});
  if (IDENTITY) saveIdentity(IDENTITY);
  var avatarUrl = identity.avatar_url || randomAvatarUrl();
  var hoy = new Date().toDateString();
  var flaresHoy = (identity.fecha_hoy === hoy) ? (identity.flares_hoy || 0) : 0;
  var flaresRestantes = Math.max(0, 3 - flaresHoy);

  box.innerHTML =
    '<div class="profile-main">' +
      '<img class="profile-avatar" src="' + esc(avatarUrl) + '" alt="Avatar de perfil">' +
      '<div class="profile-main-body">' +
        '<div class="profile-tier-badge tier2 profile-tier-inline">' +
          '<span class="tier-icon">✕</span>' +
          '<span class="tier-label">Sin validar</span>' +
        '</div>' +
        '<div class="profile-username-label">Tu nombre</div>' +
        '<div class="profile-username-value">@' + esc(identity.username || '?') + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="profile-stats">' +
      '<div class="profile-stat">' +
        '<div class="profile-stat-val">' + flaresHoy + '</div>' +
        '<div class="profile-stat-lbl">Flares hoy</div>' +
      '</div>' +
      '<div class="profile-stat">' +
        '<div class="profile-stat-val" style="color:' + (flaresRestantes > 0 ? 'var(--neon)' : 'var(--danger)') + '">' + flaresRestantes + '</div>' +
        '<div class="profile-stat-lbl">Restantes hoy</div>' +
      '</div>' +
    '</div>' +
    '<div class="profile-validate">' +
      '<div class="profile-validate-title">🔒 Desbloquea más funciones</div>' +
      '<div class="profile-validate-desc">Valida tu perfil con tu número de celular para escoger tu nombre, publicar sin límite y guardar tu perfil de Flare para recuperarlo en cualquier dispositivo.</div>' +
      '<button class="profile-validate-btn" onclick="showVerifyPhone()">Validar con mi número</button>' +
    '</div>' +
    '<div class="profile-divider"></div>' +
    '<div class="profile-section-title">📍 Mis Flares</div>' +
    '<div id="mine-list-profile"></div>' +
    profileQuickLinks();

  renderMyFlaresInProfile();
}

function renderMyFlaresInProfile() {
  var box = document.getElementById('mine-list-profile');
  if (!box) return;

  // Cargar desde API usando owner_uid
  var ownerUid = getOwnerUid();
  box.innerHTML = '<div class="pempty" style="opacity:.6">Cargando...</div>';

  apiFetch('/api/flares?owner_uid=' + encodeURIComponent(ownerUid))
    .then(function(rows) {
      if (!rows.length) {
        box.innerHTML = '<div class="pempty"><div class="pe-ico" style="font-size:24px">📍</div>No has publicado ningún flare todavía.</div>';
        return;
      }
      var html = '';
      rows.forEach(function(row) {
        var pin = rowToPin(row);
        var expiresMs = new Date(pin.expires_at).getTime();
        var r = Math.max(0, expiresMs - Date.now());
        var isExpired = expiresMs <= Date.now();
        var cat = CATS.find(function(c){ return c.id === pin.cat; }) || CATS[0];
        var bc = r < 10*60*1000 ? 'var(--danger)' : r < 30*60*1000 ? 'var(--amber)' : 'var(--neon)';
        html +=
          '<div class="prow profile-flare-row' + (isExpired ? ' profile-flare-expired' : '') + '">' +
            '<div class="prow-hdr">' +
              '<div class="prow-ico" style="background:' + cat.color + '18;border-color:' + cat.color + '55">' + pin.emoji + '</div>' +
              (pin.image ? '<img class="prow-thumb" src="' + esc(pin.image) + '" alt="Foto" loading="lazy">' : '') +
              '<div class="prow-body">' +
                (pin.bizName ? '<div class="prow-biz">🏪 ' + esc(pin.bizName) + '</div>' : '') +
                '<div class="prow-name">' + esc(pin.title) + '</div>' +
                '<div class="prow-tags">' +
                  (isExpired
                    ? '<span class="ptime profile-expired-badge">Vencido</span>'
                    : '<span class="ptime" style="color:' + bc + '">⏱ ' + fmtT(r) + '</span>') +
                  '<span class="plikes">❤️ ' + pin.likes + '</span>' +
                '</div>' +
              '</div>' +
              '<div class="profile-flare-actions">' +
                (isExpired ? '<button class="profile-repost-btn" data-repost-id="' + pin.id + '" onclick="repostMyFlare(\'' + pin.id + '\')" title="Republicar">↻ Republicar</button>' : '') +
                '<button class="pd-report" onclick="deleteMyFlare(\'' + pin.id + '\')" title="Eliminar">🗑️</button>' +
              '</div>' +
            '</div>' +
          '</div>';
      });
      box.innerHTML = html;
    })
    .catch(function() {
      box.innerHTML = '<div class="pempty">Error al cargar. Intenta de nuevo.</div>';
    });
}

function repostMyFlare(id) {
  var btn = document.querySelector('[data-repost-id="' + id + '"]');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Publicando...';
  }

  repostFlare(id)
    .then(function(row) {
      noteIdentityFlarePublished();
      var pin = rowToPin(row);
      if (typeof clusterGroup !== 'undefined' && clusterGroup && typeof makeMarker === 'function') {
        if (pins[pin.id] && pins[pin.id].marker) {
          clusterGroup.removeLayer(pins[pin.id].marker);
        }
        pin.marker = makeMarker(pin);
        pins[pin.id] = pin;
        applyVigFilter();
        refreshBadge();
        if (panelOpen) { buildChips(); renderPanel(); }
      }
      notif(pin.emoji + ' "' + pin.title + '" republicado por 1 hora!');
      renderProfile();
    })
    .catch(function(e) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '↻ Republicar';
      }
      if (e.status === 429 && e.message === 'daily_limit') openDailyLimitModal();
      else if (e.status === 409) notif('Ese flare todavía está vigente.', 'err');
      else if (e.status === 404) notif('Este flare ya no se puede republicar.', 'err');
      else notif('Error al republicar: ' + e.message, 'err');
    });
}

function renderProfileSelector(box, profiles) {
  var html =
    '<div class="profile-tier-badge tier1">' +
      '<span class="tier-icon">🔄</span>' +
      '<span class="tier-label">Elige tu perfil</span>' +
    '</div>' +
    '<div class="profile-cta">' +
      '<div class="profile-cta-title">Encontramos ' + profiles.length + ' perfiles en este dispositivo</div>' +
      '<div class="profile-cta-desc">Selecciona el perfil que quieres usar. Podrás cambiarlo desde aquí cuando quieras.</div>' +
    '</div>';

  profiles.forEach(function(p, i) {
    p.avatar_url = p.avatar_url || randomAvatarUrl();
    var fecha = new Date(p.created_at).toLocaleDateString('es-MX', { day:'numeric', month:'short', year:'numeric' });
    html +=
      '<button class="profile-selector-item" onclick="restoreProfile(' + i + ')">' +
        '<img class="profile-selector-avatar" src="' + esc(p.avatar_url) + '" alt="Avatar">' +
        '<div class="profile-selector-body">' +
          '<div class="profile-selector-name">@' + esc(p.username) + '</div>' +
          '<div class="profile-selector-date">Creado el ' + fecha + '</div>' +
        '</div>' +
        '<span class="psetting-arrow">›</span>' +
      '</button>';
  });

  box.innerHTML = html;
}

function restoreProfile(index) {
  var p = PENDING_PROFILES[index];
  if (!p) return;
  IDENTITY = {
    username:   p.username,
    device_id:  p.device_id,
    floins:     0,
    flares_hoy: 0,
    fecha_hoy:  new Date().toDateString(),
    racha_dias: 0,
    avatar_url: p.avatar_url || randomAvatarUrl(),
    created_at: p.created_at,
  };
  ensureIdentityAvatar(IDENTITY);
  saveIdentity(IDENTITY);
  PENDING_PROFILES = null;
  notif('✅ Perfil @' + p.username + ' restaurado');
  renderProfile();
}

/* openProfile() y closeProfile() son llamadas desde panel.js vía psetting-profile */

/* ── Tier 3: Verificación por teléfono (Firebase Phone Auth) ── */

var _fbConfirmationResult = null; // resultado de signInWithPhoneNumber

function showVerifyPhone() {
  var box = document.getElementById('profile-content');
  if (!box) return;
  box.innerHTML =
    '<div class="profile-verify-header">' +
      '<button class="profile-verify-back" onclick="renderProfile()">← Volver</button>' +
      '<div class="profile-verify-title">Verificar número</div>' +
    '</div>' +
    '<div class="profile-verify-body">' +
      '<div class="profile-verify-desc">Ingresa tu número de celular. Te enviaremos un código de 6 dígitos por SMS.</div>' +
      '<div class="profile-verify-field">' +
        '<span class="profile-verify-prefix">🇲🇽 +52</span>' +
        '<input id="verify-phone-input" class="profile-verify-input" type="tel" inputmode="numeric" maxlength="10" placeholder="10 dígitos">' +
      '</div>' +
      '<div id="verify-phone-err" class="profile-verify-err" style="display:none"></div>' +
      '<div id="recaptcha-container"></div>' +
      '<button class="profile-validate-btn" id="verify-send-btn" onclick="doSendCode()">Enviar código</button>' +
    '</div>';

  var input = document.getElementById('verify-phone-input');
  if (input) input.focus();
}

function doSendCode() {
  var input = document.getElementById('verify-phone-input');
  var errEl = document.getElementById('verify-phone-err');
  var btn   = document.getElementById('verify-send-btn');
  if (!input) return;

  var digits = input.value.replace(/\D/g, '');
  if (digits.length !== 10) {
    errEl.textContent = 'Ingresa exactamente 10 dígitos';
    errEl.style.display = 'block';
    return;
  }
  var phone = '+52' + digits;

  errEl.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Enviando...';

  // Esperar a que Firebase esté listo (puede tardar si la red es lenta)
  Promise.resolve(window._fbReady || null)
    .then(function() {
      if (!window._fbAuth || !window._fbRecaptchaVerifier || !window._fbSignInWithPhone) {
        throw new Error('firebase_not_loaded');
      }
      if (!window._fbAppVerifier) {
        window._fbAppVerifier = new window._fbRecaptchaVerifier(window._fbAuth, 'recaptcha-container', { size: 'invisible' });
      }
      return window._fbSignInWithPhone(window._fbAuth, phone, window._fbAppVerifier);
    })
    .then(function(confirmationResult) {
      _fbConfirmationResult = confirmationResult;
      showVerifyCode(phone);
    })
    .catch(function(e) {
      console.error('firebase phone error:', e);
      window._fbAppVerifier = null;
      var msg = 'Error al enviar SMS. Intenta de nuevo.';
      if (e.message === 'firebase_not_loaded') msg = 'Firebase no cargó. Recarga la página e intenta de nuevo.';
      if (e.code === 'auth/invalid-phone-number') msg = 'Número de teléfono inválido.';
      if (e.code === 'auth/too-many-requests')    msg = 'Demasiados intentos. Espera unos minutos.';
      errEl.textContent = msg;
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Enviar código';
    });
}

function showVerifyCode(phone) {
  var box = document.getElementById('profile-content');
  if (!box) return;
  var hint = phone.slice(0, 4) + '****' + phone.slice(-2);
  box.innerHTML =
    '<div class="profile-verify-header">' +
      '<button class="profile-verify-back" onclick="showVerifyPhone()">← Cambiar número</button>' +
      '<div class="profile-verify-title">Ingresa el código</div>' +
    '</div>' +
    '<div class="profile-verify-body">' +
      '<div class="profile-verify-desc">Enviamos un SMS a <strong>' + esc(hint) + '</strong>. Ingresa el código de 6 dígitos.</div>' +
      '<input id="verify-code-input" class="profile-verify-code-input" type="tel" inputmode="numeric" maxlength="6" placeholder="000000">' +
      '<div id="verify-code-err" class="profile-verify-err" style="display:none"></div>' +
      '<div class="profile-verify-username-section">' +
        '<div class="profile-verify-username-label">¿Quieres cambiar tu nombre? (opcional)</div>' +
        '<input id="verify-username-input" class="profile-verify-input" type="text" maxlength="30" placeholder="' + esc((IDENTITY && IDENTITY.username) || '') + '">' +
        '<div class="profile-verify-username-hint">Solo letras minúsculas, números y guion bajo</div>' +
      '</div>' +
      '<button class="profile-validate-btn" id="verify-confirm-btn" onclick="doConfirmCode()">Verificar</button>' +
      '<button class="profile-verify-resend" onclick="showVerifyPhone()">Reenviar código</button>' +
    '</div>';

  var input = document.getElementById('verify-code-input');
  if (input) {
    input.focus();
    input.addEventListener('input', function() {
      if (this.value.length === 6) document.getElementById('verify-confirm-btn').click();
    });
  }
}

function doConfirmCode() {
  var codeEl     = document.getElementById('verify-code-input');
  var usernameEl = document.getElementById('verify-username-input');
  var errEl      = document.getElementById('verify-code-err');
  var btn        = document.getElementById('verify-confirm-btn');
  if (!codeEl) return;

  var code     = codeEl.value.trim();
  var username = usernameEl ? usernameEl.value.trim().toLowerCase() : '';

  if (code.length !== 6) {
    errEl.textContent = 'El código debe tener 6 dígitos';
    errEl.style.display = 'block';
    return;
  }
  if (username && !/^[a-z0-9_]{3,30}$/.test(username)) {
    errEl.textContent = 'Nombre inválido: solo minúsculas, números y _ (mínimo 3 caracteres)';
    errEl.style.display = 'block';
    return;
  }
  if (!_fbConfirmationResult) {
    errEl.textContent = 'Sesión expirada. Vuelve a enviar el código.';
    errEl.style.display = 'block';
    return;
  }

  errEl.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Verificando...';

  _fbConfirmationResult.confirm(code)
    .then(function(result) {
      return result.user.getIdToken();
    })
    .then(function(idToken) {
      var deviceId = (IDENTITY && IDENTITY.device_id) ? IDENTITY.device_id : getDeviceFingerprint();
      var payload  = { device_id: deviceId, id_token: idToken };
      if (username) payload.username = username;
      return apiFetch('/api/verify/firebase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    })
    .then(function(res) {
      if (res.error) {
        errEl.textContent = res.error;
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Verificar';
        return;
      }
      if (res.user) {
        IDENTITY = {
          username:   res.user.username,
          device_id:  res.user.device_id,
          phone:      res.user.phone,
          tier:       3,
          floins:     IDENTITY ? (IDENTITY.floins || 0) : 0,
          flares_hoy: IDENTITY ? (IDENTITY.flares_hoy || 0) : 0,
          fecha_hoy:  IDENTITY ? (IDENTITY.fecha_hoy || new Date().toDateString()) : new Date().toDateString(),
          racha_dias: IDENTITY ? (IDENTITY.racha_dias || 0) : 0,
          avatar_url: IDENTITY ? (IDENTITY.avatar_url || randomAvatarUrl()) : randomAvatarUrl(),
          created_at: res.user.created_at,
        };
        ensureIdentityAvatar(IDENTITY);
        saveIdentity(IDENTITY);
      }
      _fbConfirmationResult = null;
      showVerifySuccess();
    })
    .catch(function(e) {
      console.error('confirm error:', e);
      var msg = 'Código incorrecto. Intenta de nuevo.';
      if (e.code === 'auth/code-expired') msg = 'El código expiró. Solicita uno nuevo.';
      errEl.textContent = msg;
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Verificar';
    });
}

function showVerifySuccess() {
  var box = document.getElementById('profile-content');
  if (!box) return;
  var username = (IDENTITY && IDENTITY.username) || '';
  box.innerHTML =
    '<div class="profile-verify-success">' +
      '<div class="profile-verify-success-icon">✅</div>' +
      '<div class="profile-verify-success-title">¡Número verificado!</div>' +
      '<div class="profile-verify-success-desc">Tu perfil <strong>@' + esc(username) + '</strong> ahora está protegido. Puedes recuperarlo en cualquier dispositivo con tu número de celular.</div>' +
      '<button class="profile-validate-btn" onclick="renderProfile()">Ver mi perfil</button>' +
    '</div>';
}
