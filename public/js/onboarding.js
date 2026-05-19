/* ── onboarding.js — tooltips no invasivos ── */

var obCurrentStep = 0;


function obStart(){
  obCurrentStep = 1;
  document.getElementById('ob-wrap').style.display = 'block';
  document.getElementById('ob-tip-fab').style.display = 'flex';
  document.getElementById('ob-tip-filters').style.display = 'block';
  document.getElementById('ob-skip-btn').style.display = 'block';
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
  var wrap = document.getElementById('ob-wrap');
  /* Dejar visible sólo si hay celebración en curso, si no ocultar */
  if(document.getElementById('ob-celebrate').style.display === 'none'){
    wrap.style.display = 'none';
  }
}

function obSkip(){
  obComplete();
}

function obCelebrate(){
  if(localStorage.getItem('flare_first_published')) return;
  localStorage.setItem('flare_first_published','1');
  obCurrentStep = 4;

  obHideTips();

  var wrap = document.getElementById('ob-wrap');
  wrap.style.display = 'block';
  var cel = document.getElementById('ob-celebrate');
  cel.style.display = 'flex';

  obLaunchConfetti();

  setTimeout(function(){
    var fill = document.getElementById('ob-progress-fill');
    if(fill) fill.style.width = '100%';
  }, 100);

  setTimeout(function(){
    cel.style.display = 'none';
    wrap.style.display = 'none';
    localStorage.setItem('flare_onboarding_complete','1');
  }, 4200);
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
