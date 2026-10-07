/* Hide loading screen when page is ready */
(function () {
  var loader = document.getElementById('pageLoader');
  if (!loader) return;

  var minTime = 700;
  var start = Date.now();
  var done = false;

  function hide() {
    if (done) return;
    done = true;
    var wait = Math.max(0, minTime - (Date.now() - start));
    setTimeout(function () {
      loader.classList.add('is-done');
      setTimeout(function () {
        if (loader.parentNode) loader.parentNode.removeChild(loader);
      }, 600);
    }, wait);
  }

  if (document.readyState === 'complete') {
    hide();
  } else {
    window.addEventListener('load', hide);
    /* safety: never stick forever */
    setTimeout(hide, 4000);
  }
})();