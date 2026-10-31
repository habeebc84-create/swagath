(function () {
  var header = document.getElementById('header');
  var toggle = document.getElementById('menuToggle');
  var nav = document.getElementById('nav');

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&' + 'amp;')
      .replace(/</g, '&' + 'lt;')
      .replace(/>/g, '&' + 'gt;')
      .replace(/\"/g, '&' + 'quot;');
  }

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', nav.classList.contains('open'));
    });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { nav.classList.remove('open'); });
    });
  }

  /* Smooth scroll for in-page anchors only (not tel/mailto/external) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (!id || id === '#' || id.length < 2 || id.indexOf(' ') >= 0) return;
    var target = null;
    try { target = document.querySelector(id); } catch (err) { return; }
    if (!target) return;
    e.preventDefault();
    var headerEl = document.getElementById('header');
    var headerH = (headerEl && headerEl.offsetHeight) || 88;
    var top = target.getBoundingClientRect().top + window.pageYOffset - headerH - 8;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    if (history.pushState) {
      try { history.pushState(null, '', id); } catch (err) {}
    }
  });

  /* Back to top already uses smooth; ensure native hash on load is smooth */
  if (location.hash) {
    /* A malformed hash (e.g. /#123) is an invalid selector and would throw
       out here, aborting the rest of app.js. Guard it. */
    var hashTarget = null;
    try { hashTarget = document.querySelector(location.hash); } catch (err) { hashTarget = null; }
    if (hashTarget) {
      setTimeout(function () {
        var headerH2 = (document.getElementById('header') && document.getElementById('header').offsetHeight) || 88;
        var t = hashTarget.getBoundingClientRect().top + window.pageYOffset - headerH2 - 8;
        window.scrollTo({ top: Math.max(0, t), behavior: 'smooth' });
      }, 100);
    }
  }

  /* Menu tabs: event delegation + RTL marquee clone */
  (function () {
    var track = document.getElementById('menuTabsTrack');
    if (track) {
      var group = track.querySelector('.menu-tabs-group');
      if (group) {
        var clone = group.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        clone.querySelectorAll('.tab').forEach(function (t) {
          t.classList.remove('active');
          t.setAttribute('tabindex', '-1');
        });
        track.appendChild(clone);
      }
    }
    var wrap = document.querySelector('.menu-tabs-wrap');
    if (wrap) {
      wrap.addEventListener('click', function (e) {
        var tab = e.target.closest('.tab');
        if (!tab || !tab.dataset.tab) return;
        var key = tab.dataset.tab;
        document.querySelectorAll('.tab').forEach(function (t) {
          t.classList.toggle('active', t.dataset.tab === key);
        });
        document.querySelectorAll('.menu-panel').forEach(function (p) {
          p.classList.toggle('active', p.id === key);
        });
        /* Keep menu section in view smoothly when switching category */
        var menuSec = document.getElementById('menu');
        if (menuSec) {
          var top = menuSec.getBoundingClientRect().top + window.pageYOffset - 88;
          if (Math.abs(menuSec.getBoundingClientRect().top - 88) > 120) {
            window.scrollTo({ top: top, behavior: 'smooth' });
          }
        }
        var shell = document.querySelector('.menu-shell');
        if (shell) {
          shell.style.opacity = '0.65';
          shell.style.transition = 'opacity 0.25s ease';
          requestAnimationFrame(function () {
            setTimeout(function () {
              shell.style.opacity = '1';
            }, 40);
          });
        }
      });
    }
  })();

  /* Reveal one element, giving it a per-position stagger so cards cascade. */
  function revealStage(el) {
    if (!el || el.classList.contains('in')) return;
    if (!el.classList.contains('section') && el.parentNode) {
      var sibs = el.parentNode.querySelectorAll(':scope > .reveal');
      for (var i = 0; i < sibs.length; i++) {
        if (sibs[i] === el) {
          el.style.setProperty('--stagger', (Math.min(i, 8) * 0.09 + 0.05).toFixed(2) + 's');
          break;
        }
      }
    }
    el.classList.add('in');
  }

  var revealObs = null;
  /* Register any .reveal nodes (including ones injected later by fetch) with
     the observer so their entrance plays when they scroll into view. */
  function observeReveals(root) {
    var nodes = (root || document).querySelectorAll('.reveal:not(.in)');
    if (!revealObs) { nodes.forEach(revealStage); return; }
    nodes.forEach(function (el) {
      if (el.dataset.revObs) return;
      el.dataset.revObs = '1';
      revealObs.observe(el);
    });
  }

  /* Reveal only the stages the user can actually see, so each entrance plays the
     moment it enters the viewport instead of firing invisibly at load. */
  function revealVisible() {
    var vh = window.innerHeight || document.documentElement.clientHeight || 0;
    document.querySelectorAll('.reveal:not(.in)').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh - 40 && r.bottom > 0) revealStage(el);
    });
  }

  /* Treat each content <section> as a reveal gate so section titles animate in
     when the stage enters the viewport. The hero animates on its own (fade-up)
     and is skipped. */
  var stages = Array.prototype.slice.call(document.querySelectorAll('section.section')).filter(function (s) {
    return !s.classList.contains('hero');
  });
  stages.forEach(function (s) { s.classList.add('reveal'); });

  if ('IntersectionObserver' in window) {
    /* threshold 0: a section can be many viewports tall (full menu), so a
       ratio-based threshold would never fire and its text stayed invisible.
       Any pixel entering the bottom band now triggers the entrance. */
    revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          revealStage(e.target);
          revealObs.unobserve(e.target);
        }
      });
    }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });
  }
  observeReveals();
  /* Reveal whatever is on screen now; off-screen stages wait for the observer
     so their entrance animation plays when the user actually reaches them. */
  revealVisible();
  window.addEventListener('load', revealVisible);
  window.addEventListener('resize', revealVisible, { passive: true });
  setTimeout(revealVisible, 500);
  setTimeout(revealVisible, 1500);
  if (!('IntersectionObserver' in window)) revealVisible();

  var backTop = document.getElementById('backTop');
  if (backTop) {
    backTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  (function () {
    // The legacy Habeeb popup node no longer exists on the homepage. Keep this
    // guard so any page that may still carry the old markup simply no-ops.
    var pop = document.getElementById('habeebPopup');
    if (!pop) return;
    pop.style.display = 'none';
  })();

  /* Seamless marquee: clone group so CSS -50% loop never jumps */
  (function () {
    var track = document.getElementById('marqueeTrack');
    if (!track) return;
    var group = track.querySelector('.marquee-group');
    if (!group) return;
    var clone = group.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
  })();

  /* Throttled scroll — progress only, no parallax (was laggy) */
  var progress = document.getElementById('scrollProgress');
  var scrollTicking = false;
  /* Dock behaviour: visible on Home/About; hides while scrolling down
     past the About section; comes back when scrolling stops or reverses.
     Reduced-motion users always keep the dock. */
  var dockAbout = document.getElementById('about');
  var dockLastY = window.scrollY || 0;
  var dockHideTimer = null;
  var dockReduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.addEventListener('scroll', function () {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(function () {
      var doc = document.documentElement;
      var max = doc.scrollHeight - doc.clientHeight;
      if (progress && max > 0) {
        progress.style.width = (doc.scrollTop / max) * 100 + '%';
      }
      if (header) header.classList.toggle('scrolled', window.scrollY > 40);
      if (backTop) backTop.classList.toggle('show', window.scrollY > 500);
      if (header && !dockReduceMotion && dockAbout) {
        var y = window.scrollY;
        var aboutEnd = dockAbout.offsetTop + dockAbout.offsetHeight;
        if (y <= aboutEnd) {
          header.classList.remove('dock-hidden');
        } else if (y > dockLastY + 2) {
          header.classList.add('dock-hidden');
        } else if (y < dockLastY - 2) {
          header.classList.remove('dock-hidden');
        }
        dockLastY = y;
        if (dockHideTimer) clearTimeout(dockHideTimer);
        dockHideTimer = setTimeout(function () {
          if (header) header.classList.remove('dock-hidden');
        }, 350);
      }
      scrollTicking = false;
    });
  }, { passive: true });

  /* Deep-link loads (e.g. /#contact) start already scrolled but never fire a
     scroll event, so the header, back-to-top and progress bar would all stay
     in their initial state until the user moves. Seed them once. */
  window.dispatchEvent(new Event('scroll'));

  var API = (window.__HATCHABLE__ && window.__HATCHABLE__.api) || '/api';

  /* Fallback photo when a gallery / specials image fails to load. */
  var IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=85';

  (function loadMenu() {
    var shell = document.querySelector('.menu-shell');
    if (!shell) return;
    fetch(API + '/menu/list')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.items || !data.items.length) return;
        var byCat = {};
        data.items.forEach(function (it) {
          if (!byCat[it.category]) byCat[it.category] = [];
          byCat[it.category].push(it);
        });
        Object.keys(byCat).forEach(function (cat) {
          var panel = document.getElementById(cat);
          if (!panel) return;
          var html = '';
          var lastGroup = null;
          byCat[cat].forEach(function (it) {
            if (it.group_name && it.group_name !== lastGroup) {
              html += '<div class="menu-group">' + esc(it.group_name) + '</div>';
              lastGroup = it.group_name;
            }
            html += '<div class="menu-row reveal"><span class="name">' +
              esc(it.name) +
              '</span><span class="price">' +
              esc(it.price) +
              '</span></div>';
          });
          panel.innerHTML = html;
          /* Rows were injected after setup — register them so each slides in
             when its panel is shown / scrolled to. */
          observeReveals(panel);
        });
      })
      .catch(function () {});
  })();

  var galleryGrid = document.getElementById('galleryGrid');
  if (galleryGrid) {
    fetch(API + '/gallery/list')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.items || !data.items.length) return;
        galleryGrid.innerHTML = data.items.map(function (item, i) {
          var large = item.is_large || i === 0;
          /* No 'in' class: the entrance plays when the tile scrolls into view. */
          var cls = large ? 'gal-item span-2 reveal' : 'gal-item reveal';
          var src = String(item.image_url || '').replace(/\"/g, '').replace(/</g, '');
          var cap = esc(item.caption || 'Gallery');
          return '<div class="' + cls + '">' +
            '<img src="' + src + '" alt="' + cap + '" loading="lazy" decoding="async" data-fallback="' + IMAGE_FALLBACK + '" onerror="this.onerror=null;this.src=this.dataset.fallback">' +
            '<span class="gal-caption">' + cap + '</span></div>';
        }).join('');
        observeReveals(galleryGrid);
      })
      .catch(function () {});
  }

  function renderSpecials(specials) {
    var grid = document.getElementById('specialsGrid');
    if (!grid) return;
    if (!specials || !specials.length) {
      grid.innerHTML = '<div class="empty-state reveal"><h3>No popular dishes added yet</h3></div>';
      return;
    }
    grid.innerHTML = specials.map(function (it) {
      var imgUrl = String(it.image_url || '').replace(/\"/g, '').replace(/</g, '');
      var fallback = String(it.image_fallback || '').replace(/\"/g, '').replace(/</g, '');
      var title = esc(it.title || 'Special');
      var blurb = esc(it.blurb || '');
      var price = esc(it.price || '');
      var imgAlt = title;
      /* Every photo gets a fallback: a failed image shows the dining
         photo instead of fading to a ghost at 30% opacity. */
      var imgFallback = fallback || IMAGE_FALLBACK;
      var onerror = "this.onerror=null;this.src=this.dataset.fallback;";
      return '<article class="special-card reveal">' +
        '<img src="' + imgUrl + '" alt="' + imgAlt + '" loading="lazy" decoding="async" data-fallback="' + imgFallback + '" onerror="' + onerror + '">' +
        '<div class="special-body">' +
          '<h3>' + title + '</h3>' +
          (blurb ? '<p>' + blurb + '</p>' : '') +
          '<span class="special-price">' + price + '</span>' +
        '</div>' +
      '</article>';
    }).join('');
    observeReveals(grid);
  }

  (function loadSpecials() {
    var grid = document.getElementById('specialsGrid');
    if (!grid) return;
    fetch(API + '/specials/list')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && data.specials && data.specials.length) {
          renderSpecials(data.specials);
        }
      })
      .catch(function () {});
  })();

  function renderReviews(reviews) {
    var grid = document.getElementById('reviewsGrid');
    if (!grid) return;
    if (!reviews || !reviews.length) {
      grid.innerHTML = '<div class="empty-state reveal"><h3>No reviews yet</h3></div>';
      return;
    }
    grid.innerHTML = reviews.map(function (it) {
      var stars = '';
      var n = Number(it.rating);
      for (var i = 0; i < 5; i++) {
        stars += (i < n) ? '★' : '☆';
      }
      if (!stars) stars = '★★★★★';
      return '<article class="review-card reveal"><div class="stars">' + stars + '</div><blockquote>' +
        esc(it.text || '') + '</blockquote><cite>— ' + esc(it.author || '') + '</cite></article>';
    }).join('');
    observeReveals(grid);
  }

  (function loadReviews() {
    var grid = document.getElementById('reviewsGrid');
    if (!grid) return;
    fetch(API + '/reviews/list')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && data.reviews && data.reviews.length) {
          renderReviews(data.reviews);
        }
      })
      .catch(function () {});
  })();

  /* Image preview: tap/click a gallery or specials photo to see it large.
     Delegated, so photos injected later by the gallery/specials fetches
     work too. Esc closes, arrow keys move, focus returns on close. */
  (function imagePreview() {
    var overlay = document.getElementById('imgPreview');
    var imgEl = document.getElementById('imgPreviewImg');
    var capEl = document.getElementById('imgPreviewCaption');
    var closeBtn = document.getElementById('imgPreviewClose');
    var prevBtn = document.getElementById('imgPreviewPrev');
    var nextBtn = document.getElementById('imgPreviewNext');
    if (!overlay || !imgEl || !closeBtn) return;

    var items = [];
    var index = 0;
    var lastFocus = null;

    function collect() {
      items = [];
      var seen = {};
      document.querySelectorAll('#galleryGrid img, #specialsGrid img').forEach(function (img) {
        var src = img.currentSrc || img.src;
        if (!src || seen[src]) return;
        seen[src] = true;
        var card = img.closest('.gal-item, .special-card');
        var caption = '';
        if (card) {
          var cap = card.querySelector('.gal-caption');
          var heading = card.querySelector('h3');
          caption = cap ? cap.textContent.trim() : (heading ? heading.textContent.trim() : '');
        }
        items.push({ src: src, alt: img.alt || caption || 'Swagath photo', caption: caption || img.alt || '' });
      });
    }

    function show(i) {
      if (!items.length) return;
      index = (i + items.length) % items.length;
      var item = items[index];
      imgEl.onerror = function () {
        imgEl.onerror = null;
        imgEl.src = IMAGE_FALLBACK;
      };
      imgEl.src = item.src;
      imgEl.alt = item.alt;
      capEl.textContent = item.caption;
      capEl.style.display = item.caption ? '' : 'none';
    }

    function openAt(i) {
      collect();
      if (!items.length) return;
      lastFocus = document.activeElement;
      show(i);
      overlay.hidden = false;
      document.body.style.overflow = 'hidden';
      closeBtn.focus();
    }

    function close() {
      overlay.hidden = true;
      document.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    document.addEventListener('click', function (e) {
      var card = e.target.closest ? e.target.closest('.gal-item, .special-card') : null;
      if (!card || e.target.closest('a, button')) return;
      var img = card.querySelector('img');
      if (!img) return;
      collect();
      var src = img.currentSrc || img.src;
      var found = -1;
      for (var i = 0; i < items.length; i++) {
        if (items[i].src === src) { found = i; break; }
      }
      openAt(found < 0 ? 0 : found);
    });

    closeBtn.addEventListener('click', close);
    if (prevBtn) prevBtn.addEventListener('click', function () { show(index - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { show(index + 1); });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });
    document.addEventListener('keydown', function (e) {
      if (overlay.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(index - 1);
      else if (e.key === 'ArrowRight') show(index + 1);
    });
  })();

  /* Home hero slideshow: 5 photos rotating every 20 seconds with a
     crossfade between two stacked images. Pauses while the tab is
     hidden; with reduced motion the first photo stays put. A photo
     that fails to load is skipped instead of showing a blank hero. */
  (function heroSlideshow() {
    var first = document.getElementById('heroImg');
    var second = document.getElementById('heroImgNext');
    if (!first || !second) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var SLIDES = [
      { src: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=1920&q=85', alt: 'Chicken curry with naan' },
      { src: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1920&q=85', alt: 'Swagath restaurant dining room' },
      { src: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=1920&q=85', alt: 'Signature tandoori' },
      { src: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1920&q=85', alt: 'Dum biryani' },
      { src: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1920&q=85', alt: 'Warm dining ambience' }
    ];
    var index = 0;
    var timer = null;
    var imgs = [first, second];

    function setActive(img, slide) {
      img.alt = slide.alt;
      img.setAttribute('aria-hidden', 'false');
      img.classList.add('active');
    }
    function setInactive(img) {
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');
      img.classList.remove('active');
    }

    function show(nextIndex, skipped) {
      index = (nextIndex + SLIDES.length) % SLIDES.length;
      var incoming = imgs[index % 2];
      var outgoing = imgs[(index + 1) % 2];
      var slide = SLIDES[index];
      incoming.onerror = function () {
        incoming.onerror = null;
        /* Skip a broken photo once; do not loop forever on bad URLs. */
        if (!skipped) show(index + 1, true);
      };
      incoming.onload = function () {
        incoming.onload = null;
        setActive(incoming, slide);
        setInactive(outgoing);
      };
      if (incoming.src !== slide.src) incoming.src = slide.src;
      if (incoming.complete && incoming.naturalWidth > 0) {
        incoming.onload = null;
        setActive(incoming, slide);
        setInactive(outgoing);
      }
    }

    function start() {
      if (timer || document.hidden) return;
      timer = setInterval(function () { show(index + 1, false); }, 20000);
    }
    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });

    /* Warm the cache for the remaining photos after the first paint. */
    setTimeout(function () {
      SLIDES.forEach(function (slide, i) {
        if (i < 2) return;
        var pre = new Image();
        pre.src = slide.src;
      });
    }, 1500);
    start();
  })();

  (function loadHeroEditable() {
    var img = document.getElementById('heroImg');
    if (!img) return;
    fetch(API + '/hero-image')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && data.hero_url) {
          img.src = data.hero_url;
          img.removeAttribute('data-fallback');
        }
      })
      .catch(function () {});

    fetch(API + '/home-text')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) return;
        var sub = document.getElementById('heroSub');
        if (sub && data.subtitle) sub.textContent = data.subtitle;
        var meta = document.getElementById('heroMeta');
        if (meta && data.price && data.seating && data.cateringPax && data.location) {
          meta.innerHTML =
            '<div class="meta-chip"><strong>' + esc(data.price) + '</strong><span>Per person</span></div>' +
            '<div class="meta-chip"><strong>' + esc(data.seating) + '</strong><span>Dining</span></div>' +
            '<div class="meta-chip"><strong>' + esc(data.cateringPax) + '</strong><span>Catering pax</span></div>' +
            '<div class="meta-chip"><strong>' + esc(data.location) + '</strong><span>' + esc(data.meta || '') + '</span></div>';
        }
      })
      .catch(function () {});
  })();

  function bindForm(formId, msgId, endpoint, buildPayload) {
    var form = document.getElementById(formId);
    if (!form) return;
    var dateEl = form.querySelector('[type="date"]');
    if (dateEl) dateEl.min = new Date().toISOString().slice(0, 10);

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var msg = document.getElementById(msgId);
      var btn = form.querySelector('[type="submit"]');
      if (!btn) return;
      btn.disabled = true;
      var prev = btn.textContent;
      btn.textContent = 'Sending…';
      if (msg) {
        msg.textContent = '';
        msg.className = 'form-msg';
      }

      try {
        var res = await fetch(API + endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPayload(form))
        });
        var data = await res.json();
        if (res.ok && data.success) {
          if (msg) {
            msg.textContent = 'Request received. We will call or WhatsApp you shortly.';
            msg.className = 'form-msg ok';
          }
          form.reset();
        } else if (msg) {
          msg.textContent = (data && data.error) || 'Please call or WhatsApp 083400 03444.';
          msg.className = 'form-msg err';
        }
      } catch (err) {
        if (msg) {
          msg.textContent = 'Network error. Call / WhatsApp 083400 03444.';
          msg.className = 'form-msg err';
        }
      }
      btn.disabled = false;
      btn.textContent = prev;
    });
  }

  (function bindBookingOptions() {
    var form = document.getElementById('bookingForm');
    if (!form) return;

    var modeBtns = form.querySelectorAll('.opt-chip');
    var mode = 'table';

    var fieldsByMode = {
      table: ['name', 'phone', 'email', 'party_size', 'booking_date', 'booking_time', 'special_request'],
      takeaway: ['name', 'phone', 'email', 'items', 'pickup_time', 'special_request'],
      delivery: ['name', 'phone', 'email', 'address', 'delivery_time', 'special_request']
    };

    function applyMode() {
      var fields = fieldsByMode[mode] || fieldsByMode.table;
      var set = {};
      fields.forEach(function (name) { set[name] = true; });

      Array.prototype.forEach.call(form.elements, function (el) {
        if (el && el.name && fieldsByMode[mode]) {
          var isInMode = set[el.name];
          if (el.classList) {
            el.classList.toggle('hidden-by-mode', !isInMode);
            el.classList.toggle('visible-by-mode', isInMode);
            el.required = isInMode ? !!el.hasAttribute('data-keep-required') : false;
          }
        }
      });

      modeBtns.forEach(function (btn) {
        var isActive = btn.dataset.mode === mode;
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        if (btn.tagName === 'BUTTON') btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });

      var hint = form.querySelector('#specialRequestField label');
      if (hint) {
        var labelMap = {
          table: 'Special Request',
          takeaway: 'For here or to go?',
          delivery: 'Delivery instructions'
        };
        hint.textContent = labelMap[mode] || 'Special Request';
      }

      var placeholderMap = {
        table: 'Birthday, window seat, allergies…',
        takeaway: 'Packaging note, extra cutlery…',
        delivery: 'Gate code, floor, contact at address…'
      };
      var special = form.querySelector('[name="special_request"]');
      if (special) special.placeholder = placeholderMap[mode] || '';

      var addressLabel = form.querySelector('#addressField label');
      if (addressLabel) {
        addressLabel.textContent = mode === 'delivery' ? 'Delivery Address *' : 'Address (if known)';
      }
    }

    modeBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var next = btn.dataset.mode;
        if (!next || next === mode) return;
        mode = next;
        applyMode();
      });
    });

    applyMode();
  })();

  bindForm('bookingForm', 'bookingMsg', '/bookings/create', function (f) {
    var modeBtns = document.querySelectorAll('#bookingForm .opt-chip');
    var mode = 'table';
    modeBtns.forEach(function (b) {
      if (b.getAttribute('aria-pressed') === 'true') mode = b.dataset.mode;
    });

    var get = function (name) {
      var el = f.querySelector('[name="' + name + '"]');
      if (!el) return null;
      var v = el.value.trim();
      return v || null;
    };

    var payload = {
      name: get('name'),
      phone: get('phone'),
      email: get('email'),
      party_size: f.party_size ? f.party_size.value : null,
      booking_date: f.booking_date ? f.booking_date.value : null,
      booking_time: f.booking_time ? f.booking_time.value : null,
      special_request: get('special_request'),
      booking_mode: mode,
      takeaway_items: get('items'),
      pickup_time: get('pickup_time'),
      delivery_address: get('address'),
      delivery_time: get('delivery_time')
    };

    if (mode === 'takeaway') {
      payload.items = get('items');
      payload.pickup_time = get('pickup_time');
      payload.party_size = null;
      payload.booking_date = null;
      payload.booking_time = null;
    } else if (mode === 'delivery') {
      payload.delivery_address = get('address');
      payload.delivery_time = get('delivery_time');
      payload.party_size = null;
      payload.booking_date = null;
      payload.booking_time = null;
    } else {
      payload.items = null;
      payload.pickup_time = null;
      payload.delivery_address = null;
      payload.delivery_time = null;
      if (f.party_size) payload.party_size = f.party_size.value;
      if (f.booking_date) payload.booking_date = f.booking_date.value;
      if (f.booking_time) payload.booking_time = f.booking_time.value;
    }

    return buildPayloadWithLocation(payload);
  });

  function buildPayloadWithLocation(payload) {
    var input = document.querySelector('#bookingForm [name="location_address"]');
    var liveBtn = document.querySelector('#bookingForm .loc-live-btn');
    var state = window.__SWAGATH_BOOKING_LOC || {};

    var address = input ? input.value.trim() : '';
    var lat = state.lat != null ? state.lat : null;
    var lng = state.lng != null ? state.lng : null;
    var source = state.source || 'manual';        var status = state.status || 'pending';

        if (payload.booking_mode === 'delivery' && address) {
          status = state.status === 'valid' ? 'accepted' : (state.status === 'outside' ? 'outside' : 'pending');
      payload.location_address = address;
      payload.location_lat = lat;
      payload.location_lng = lng;
      payload.location_source = source;        payload.location_status = status;
    }

    return payload;
  }

  (function addMissingBookingFields() {
    var form = document.getElementById('bookingForm');
    if (!form) return;

    var modeGroup = form.querySelector('.booking-options');
    if (!modeGroup) return;

    var itemsField = document.createElement('div');
    itemsField.className = 'field';
    itemsField.id = 'itemsField';
    itemsField.innerHTML =
      '<label>Items to order</label>' +
      '<textarea name="items" rows="2" placeholder="Paneer 65, chicken biryani, coke 2…"></textarea>';

    var pickupField = document.createElement('div');
    pickupField.className = 'field';
    pickupField.id = 'pickupTimeField';
    pickupField.innerHTML =
      '<label>Pickup Time</label>' +
      '<select name="pickup_time">' +
        '<option value="">Select time</option>' +
        '<option value="ASAP">As soon as possible</option>' +
        '<option value="11:00 AM">11:00 AM</option>' +
        '<option value="12:00 PM">12:00 PM</option>' +
        '<option value="1:00 PM">1:00 PM</option>' +
        '<option value="12:30 PM">12:30 PM</option>' +
        '<option value="1:30 PM">1:30 PM</option>' +
        '<option value="2:00 PM">2:00 PM</option>' +
        '<option value="7:00 PM">7:00 PM</option>' +
        '<option value="7:30 PM">7:30 PM</option>' +
        '<option value="8:00 PM">8:00 PM</option>' +
        '<option value="8:30 PM">8:30 PM</option>' +
      '</select>';

    var addressField = document.createElement('div');
    addressField.className = 'field';
    addressField.id = 'addressField';
    addressField.innerHTML =
      '<label>Delivery Address</label>' +
      '<textarea name="address" rows="2" placeholder="House / street / landmark"></textarea>';

    var deliveryTimeField = document.createElement('div');
    deliveryTimeField.className = 'field';
    deliveryTimeField.id = 'deliveryTimeField';
    deliveryTimeField.innerHTML =
      '<label>Delivery Time</label>' +
      '<select name="delivery_time">' +
        '<option value="">Select time</option>' +
        '<option value="ASAP">As soon as possible</option>' +
        '<option value="11:00 AM">11:00 AM</option>' +
        '<option value="12:00 PM">12:00 PM</option>' +
        '<option value="12:30 PM">12:30 PM</option>' +
        '<option value="1:00 PM">1:00 PM</option>' +
        '<option value="1:30 PM">1:30 PM</option>' +
        '<option value="2:00 PM">2:00 PM</option>' +
        '<option value="7:00 PM">7:00 PM</option>' +
        '<option value="7:30 PM">7:30 PM</option>' +
        '<option value="8:00 PM">8:00 PM</option>' +
        '<option value="8:30 PM">8:30 PM</option>' +
      '</select>';

    var locationField = document.createElement('div');
    locationField.className = 'field';
    locationField.id = 'locationField';
    locationField.innerHTML =
      '<label>Delivery Location</label>' +
      '<div class="loc-row">' +
        '<input type="text" name="location_address" class="loc-input" placeholder="Kalikiri Cross Road or nearby address">' +
        '<button type="button" class="loc-live btn btn-ghost loc-live-btn">📍 Use Live Location</button>' +
      '</div>' +
      '<div class="loc-status" role="status" aria-live="polite"></div>' +
      '<div class="loc-detail"></div>';

    var specialField = document.getElementById('specialRequestField');
    var refEl = specialField || form.querySelector('button[type="submit"]');
    if (!refEl) return;

    var beforeSubmit = () => {
      if (modeGroup) {
        form.insertBefore(itemsField, modeGroup);
        form.insertBefore(pickupField, modeGroup);
        form.insertBefore(addressField, modeGroup);
        form.insertBefore(deliveryTimeField, modeGroup);
        form.insertBefore(locationField, modeGroup);
      } else {
        form.appendChild(itemsField);
        form.appendChild(pickupField);
        form.appendChild(addressField);
        form.appendChild(deliveryTimeField);
        form.appendChild(locationField);
      }
      bindLocationFlow(form);
    };

    var alreadyDone = window.__SWAGATH_BOOKING_FIELDS_DONE;
    if (!alreadyDone) {
      beforeSubmit();
      window.__SWAGATH_BOOKING_FIELDS_DONE = true;
    }
  })();

  function bindLocationFlow(form) {
    if (form.__swagathLocBound) return;
    form.__swagathLocBound = true;

    var input = form.querySelector('[name="location_address"]');
    var statusEl = form.querySelector('#locationField .loc-status');
    var detailEl = form.querySelector('#locationField .loc-detail');
    var liveBtn = form.querySelector('.loc-live-btn');

    if (!input || !statusEl || !detailEl || !liveBtn) return;

    var state = {
      status: 'idle',
      address: null,
      lat: null,
      lng: null,
      source: 'manual'
    };

    function statusFromCoords(lat, lng) {
      if (lat == null || lng == null || !isFinite(lat) || !isFinite(lng)) return null;
      return HELPERS.isKalikiriOrWithinKm(lat, lng, window.__SWAGATH_DRIFT_KM || 5.0) ? 'valid' : 'outside';
    }

    function renderStatus(msg, kind) {
      statusEl.textContent = msg || '';
      statusEl.className = 'loc-status' + (kind ? ' ' + kind : '');
    }

    function renderDetail() {
      var parts = [];
      if (state.address) parts.push('Address: ' + state.address);
      if (state.lat != null && state.lng != null) {
        parts.push('📍 ' + state.lat.toFixed(5) + ', ' + state.lng.toFixed(5));
      }
      if (state.source) parts.push('Source: ' + state.source);
      detailEl.textContent = parts.join(' · ') || 'No location captured yet';
    }

    function setValid() {
      statusEl.className = 'loc-status loc-ok';
      renderStatus('Location accepted (Kalikiri or nearby)');
      renderDetail();
    }

    function setOutside() {
      statusEl.className = 'loc-status loc-err';
      renderStatus('Location is outside Kalikiri / 5 km area');
      renderDetail();
    }

    function setError(msg) {
      statusEl.className = 'loc-status loc-err';
      renderStatus(msg || 'Could not read location');
      renderDetail();
    }

    window.__SWAGATH_DRIFT_KM = 5.0;

    function buildPayloadWithLocation(payload) {
      var loc = {};
      loc.location_address = input.value.trim() || null;
      loc.lat = state.lat;
      loc.lng = state.lng;
      loc.source = state.source || 'manual';
      loc.location_status = state.status === 'valid' ? 'accepted' : state.status;

      var hasCoords = state.lat != null && state.lng != null;
      var hasAddress = loc.location_address;

      if (hasCoords && state.status === 'valid') {
        loc.location_status = 'accepted';
      } else if (hasCoords && state.status === 'outside') {
        loc.location_status = 'outside';
      } else if (hasAddress && !hasCoords) {
        loc.location_status = 'accepted';
        state.status = 'valid';
        state.source = 'manual';
        setValid();
      } else if (!hasAddress && !hasCoords) {
        loc.location_status = 'pending';
        loc.lat = null;
        loc.lng = null;
      }

      payload.location_address = loc.location_address;
      payload.location_lat = loc.lat;
      payload.location_lng = loc.lng;
      payload.location_source = loc.source;
      payload.location_status = loc.location_status;

      return payload;
    }

    var HELPERS = window.__SWAGATH_LOC_HELPERS;
    if (!HELPERS) {
      HELPERS = {
        KALIKIRI_LAT: 13.7779,
        KALIKIRI_LNG: 78.3870,
        KALIKIRI_DRIFT_KM: 5.0,

        isKalikiriOrWithinKm: function (lat, lng, maxKm) {
          if (lat == null || lng == null || !isFinite(lat) || !isFinite(lng)) return false;
          if (Math.abs(lat - KALIKIRI_LAT) > 0.05 || Math.abs(lng - KALIKIRI_LNG) > 0.05) return false;
          var R = 6371.008;
          var toRad = function (deg) { return deg * Math.PI / 180; };
          var dLat = toRad(lat - KALIKIRI_LAT);
          var dLng = toRad(lng - KALIKIRI_LNG);
          var a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(toRad(KALIKIRI_LAT)) * Math.cos(toRad(lat))
            * Math.sin(dLng / 2) * Math.sin(dLng / 2);
          var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return (R * c) <= (maxKm != null ? maxKm : this.KALIKIRI_DRIFT_KM);
        },

        geocodeKalikiri: function (query) {
          var q = (query || '').toString().toLowerCase().trim();
          if (!q) return null;
          if (q.indexOf('kalikiri') !== -1) return { lat: 13.7779, lng: 78.3870, label: 'Kalikiri Cross Road' };
          if (q.indexOf('andhra') !== -1 || q.indexOf('ap ') !== -1 || q.indexOf('517234') !== -1) {
            if (q.indexOf('road') !== -1 || q.indexOf('cross') !== -1 || q.indexOf('st') !== -1 || q.indexOf('street') !== -1) {
              return { lat: 13.7779, lng: 78.3870, label: 'Kalikiri area' };
            }
          }
          return null;
        }
      };
      window.__SWAGATH_LOC_HELPERS = HELPERS;
    }

    function refreshFromInput() {
      var raw = input.value.trim();
      if (!raw) {
        state.address = null;
        if (state.source === 'manual' || state.lat == null) {
          state.status = 'pending';
          if (state.lat == null || state.lng == null) {
            state.lat = null;
            state.lng = null;
          }
          renderStatus('Enter an address or use Live Location');
        }
        renderDetail();
        return;
      }

      var guessed = HELPERS.geocodeKalikiri(raw);
      if (guessed) {
        state.address = raw;
        state.lat = guessed.lat;
        state.lng = guessed.lng;
        state.source = 'manual';
        state.status = statusFromCoords(guessed.lat, guessed.lng) || 'outside';
        if (state.status === 'valid') setValid(); else setOutside();
        renderDetail();
        return;
      }

      state.address = raw;
      state.status = 'manual-unvalidated';
      if (state.lat == null || state.lng == null) {
        renderStatus('Type a Kalikiri / nearby address or use Live Location');
      } else {
        renderStatus('Address typed — confirm with Live Location or keep as is');
      }
      renderDetail();
    }

    input.addEventListener('input', function () {
      refreshFromInput();
    });

    liveBtn.addEventListener('click', function () {
      if (!navigator.geolocation) {
        setError('Live location is not available on this device');
        return;
      }
      renderStatus('Getting live location…');
      liveBtn.disabled = true;
      liveBtn.textContent = 'Locating…';

      navigator.geolocation.getCurrentPosition(
        function (pos) {
          var lat = pos.coords.latitude;
          var lng = pos.coords.longitude;
          var acc = pos.coords.accuracy;
          state.lat = lat;
          state.lng = lng;
          state.source = 'live';

          var address = input.value.trim();
          if (!address) {
            address = 'Kalikiri area (live location)';
            input.value = address;
          }
          state.address = address;

          state.status = statusFromCoords(lat, lng) || 'outside';
          if (state.status === 'valid') setValid(); else setOutside();
          renderDetail();
          liveBtn.disabled = false;
          liveBtn.textContent = '📍 Use Live Location';
        },
        function (err) {
          var labels = {
            1: 'Location access was denied. Type a Kalikiri / nearby address and we will keep the order.',
            2: 'Location unavailable right now. Type a Kalikiri / nearby address.',
            3: 'Location timed out. Type a Kalikiri / nearby address or try again.'
          };
          setError(labels[err.code] || 'Could not read live location');
          liveBtn.disabled = false;
          liveBtn.textContent = '📍 Use Live Location';
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000
        }
      );
    });

    refreshFromInput();
  }


  bindForm('cateringForm', 'cateringMsg', '/catering/create', function (f) {
    return {
      name: f.name.value.trim(),
      phone: f.phone.value.trim(),
      email: f.email.value.trim() || null,
      event_type: f.event_type.value,
      guest_count: f.guest_count.value,
      event_date: f.event_date.value || null,
      event_location: f.event_location.value.trim() || null,
      package_interest: f.package_interest.value || null,
      dietary_notes: f.dietary_notes.value.trim() || null,
      message: f.message.value.trim() || null
    };
  });

  /* ---------- Motion polish: cascading reveals + light parallax ----------
     Optional layer — wrapped so a failure here can never break the page. */
  try {
    (function () {
      var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

      /* Stagger cards inside each grid so sections cascade in instead of
         popping in as one block. Delay is cleared once it has been used so
         hover transitions are never slowed down afterwards. */
      var groups = ['.about-grid', '.specials-grid', '.cater-grid', '.reviews-grid', '.gallery-grid', '.faq-list', '.contact-grid'];
      groups.forEach(function (sel) {
        var wrap = document.querySelector(sel);
        if (!wrap || reduce) return;
        var i = 0;
        wrap.querySelectorAll('.reveal').forEach(function (el) {
          var delay = (i % 6) * 75;
          i++;
          if (!delay) return;
          el.style.transitionDelay = delay + 'ms';
          setTimeout(function () { el.style.transitionDelay = ''; }, delay + 1400);
        });
      });

      if (reduce) return;

      /* Compositor-only micro parallax.
         Keep this as light as possible: only the hero media gets a tiny
         scroll-following drift. Everything else is left alone so scrolling
         stays smooth on low-end phones. */
      var heroMedia = document.querySelector('.hero-media');
      if (!heroMedia) return;

      var ticking = false;
      function paint() {
        ticking = false;
        var y = window.pageYOffset || document.documentElement.scrollTop || 0;
        var vh = window.innerHeight || 1;
        var p = Math.min(1, y / Math.max(1, vh));
        heroMedia.style.transform = 'translate3d(0,' + (y * 0.14).toFixed(1) + 'px,0)';
      }
      window.addEventListener('scroll', function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(paint);
      }, { passive: true });
      paint();
    })();
  } catch (err) { /* motion polish is optional */ }
})();
