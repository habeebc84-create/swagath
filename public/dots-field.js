(function () {
  'use strict';
  var dotsField = document.getElementById('dotsField');
  var dotsCursor = document.getElementById('dotsCursor');
  if (!dotsField) return;

  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var gap = 28;
  var cols = Math.ceil(window.innerWidth / gap) + 2;
  var rows = Math.ceil(window.innerHeight / gap) + 2;
  var dotCount = cols * rows;
  var dotEls = new Array(dotCount);
  var dotX = new Float64Array(dotCount);
  var dotY = new Float64Array(dotCount);
  var dotHomeX = new Float64Array(dotCount);
  var dotHomeY = new Float64Array(dotCount);
  var dotActive = new Uint8Array(dotCount);

  var frag = document.createDocumentFragment();
  for (var i = 0; i < dotCount; i++) {
    var dot = document.createElement('span');
    dot.className = 'dot';
    dotsField.appendChild(dot);
    dotEls[i] = dot;
  }
  dotsField.appendChild(dotsCursor);

  function placeDots() {
    cols = Math.ceil(window.innerWidth / gap) + 2;
    rows = Math.ceil(window.innerHeight / gap) + 2;
    dotCount = cols * rows;
    dotEls.length = 0;
    dotX = new Float64Array(dotCount);
    dotY = new Float64Array(dotCount);
    dotHomeX = new Float64Array(dotCount);
    dotHomeY = new Float64Array(dotCount);
    dotActive = new Uint8Array(dotCount);

    dotsField.textContent = '';
    for (var i = 0; i < dotCount; i++) {
      var dot = document.createElement('span');
      dot.className = 'dot';
      dotsField.appendChild(dot);
      dotEls[i] = dot;
    }
    dotsField.appendChild(dotsCursor);

    var start = performance.now();
    var last = start;
    var frame = function () {
      last = performance.now();
      layoutDots(start, last);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  function layoutDots(start, now) {
    var elapsed = now - start;
    var period = 720;
    var t = (elapsed % period) / period;
    for (var i = 0; i < dotCount; i++) {
      var scaled = i * 0.7;
      var homeX = (scaled % cols) * gap - gap;
      var homeY = (Math.floor(scaled / cols) * gap) - gap;
      dotHomeX[i] = homeX;
      dotHomeY[i] = homeY;
      var driftX = Math.sin((elapsed * 0.00018) + (i * 0.11)) * 3.2;
      var driftY = Math.cos((elapsed * 0.00021) + (i * 0.13)) * 3.2;
      dotX[i] = homeX + driftX;
      dotY[i] = homeY + driftY;
      dotEls[i].style.left = dotX[i] + 'px';
      dotEls[i].style.top = dotY[i] + 'px';
    }
    var cx = cursorX;
    var cy = cursorY;
    if (cx == null) {
      for (var j = 0; j < dotCount; j++) {
        dotActive[j] = 0;
        dotEls[j].classList.remove('active');
      }
      return;
    }
    var radius = 170;
    for (var k = 0; k < dotCount; k++) {
      var dx = dotX[k] - cx;
      var dy = dotY[k] - cy;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var active = dist < radius ? 1 : 0;
      dotActive[k] = active;
      var strength = active ? Math.max(0, 1 - dist / radius) : 0;
      var scale = 1 + strength * 2.6;
      var innerGlow = strength * 14;
      var outerGlow = strength * 30;
      var alpha = 0.32 + strength * 0.7;
      dotEls[k].style.transform = 'translate3d(' + (dx * 0.33) + 'px,' + (dy * 0.33) + 'px,0) scale(' + scale + ')';
      dotEls[k].style.opacity = String(alpha);
      dotEls[k].style.background = 'rgba(255,246,218,' + alpha + ')';
      dotEls[k].style.boxShadow = '0 0 ' + String(innerGlow).slice(0, 4) + 'px rgba(245,208,106,' + (0.35 + strength * 0.6) + '),' + '0 0 ' + String(outerGlow).slice(0, 4) + 'px rgba(224,177,42,' + (0.12 + strength * 0.4) + ')';
    }
  }

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
    if (dotsCursor) {
      dotsCursor.style.transform = 'translate3d(' + (cursorX - 5) + 'px,' + (cursorY - 5) + 'px,0)';
    }
  }

  function onLeave() {
    cursorX = null;
    cursorY = null;
    if (dotsCursor) {
      dotsCursor.style.transform = 'translate3d(-100px,-100px,0)';
    }
  }

  window.addEventListener('mousemove', onMove, { passive: true });
  window.addEventListener('touchmove', onMove, { passive: true });
  window.addEventListener('touchstart', onMove, { passive: true });
  window.addEventListener('mouseleave', onLeave, { passive: true });
  window.addEventListener('touchend', onLeave, { passive: true });

  if (reduceMotion) {
    cursorX = 0;
    cursorY = 0;
  }

  var ro = null;
  if (window.ResizeObserver) {
    ro = new ResizeObserver(function () { placeDots(); });
    ro.observe(dotsField);
  }

  placeDots();

  window.addEventListener('resize', function () { placeDots(); }, { passive: true });
})();
