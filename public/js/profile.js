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
    if(typeof setActiveNav === 'function') setActiveNav(null);
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
      '<div class="profile-divider"></div>' +
      '<div class="profile-recover">' +
        '<div class="profile-recover-title">¿Ya tienes una cuenta?</div>' +
        '<div class="profile-recover-desc">Ingresa con tu número de celular para recuperar tu perfil en este dispositivo.</div>' +
        '<button class="profile-recover-btn" onclick="showRecoverPhone()">📱 Ingresar con mi número</button>' +
      '</div>' +
      profileQuickLinks();
    return;
  }

  var identity = ensureIdentityAvatar(IDENTITY || {});
  if (IDENTITY) saveIdentity(IDENTITY);
  var avatarUrl = identity.avatar_url;
  var hoy = new Date().toDateString();
  var flaresHoy = (identity.fecha_hoy === hoy) ? (identity.flares_hoy || 0) : 0;
  var flaresRestantes = Math.max(0, 10 - flaresHoy);
  var floinsBalance = identity.floins || 0;

  // Actualizar balance desde servidor (solo el número, el historial está en panel-floins)
  if (identity.uid) {
    fetch('/api/floins-balance?uid=' + encodeURIComponent(identity.uid))
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(data){
        if (!data) return;
        if (IDENTITY) { IDENTITY.floins = data.balance; saveIdentity(IDENTITY); }
        var balEl = document.getElementById('floins-balance-val');
        if (balEl) balEl.textContent = data.balance;
      })
      .catch(function(){});
  }

  box.innerHTML =
    '<div class="profile-main">' +
      (getTier() === 3
        ? '<div class="profile-avatar-wrap" onclick="pickProfileAvatar()">' +
            '<img class="profile-avatar" src="' + esc(avatarUrl) + '" alt="Avatar de perfil" id="profile-avatar-img">' +
            '<div class="profile-avatar-edit">📷</div>' +
          '</div>'
        : '<img class="profile-avatar" src="' + esc(avatarUrl) + '" alt="Avatar de perfil">') +
      '<div class="profile-main-body">' +
        (getTier() === 3
          ? '<div class="profile-tier-badge tier3 profile-tier-inline"><span class="tier-icon">✓</span><span class="tier-label">Verificado</span></div>'
          : '<div class="profile-tier-badge tier2 profile-tier-inline"><span class="tier-icon">✕</span><span class="tier-label">Sin validar</span></div>'
        ) +
        '<div class="profile-username-label">Tu nombre</div>' +
        '<div class="profile-username-value">@' + esc(identity.username || '?') + '</div>' +
        (getTier() === 3 ? '<button class="profile-change-username-btn" onclick="showChangeUsername()">✏️ Cambiar</button>' : '') +
      '</div>' +
    '</div>' +
    '<div class="profile-stats">' +
      '<div class="profile-stat">' +
        '<div class="profile-stat-val">' + flaresHoy + '</div>' +
        '<div class="profile-stat-lbl">Flares hoy</div>' +
      '</div>' +
      (getTier() < 3 ?
        '<div class="profile-stat">' +
          '<div class="profile-stat-val" style="color:' + (flaresRestantes > 0 ? 'var(--neon)' : 'var(--danger)') + '">' + flaresRestantes + '</div>' +
          '<div class="profile-stat-lbl">Restantes hoy</div>' +
        '</div>'
      : '') +
      '<div class="profile-stat profile-stat-floins" onclick="showFloinsPanel()" title="Ver mis Floins">' +
        '<div class="profile-stat-val" id="floins-balance-val">' + floinsBalance + '</div>' +
        '<div class="profile-stat-lbl"><img src="/icons/floin.png" onerror="this.replaceWith(\'🪙\')" style="width:11px;height:11px;vertical-align:middle"> Floins</div>' +
        '<div class="profile-stat-goto">Ver panel →</div>' +
      '</div>' +
    '</div>' +
    (getTier() < 3 ?
      '<div class="profile-recover">' +
        '<div class="profile-recover-title">¿Ya tienes una cuenta?</div>' +
        '<div class="profile-recover-desc">Ingresa con tu número de celular para recuperar tu perfil en este dispositivo.</div>' +
        '<button class="profile-recover-btn" onclick="showRecoverPhone()">📱 Ingresar con mi número</button>' +
      '</div>'
    : '<div class="profile-quick-actions">' +
        '<button class="profile-quick-btn" onclick="closeProfile();closePanel()">' +
          '<span class="profile-quick-ico">🗺️</span>' +
          '<span class="profile-quick-lbl">Ir al mapa</span>' +
        '</button>' +
        '<button class="profile-quick-btn" onclick="closeProfile();closePanel();setTimeout(function(){document.getElementById(\'fab\').click()},200)">' +
          '<span class="profile-quick-ico">⚡</span>' +
          '<span class="profile-quick-lbl">Poner flare</span>' +
        '</button>' +
      '</div>' +
      '<button class="profile-signout-btn" onclick="doSignOut()">↩ Cerrar sesión</button>') +
    (typeof DEV_DURATION_MODE !== 'undefined' && DEV_DURATION_MODE ?
      '<div class="profile-dev-reset">' +
        '<div class="profile-dev-reset-title">🧪 DEV — Resetear tier</div>' +
        '<div style="display:flex;gap:8px;margin-top:8px">' +
          '<button class="profile-dev-btn" onclick="devResetTier(1)">→ Tier 1</button>' +
          '<button class="profile-dev-btn" onclick="devResetTier(2)">→ Tier 2</button>' +
        '</div>' +
        '<input id="dev-reset-secret" class="profile-verify-input" type="password" placeholder="Contraseña admin" style="margin-top:8px">' +
        '<div id="dev-reset-err" class="profile-verify-err" style="display:none"></div>' +
      '</div>'
    : '') +
    '<div class="profile-divider"></div>' +
    '<div class="profile-tabs-wrap">' +
      '<div class="profile-tabs">' +
        '<button class="profile-tab active" id="tab-flares" onclick="switchProfileTab(\'flares\')">📍 Mis Flares</button>' +
        '<button class="profile-tab" id="tab-likes" onclick="switchProfileTab(\'likes\')">❤️ Mis Likes</button>' +
      '</div>' +
      '<div id="tab-flares-content">' +
        '<div class="profile-flares-note">Tienes 24 h para republicar un flare antes de que desaparezca.</div>' +
        '<div id="mine-list-profile">' +
        (getTier() < 3
          ? '<div class="prow profile-flare-row"><div class="prow-hdr"><div class="prow-ico" style="background:#ffffff10;border-color:#ffffff20">📍</div><div class="prow-body"><div class="prow-name" style="background:#ffffff15;color:transparent;border-radius:4px">Flare de ejemplo largo</div><div class="prow-tags"><span class="ptime">⏱ 45 min</span><span class="plikes">❤️ 3</span></div></div></div></div>' +
            '<div class="prow profile-flare-row"><div class="prow-hdr"><div class="prow-ico" style="background:#ffffff10;border-color:#ffffff20">🍕</div><div class="prow-body"><div class="prow-name" style="background:#ffffff15;color:transparent;border-radius:4px">Otro flare aquí</div><div class="prow-tags"><span class="ptime">⏱ 12 min</span><span class="plikes">❤️ 1</span></div></div></div></div>'
          : '') +
        '</div>' +
      '</div>' +
      '<div id="tab-likes-content" style="display:none">' +
        '<div class="profile-flares-note">Flares vigentes a los que diste like.</div>' +
        '<div id="likes-list-profile">' +
        (getTier() < 3
          ? '<div class="prow profile-flare-row"><div class="prow-hdr"><div class="prow-ico" style="background:#ffffff10;border-color:#ffffff20">❤️</div><div class="prow-body"><div class="prow-name" style="background:#ffffff15;color:transparent;border-radius:4px">Flare que likeaste</div><div class="prow-tags"><span class="ptime">⏱ 23 min</span><span class="plikes plikes-active">❤️ 7</span></div></div></div></div>'
          : '') +
        '</div>' +
      '</div>' +
      (getTier() < 3
        ? '<div class="profile-lock-overlay" onclick="showVerifyPhone()">' +
            '<div class="profile-lock-box">' +
              '<div class="profile-lock-icon">🔒</div>' +
              '<div class="profile-lock-title">Verifica tu cuenta</div>' +
              '<div class="profile-lock-desc">Verifica tu cuenta para administrar tus flares, ver tus likes y publicar sin límite desde cualquier dispositivo.</div>' +
              '<button class="profile-validate-btn" onclick="showVerifyPhone()">Verificar por SMS</button>' +
            '</div>' +
          '</div>'
        : '') +
    '</div>' +
    profileQuickLinks();

  if (getTier() >= 3) renderMyFlaresInProfile();
}

