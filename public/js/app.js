/* app.js — entry point. All logic is in the modules loaded before this file. */

/* ── ANALYTICS ── */
function trackEvent(event_type, flare_id) {
  try {
    var device_id = localStorage.getItem('flare_device_id') || null;
    fetch('/api/track-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: event_type, device_id: device_id, flare_id: flare_id || null }),
    }).catch(function(){});
  } catch(e) {}
}

// map_open — al cargar la app
trackEvent('map_open');

// pwa_launched_standalone — si se abrió desde pantalla de inicio
if (window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches) {
  trackEvent('pwa_launched_standalone');
}

// pwa_installed — cuando el usuario acepta instalar
window.addEventListener('appinstalled', function() {
  trackEvent('pwa_installed');
});
