/* ── profile.js — panel de perfil de usuario ── */

var profileOpen = false;

function openProfile() {
  profileOpen = true;
  renderProfile();
}

function closeProfile() {
  profileOpen = false;
}

function renderProfile() {
  var box = document.getElementById('profile-content');
  if (!box) return;

  var tier = getTier();

  if (tier === 1) {
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
      '</div>';
    return;
  }

  var identity = IDENTITY || {};
  var hoy = new Date().toDateString();
  var flaresHoy = (identity.fecha_hoy === hoy) ? (identity.flares_hoy || 0) : 0;
  var flaresRestantes = Math.max(0, 3 - flaresHoy);

  box.innerHTML =
    '<div class="profile-tier-badge tier2">' +
      '<span class="tier-icon">🤝</span>' +
      '<span class="tier-label">Anónimo</span>' +
    '</div>' +
    '<div class="profile-username">' +
      '<div class="profile-username-label">Tu nombre</div>' +
      '<div class="profile-username-value">@' + esc(identity.username || '?') + '</div>' +
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
      '<button class="profile-validate-btn" onclick="notif(\'Próximamente — registro por teléfono 📱\')">Validar con mi número</button>' +
    '</div>' +
    '<div class="profile-divider"></div>' +
    '<div class="profile-section-title">📍 Mis Flares</div>' +
    '<div id="mine-list-profile"></div>';

  renderMyFlaresInProfile();
}

function renderMyFlaresInProfile() {
  var box = document.getElementById('mine-list-profile');
  if (!box) return;

  // Cargar desde API usando owner_uid
  var ownerUid = (IDENTITY && IDENTITY.device_id) ? IDENTITY.device_id : MY_ID;
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
        var r = Math.max(0, new Date(pin.expires_at).getTime() - Date.now());
        var cat = CATS.find(function(c){ return c.id === pin.cat; }) || CATS[0];
        var bc = r < 10*60*1000 ? 'var(--danger)' : r < 30*60*1000 ? 'var(--amber)' : 'var(--neon)';
        html +=
          '<div class="prow">' +
            '<div class="prow-hdr">' +
              '<div class="prow-ico" style="background:' + cat.color + '18;border-color:' + cat.color + '55">' + pin.emoji + '</div>' +
              '<div class="prow-body">' +
                (pin.bizName ? '<div class="prow-biz">🏪 ' + esc(pin.bizName) + '</div>' : '') +
                '<div class="prow-name">' + esc(pin.title) + '</div>' +
                '<div class="prow-tags">' +
                  '<span class="ptime" style="color:' + bc + '">⏱ ' + fmtT(r) + '</span>' +
                  '<span class="plikes">❤️ ' + pin.likes + '</span>' +
                '</div>' +
              '</div>' +
              '<button class="pd-report" onclick="deleteMyFlare(\'' + pin.id + '\')" title="Eliminar">🗑️</button>' +
            '</div>' +
          '</div>';
      });
      box.innerHTML = html;
    })
    .catch(function() {
      box.innerHTML = '<div class="pempty">Error al cargar. Intenta de nuevo.</div>';
    });
}

/* openProfile() y closeProfile() son llamadas desde panel.js vía psetting-profile */