function switchProfileTab(tab) {
  var floresTab = document.getElementById('tab-flares');
  var likesTab  = document.getElementById('tab-likes');
  var floresContent = document.getElementById('tab-flares-content');
  var likesContent  = document.getElementById('tab-likes-content');
  if (!floresTab || !likesTab) return;

  if (tab === 'flares') {
    floresTab.classList.add('active');
    likesTab.classList.remove('active');
    floresContent.style.display = '';
    likesContent.style.display = 'none';
  } else {
    likesTab.classList.add('active');
    floresTab.classList.remove('active');
    floresContent.style.display = 'none';
    likesContent.style.display = '';
    renderMyLikesInProfile();
  }
}

function renderMyFlaresInProfile() {
  var box = document.getElementById('mine-list-profile');
  if (!box) return;

  // Solo por users.id — fuente de verdad
  var uid = IDENTITY && IDENTITY.uid;
  if (!uid) {
    box.innerHTML = '<div class="pempty"><div class="pe-ico" style="font-size:24px">📍</div>No has publicado ningún flare todavía.</div>';
    return;
  }
  box.innerHTML = '<div class="pempty" style="opacity:.6">Cargando...</div>';

  apiFetch('/api/flares?owner_uid=' + encodeURIComponent(uid))
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
                (isExpired ? '<button class="profile-repost-btn" data-repost-id="' + pin.id + '" onclick="repostMyFlare(\'' + pin.id + '\')" title="Republicar">↻ Republicar</button>' : '<button class="pd-map" onclick="closePanel();flyToPin(\'' + pin.id + '\')" title="Ver en mapa">📍 Ver aquí</button>') +
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

function renderMyLikesInProfile() {
  var box = document.getElementById('likes-list-profile');
  if (!box) return;

  var uid = IDENTITY && IDENTITY.uid;
  if (!uid) {
    box.innerHTML = '<div class="pempty"><div class="pe-ico" style="font-size:24px">❤️</div>No has dado likes todavía.</div>';
    return;
  }
  if (box._loaded) return; // ya cargado en esta sesión del perfil
  box.innerHTML = '<div class="pempty" style="opacity:.6">Cargando...</div>';

  apiFetch('/api/likes?uid=' + encodeURIComponent(uid))
    .then(function(data) {
      var ids = (data && Array.isArray(data.liked)) ? data.liked : [];
      if (!ids.length) {
        box.innerHTML = '<div class="pempty"><div class="pe-ico" style="font-size:24px">❤️</div>No has dado likes a ningún flare vigente.</div>';
        return;
      }
      // Buscar los flares vigentes de esos IDs
      var fetches = ids.slice(0, 50).map(function(fid) {
        return apiFetch('/api/flares?id=' + encodeURIComponent(fid) + '&uid=' + encodeURIComponent(uid))
          .catch(function() { return null; });
      });
      return Promise.all(fetches).then(function(results) {
        var vigentes = results.filter(function(r) { return r && r.id; });
        if (!vigentes.length) {
          box.innerHTML = '<div class="pempty"><div class="pe-ico" style="font-size:24px">❤️</div>Los flares que likeaste ya expiraron.</div>';
          return;
        }
        var html = '';
        vigentes.forEach(function(row) {
          var pin = rowToPin(row);
          var expiresMs = new Date(pin.expires_at).getTime();
          var r = Math.max(0, expiresMs - Date.now());
          var cat = CATS.find(function(c){ return c.id === pin.cat; }) || CATS[0];
          var bc = r < 10*60*1000 ? 'var(--danger)' : r < 30*60*1000 ? 'var(--amber)' : 'var(--neon)';
          html +=
            '<div class="prow profile-flare-row">' +
              '<div class="prow-hdr">' +
                '<div class="prow-ico" style="background:' + cat.color + '18;border-color:' + cat.color + '55">' + pin.emoji + '</div>' +
                (pin.image ? '<img class="prow-thumb" src="' + esc(pin.image) + '" alt="Foto" loading="lazy">' : '') +
                '<div class="prow-body">' +
                  (pin.bizName ? '<div class="prow-biz">🏪 ' + esc(pin.bizName) + '</div>' : '') +
                  '<div class="prow-name">' + esc(pin.title) + '</div>' +
                  (pin.username ? '<div class="prow-username">@' + esc(pin.username) + '</div>' : '') +
                  '<div class="prow-tags">' +
                    '<span class="ptime" style="color:' + bc + '">⏱ ' + fmtT(r) + '</span>' +
                    '<span class="plikes plikes-active">❤️ ' + pin.likes + '</span>' +
                  '</div>' +
                '</div>' +
                '<div class="profile-flare-actions">' +
                  '<button class="pd-map" onclick="flyToLikedFlare(\'' + pin.id + '\',' + pin.lat + ',' + pin.lng + ')" title="Ver en mapa">📍 Ver aquí</button>' +
                '</div>' +
              '</div>' +
            '</div>';
        });
        box.innerHTML = html;
        box._loaded = true;
      });
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

/* ── Cambiar username (Tier 3) ── */

function showChangeUsername() {
  var box = document.getElementById('profile-content');
  if (!box) return;
  box.innerHTML =
    '<div class="profile-verify-header">' +
      '<button class="profile-verify-back" onclick="renderProfile()">← Volver</button>' +
      '<div class="profile-verify-title">Cambiar nombre</div>' +
    '</div>' +
    '<div class="profile-verify-body">' +
      '<div class="profile-verify-desc">Elige un nombre único. Puedes cambiarlo libremente la primera vez, después deberás esperar 7 días entre cambios.</div>' +
      '<input id="change-username-input" class="profile-verify-input" type="text" maxlength="30" ' +
        'placeholder="' + esc((IDENTITY && IDENTITY.username) || '') + '" ' +
        'style="margin-top:12px" autocomplete="off" autocorrect="off" autocapitalize="off">' +
      '<div class="profile-verify-username-hint">Solo letras minúsculas, números y _ (3-30 caracteres)</div>' +
      '<div id="change-username-err" class="profile-verify-err" style="display:none"></div>' +
      '<button class="profile-validate-btn" id="change-username-btn" onclick="doChangeUsername()" style="margin-top:12px">Guardar nombre</button>' +
    '</div>';
  var input = document.getElementById('change-username-input');
  if (input) input.focus();
}

function doChangeUsername() {
  var input  = document.getElementById('change-username-input');
  var errEl  = document.getElementById('change-username-err');
  var btn    = document.getElementById('change-username-btn');
  if (!input) return;
  var username = input.value.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,30}$/.test(username)) {
    errEl.textContent = 'Solo letras minúsculas, números y _ (mínimo 3 caracteres).';
    errEl.style.display = 'block'; return;
  }
  if (username === (IDENTITY && IDENTITY.username)) {
    errEl.textContent = 'Es el mismo nombre actual.';
    errEl.style.display = 'block'; return;
  }
  errEl.style.display = 'none';
  btn.disabled = true; btn.textContent = 'Guardando...';
  apiFetch('/api/profile/username', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: IDENTITY.uid, username }),
  })
  .then(function(res) {
    IDENTITY.username = res.username;
    saveIdentity(IDENTITY);
    notif('✓ Nombre actualizado a @' + res.username);
    renderProfile();
  })
  .catch(function(e) {
    errEl.textContent = e.message || 'Error al cambiar el nombre.';
    errEl.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Guardar nombre';
  });
}

