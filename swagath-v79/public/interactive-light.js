/* Advanced lighting controller
   Key (fast) + Fill (slow lag) + intensity by velocity */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(hover: none)').matches) return;

  function ensure(id) {
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.setAttribute('aria-hidden', 'true');
      document.body.appendChild(el);
    }
    return el;
  }

  var key = ensure('interactiveLight');
  var fill = ensure('interactiveLightSoft');

  var kx = window.innerWidth / 2, ky = window.innerHeight / 2;
  var fx = kx, fy = ky;
  var tx = kx, ty = ky;
  var lastX = tx, lastY = ty;
  var speed = 0;
  var on = false;
  var raf = 0;

  function paint() {
    /* Key light — responsive */
    kx += (tx - kx) * 0.16;
    ky += (ty - ky) * 0.16;
    /* Fill — lagged bounce */
    fx += (tx - fx) * 0.05;
    fy += (ty - fy) * 0.05;

    key.style.transform = 'translate3d(' + kx + 'px,' + ky + 'px,0)';
    fill.style.transform = 'translate3d(' + fx + 'px,' + fy + 'px,0)';

    /* Intensity scales slightly with motion (living light) */
    var boost = Math.min(0.25, speed * 0.002);
    key.style.opacity = on ? String(0.85 + boost) : '0';
    fill.style.opacity = on ? String(0.7 + boost * 0.5) : '0';

    speed *= 0.92;
    raf = requestAnimationFrame(paint);
  }

  window.addEventListener('mousemove', function (e) {
    var dx = e.clientX - lastX;
    var dy = e.clientY - lastY;
    speed = Math.min(120, Math.sqrt(dx * dx + dy * dy));
    lastX = e.clientX;
    lastY = e.clientY;
    tx = e.clientX;
    ty = e.clientY;

    if (!on) {
      on = true;
      key.classList.add('is-on');
      fill.classList.add('is-on');
      kx = fx = tx;
      ky = fy = ty;
      if (!raf) paint();
    }
  }, { passive: true });

  document.documentElement.addEventListener('mouseleave', function () {
    on = false;
    key.classList.remove('is-on');
    fill.classList.remove('is-on');
  });

  var sel = '.feature-card,.special-card,.cater-card,.review-card,.contact-card,.menu-shell,.booking-card';
  document.addEventListener('mousemove', function (e) {
    var el = e.target.closest(sel);
    if (!el) return;
    var r = el.getBoundingClientRect();
    el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    el.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });
})();