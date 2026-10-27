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
      scrollTicking = false;
    });
  }, { passive: true });

  /* Deep-link loads (e.g. /#contact) start already scrolled but never fire a
     scroll event, so the header, back-to-top and progress bar would all stay
     in their initial state until the user moves. Seed them once. */
  window.dispatchEvent(new Event('scroll'));

  var API = (window.__HATCHABLE__ && window.__HATCHABLE__.api) || '/api';

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
            '<img src="' + src + '" alt="' + cap + '" loading="lazy" decoding="async" onerror="this.style.opacity=0.3">' +
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
      var onerror = fallback
        ? "this.onerror=null;this.src='" + fallback + "';"
        : "this.style.opacity=0.3;";
      return '<article class="special-card reveal">' +
        '<img src="' + imgUrl + '" alt="' + imgAlt + '" loading="lazy" decoding="async" onerror="' + onerror + '">' +
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

  bindForm('bookingForm', 'bookingMsg', '/bookings/create', function (f) {
    return {
      name: f.name.value.trim(),
      phone: f.phone.value.trim(),
      email: f.email.value.trim() || null,
      party_size: f.party_size.value,
      booking_date: f.booking_date.value,
      booking_time: f.booking_time.value,
      special_request: f.special_request.value.trim() || null
    };
  });

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

      /* Compositor-only parallax: the depth light pools and the hero drift
         with the scroll. These targets carry no CSS animation of their own,
         so an inline transform can never fight one (transforms only, no
         layout, one rAF per scroll frame). */
      var heroMedia = document.querySelector('.hero-media');
      var heroContent = document.querySelector('.hero-content');
      if (!heroMedia && !heroContent) return;

      var ticking = false;
      function paint() {
        ticking = false;
        var y = window.pageYOffset || document.documentElement.scrollTop || 0;
        var vh = window.innerHeight || 1;
        var p = Math.min(1, y / vh);
        if (heroMedia) heroMedia.style.transform = 'translate3d(0,' + (y * 0.16).toFixed(1) + 'px,0)';
        if (heroContent) {
          heroContent.style.transform = 'translate3d(0,' + (y * 0.24).toFixed(1) + 'px,0)';
          heroContent.style.opacity = String(Math.max(0, 1 - p * 1.15));
        }
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
