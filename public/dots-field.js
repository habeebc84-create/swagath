(function () {
  'use strict';
  var dotsField = document.getElementById('dotsField');
  var dotsCursor = document.getElementById('dotsCursor');
  if (!dotsField) return;
  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init, { passive: true });
  }
  return;

  function init() {
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var gap = 24;
  var cols = Math.ceil(window.innerWidth / gap) + 2;
  var rows = Math.ceil(window.innerHeight / gap) + 2;
  var dotCount = cols * rows;
  var dotEls = new Array(dotCount);
  var dotX = new Float64Array(dotCount);
  var dotY = new Float64Array(dotCount);
  var dotHomeX = new Float64Array(dotCount);
  var dotHomeY = new Float64Array(dotCount);
  var dotVelX = new Float64Array(dotCount);
  var dotVelY = new Float64Array(dotCount);
  var dotActive = new Uint8Array(dotCount);

  for (var i = 0; i < dotCount; i++) {
    var dot = document.createElement('span');
    dot.className = 'dot';
    dotsField.appendChild(dot);
    dotEls[i] = dot;
  }
  dotsField.appendChild(dotsCursor);

  var cursorX = null;
  var cursorY = null;

  function onMove(e) {
    var p = null;
    if (e.touches && e.touches[0]) {
      p = e.touches[0];
    } else if (e.clientX != null) {
      p = e;
    }
    if (p == null) return;
    cursorX = p.clientX;
    cursorY = p.clientY;
  }

  function onLeave() {
    cursorX = null;
    cursorY = null;
  }

  function onMouseEnter() {
    if (cursorX == null || cursorY == null) {
      cursorX = -1000;
      cursorY = -1000;
    }
  }

  window.addEventListener('mousemove', onMove, { passive: true });
  window.addEventListener('mouseenter', onMouseEnter, { passive: true });
  window.addEventListener('mouseleave', onLeave, { passive: true });
  window.addEventListener('touchmove', onMove, { passive: true });
  window.addEventListener('touchstart', function (e) {
    onMove(e);
  }, { passive: true });
  window.addEventListener('touchend', onLeave, { passive: true });
  window.addEventListener('touchcancel', onLeave, { passive: true });

  var animStart = performance.now();
  var raf = 0;
  var schedule = function (now) {
    animStart = now;
    raf = 0;
    layoutDots(now);
    if (document.readyState === 'complete' || document.hidden) { raf = 0; return; }
    raf = requestAnimationFrame(loop);
  };
  var loop = function (now) {
    schedule(now);
  };
  raf = requestAnimationFrame(loop);

  function layoutDots(now) {
    var elapsed = now - animStart;
    for (var i = 0; i < dotCount; i++) {
      var scaled = i * 0.71;
      var homeX = (scaled % cols) * gap - gap;
      var homeY = (Math.floor(scaled / cols) * gap) - gap;
      dotHomeX[i] = homeX;
      dotHomeY[i] = homeY;
      var driftX = Math.sin((elapsed * 0.00016) + (i * 0.11)) * 3.0;
      var driftY = Math.cos((elapsed * 0.00019) + (i * 0.13)) * 3.0;
      dotX[i] = homeX + driftX;
      dotY[i] = homeY + driftY;
      dotVelX[i] *= 0.92;
      dotVelY[i] *= 0.92;
      dotX[i] += dotVelX[i];
      dotY[i] += dotVelY[i];
      dotEls[i].style.transform = 'translate3d(' + dotX[i] + 'px,' + dotY[i] + 'px,0)';
    }

    if (cursorX == null || cursorY == null) {
      for (var j = 0; j < dotCount; j++) {
        dotActive[j] = 0;
        dotEls[j].classList.remove('active');
        dotVelX[j] *= 0.88;
        dotVelY[j] *= 0.88;
        dotX[j] += dotVelX[j];
        dotY[j] += dotVelY[j];
        var reboundX = (dotHomeX[j] - dotX[j]) * 0.06;
        var reboundY = (dotHomeY[j] - dotY[j]) * 0.06;
        dotVelX[j] += reboundX;
        dotVelY[j] += reboundY;
        dotX[j] += reboundX;
        dotY[j] += reboundY;
        dotEls[j].style.transform = 'translate3d(' + dotX[j] + 'px,' + dotY[j] + 'px,0)';
        dotEls[j].style.opacity = '0';
        dotEls[j].style.background = '';
        dotEls[j].style.boxShadow = '';
      }
      return;
    }

    var cursorGlowRadius = 200;
    var px = cursorX;
    var py = cursorY;
    var radiusSq = cursorGlowRadius * cursorGlowRadius;
    for (var k = 0; k < dotCount; k++) {
      var dx = dotX[k] - px;
      var dy = dotY[k] - py;
      var distSq = dx * dx + dy * dy;
      var active = distSq < radiusSq ? 1 : 0;
      dotActive[k] = active;
      var strength = active ? Math.max(0, 1 - Math.sqrt(distSq) / cursorGlowRadius) : 0;
      var scale = 1 + strength * 1.2;
      var innerGlow = strength * 9;
      var alpha = 0.42 + strength * 0.58;
      var glow1 = (0.5 + strength * 0.5).toFixed(2);

      if (active) {
        var pull = strength * 0.11;
        dotVelX[k] += (dx / (Math.sqrt(distSq) || 1)) * pull;
        dotVelY[k] += (dy / (Math.sqrt(distSq) || 1)) * pull;
      } else {
        dotVelX[k] *= 0.93;
        dotVelY[k] *= 0.93;
      }
      dotX[k] += dotVelX[k];
      dotY[k] += dotVelY[k];

      dotEls[k].style.transform = 'translate3d(' + dotX[k] + 'px,' + dotY[k] + 'px,0) scale(' + scale + ')';
      dotEls[k].style.opacity = alpha.toFixed(3);
      dotEls[k].classList.toggle('active', active);
      if (active) {
        dotEls[k].style.background = 'rgba(255,244,200,' + alpha.toFixed(3) + ')';
        dotEls[k].style.boxShadow = '0 0 ' + String(innerGlow).slice(0, 4) + 'px rgba(245,208,106,' + glow1 + ')';
      } else {
        dotEls[k].style.background = '';
        dotEls[k].style.boxShadow = '';
      }
    }
  }

  if (reduceMotion) {
    dotsField.style.display = 'none';
    return;
  }

  var ro = null;
  if (window.ResizeObserver) {
    try {
      ro = new ResizeObserver(function () { placeDots(); });
      ro.observe(dotsField);
    } catch (err) {
      ro = null;
    }
  }

  function placeDots() {
    cols = Math.ceil(window.innerWidth / gap) + 2;
    rows = Math.ceil(window.innerHeight / gap) + 2;
    dotCount = cols * rows;
    dotEls.length = 0;
    dotX = new Float64Array(dotCount);
    dotY = new Float64Array(dotCount);
    dotHomeX = new Float64Array(dotCount);
    dotHomeY = new Float64Array(dotCount);
    dotVelX = new Float64Array(dotCount);
    dotVelY = new Float64Array(dotCount);
    dotActive = new Uint8Array(dotCount);

    dotsField.textContent = '';
    for (var i = 0; i < dotCount; i++) {
      var dot = document.createElement('span');
      dot.className = 'dot';
      dotsField.appendChild(dot);
      dotEls[i] = dot;
    }
    dotsField.appendChild(dotsCursor);
  }

  window.addEventListener('resize', function () { placeDots(); }, { passive: true });

  window.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
    } else {
      animStart = performance.now();
      if (!raf) { raf = requestAnimationFrame(loop); }
    }
  }, { passive: true });
  }
})();
