(function () {
  var header = document.getElementById('header');
  var toggle = document.getElementById('menuToggle');
  var nav = document.getElementById('nav');

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&' + 'amp;')
      .replace(/</g, '&' + 'lt;')
      .replace(/>/g, '&' + 'gt;')
      .replace(/"/g, '&' + 'quot;');
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
    var hashTarget = document.querySelector(location.hash);
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

  function revealAll() {
    document.querySelectorAll('.reveal').forEach(function (el) {
      el.classList.add('in');
    });
  }
  if ('IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.01, rootMargin: '40px 0px 0px 0px' });
    document.querySelectorAll('.reveal').forEach(function (el) { obs.observe(el); });
    /* Progressive safety nets: reveal in staggered waves so content can never
       be stuck invisible (gallery/specials lasted >1.2s before on slow loads). */
    setTimeout(revealAll, 500);
    setTimeout(revealAll, 1500);
  } else {
    revealAll();
  }
  window.addEventListener('load', function () {
    setTimeout(revealAll, 300);
  });

  var backTop = document.getElementById('backTop');
  if (backTop) {
    backTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* Built by Habeeb popup — show every visit; dismiss for this session only */
  (function () {
    var pop = document.getElementById('habeebPopup');
    if (!pop) return;
    var key = 'swagath_habeeb_popup_v3';
    function closePop() {
      pop.classList.remove('is-open');
      document.body.style.overflow = '';
      try { sessionStorage.setItem(key, '1'); } catch (e) {}
    }
    function openPop() {
      pop.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }
    pop.querySelectorAll('[data-close-popup]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        closePop();
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && pop.classList.contains('is-open')) closePop();
    });
    var already = false;
    try { already = !!sessionStorage.getItem(key); } catch (e) {}
    if (!already) {
      setTimeout(openPop, 900);
    }
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
            html += '<div class="menu-row"><span class="name">' +
              esc(it.name) +
              '</span><span class="price">' +
              esc(it.price) +
              '</span></div>';
          });
          panel.innerHTML = html;
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
          var cls = large ? 'gal-item span-2 reveal in' : 'gal-item reveal in';
          var src = String(item.image_url || '').replace(/"/g, '').replace(/</g, '');
          var cap = esc(item.caption || 'Gallery');
          return '<div class="' + cls + '">' +
            '<img src="' + src + '" alt="' + cap + '" loading="lazy" decoding="async" onerror="this.style.opacity=0.3">' +
            '<span class="gal-caption">' + cap + '</span></div>';
        }).join('');
      })
      .catch(function () {});
  }

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
})();