/* ── Migrar avatar Tier 2 → R2 al verificar ── */

function migrateAvatarToR2(avatarUrl) {
  if (!avatarUrl || avatarUrl.includes('r2.dev') || avatarUrl.includes('pub-')) return;
  // Cargar la imagen local y subirla a R2
  var img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function() {
    try {
      var canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      canvas.getContext('2d').drawImage(img, 0, 0);
      var dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      apiFetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data_url: dataUrl, title: 'Avatar de perfil', uid: MY_ID }),
      }).then(function(res) {
        IDENTITY.avatar_url = res.image_url;
        saveIdentity(IDENTITY);
        apiFetch('/api/profile/avatar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: IDENTITY.uid, avatar_url: res.image_url }),
        }).catch(function(){});
      }).catch(function(){});
    } catch(e) {}
  };
  img.onerror = function() {};
  img.src = avatarUrl;
}

/* ── Avatar personalizado (Tier 3) ── */

function pickProfileAvatar() {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/jpeg,image/png,image/webp';
  input.style.display = 'none';
  document.body.appendChild(input);
  input.addEventListener('change', function() {
    var file = input.files && input.files[0];
    document.body.removeChild(input);
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { notif('La imagen debe pesar máximo 5 MB.', 'err'); return; }
    notif('Subiendo foto de perfil...');
    compressImage(file, 400, 0.85)
      .then(function(dataUrl) {
        return apiFetch('/api/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data_url: dataUrl, title: 'Avatar de perfil', uid: MY_ID }),
        });
      })
      .then(function(res) {
        IDENTITY.avatar_url = res.image_url;
        saveIdentity(IDENTITY);
        var img = document.getElementById('profile-avatar-img');
        if (img) img.src = res.image_url;
        notif('Foto de perfil actualizada ✓');
        // Persistir en DB
        apiFetch('/api/profile/avatar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: IDENTITY.uid, avatar_url: res.image_url }),
        }).catch(function(){});
      })
      .catch(function(e) {
        notif(e.message || 'Error al subir la foto.', 'err');
      });
  });
  input.click();
}

