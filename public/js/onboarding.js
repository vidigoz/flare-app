/* ── onboarding.js — tooltips no invasivos ── */

var obCurrentStep = 0;


function obStart(){
  obCurrentStep = 1;
  document.getElementById('ob-wrap').style.display = 'block';
  document.getElementById('ob-tip-fab').style.display = 'flex';
  document.getElementById('ob-tip-filters').style.display = 'block';
  document.getElementById('ob-skip-btn').style.display = 'block';
  var pbtn = document.getElementById('pbtn');
  if(pbtn) pbtn.classList.add('ob-active');
}

function obHideTips(){
  ['ob-tip-fab','ob-tip-filters'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.style.display = 'none';
  });
  document.getElementById('ob-skip-btn').style.display = 'none';
}

function obComplete(){
  localStorage.setItem('flare_onboarding_complete','1');
  obHideTips();
  var pbtn = document.getElementById('pbtn');
  if(pbtn) pbtn.classList.remove('ob-active');
  var wrap = document.getElementById('ob-wrap');
  /* Dejar visible sólo si hay celebración en curso, si no ocultar */
  if(document.getElementById('ob-celebrate').style.display === 'none'){
    wrap.style.display = 'none';
  }
}

function obSkip(){
  obComplete();
}

function obCelebrate(isFirstFlare){
  if(localStorage.getItem('flare_first_published')) return;
  localStorage.setItem('flare_first_published','1');
  obCurrentStep = 4;

  obHideTips();

  if(isFirstFlare && IDENTITY) {
    var titleEl = document.querySelector('#ob-celebrate .ob-title');
    var descEl  = document.querySelector('#ob-celebrate .ob-desc');
    if(titleEl) titleEl.innerHTML = '¡Bienvenido a <span>Flare</span>!';
    if(descEl)  descEl.innerHTML  =
      'Tu nombre asignado es <strong style="color:var(--neon)">' + esc(IDENTITY.username) + '</strong>.<br>' +
      'Valida tu perfil con tu número para escoger tu nombre y desbloquear más funciones.';
  }

  var wrap = document.getElementById('ob-wrap');
  wrap.style.display = 'block';
  var cel = document.getElementById('ob-celebrate');
  cel.style.display = 'flex';

  obLaunchConfetti();
}

function obCloseCelebrate() {
  document.getElementById('ob-celebrate').style.display = 'none';
  document.getElementById('ob-wrap').style.display = 'none';
  localStorage.setItem('flare_onboarding_complete','1');
}

function obLaunchConfetti(){
  var container = document.getElementById('ob-confetti');
  var colors = ['#00f5a0','#f500a0','#ffb300','#ff4060','#ffffff','#00c8ff'];
  for(var i=0; i<80; i++){
    (function(i){
      setTimeout(function(){
        var p = document.createElement('div');
        p.className = 'ob-particle';
        p.style.left = Math.random()*100+'vw';
        p.style.background = colors[Math.floor(Math.random()*colors.length)];
        p.style.width = (6+Math.random()*8)+'px';
        p.style.height = (6+Math.random()*8)+'px';
        p.style.borderRadius = Math.random()>.5 ? '50%' : '2px';
        p.style.animationDuration = (1.5+Math.random()*2)+'s';
        p.style.animationDelay = '0s';
        container.appendChild(p);
        setTimeout(function(){ p.remove(); }, 3500);
      }, i*30);
    })(i);
  }
}
