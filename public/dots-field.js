/* Small dot-field lighting — one canvas, no per-dot DOM nodes.
   The previous version created one <span> per dot (~3,800 on desktop) and
   rewrote every dot's transform / opacity / background / box-shadow on
   every frame, while a CSS `dotGlow` animation fought the JS transform.
   This version draws the same faint dot grid on a single canvas, brightens
   only the dots near the cursor, and stops animating when the tab is
   hidden, the cursor has left, or the user prefers reduced motion.
   Touch / coarse-pointer devices get one static frame: a finger covers
   the glow anyway, and a rAF loop there only cost battery. */
(function () {
  'use strict';

  var field = document.getElementById('dotsField');
  if (!field) return;

  var motionQuery = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;
  var finePointer = window.matchMedia
    ? window.matchMedia('(hover: hover) and (pointer: fine)').matches
    : true;

  var GAP = 28;
  var RADIUS = 280;
  var RADIUS_SQ = RADIUS * RADIUS;

  var canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  field.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var width = 0;
  var height = 0;
  var homes = null; // Float64Array [x0, y0, x1, y1, ...]
  var count = 0;

  var cursorX = 0;
  var cursorY = 0;
  var cursorPresent = false;
  var lastMove = 0;
  var glowUntil = 0;
  var raf = 0;
  var lastDraw = 0;
  var reduced = !!(motionQuery && motionQuery.matches);

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var cols = Math.ceil(width / GAP);
    var rows = Math.ceil(height / GAP);
    count = cols * rows;
    homes = new Float64Array(count * 2);
    var i = 0;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        homes[i++] = (c + 0.5) * GAP;
        homes[i++] = (r + 0.5) * GAP;
      }
    }
  }

  /* One frame. `now` drives the gentle drift; with no cursor the glow
     strength fades out over the 500ms after the cursor leaves. */
  function draw(now) {
    ctx.clearRect(0, 0, width, height);
    if (!homes) return;

    /* cursorX/Y keep the last known position so the glow can fade out
       from where the cursor left, instead of jumping to a corner. */
    var hasCursor = cursorPresent;
    var fade = 1;
    if (!hasCursor) {
      fade = glowUntil ? Math.max(0, (glowUntil - now) / 500) : 0;
    }
    var t = now * 0.00016;

    /* Pass 1: every dot, one fill style, one batched path. */
    ctx.beginPath();
    for (var i = 0; i < count; i++) {
      var x = homes[i * 2];
      var y = homes[i * 2 + 1];
      var dx = Math.sin(t + x * 0.013 + y * 0.017) * 2;
      var dy = Math.cos(t * 1.2 + x * 0.011 + y * 0.019) * 2;
      ctx.moveTo(x + dx + 1, y + dy);
      ctx.arc(x + dx, y + dy, 1, 0, Math.PI * 2);
    }
    ctx.fillStyle = 'rgba(245, 233, 210, 0.12)';
    ctx.fill();

    if (!hasCursor && fade <= 0) return;

    /* Pass 2: only dots inside the glow radius get the warm light. */
    for (var j = 0; j < count; j++) {
      var hx = homes[j * 2];
      var hy = homes[j * 2 + 1];
      var ox = Math.sin(t + hx * 0.013 + hy * 0.017) * 2;
      var oy = Math.cos(t * 1.2 + hx * 0.011 + hy * 0.019) * 2;
      var px = hx + ox;
      var py = hy + oy;
      var ddx = px - cursorX;
      var ddy = py - cursorY;
      var distSq = ddx * ddx + ddy * ddy;
      if (distSq >= RADIUS_SQ) continue;
      var strength = (1 - Math.sqrt(distSq) / RADIUS) * fade;
      if (strength <= 0) continue;

      ctx.beginPath();
      ctx.arc(px, py, 3 + strength * 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(245, 208, 106, ' + (strength * 0.12).toFixed(3) + ')';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(px, py, 1 + strength * 1.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 244, 200, ' + (0.12 + strength * 0.88).toFixed(3) + ')';
      ctx.fill();
    }
  }

  function frame(now) {
    raf = 0;
    if (reduced || document.hidden) return;
    /* When the cursor is still, the drift alone needs only ~30fps. */
    if (now - lastDraw < 33 && now - lastMove > 150) {
      raf = requestAnimationFrame(frame);
      return;
    }
    lastDraw = now;
    draw(now);
    if (!cursorPresent && glowUntil && now >= glowUntil) {
      glowUntil = 0;
      draw(now);
      return; /* idle: loop stops until the next mousemove */
    }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (raf || reduced || document.hidden) return;
    lastDraw = 0;
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  function drawStatic() {
    stop();
    cursorPresent = false;
    glowUntil = 0;
    draw(performance.now());
  }

  function applyPreference() {
    reduced = !!(motionQuery && motionQuery.matches);
    if (reduced) {
      stop();
      field.style.display = 'none';
    } else {
      field.style.display = '';
      if (finePointer) start();
      else drawStatic();
    }
  }

  resize();

  if (reduced) {
    field.style.display = 'none';
  } else if (!finePointer) {
    drawStatic();
  } else {
    draw(performance.now());
    window.addEventListener('mousemove', function (e) {
      cursorX = e.clientX;
      cursorY = e.clientY;
      cursorPresent = true;
      lastMove = performance.now();
      glowUntil = 0;
      start();
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', function () {
      cursorPresent = false;
      glowUntil = performance.now() + 500;
      start();
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
      else if (cursorPresent) start();
      else drawStatic();
    });
  }

  if (motionQuery && typeof motionQuery.addEventListener === 'function') {
    motionQuery.addEventListener('change', applyPreference);
  }

  var resizeTimer = 0;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resize();
      if (reduced) return;
      if (!finePointer || (!cursorPresent && !raf)) drawStatic();
    }, 150);
  }, { passive: true });
})();