function compressImage(file, maxPx, quality) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onerror = function() { reject(new Error('No se pudo leer la imagen.')); };
    reader.onload = function() {
      var img = new Image();
      img.onerror = function() { resolve(reader.result); };
      img.onload = function() {
        var w = img.width, h = img.height;
        if (w > maxPx || h > maxPx) {
          if (w > h) { h = Math.round(h * maxPx / w); w = maxPx; }
          else { w = Math.round(w * maxPx / h); h = maxPx; }
        }
        try {
          var canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch(ex) { resolve(reader.result); }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ── Cerrar sesión ── */

function doSignOut() {
  if (!window.confirm('¿Cerrar sesión? Tu perfil sigue guardado y podés recuperarlo con tu número.')) return;
  // Borrar TODO el localStorage para volver a Tier 1 limpio
  var keys = ['flare_identity','flare_device_id','flare_uid','flare_first_published',
              'flare_onboarding_complete','flare_mine','flare_liked','flare_mapmode'];
  keys.forEach(function(k) { localStorage.removeItem(k); });
  IDENTITY = null;
  likedIds = [];
  // Limpiar pin.liked en memoria para que el UI refleje Tier 1 antes del reload
  if (typeof pins !== 'undefined') {
    Object.values(pins).forEach(function(pin) { pin.liked = false; });
  }
  notif('Sesión cerrada. Ingresá con tu número para volver.', 'err');
  // Recargar para generar nuevo device_id y estado limpio
  setTimeout(function() { window.location.reload(); }, 1500);
}

/* ── DEV: resetear tier para pruebas ── */

function devResetTier(targetTier) {
  var secret = (document.getElementById('dev-reset-secret') || {}).value || '';
  var errEl = document.getElementById('dev-reset-err');
  if (!secret) { errEl.textContent = 'Ingresa la contraseña admin.'; errEl.style.display = 'block'; return; }

  if (targetTier === 1) {
    var confirmed = window.confirm('¿Borrar perfil local y volver a Tier 1 (visitante)?');
    if (!confirmed) return;
    localStorage.removeItem('flare_identity');
    localStorage.removeItem('flare_first_published');
    localStorage.removeItem('flare_onboarding_complete');
    IDENTITY = null;
    notif('🧪 DEV: perfil borrado → Tier 1', 'err');
    renderProfile();
    return;
  }

  if (targetTier === 2) {
    if (!IDENTITY) { errEl.textContent = 'No hay perfil local.'; errEl.style.display = 'block'; return; }
    IDENTITY.tier = 2;
    IDENTITY.phone = null;
    saveIdentity(IDENTITY);
    notif('🧪 DEV: perfil → Tier 2 (sin validar)', 'err');
    renderProfile();
  }
}

/* ── Recuperar cuenta con número de teléfono ── */

function showRecoverPhone() {
  var box = document.getElementById('profile-content');
  if (!box) return;
  box.innerHTML =
    '<div class="profile-verify-header">' +
      '<button class="profile-verify-back" onclick="renderProfile()">← Volver</button>' +
      '<div class="profile-verify-title">Ingresar con tu número</div>' +
    '</div>' +
    '<div class="profile-verify-body">' +
      '<div class="profile-verify-desc">Ingresa el número con el que verificaste tu cuenta. Te enviaremos un código por SMS.</div>' +
      '<div class="profile-verify-field">' +
        '<span class="profile-verify-prefix">🇲🇽 +52</span>' +
        '<input id="recover-phone-input" class="profile-verify-input" type="tel" inputmode="numeric" maxlength="10" placeholder="10 dígitos">' +
      '</div>' +
      '<div id="recover-phone-err" class="profile-verify-err" style="display:none"></div>' +
      '<div id="recaptcha-container-recover"></div>' +
      '<button class="profile-validate-btn" id="recover-send-btn" onclick="doRecoverSendCode()">Enviar código</button>' +
    '</div>';
  var input = document.getElementById('recover-phone-input');
  if (input) input.focus();
}

function doRecoverSendCode() {
  var input = document.getElementById('recover-phone-input');
  var errEl = document.getElementById('recover-phone-err');
  var btn   = document.getElementById('recover-send-btn');
  if (!input) return;
  var digits = input.value.replace(/\D/g, '');
  if (digits.length !== 10) { errEl.textContent = 'Ingresa exactamente 10 dígitos'; errEl.style.display = 'block'; return; }
  var phone = '+52' + digits;
  errEl.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Enviando...';
  Promise.resolve(window._fbReady || null)
    .then(function() {
      if (!window._fbAuth || !window._fbRecaptchaVerifier || !window._fbSignInWithPhone) throw new Error('firebase_not_loaded');
      if (window._fbRecoverVerifier) { try { window._fbRecoverVerifier.clear(); } catch(ex) {} window._fbRecoverVerifier = null; }
      window._fbRecoverVerifier = new window._fbRecaptchaVerifier(window._fbAuth, 'recaptcha-container-recover', { size: 'invisible' });
      return window._fbSignInWithPhone(window._fbAuth, phone, window._fbRecoverVerifier);
    })
    .then(function(confirmationResult) {
      _fbRecoverConfirmation = confirmationResult;
      showRecoverCode(phone);
    })
    .catch(function(e) {
      window._fbRecoverVerifier = null;
      var msg = 'Error al enviar SMS. (' + (e.code || e.message || 'desconocido') + ')';
      if (e.message === 'firebase_not_loaded') msg = 'Firebase no cargó. Recarga la página.';
      if (e.code === 'auth/invalid-phone-number') msg = 'Número inválido.';
      if (e.code === 'auth/too-many-requests') msg = 'Demasiados intentos. Espera unos minutos.';
      errEl.textContent = msg; errEl.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Enviar código';
    });
}

var _fbRecoverConfirmation = null;

function showRecoverCode(phone) {
  var box = document.getElementById('profile-content');
  if (!box) return;
  var hint = phone.slice(0, 4) + '****' + phone.slice(-2);
  box.innerHTML =
    '<div class="profile-verify-header">' +
      '<button class="profile-verify-back" onclick="showRecoverPhone()">← Cambiar número</button>' +
      '<div class="profile-verify-title">Ingresa el código</div>' +
    '</div>' +
    '<div class="profile-verify-body">' +
      '<div class="profile-verify-desc">Enviamos un SMS a <strong>' + esc(hint) + '</strong>. Ingresa el código de 6 dígitos.</div>' +
      '<input id="recover-code-input" class="profile-verify-code-input" type="tel" inputmode="numeric" maxlength="6" placeholder="000000">' +
      '<div id="recover-code-err" class="profile-verify-err" style="display:none"></div>' +
      '<button class="profile-validate-btn" id="recover-confirm-btn" onclick="doRecoverConfirm()">Ingresar</button>' +
      '<button class="profile-verify-resend" onclick="showRecoverPhone()">Reenviar código</button>' +
    '</div>';
  var input = document.getElementById('recover-code-input');
  if (input) { input.focus(); }
}

function doRecoverConfirm() {
  var codeEl = document.getElementById('recover-code-input');
  var errEl  = document.getElementById('recover-code-err');
  var btn    = document.getElementById('recover-confirm-btn');
  if (!codeEl) return;
  var code = codeEl.value.trim();
  if (code.length !== 6) { errEl.textContent = 'El código debe tener 6 dígitos'; errEl.style.display = 'block'; return; }
  if (!_fbRecoverConfirmation) { errEl.textContent = 'Sesión expirada. Vuelve a enviar el código.'; errEl.style.display = 'block'; return; }
  errEl.style.display = 'none';
  btn.disabled = true; btn.textContent = 'Ingresando...';
  _fbRecoverConfirmation.confirm(code)
    .then(function(result) { return result.user.getIdToken(); })
    .then(function(idToken) {
      var deviceId = getDeviceFingerprint();
      return apiFetch('/api/verify/firebase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken, is_recovery: true }),
      });
    })
    .then(function(res) {
      if (res.error) { errEl.textContent = res.error; errEl.style.display = 'block'; btn.disabled = false; btn.textContent = 'Ingresar'; return; }
      if (res.user) {
        console.log('[recover] res.user recibido:', JSON.stringify(res.user));
        IDENTITY = {
          uid:        res.user.id,
          username:   res.user.username,
          phone:      res.user.phone,
          tier:       3,
          flares_hoy: 0,
          fecha_hoy:  new Date().toDateString(),
          avatar_url: res.user.avatar_url || (IDENTITY && IDENTITY.avatar_url) || null,
        };
        ensureIdentityAvatar(IDENTITY);
        // Calcular flares_hoy desde flares vigentes de hoy
        apiFetch('/api/flares?owner_uid=' + encodeURIComponent(res.user.id))
          .then(function(flares) {
            var hoy = new Date().toDateString();
            var hoyCount = (flares || []).filter(function(f) {
              return new Date(f.created_at).toDateString() === hoy;
            }).length;
            IDENTITY.flares_hoy = hoyCount;
            IDENTITY.fecha_hoy = hoy;
            saveIdentity(IDENTITY);
          }).catch(function() { saveIdentity(IDENTITY); });
        // Cargar likes del usuario
        apiFetch('/api/likes?uid=' + encodeURIComponent(res.user.id))
          .then(function(data) {
            if (data && data.liked) {
              localStorage.setItem('flare_liked', JSON.stringify(data.liked));
            }
          }).catch(function() {});
        if (res.user.onboarding_complete) {
          localStorage.setItem('flare_onboarding_complete', '1');
          localStorage.setItem('flare_first_published', '1');
        }
      }
      _fbRecoverConfirmation = null;
      var box = document.getElementById('profile-content');
      if (box) box.innerHTML =
        '<div class="profile-verify-success">' +
          '<div class="profile-verify-success-icon">✅</div>' +
          '<div class="profile-verify-success-title">¡Bienvenido de vuelta!</div>' +
          '<div class="profile-verify-success-desc">Tu perfil <strong>@' + esc(IDENTITY.username) + '</strong> fue recuperado en este dispositivo.</div>' +
          '<button class="profile-validate-btn" onclick="renderProfile()">Ver mi perfil</button>' +
        '</div>';
    })
    .catch(function(e) {
      console.error('recover confirm error:', e.code, e.message);
      var msg = 'Error (' + (e.code || e.message || 'desconocido') + '). Intenta de nuevo.';
      if (e.code === 'auth/code-expired') msg = 'El código expiró. Solicita uno nuevo.';
      if (e.code === 'auth/invalid-verification-code') msg = 'Código incorrecto. Verifica los 6 dígitos.';
      if (e.code === 'auth/session-expired') msg = 'Sesión expirada. Vuelve a enviar el código.';
      errEl.textContent = msg; errEl.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Ingresar';
    });
}

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
      // Siempre recrear el verifier — el div puede haberse recreado
      if (window._fbAppVerifier) {
        try { window._fbAppVerifier.clear(); } catch(ex) {}
        window._fbAppVerifier = null;
      }
      window._fbAppVerifier = new window._fbRecaptchaVerifier(window._fbAuth, 'recaptcha-container', { size: 'invisible' });
      return window._fbSignInWithPhone(window._fbAuth, phone, window._fbAppVerifier);
    })
    .then(function(confirmationResult) {
      _fbConfirmationResult = confirmationResult;
      showVerifyCode(phone);
    })
    .catch(function(e) {
      console.error('firebase phone error:', e);
      window._fbAppVerifier = null;
      var msg = 'Error al enviar SMS. Intenta de nuevo. (' + (e.code || e.message || 'desconocido') + ')';
      if (e.message === 'firebase_not_loaded') msg = 'Firebase no cargó. Recarga la página e intenta de nuevo.';
      if (e.code === 'auth/invalid-phone-number') msg = 'Número de teléfono inválido.';
      if (e.code === 'auth/too-many-requests')    msg = 'Demasiados intentos. Espera unos minutos.';
      if (e.code === 'auth/captcha-check-failed' || e.code === 'auth/internal-error') msg = 'Error de verificación reCAPTCHA (' + e.code + '). Recarga la página.';
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
      '<button class="profile-validate-btn" id="verify-confirm-btn" onclick="doConfirmCode()">Verificar</button>' +
      '<button class="profile-verify-resend" onclick="showVerifyPhone()">Reenviar código</button>' +
    '</div>';

  var input = document.getElementById('verify-code-input');
  if (input) {
    input.focus();
  }
}

function doConfirmCode() {
  var codeEl = document.getElementById('verify-code-input');
  var errEl  = document.getElementById('verify-code-err');
  var btn    = document.getElementById('verify-confirm-btn');
  if (!codeEl) return;

  var code = codeEl.value.trim();

  if (code.length !== 6) {
    errEl.textContent = 'El código debe tener 6 dígitos';
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
      var payload = { id_token: idToken };
      if (IDENTITY && IDENTITY.uid) payload.users_id = IDENTITY.uid;
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
        var prevAvatar = IDENTITY && IDENTITY.avatar_url;
        IDENTITY = {
          uid:        res.user.id,
          username:   res.user.username,
          device_id:  res.user.device_id,
          phone:      res.user.phone,
          tier:       3,
          floins:     IDENTITY ? (IDENTITY.floins || 0) : 0,
          flares_hoy: IDENTITY ? (IDENTITY.flares_hoy || 0) : 0,
          fecha_hoy:  IDENTITY ? (IDENTITY.fecha_hoy || new Date().toDateString()) : new Date().toDateString(),
          racha_dias: IDENTITY ? (IDENTITY.racha_dias || 0) : 0,
          avatar_url: res.user.avatar_url || prevAvatar || null,
          created_at: res.user.created_at,
        };
        ensureIdentityAvatar(IDENTITY);
        saveIdentity(IDENTITY);
        // Migrar avatar de Tier 2 a R2 si es URL local y no tiene ya uno en R2
        if (!res.user.avatar_url && IDENTITY.avatar_url) {
          migrateAvatarToR2(IDENTITY.avatar_url);
        }
        // Toast de bono de registro
        if (res.floins_bonus > 0) {
          IDENTITY.floins = (IDENTITY.floins || 0) + res.floins_bonus;
          saveIdentity(IDENTITY);
          setTimeout(function(){ if(typeof showFloinsToast === 'function') showFloinsToast(res.floins_bonus, 'register_phone'); }, 1000);
        }
      }
      _fbConfirmationResult = null;
      showVerifySuccess();
    })
    .catch(function(e) {
      console.error('confirm error:', e.code, e.message);
      var msg = 'Error (' + (e.code || e.message || 'desconocido') + '). Intenta de nuevo.';
      if (e.code === 'auth/code-expired') msg = 'El código expiró. Solicita uno nuevo.';
      if (e.code === 'auth/invalid-verification-code') msg = 'Código incorrecto. Verifica los 6 dígitos.';
      if (e.code === 'auth/session-expired') msg = 'Sesión expirada. Vuelve a enviar el código.';
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
