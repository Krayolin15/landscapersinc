/* ==========================================================
   LANDSCAPERS INC. — site interactions
   (shared by index.html and grow.html; every block is null-safe)
   The seed → tree → logo scene lives in growth.js.
   ========================================================== */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  root.classList.add('js');

  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CFG = window.LI_CONFIG || {};

  /* ---------- Central contact wiring ---------- */
  var waNumber = String(CFG.whatsappNumber || '').replace(/\D/g, '');
  function waUrl(message) {
    if (!waNumber) return null;
    return 'https://wa.me/' + waNumber + '?text=' + encodeURIComponent(message || CFG.defaultMessage || '');
  }
  window.LI_waUrl = waUrl;

  $$('[data-wa]').forEach(function (a) {
    var url = waUrl(a.getAttribute('data-wa'));
    if (!url) return;               // no number configured: link keeps pointing at the contact section
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
  });
  $$('[data-phone]').forEach(function (el) { if (CFG.phoneDisplay) el.textContent = CFG.phoneDisplay; });
  $$('[data-phone2]').forEach(function (el) { el.textContent = CFG.secondaryPhoneDisplay || ''; });
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Navigation ---------- */
  var nav = $('#nav');
  var burger = $('#burger');
  var menu = $('#mobileMenu');
  var toTop = $('#toTop');
  var dock = $('.dock');
  var growthEl = $('#growth');

  function onScroll() {
    var y = window.scrollY;
    if (nav) nav.classList.toggle('is-scrolled', y > 40);
    if (toTop) toTop.classList.toggle('is-on', y > window.innerHeight * 1.2);
    if (dock && growthEl) {
      // keep the floating buttons out of the cinematic scene
      var r = growthEl.getBoundingClientRect();
      dock.classList.toggle('is-away', r.top < window.innerHeight * 0.5 && r.bottom > window.innerHeight * 0.6);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function setMenu(open) {
    if (!menu || !burger) return;
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    nav.classList.toggle('menu-open', open);
    doc.body.style.overflow = open ? 'hidden' : '';
    if ('inert' in menu) menu.inert = !open;
    if (open) { var first = $('a', menu); if (first) first.focus({ preventScroll: true }); }
  }
  if (burger && menu) {
    if ('inert' in menu) menu.inert = true;
    burger.addEventListener('click', function () { setMenu(!menu.classList.contains('is-open')); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); burger.focus(); }
    });
    window.addEventListener('resize', function () { if (window.innerWidth > 1080) setMenu(false); });
  }

  if (toTop) toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }); });

  /* Active section indicator */
  var navLinks = $$('.nav-link[data-section]');
  if (navLinks.length && 'IntersectionObserver' in window) {
    var sections = navLinks.map(function (l) { return doc.getElementById(l.dataset.section); }).filter(Boolean);
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (l) {
          var on = l.dataset.section === en.target.id;
          l.classList.toggle('is-active', on);
          if (on) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- Scroll reveals ---------- */
  var reveals = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var ro = new IntersectionObserver(function (entries) {
      // stagger items that enter together
      var k = 0;
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.style.setProperty('--d', (k++ * 90) + 'ms');
        en.target.classList.add('is-in');
        ro.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { ro.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- GSAP: parallax + process vine ---------- */
  function initMotion() {
    var gsap = window.gsap, ST = window.ScrollTrigger;
    var steps = $('#steps');
    var stepEls = $$('.step', steps);
    var fills = $$('.vine-fill', steps);

    function setVine(p) {
      fills.forEach(function (f) { f.style.strokeDashoffset = String(1 - p); });
      stepEls.forEach(function (s, i) { s.classList.toggle('is-on', p > (i + 0.35) / stepEls.length * 0.92); });
    }

    if (!gsap || !ST || reduceMotion) {
      if (steps) setVine(1);
      return;
    }
    gsap.registerPlugin(ST);

    var heroMedia = $('#heroMedia');
    if (heroMedia) {
      gsap.to(heroMedia, { yPercent: 9, ease: 'none', scrollTrigger: { trigger: heroMedia.parentNode, start: 'top top', end: 'bottom top', scrub: true } });
    }
    var pm = $('.pricing-media');
    if (pm) {
      gsap.fromTo(pm, { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: pm.parentNode, start: 'top bottom', end: 'bottom top', scrub: true } });
    }
    if (steps) {
      setVine(0);
      ST.create({ trigger: steps, start: 'top 78%', end: 'bottom 55%', scrub: 0.6, onUpdate: function (self) { setVine(self.progress); } });
    }
    // image scale-on-scroll for the large editorial photos
    $$('.about-img--main img, .why-img img').forEach(function (im) {
      gsap.fromTo(im, { yPercent: -4, scale: 1.1 }, { yPercent: 4, scale: 1.1, ease: 'none', scrollTrigger: { trigger: im.parentNode, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    window.addEventListener('load', function () { ST.refresh(); });
  }
  initMotion();

  /* ---------- Gallery filters ---------- */
  var filters = $$('.filter');
  var items = $$('.g-item');
  var status = $('#galleryStatus');
  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var f = btn.dataset.filter;
      filters.forEach(function (b) { var on = b === btn; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on)); });
      var shown = 0;
      items.forEach(function (it) {
        var show = f === 'all' || it.dataset.cat === f;
        it.classList.toggle('is-hidden', !show);
        if (show) {
          shown++;
          it.classList.add('is-entering');
          requestAnimationFrame(function () { requestAnimationFrame(function () { it.classList.remove('is-entering'); }); });
        }
      });
      if (status) status.textContent = shown + ' project photo' + (shown === 1 ? '' : 's') + ' shown.';
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    });
  });

  /* ---------- Lightbox ---------- */
  var lb = $('#lightbox');
  if (lb) {
    var lbImg = $('#lbImg'), lbCap = $('#lbCap');
    var current = 0, visible = [], lastFocus = null;

    function show(i) {
      current = (i + visible.length) % visible.length;
      var b = visible[current];
      lbImg.classList.add('is-swapping');
      var next = new Image();
      next.onload = next.onerror = function () {
        lbImg.src = b.dataset.full;
        lbImg.alt = $('img', b).alt;
        var meta = doc.createElement('small');
        meta.textContent = b.dataset.catlabel + ' · ' + (current + 1) + ' / ' + visible.length;
        lbCap.textContent = '';
        lbCap.appendChild(meta);
        lbCap.appendChild(doc.createTextNode(b.dataset.title));
        lbImg.classList.remove('is-swapping');
      };
      next.src = b.dataset.full;
    }
    function open(btn) {
      visible = $$('.g-item:not(.is-hidden) .g-btn');
      lastFocus = btn;
      lb.hidden = false;
      doc.body.style.overflow = 'hidden';
      requestAnimationFrame(function () { lb.classList.add('is-open'); });
      show(visible.indexOf(btn));
      $('#lbClose').focus();
    }
    function close() {
      lb.classList.remove('is-open');
      doc.body.style.overflow = '';
      setTimeout(function () { lb.hidden = true; }, 350);
      if (lastFocus) lastFocus.focus();
    }
    $$('.g-btn').forEach(function (b) { b.addEventListener('click', function () { open(b); }); });
    $('#lbClose').addEventListener('click', close);
    $('#lbPrev').addEventListener('click', function () { show(current - 1); });
    $('#lbNext').addEventListener('click', function () { show(current + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.tagName === 'FIGURE') close(); });
    doc.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(current - 1);
      else if (e.key === 'ArrowRight') show(current + 1);
      else if (e.key === 'Tab') {            // keep focus inside the dialog
        var f = $$('button', lb), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    var sx = null, sy = null;
    lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) show(current + (dx < 0 ? 1 : -1));
      sx = null;
    }, { passive: true });
  }

  /* ---------- Testimonials ---------- */
  var track = $('#tTrack');
  if (track) {
    var prev = $('#tPrev'), next = $('#tNext');
    var step = function () { return Math.min(track.clientWidth * 0.8, 460); };
    var sync = function () {
      prev.disabled = track.scrollLeft < 8;
      next.disabled = track.scrollLeft > track.scrollWidth - track.clientWidth - 8;
    };
    prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: reduceMotion ? 'auto' : 'smooth' }); });
    next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: reduceMotion ? 'auto' : 'smooth' }); });
    track.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  }

  /* ---------- Reels (video loads only when asked for) ---------- */
  $$('.reel').forEach(function (reel) {
    var v = $('video', reel), b = $('.reel-play', reel);
    b.addEventListener('click', function () {
      $$('.reel.is-playing video').forEach(function (o) { if (o !== v) { o.pause(); } });
      v.controls = true;
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
      b.hidden = true;
      v.focus();
    });
    v.addEventListener('play', function () { reel.classList.add('is-playing'); });
    v.addEventListener('pause', function () { reel.classList.remove('is-playing'); if (v.ended || v.currentTime === 0) b.hidden = false; });
  });

  /* ---------- FAQ accordion ---------- */
  $$('.faq-q').forEach(function (q) {
    q.addEventListener('click', function () {
      var item = q.closest('.faq-item');
      var open = !item.classList.contains('is-open');
      $$('.faq-item.is-open').forEach(function (o) {
        if (o !== item) { o.classList.remove('is-open'); $('.faq-q', o).setAttribute('aria-expanded', 'false'); }
      });
      item.classList.toggle('is-open', open);
      q.setAttribute('aria-expanded', String(open));
    });
  });

  /* ---------- Quote form → WhatsApp ---------- */
  var form = $('#quoteForm');
  if (form) {
    var done = $('#formDone'), doneOpen = $('#doneOpen'), doneEdit = $('#doneEdit');
    var loadedAt = Date.now();
    var rules = {
      firstName: function (v) { return v.length >= 2 ? '' : 'Please enter your first name.'; },
      lastName: function (v) { return v.length >= 2 ? '' : 'Please enter your last name.'; },
      email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Please enter a valid email address.'; },
      phone: function (v) { var d = v.replace(/\D/g, ''); return (/^[+\d][\d\s()-]+$/.test(v) && d.length >= 9 && d.length <= 13) ? '' : 'Please enter a valid phone number, e.g. 082 123 4567.'; },
      location: function (v) { return v.length >= 2 ? '' : 'Please tell us where the property is.'; },
      service: function (v) { return v ? '' : 'Please choose a service.'; },
      message: function (v) { return v.length >= 10 ? '' : 'Please describe the project in a sentence or two.'; }
    };
    function check(name) {
      var el = form.elements[name];
      var msg = rules[name](el.value.trim());
      var field = el.closest('.field');
      field.classList.toggle('has-error', !!msg);
      $('.err', field).textContent = msg;
      el.setAttribute('aria-invalid', String(!!msg));
      return !msg;
    }
    Object.keys(rules).forEach(function (name) {
      var el = form.elements[name];
      el.addEventListener('blur', function () { if (el.value.trim() || el.closest('.field').classList.contains('has-error')) check(name); });
      el.addEventListener('input', function () { if (el.closest('.field').classList.contains('has-error')) check(name); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstBad = null;
      Object.keys(rules).forEach(function (name) { if (!check(name) && !firstBad) firstBad = form.elements[name]; });
      if (firstBad) { firstBad.focus(); return; }
      // spam protection: honeypot field + a minimum time on page
      if (form.elements.website.value || Date.now() - loadedAt < 2500) return;

      var v = function (n) { return form.elements[n].value.trim(); };
      var text = 'Hi Landscapers Inc, I would like to request a quotation.\n\n' +
        '*Name:* ' + v('firstName') + ' ' + v('lastName') + '\n' +
        '*Email:* ' + v('email') + '\n' +
        '*Phone:* ' + v('phone') + '\n' +
        '*Property location:* ' + v('location') + '\n' +
        '*Service required:* ' + v('service') + '\n\n' +
        '*Project description:*\n' + v('message');
      var url = waUrl(text);
      if (!url) {   // no WhatsApp number configured — fall back to email rather than pretend
        url = 'mailto:' + (CFG.email || 'Sales@landscapersinc.co.za') + '?subject=' + encodeURIComponent('Quotation request') + '&body=' + encodeURIComponent(text.replace(/\*/g, ''));
      }
      doneOpen.href = url;
      window.open(url, '_blank', 'noopener');   // opened inside the click, so it is not blocked as a pop-up
      form.hidden = true;
      done.hidden = false;
      done.focus();
    });
    doneEdit.addEventListener('click', function () { done.hidden = true; form.hidden = false; form.elements.firstName.focus(); });
  }
})();
