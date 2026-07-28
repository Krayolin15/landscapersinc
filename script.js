/* ==========================================================================
   LANDSCAPERS INC. — LUXURY REBUILD JS
   Pure vanilla JS. No frameworks, no build step.
   ========================================================================== */
(function(){
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- PRELOADER ---------------- */
  var preloader = document.getElementById('preloader');
  var preBarFill = document.getElementById('preBarFill');
  var prePct = document.getElementById('prePct');
  var pct = 0;
  var preInterval = setInterval(function(){
    pct += Math.random() * 14 + 4;
    if (pct >= 100) { pct = 100; clearInterval(preInterval); }
    preBarFill.style.width = pct + '%';
    prePct.textContent = Math.floor(pct) + '%';
    if (pct === 100) {
      setTimeout(function(){
        preloader.classList.add('fade-out');
        document.body.classList.remove('lock-scroll');
        runHeroReveal();
      }, 280);
    }
  }, 140);

  /* Safety net: never let preloader block the site */
  setTimeout(function(){
    if (!preloader.classList.contains('fade-out')) {
      preloader.classList.add('fade-out');
      runHeroReveal();
    }
  }, 3200);

  /* ---------------- HERO TEXT REVEAL ---------------- */
  function runHeroReveal(){
    var lines = document.querySelectorAll('.hero h1 .line span');
    lines.forEach(function(el, i){
      el.style.transition = 'transform .95s cubic-bezier(.16,1,.3,1)';
      el.style.transitionDelay = (i * 0.12) + 's';
      requestAnimationFrame(function(){ el.style.transform = 'translateY(0)'; });
    });
    var sub = document.getElementById('heroSub');
    var btns = document.getElementById('heroBtns');
    [sub, btns].forEach(function(el, i){
      if(!el) return;
      el.style.transition = 'opacity .9s ease, transform .9s cubic-bezier(.16,1,.3,1)';
      el.style.transitionDelay = (0.5 + i * 0.15) + 's';
      requestAnimationFrame(function(){ el.style.opacity = 1; el.style.transform = 'translateY(0)'; });
    });
  }

  /* ---------------- CUSTOM CURSOR ---------------- */
  var ring = document.getElementById('cursorRing');
  var dot = document.getElementById('cursorDot');
  var isTouch = window.matchMedia('(hover:none), (pointer:coarse)').matches;

  if (!isTouch) {
    var mx = 0, my = 0, rx = 0, ry = 0;
    document.addEventListener('mousemove', function(e){
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + 'px'; dot.style.top = my + 'px';
    });
    (function loop(){
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
      requestAnimationFrame(loop);
    })();

    var hoverables = 'a, button, .service-card, .gallery-item, input, select, textarea, .filter-btn, .faq-q';
    document.addEventListener('mouseover', function(e){
      if (e.target.closest(hoverables)) ring.classList.add('hover');
    });
    document.addEventListener('mouseout', function(e){
      if (e.target.closest(hoverables)) ring.classList.remove('hover');
    });
    document.addEventListener('mouseleave', function(){ document.body.classList.add('cursor-hide'); });
    document.addEventListener('mouseenter', function(){ document.body.classList.remove('cursor-hide'); });
  }

  /* ---------------- MAGNETIC BUTTONS ---------------- */
  document.querySelectorAll('.magnetic').forEach(function(btn){
    btn.addEventListener('mousemove', function(e){
      if (isTouch) return;
      var r = btn.getBoundingClientRect();
      var x = e.clientX - r.left - r.width/2;
      var y = e.clientY - r.top - r.height/2;
      btn.style.transform = 'translate(' + (x*0.25) + 'px,' + (y*0.35) + 'px)';
    });
    btn.addEventListener('mouseleave', function(){ btn.style.transform = 'translate(0,0)'; });
    btn.addEventListener('click', function(e){
      var rect = btn.getBoundingClientRect();
      var ripple = document.createElement('span');
      ripple.className = 'ripple-dot';
      var size = Math.max(rect.width, rect.height) * 1.6;
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size/2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size/2) + 'px';
      var wrap = btn.querySelector('.btn-ripple');
      if (!wrap) { wrap = document.createElement('span'); wrap.className='btn-ripple'; btn.appendChild(wrap); }
      wrap.appendChild(ripple);
      setTimeout(function(){ ripple.remove(); }, 700);
    });
  });

  /* ---------------- NAVBAR: hide/show + scrolled + active link ---------------- */
  var navbar = document.getElementById('navbar');
  var lastY = window.scrollY;
  var navLinks = document.querySelectorAll('.nav-link');
  var sections = document.querySelectorAll('section[id], header[id]');

  window.addEventListener('scroll', function(){
    var y = window.scrollY;
    navbar.classList.toggle('scrolled', y > 40);
    if (y > lastY && y > 160) navbar.classList.add('nav-hidden');
    else navbar.classList.remove('nav-hidden');
    lastY = y;

    /* active section */
    var current = '';
    sections.forEach(function(sec){
      var top = sec.offsetTop - 140;
      if (y >= top) current = sec.id;
    });
    navLinks.forEach(function(l){
      l.classList.toggle('active', l.getAttribute('href') === '#' + current);
    });

    updateGrowthLine();
    updateBackToTop();
  }, { passive:true });

  /* ---------------- SMOOTH ANCHOR SCROLL ---------------- */
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      var offset = target.offsetTop - 86;
      window.scrollTo({ top: offset, behavior: reduceMotion ? 'auto' : 'smooth' });
      hamburger.classList.remove('active');
      mobileMenu.classList.remove('active');
      document.body.classList.remove('lock-scroll');
    });
  });

  /* ---------------- MOBILE MENU ---------------- */
  var hamburger = document.getElementById('hamburger');
  var mobileMenu = document.getElementById('mobileMenu');
  hamburger.addEventListener('click', function(){
    hamburger.classList.toggle('active');
    mobileMenu.classList.toggle('active');
    document.body.classList.toggle('lock-scroll');
  });

  /* ---------------- HERO FLOATING LEAVES ---------------- */
  var particleHost = document.getElementById('heroParticles');
  var leafIcons = ['fa-leaf','fa-seedling'];
  if (!reduceMotion) {
    for (var i=0; i<14; i++) {
      var leaf = document.createElement('i');
      leaf.className = 'fa-solid ' + leafIcons[i % 2];
      leaf.style.left = (Math.random()*100) + '%';
      leaf.style.top = (-10 - Math.random()*30) + '%';
      leaf.style.fontSize = (10 + Math.random()*10) + 'px';
      leaf.style.animationDuration = (10 + Math.random()*10) + 's';
      leaf.style.animationDelay = (Math.random()*10) + 's';
      particleHost.appendChild(leaf);
    }
  }

  /* ---------------- GROWTH LINE (scroll progress vine) ---------------- */
  var growthFill = document.getElementById('growthFill');
  var fillLength = 0;
  if (growthFill) { fillLength = growthFill.getTotalLength(); growthFill.style.strokeDasharray = fillLength; growthFill.style.strokeDashoffset = fillLength; }
  var buds = [document.getElementById('bud1'), document.getElementById('bud2'), document.getElementById('bud3')];

  function updateGrowthLine(){
    if (!growthFill) return;
    var docH = document.documentElement.scrollHeight - window.innerHeight;
    var progress = docH > 0 ? Math.min(window.scrollY / docH, 1) : 0;
    growthFill.style.strokeDashoffset = fillLength * (1 - progress);
    buds.forEach(function(b, i){
      var threshold = (i+1) / 4;
      if (b) b.style.opacity = progress >= threshold - 0.08 ? 1 : 0;
    });
  }

  /* ---------------- SCROLL REVEAL ---------------- */
  var revealEls = document.querySelectorAll('[data-reveal]');
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.16, rootMargin: '0px 0px -60px 0px' });
  revealEls.forEach(function(el){ io.observe(el); });

  /* ---------------- PROCESS VINE FILL ---------------- */
  var pvFill = document.getElementById('pvFill');
  var processList = document.querySelector('.process-list');
  if (pvFill && processList) {
    var pvLen = pvFill.getTotalLength();
    pvFill.style.strokeDasharray = pvLen;
    pvFill.style.strokeDashoffset = pvLen;
    var pvIO = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting) {
          pvFill.style.transition = 'stroke-dashoffset 1.8s cubic-bezier(.16,1,.3,1)';
          pvFill.style.strokeDashoffset = 0;
          pvIO.disconnect();
        }
      });
    }, { threshold: 0.2 });
    pvIO.observe(processList);
  }

  /* ---------------- ANIMATED COUNTERS ---------------- */
  var counters = document.querySelectorAll('.counter');
  var counterIO = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (!entry.isIntersecting) return;
      var el = entry.target;
      var target = parseInt(el.getAttribute('data-count'), 10) || 0;
      var start = 0;
      var duration = 1600;
      var startTime = null;
      function step(ts){
        if (!startTime) startTime = ts;
        var p = Math.min((ts - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.floor(eased * target);
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = target;
      }
      requestAnimationFrame(step);
      counterIO.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach(function(el){ counterIO.observe(el); });

  /* ---------------- GALLERY FILTER ---------------- */
  var filterBtns = document.querySelectorAll('.filter-btn');
  var galleryItems = document.querySelectorAll('.gallery-item');
  filterBtns.forEach(function(btn){
    btn.addEventListener('click', function(){
      filterBtns.forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      var f = btn.getAttribute('data-filter');
      galleryItems.forEach(function(item){
        var match = f === 'all' || item.getAttribute('data-category') === f;
        item.classList.toggle('hidden', !match);
      });
    });
  });

  /* ---------------- LIGHTBOX ---------------- */
  var lightbox = document.getElementById('lightbox');
  var lbImg = document.getElementById('lbImg');
  var lbCaption = document.getElementById('lbCaption');
  var lbClose = document.getElementById('lbClose');
  var lbPrev = document.getElementById('lbPrev');
  var lbNext = document.getElementById('lbNext');
  var galleryArr = Array.prototype.slice.call(galleryItems);
  var currentIndex = 0;

  function openLightbox(index){
    var visible = galleryArr.filter(function(i){ return !i.classList.contains('hidden'); });
    currentIndex = visible.indexOf(galleryArr[index]) > -1 ? galleryArr.indexOf(galleryArr[index]) : index;
    showLightboxImage(index);
    lightbox.classList.add('active');
    document.body.classList.add('lock-scroll');
  }
  function showLightboxImage(index){
    var item = galleryArr[index];
    var img = item.querySelector('img');
    var title = item.querySelector('.gallery-caption h4').textContent;
    var cat = item.querySelector('.gallery-caption span').textContent;
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    lbCaption.textContent = title + ' — ' + cat;
    currentIndex = index;
  }
  galleryArr.forEach(function(item, i){
    item.addEventListener('click', function(){ openLightbox(i); });
  });
  lbClose.addEventListener('click', function(){
    lightbox.classList.remove('active');
    document.body.classList.remove('lock-scroll');
  });
  lightbox.addEventListener('click', function(e){ if (e.target === lightbox) lbClose.click(); });
  lbPrev.addEventListener('click', function(){ showLightboxImage((currentIndex - 1 + galleryArr.length) % galleryArr.length); });
  lbNext.addEventListener('click', function(){ showLightboxImage((currentIndex + 1) % galleryArr.length); });
  document.addEventListener('keydown', function(e){
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') lbClose.click();
    if (e.key === 'ArrowLeft') lbPrev.click();
    if (e.key === 'ArrowRight') lbNext.click();
  });

  /* ---------------- FAQ ACCORDION ---------------- */
  document.querySelectorAll('.faq-item').forEach(function(item){
    var q = item.querySelector('.faq-q');
    var a = item.querySelector('.faq-a');
    q.addEventListener('click', function(){
      var isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(function(openItem){
        openItem.classList.remove('open');
        openItem.querySelector('.faq-a').style.maxHeight = null;
      });
      if (!isOpen) {
        item.classList.add('open');
        a.style.maxHeight = a.scrollHeight + 'px';
      }
    });
  });

  /* ---------------- FLOATING LABEL SELECT SUPPORT ---------------- */
  document.querySelectorAll('.field select').forEach(function(sel){
    var field = sel.closest('.field');
    function sync(){ field.classList.toggle('select-filled', !!sel.value); }
    sel.addEventListener('change', sync);
    sync();
  });

  /* ---------------- BACK TO TOP ---------------- */
  var dockTop = document.getElementById('dockTop');
  function updateBackToTop(){
    dockTop.classList.toggle('show', window.scrollY > 700);
  }
  dockTop.addEventListener('click', function(){
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  /* ---------------- CONTACT FORM -> WHATSAPP ---------------- */
  window.sendToWhatsApp = function(e){
    e.preventDefault();
    var form = document.getElementById('landscape-contact-form');
    var firstName = form.firstName.value.trim();
    var lastName = form.lastName.value.trim();
    var email = form.email.value.trim();
    var phone = form.phone.value.trim();
    var service = form.service.value;
    var address = form.address.value.trim();
    var message = form.message.value.trim();

    var text = 'Hi Landscapers Inc, I would like a quote.\n\n' +
      'Name: ' + firstName + ' ' + lastName + '\n' +
      'Email: ' + email + '\n' +
      'Phone: ' + phone + '\n' +
      'Service: ' + service + '\n' +
      'Address: ' + address + '\n' +
      'Details: ' + message;

    var url = 'https://wa.me/27691315387?text=' + encodeURIComponent(text);

    form.classList.add('hide');
    document.getElementById('successMessage').classList.add('show');

    setTimeout(function(){
      window.open(url, '_blank');
    }, 700);
  };

  /* init on load */
  updateGrowthLine();
  updateBackToTop();
})();
