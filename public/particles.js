/* Same particle system as admin dashboard.
   Respects prefers-reduced-motion and pauses when the tab is hidden. */
(function () {
  var canvas = document.getElementById('particles');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (motionQuery.matches) {
    canvas.style.display = 'none';
    return;
  }

  canvas.style.display = 'block';
  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.zIndex = '0';
  canvas.style.pointerEvents = 'none';
  canvas.style.opacity = '0.65';

  var parts = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (var i = 0; i < 40; i++) {
    parts.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 2 + 0.4,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      a: Math.random() * 0.45 + 0.15
    });
  }

  var raf = 0;
  var running = false;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    parts.forEach(function (p) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(245,208,106,' + p.a + ')';
      ctx.fill();
    });
    raf = requestAnimationFrame(draw);
  }

  function start() {
    if (running || document.hidden || motionQuery.matches) return;
    running = true;
    raf = requestAnimationFrame(draw);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else start();
  });

  if (typeof motionQuery.addEventListener === 'function') {
    motionQuery.addEventListener('change', function (e) {
      if (e.matches) {
        stop();
        canvas.style.display = 'none';
      } else {
        canvas.style.display = 'block';
        start();
      }
    });
  }

  start();
})();
