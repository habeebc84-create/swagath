(function () {
  'use strict';
  var dotsField = document.getElementById('dotsField');
  var dotsCursor = document.getElementById('dotsCursor');
  if (!dotsField) return;

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
    var p = e.touches ? e.touches[0] : e;
    if (p == null) return;
    if (e.type === 'touchmove' || e.type === 'touchstart') {
      p = e.touches[0];
    }
    if (p == null) return;
    cursorX = p.clientX;
    cursorY = p.clientY;
    if (dotsCursor && dotsCursor.style) {
      dotsCursor.style.transform = 'translate3d(' + (cursorX - 6) + 'px,' + (cursorY - 6) + 'px,0)';
    }
  }

  function onLeave() {
    cursorX = null;
    cursorY = null;
    if (dotsCursor && dotsCursor.style) {
      dotsCursor.style.transform = 'translate3d(-100px,-100px,0)';
    }
  }

  window.addEventListener('mousemove', onMove, { passive: true });
  window.addEventListener('touchmove', onMove, { passive: true });
  window.addEventListener('touchstart', onMove, { passive: true });
  window.addEventListener('mouseleave', onLeave, { passive: true });
  window.addEventListener('touchend', onLeave, { passive: true });

  var animStart = performance.now();
  var ticking = false;
  var schedule = function (now) {
    animStart = now;
    ticking = false;
    layoutDots(now);
  };
  var loop = function (now) {
    if (!ticking) {
      ticking = true;
      schedule(now);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  function layoutDots(now) {
    var elapsed = now - animStart;
    var period = 760;
    var t = (elapsed % period) / period;
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
      dotEls[i].style.left = '0px';
      dotEls[i].style.top = '0px';
    }

    if (cursorX == null || cursorY == null) {
      for (var j = 0; j < dotCount; j++) {
        dotActive[j] = 0;
        dotEls[j].classList.remove('active');
        dotVelX[j] *= 0.86;
        dotVelY[j] *= 0.86;
        dotX[j] += dotVelX[j];
        dotY[j] += dotVelY[j];
        var reboundX = (dotHomeX[j] - dotX[j]) * 0.05;
        var reboundY = (dotHomeY[j] - dotY[j]) * 0.05;
        dotVelX[j] += reboundX;
        dotVelY[j] += reboundY;
        dotX[j] += reboundX;
        dotY[j] += reboundY;
        dotEls[j].style.transform = 'translate3d(' + dotX[j] + 'px,' + dotY[j] + 'px,0)';
        dotEls[j].style.opacity = '';
        dotEls[j].style.background = '';
        dotEls[j].style.boxShadow = '';
      }
      return;
    }

    var cursorGlowRadius = 90;
    var cursorGlowX = cursorX;
    var cursorGlowY = cursorY;
    for (var k = 0; k < dotCount; k++) {
      var dx = dotX[k] - cursorGlowX;
      var dy = dotY[k] - cursorGlowY;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var active = dist < cursorGlowRadius ? 1 : 0;
      dotActive[k] = active;
      var strength = active ? Math.max(0, 1 - dist / cursorGlowRadius) : 0;
      var scale = 1 + strength * 2.2;
      var innerGlow = strength * 8;
      var outerGlow = strength * 18;
      var alpha = 0.3 + strength * 0.6;
      var glow1 = (0.45 + strength * 0.55).toFixed(2);
      var glow2 = (0.2 + strength * 0.4).toFixed(2);

      if (active) {
        var pull = strength * 0.18;
        dotVelX[k] += (dx / (dist || 1)) * pull;
        dotVelY[k] += (dy / (dist || 1)) * pull;
      } else {
        dotVelX[k] *= 0.94;
        dotVelY[k] *= 0.94;
      }
      dotX[k] += dotVelX[k];
      dotY[k] += dotVelY[k];

      dotEls[k].style.transform = 'translate3d(' + dotX[k] + 'px,' + dotY[k] + 'px,0) scale(' + scale + ')';
      dotEls[k].style.opacity = String(alpha);
      dotEls[k].classList.toggle('active', active);
      if (active) {
        dotEls[k].style.background = 'rgba(255,244,200,' + alpha + ')';
        dotEls[k].style.boxShadow = '0 0 ' + String(innerGlow).slice(0, 4) + 'px rgba(245,208,106,' + glow1 + '),' + '0 0 ' + String(outerGlow).slice(0, 4) + 'px rgba(224,177,42,' + glow2 + ')';
      } else {
        dotEls[k].style.background = '';
        dotEls[k].style.boxShadow = '';
      }
    }
  }

  if (reduceMotion) {
    dotsField.style.display = 'none';
  }

  var ro = null;
  if (window.ResizeObserver) {
    ro = new ResizeObserver(function () { placeDots(); });
    ro.observe(dotsField);
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
})();
