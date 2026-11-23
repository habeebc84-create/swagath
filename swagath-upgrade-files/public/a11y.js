/* Accessibility helpers shared by every page.
   - Links each form label to its control (assigns id / for) so screen readers
     announce field names, including fields the booking script adds later.
   - Keeps the mobile menu button's aria-expanded / label in sync.
   - Keeps menu-category buttons' aria-pressed in sync with the active tab.
   - Gives the hero slideshow a pause / play button (WCAG 2.2.2) and stops it
     while the hero is off-screen. */
(function () {
  'use strict';
  var uid = 0;

  function linkLabels(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var labels = scope.querySelectorAll('label:not([for])');
    for (var i = 0; i < labels.length; i++) {
      var label = labels[i];
      if (label.querySelector('input,select,textarea')) continue; // already wraps its control
      var holder = label.parentElement;
      if (!holder) continue;
      var control = null;
      var sib = label.nextElementSibling;
      while (sib && !control) {
        if (/^(INPUT|SELECT|TEXTAREA)$/.test(sib.tagName)) control = sib;
        else if (sib.tagName === 'LABEL') break;
        else control = sib.querySelector && sib.querySelector('input:not([type=hidden]),select,textarea');
        sib = sib.nextElementSibling;
      }
      if (!control) control = holder.querySelector('input:not([type=hidden]),select,textarea');
      if (!control) continue;
      if (!control.id) {
        var base = (control.name || 'field').replace(/[^a-z0-9_-]/gi, '');
        var id = 'f-' + base + '-' + (++uid);
        while (document.getElementById(id)) id = 'f-' + base + '-' + (++uid);
        control.id = id;
      }
      label.setAttribute('for', control.id);
      if (control.required || /\*\s*$/.test(label.textContent)) control.setAttribute('aria-required', 'true');
    }
  }

  function syncMenuToggle() {
    var toggle = document.getElementById('menuToggle');
    var nav = document.getElementById('nav');
    if (!toggle || !nav) return;
    var update = function () {
      var open = nav.classList.contains('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    new MutationObserver(update).observe(nav, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        nav.classList.remove('open');
        toggle.focus();
      }
    });
    update();
  }

  function syncMenuTabs() {
    var tabs = document.querySelectorAll('.menu-tabs-group:not([aria-hidden="true"]) .tab');
    if (!tabs.length) return;
    var update = function () {
      for (var i = 0; i < tabs.length; i++) {
        tabs[i].setAttribute('aria-pressed', tabs[i].classList.contains('active') ? 'true' : 'false');
      }
    };
    for (var i = 0; i < tabs.length; i++) {
      new MutationObserver(update).observe(tabs[i], { attributes: true, attributeFilter: ['class'] });
    }
    update();
  }

  function heroPause() {
    var btn = document.getElementById('heroPause');
    var hero = document.getElementById('home');
    if (!btn || !hero || !window.SwagathHero) return; // no slideshow (e.g. reduced motion)
    btn.hidden = false;
    var userPaused = false;
    var render = function () {
      btn.setAttribute('aria-pressed', userPaused ? 'true' : 'false');
      btn.setAttribute('aria-label', userPaused ? 'Play background photos' : 'Pause background photos');
      btn.classList.toggle('is-paused', userPaused);
    };
    btn.addEventListener('click', function () {
      userPaused = !userPaused;
      if (userPaused) window.SwagathHero.pause(); else window.SwagathHero.resume();
      render();
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        if (userPaused) return;
        if (entries[0].isIntersecting) window.SwagathHero.resume(); else window.SwagathHero.pause();
      }).observe(hero);
    }
    render();
  }

  function skipLink() {
    var link = document.querySelector('.skip-link');
    var main = document.getElementById('main');
    if (!link || !main) return;
    // app.js smooth-scrolls in-page links; make sure focus also moves.
    link.addEventListener('click', function () {
      if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
      setTimeout(function () { main.focus({ preventScroll: true }); }, 0);
    });
  }

  function init() {
    skipLink();
    linkLabels(document);
    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        if (records[i].addedNodes.length) { linkLabels(document); return; }
      }
    }).observe(document.body, { childList: true, subtree: true });
    syncMenuToggle();
    syncMenuTabs();
    heroPause();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
