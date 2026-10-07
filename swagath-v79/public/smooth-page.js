/* Smooth scroll for anchors only — DO NOT hijack wheel/trackpad */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* CSS handles native trackpad / mouse wheel — never preventDefault on wheel */
  try {
    document.documentElement.style.scrollBehavior = 'smooth';
    document.body.style.scrollBehavior = 'smooth';
  } catch (e) {}
})();