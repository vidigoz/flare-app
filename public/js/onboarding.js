/* ── onboarding.js — full onboarding tutorial ── */

var obCurrentStep = 0;

function obStart(){
  obCurrentStep = 1;
  var wrap = document.getElementById('ob-wrap');
  wrap.style.display = 'block';
  setTimeout(function(){ wrap.classList.add('active'); }, 10);
  obShowStep(1);
}

function obShowStep(n){
  [1,2,3,4].forEach(function(i){
    var el = document.getElementById('ob-'+i);
    if(el) el.style.display = 'none';
  });
  var step = document.getElementById('ob-'+n);
  if(!step) return;
  step.style.display = 'flex';

  document.getElementById('fab-wrap').classList.remove('ob-spotlight');
  document.querySelectorAll('.mk').forEach(function(el){ el.classList.remove('ob-pins-pulse'); });

  if(n===2){
    setTimeout(function(){
      document.querySelectorAll('.mk-b').forEach(function(el){ el.style.animation='pulse-danger .8s ease-in-out infinite alternate'; });
    }, 300);
  }
  if(n===3){
    document.getElementById('ob-wrap').style.pointerEvents = 'none';
    document.getElementById('fab-wrap').classList.add('ob-spotlight');
    step.style.pointerEvents = 'none';
    step.style.background = 'transparent';
    step.style.backdropFilter = 'none';
    var card = step.querySelector('.ob-card');
    if(card) card.style.pointerEvents = 'all';
    var toast = step.querySelector('.ob-toast');
    if(toast){
      toast.style.pointerEvents = 'all';
      toast.style.position = 'relative';
      toast.style.zIndex = '9600';
      var skipBtn = toast.querySelector('.ob-btn-skip');
      if(skipBtn && !skipBtn._touchBound){
        skipBtn._touchBound = true;
        skipBtn.addEventListener('touchend', function(e){ e.preventDefault(); e.stopPropagation(); obSkip(); });
      }
    }
  } else {
    document.getElementById('ob-wrap').style.pointerEvents = 'all';
    var allSteps = document.querySelectorAll('.ob-step');
    allSteps.forEach(function(s){ s.style.background=''; s.style.backdropFilter=''; s.style.pointerEvents=''; });
  }
}

function obComplete(){
  localStorage.setItem('flare_onboarding_complete','1');
  var wrap = document.getElementById('ob-wrap');
  wrap.classList.remove('active');
  wrap.style.pointerEvents = 'none';
  document.getElementById('fab-wrap').classList.remove('ob-spotlight');
  document.querySelectorAll('.mk-b').forEach(function(el){ el.style.animation=''; });
  setTimeout(function(){ wrap.style.display='none'; }, 400);
}

function obSkip(){
  obComplete();
}

function obCelebrate(){
  if(localStorage.getItem('flare_first_published')) return;
  localStorage.setItem('flare_first_published','1');
  obCurrentStep = 4;

  document.getElementById('fab-wrap').classList.remove('ob-spotlight');
  document.querySelectorAll('.mk-b').forEach(function(el){ el.style.animation=''; });
  document.getElementById('ob-wrap').style.pointerEvents = 'all';

  obShowStep(4);
  obLaunchConfetti();

  setTimeout(function(){
    var fill = document.getElementById('ob-progress-fill');
    if(fill) fill.style.width = '100%';
  }, 100);

  setTimeout(function(){ obComplete(); }, 4200);
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

document.addEventListener('click', function(e){
  var next = e.target.closest('.ob-btn-next');
  if(next){
    var n = parseInt(next.dataset.next);
    obCurrentStep = n;
    obShowStep(n);
    return;
  }
  var skip = e.target.closest('.ob-btn-skip');
  if(skip){ obSkip(); return; }
});
