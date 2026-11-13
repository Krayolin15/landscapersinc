/* ==========================================================
   LANDSCAPERS INC. — SIGNATURE SCENE
   Seed → roots → shoot → sapling → tree → Landscapers Inc. logo

   One continuous, procedurally drawn canvas scene. Scroll position
   (GSAP ScrollTrigger, scrubbed) is the only thing that advances the
   story, so it plays forwards and backwards. Wind, dust and light are
   the only time-based motion.

   Nothing here is a pre-rendered clip: the tree is a branch hierarchy
   that is re-posed every frame, and the leaves themselves fly into the
   pixels of the real logo before the real artwork fades in over them.
   ========================================================== */
(function () {
  'use strict';

  var section = document.getElementById('growth');
  var stage = document.getElementById('growthStage');
  var canvas = document.getElementById('growthCanvas');
  if (!section || !stage || !canvas) return;

  var ctx = canvas.getContext && canvas.getContext('2d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!ctx || reduce) { section.classList.add('is-static'); return; }

  /* ---------------- helpers ---------------- */
  var PI = Math.PI, TAU = PI * 2;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function sat(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { t = sat(t); return t * t * (3 - 2 * t); }
  function range(p, a, b) { return sat((p - a) / (b - a)); }
  function sRange(p, a, b) { return smooth((p - a) / (b - a)); }
  function easeInOut(t) { t = sat(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function mix3(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function css(c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a === undefined ? 1 : a) + ')'; }
  // piecewise-linear keyframes with smoothed segments: [[p, value|array], ...]
  function key(frames, p) {
    if (p <= frames[0][0]) return frames[0][1];
    for (var i = 1; i < frames.length; i++) {
      if (p <= frames[i][0]) {
        var a = frames[i - 1], b = frames[i], t = (p - a[0]) / (b[0] - a[0]);
        t = t * t * (3 - 2 * t) * 0.6 + t * 0.4;        // soften the joins without stalling the camera
        if (typeof a[1] === 'number') return lerp(a[1], b[1], t);
        return mix3(a[1], b[1], t);
      }
    }
    return frames[frames.length - 1][1];
  }

  /* ---------------- sizing ---------------- */
  var W = 0, H = 0, DPR = 1, mobile = false, lowPower = false;
  var S1 = 400;          // px per world unit at the final (whole tree) framing; 1 unit ≈ tree height
  var anchorX = 0;       // screen x of the tree
  var groundFinal = 0;   // screen y of the ground at the final framing

  /* ---------------- scene data ---------------- */
  var tree, roots, leaves = [], twigs = [], grass = [], specks = [], motes = [], stars = [], crumbs = [];
  var EMBLEM = { x: 0, y: -0.615, r: 0.345 }, treeH = 1;
  var logoImg = new Image(), wordImg = new Image(), logoReady = false, wordReady = false, targetsReady = false;

  var LEAF = ['#1c4429', '#24573a', '#2e6a41', '#34764C', '#4b8a4f', '#6a9f58', '#8fb765', '#b3cc7a'].map(hex);
  var BARK = hex('#3a2a1d'), BARK_HI = hex('#7a5d40'), STEM = hex('#6f9b45'), ROOT = hex('#d6c29c');

  function buildTree(rand, o) {
    var list = [];
    (function add(parent, depth, rel, len, width, t0, attach) {
      var dur = Math.max(0.16, (1 - t0) * 0.96);
      var b = { parent: parent, depth: depth, rel: rel, len: len, width: width, t0: t0, dur: dur, attach: attach,
        bend: (rand() - 0.5) * o.bend, phase: rand() * TAU, x0: 0, y0: 0, x1: 0, y1: 0, cx: 0, cy: 0, ang: 0, g: 0, w: 0 };
      list.push(b);
      if (depth >= o.depth) return;
      var n = depth === 0 ? o.first : (rand() < o.triple ? 3 : 2);
      for (var k = 0; k < n; k++) {
        var spread = (k - (n - 1) / 2) * (o.spread + rand() * o.spreadVar) + (rand() - 0.5) * 0.28;
        add(b, depth + 1, spread, len * (o.shrink + rand() * 0.14), width * o.taper, t0 + dur * (0.24 + rand() * 0.09), 1);
      }
      if (depth <= o.sideMax && rand() < o.side) {
        add(b, depth + 2, (rand() < 0.5 ? -1 : 1) * (0.75 + rand() * 0.45), len * 0.5, width * 0.4, t0 + dur * (0.42 + rand() * 0.1), 0.5 + rand() * 0.3);
      }
    })(null, 0, 0, o.len, o.width, 0, 1);
    return list;
  }

  // Re-pose the whole hierarchy for growth amount tau (0..1). Children ride on their parent's
  // current tip, so the plant genuinely elongates and branches rather than scaling up.
  function pose(list, tau, time, baseAngle, sway, ox, oy, pw) {
    for (var i = 0; i < list.length; i++) {
      var b = list[i], p = b.parent;
      var g = sat((tau - b.t0) / b.dur);
      g = Math.pow(g * g * (3 - 2 * g), b.depth === 0 ? pw : 1.25);
      b.g = g;
      var age = sat((tau - b.t0) / (1.001 - b.t0));
      b.w = b.width * (0.16 + 0.84 * age * age);
      var L = b.len * g;
      var sw = sway ? Math.sin(time * (0.7 + b.depth * 0.17) + b.phase) * sway * (0.25 + b.depth * 0.3) : 0;
      if (p) {
        var t = b.attach, u = 1 - t;
        b.x0 = u * u * p.x0 + 2 * u * t * p.cx + t * t * p.x1;
        b.y0 = u * u * p.y0 + 2 * u * t * p.cy + t * t * p.y1;
        b.ang = p.ang + b.rel + sw;
      } else { b.x0 = ox; b.y0 = oy; b.ang = baseAngle + sw * 0.5; }
      var dx = Math.cos(b.ang), dy = Math.sin(b.ang);
      b.x1 = b.x0 + dx * L; b.y1 = b.y0 + dy * L;
      b.cx = b.x0 + dx * L * 0.5 - dy * L * b.bend;
      b.cy = b.y0 + dy * L * 0.5 + dx * L * b.bend;
    }
  }

  function build() {
    var rand = rng(mobile ? 77123 : 90417);
    var depth = lowPower ? 5 : 6;
    tree = buildTree(rand, { depth: depth, first: 3, triple: 0.24, spread: 0.52, spreadVar: 0.22, shrink: 0.68, taper: 0.64, bend: 0.34, side: 0.85, sideMax: 2, len: 0.33, width: 0.058 });
    roots = buildTree(rng(5521), { depth: 4, first: 3, triple: 0.3, spread: 0.72, spreadVar: 0.3, shrink: 0.62, taper: 0.6, bend: 0.7, side: 0.6, sideMax: 1, len: 0.085, width: 0.016 });

    // rest pose (fully grown, no wind) → used to place leaves and to choreograph the morph
    pose(tree, 1, 0, -PI / 2, 0, 0, 0, 2.3);

    leaves = []; twigs = [];
    var perTip = lowPower ? 9 : 14;
    for (var i = 0; i < tree.length; i++) {
      var b = tree[i];
      var n = b.depth >= depth ? perTip : b.depth === depth - 1 ? Math.round(perTip * 0.65) : b.depth === depth - 2 ? 5 : b.depth === depth - 3 ? 3 : b.depth >= 1 ? 2 : 0;
      for (var k = 0; k < n; k++) {
        var f = 0.35 + rand() * 0.65, a = rand() * TAU, r = Math.sqrt(rand()) * (0.035 + rand() * 0.07);
        var u = 1 - f;
        var rx = u * u * b.x0 + 2 * u * f * b.cx + f * f * b.x1 + Math.cos(a) * r;
        var ry = u * u * b.y0 + 2 * u * f * b.cy + f * f * b.y1 + Math.sin(a) * r * 0.85;
        // light comes from the upper right: sunlit leaves get the lighter greens
        var lit = sat(0.5 + (rx * 0.9 - (ry + 0.62) * 1.5) * 0.9 + (rand() - 0.5) * 0.7);
        var back = rand() < 0.36;
        leaves.push({ b: b, f: f, ox: Math.cos(a) * r, oy: Math.sin(a) * r * 0.85, rx: rx, ry: ry,
          size: 0.0125 + rand() * 0.0135, rot: rand() * PI, shade: clamp(Math.round((back ? lit * 3 : 1.5 + lit * 6)), 0, 7), back: back,
          t0: Math.min(0.9, b.t0 + b.dur * (0.1 + rand() * 0.55)), phase: rand() * TAU,
          delay: 0, swirl: (rand() - 0.5) * 0.3, spin: (rand() - 0.5) * 7, tx: 0, ty: 0, tc: LEAF[3], x: 0, y: 0 });
      }
    }
    // extra particles sampled along the wood, so the trunk and branches dissolve into the logo too
    var nTw = lowPower ? 160 : 340;
    for (var j = 0; j < nTw; j++) {
      var bb = tree[Math.floor(Math.pow(rand(), 1.6) * tree.length)], ff = rand(), uu = 1 - ff;
      twigs.push({ rx: uu * uu * bb.x0 + 2 * uu * ff * bb.cx + ff * ff * bb.x1, ry: uu * uu * bb.y0 + 2 * uu * ff * bb.cy + ff * ff * bb.y1,
        size: 0.006 + rand() * 0.006, delay: 0, swirl: (rand() - 0.5) * 0.24, spin: 0, tx: 0, ty: 0, tc: BARK, wood: true });
    }

    // measure the grown tree so the framing and the logo are fitted to it
    var top = 0;
    for (var li = 0; li < leaves.length; li++) if (leaves[li].ry < top) top = leaves[li].ry;
    treeH = -top + 0.02;
    EMBLEM.r = treeH * 0.335; EMBLEM.x = 0; EMBLEM.y = -(0.03 + EMBLEM.r * 1.9);

    grass = [];
    var gr = rng(311), nG = lowPower ? 520 : 900;
    for (var q = 0; q < nG; q++) {
      var gx = (q / nG - 0.5) * 6.4 + (gr() - 0.5) * 0.01;
      var clear = sat((Math.abs(gx) - 0.035) / 0.1);      // bare patch of soil around the seed
      grass.push({ x: gx, h: (0.012 + gr() * 0.03) * (0.15 + 0.85 * clear), lean: (gr() - 0.5) * 0.9, phase: gr() * TAU, shade: Math.floor(gr() * 4), skip: clear < 0.04 });
    }
    specks = [];
    var sr = rng(907);
    for (var s = 0; s < 420; s++) specks.push({ x: (sr() - 0.5) * 0.7, y: 0.004 + Math.pow(sr(), 1.4) * 0.3, r: 0.0012 + sr() * 0.0042, c: sr(), e: 0.5 + sr() * 0.5 });
    for (var s2 = 0; s2 < 520; s2++) specks.push({ x: (sr() - 0.5) * 6.2, y: 0.006 + sr() * 0.36, r: 0.003 + sr() * 0.008, c: sr(), e: 0.5 + sr() * 0.5 });

    motes = [];
    var mr = rng(42);
    for (var m = 0; m < (lowPower ? 26 : 48); m++) motes.push({ x: mr(), y: mr(), r: 0.6 + mr() * 1.8, sp: 0.2 + mr() * 0.8, phase: mr() * TAU, a: 0.15 + mr() * 0.4 });
    stars = [];
    for (var st = 0; st < 70; st++) stars.push({ x: mr(), y: mr() * 0.62, r: 0.4 + mr() * 1.1, phase: mr() * TAU });
    crumbs = [];
    for (var c = 0; c < 16; c++) crumbs.push({ dir: (mr() - 0.5) * 2, h: 0.012 + mr() * 0.03, r: 0.0016 + mr() * 0.003, d: mr() * 0.25 });

    if (logoReady) buildTargets();
  }

  // Sample the real emblem artwork: every leaf gets a destination pixel and that pixel's colour.
  function buildTargets() {
    var all = leaves.concat(twigs), N = all.length, size = 220, data = null;
    try {
      var oc = document.createElement('canvas'); oc.width = oc.height = size;
      var ox = oc.getContext('2d'); ox.drawImage(logoImg, 0, 0, size, size);
      data = ox.getImageData(0, 0, size, size).data;
    } catch (e) { data = null; }      // e.g. opened from file:// — fall back to a plain disc in brand colours
    var rand = rng(1234), pts = [], guard = 0;
    while (pts.length < N && guard++ < N * 60) {
      var a = rand() * TAU, r = Math.sqrt(rand());
      var u = 0.5 + Math.cos(a) * r * 0.5, v = 0.5 + Math.sin(a) * r * 0.5, col;
      if (data) {
        var idx = ((v * (size - 1) | 0) * size + (u * (size - 1) | 0)) * 4;
        if (data[idx + 3] < 140) continue;
        col = [data[idx], data[idx + 1], data[idx + 2]];
      } else col = LEAF[2 + (rand() * 5 | 0)];
      pts.push({ x: EMBLEM.x + (u - 0.5) * 2 * EMBLEM.r, y: EMBLEM.y + (v - 0.5) * 2 * EMBLEM.r, c: col });
    }
    while (pts.length < N) pts.push(pts[(rand() * pts.length) | 0] || { x: EMBLEM.x, y: EMBLEM.y, c: LEAF[3] });
    // pair particles with nearby destinations (banded by height, then left→right) so the canopy
    // folds into the emblem instead of scrambling across itself
    var band = function (o, yk, xk) { return Math.round((o[yk] + 1.1) * 11) * 10 + (o[xk] + 1); };
    var src = all.slice().sort(function (p, q) { return band(p, 'ry', 'rx') - band(q, 'ry', 'rx'); });
    pts.sort(function (p, q) { return band(p, 'y', 'x') - band(q, 'y', 'x'); });
    for (var i = 0; i < N; i++) {
      var s = src[i], t = pts[i];
      s.tx = t.x; s.ty = t.y; s.tc = t.c;
      // the top of the canopy lets go first
      s.delay = clamp(0.04 + (s.ry + 1.02) * 0.34 + rand() * 0.2, 0, 0.46);
    }
    targetsReady = true;
  }

  logoImg.onload = function () { logoReady = true; if (leaves.length) buildTargets(); };
  wordImg.onload = function () { wordReady = true; };

  /* ---------------- state ---------------- */
  var state = { p: 0 };
  var running = false, raf = 0, lastT = 0, time = 0;
  var panels = Array.prototype.slice.call(stage.querySelectorAll('.g-panel')).map(function (el) {
    return { el: el, a: parseFloat(el.dataset.from), b: parseFloat(el.dataset.to), o: -1 };
  });
  var stepEls = Array.prototype.slice.call(stage.querySelectorAll('.growth-steps li')).map(function (el) { return { el: el, at: parseFloat(el.dataset.at), on: null }; });
  var isLight = null;

  function resize() {
    var w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    var wasMobile = mobile, first = !W;
    // ignore the small height changes caused by mobile browser chrome showing/hiding
    if (!first && w === W && Math.abs(h - H) < 130) return;
    W = w; H = h;
    mobile = W < 900;
    lowPower = mobile || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
    DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    if (first || wasMobile !== mobile) build();
    if (mobile) {
      anchorX = W * 0.5; groundFinal = H * 0.925;
      S1 = Math.min(H * 0.41, W * 0.9) / treeH;
    } else {
      anchorX = W * 0.71; groundFinal = H * 0.86;
      S1 = Math.min(groundFinal - 96, W * 0.5) / treeH;
    }
    if (!running) draw();
  }

  /* ---------------- camera ---------------- */
  // zoom = multiple of the final framing; fy = world y kept at screen y (sy · H)
  var CAM_ZOOM = [[0, 7.2], [0.11, 8.2], [0.23, 6.4], [0.35, 3.5], [0.47, 3.1], [0.6, 1.75], [0.74, 1], [1, 1]];
  var CAM_FY = [[0, -0.012], [0.11, -0.008], [0.23, 0.03], [0.35, 0.045], [0.47, -0.05], [0.6, -0.06], [0.74, 0], [1, 0]];
  var CAM_SY = [[0, 0.6], [0.11, 0.58], [0.23, 0.5], [0.35, 0.48], [0.47, 0.64], [0.6, 0.74], [0.74, 0.86], [1, 0.86]];
  var cam = { s: 1, ox: 0, oy: 0 };
  function X(x) { return cam.ox + x * cam.s; }
  function Y(y) { return cam.oy + y * cam.s; }

  var SKY_TOP = [[0, hex('#040c09')], [0.3, hex('#0a2029')], [0.42, hex('#25506e')], [0.54, hex('#7fb1d0')], [0.74, hex('#aacfe2')], [0.86, hex('#F5F2E9')]];
  var SKY_BOT = [[0, hex('#0f2a20')], [0.24, hex('#2b4a41')], [0.36, hex('#d99a6c')], [0.46, hex('#f3c99b')], [0.58, hex('#f4e6c8')], [0.74, hex('#f1ecda')], [0.86, hex('#F5F2E9')]];

  function surface(x) { return Math.sin(x * 37) * 0.0016 + Math.sin(x * 11.3 + 1.7) * 0.0026 - 0.004 * Math.exp(-x * x / 0.0009) + 0.004; }

  /* ---------------- draw ---------------- */
  function draw() {
    var p = state.p;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    // camera
    var zoom = key(CAM_ZOOM, p), fy = key(CAM_FY, p), sy = key(CAM_SY, p);
    var syPx = lerp(sy * H, groundFinal, sRange(p, 0.58, 0.74));
    cam.s = S1 * zoom; cam.ox = anchorX; cam.oy = syPx - fy * cam.s;
    if (!mobile) cam.ox = lerp(W * 0.64, anchorX, sRange(p, 0.3, 0.72));     // drift right as the camera pulls back
    var gy = Y(0);

    var tau = Math.pow(range(p, 0.335, 0.76), 0.92);       // tree growth
    var rho = smooth(range(p, 0.125, 0.52));                // root growth
    var M = range(p, 0.775, 0.935);                         // tree → logo
    var fadeWorld = 1 - sRange(M, 0.02, 0.42);              // ground, roots, wood
    var day = sRange(p, 0.36, 0.58);
    var wind = 0.012 + 0.02 * day;

    /* sky */
    var top = key(SKY_TOP, p), bot = key(SKY_BOT, p);
    var sky = ctx.createLinearGradient(0, 0, 0, Math.max(gy, H * 0.5));
    sky.addColorStop(0, css(top)); sky.addColorStop(1, css(bot));
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

    var night = 1 - sRange(p, 0.16, 0.4);
    if (night > 0.01) {
      ctx.fillStyle = '#fff';
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        ctx.globalAlpha = night * (0.25 + 0.5 * (0.5 + 0.5 * Math.sin(time * 1.3 + s.phase)));
        ctx.beginPath(); ctx.arc(s.x * W, s.y * Math.min(gy, H), s.r, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    /* sun: rises behind the horizon as the shoot breaks through */
    var sunUp = sRange(p, 0.3, 0.7);
    var sunA = sRange(p, 0.26, 0.4) * (1 - sRange(M, 0.05, 0.5));
    var sunX = anchorX + (mobile ? W * 0.22 : W * 0.13), sunY = lerp(gy + S1 * 0.05, H * (mobile ? 0.34 : 0.2), sunUp);
    if (sunA > 0.01) {
      var R = Math.max(W, H) * 0.62;
      var g = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, R);
      g.addColorStop(0, 'rgba(255,236,190,' + 0.72 * sunA + ')');
      g.addColorStop(0.1, 'rgba(255,214,150,' + 0.36 * sunA + ')');
      g.addColorStop(0.4, 'rgba(255,196,130,' + 0.1 * sunA + ')');
      g.addColorStop(1, 'rgba(255,196,130,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,246,222,' + 0.9 * sunA + ')';
      ctx.beginPath(); ctx.arc(sunX, sunY, S1 * 0.035, 0, TAU); ctx.fill();
    }

    /* distant hills — soft, low-contrast, like a shallow depth of field */
    if (fadeWorld > 0.01) {
      var zf = Math.pow(zoom, 0.3);
      for (var hl = 0; hl < 2; hl++) {
        var hc = mix3(mix3(hex('#0d2a1e'), hex('#3d6a4c'), day), bot, 0.55 - hl * 0.22);
        ctx.fillStyle = css(hc, fadeWorld);
        ctx.beginPath(); ctx.moveTo(0, gy + 2);
        for (var hx = 0; hx <= W + 40; hx += 40) {
          var wx = (hx - cam.ox) / (S1 * zf * (2.2 - hl * 0.6)) + hl * 3.1;
          ctx.lineTo(hx, gy - (0.5 + 0.5 * Math.sin(wx * 2.1) * Math.cos(wx * 0.83 + 1)) * S1 * zf * (0.085 - hl * 0.045) - S1 * 0.004);
        }
        ctx.lineTo(W + 40, gy + 2); ctx.closePath(); ctx.fill();
      }
    }

    /* light shafts through the canopy */
    var rays = sRange(p, 0.56, 0.7) * (1 - sRange(M, 0, 0.3));
    if (rays > 0.01) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (var ry = 0; ry < 5; ry++) {
        var ang = PI * 0.62 + ry * 0.13 + Math.sin(time * 0.15 + ry) * 0.02, len = Math.max(W, H);
        var rg = ctx.createLinearGradient(sunX, sunY, sunX + Math.cos(ang) * len * 0.7, sunY + Math.sin(ang) * len * 0.7);
        rg.addColorStop(0, 'rgba(255,240,205,' + 0.11 * rays + ')'); rg.addColorStop(1, 'rgba(255,240,205,0)');
        ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(sunX, sunY);
        ctx.lineTo(sunX + Math.cos(ang - 0.035) * len, sunY + Math.sin(ang - 0.035) * len);
        ctx.lineTo(sunX + Math.cos(ang + 0.035) * len, sunY + Math.sin(ang + 0.035) * len);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }

    /* soil cross-section */
    var x0w = (0 - cam.ox) / cam.s - 0.05, x1w = (W - cam.ox) / cam.s + 0.05;
    if (fadeWorld > 0.01 && gy < H + 4) {
      ctx.globalAlpha = fadeWorld;
      var soil = ctx.createLinearGradient(0, gy, 0, gy + cam.s * 0.34);
      soil.addColorStop(0, '#3b2717'); soil.addColorStop(0.16, '#2a1b10'); soil.addColorStop(1, '#0d0906');
      ctx.fillStyle = soil; ctx.beginPath(); ctx.moveTo(-2, H + 2);
      var stepW = Math.max((x1w - x0w) / 90, 0.002);
      for (var sx = x0w; sx <= x1w + stepW; sx += stepW) ctx.lineTo(X(sx), Y(surface(sx)));
      ctx.lineTo(W + 2, H + 2); ctx.closePath(); ctx.fill();

      for (var k = 0; k < specks.length; k++) {
        var sp = specks[k];
        if (sp.x < x0w || sp.x > x1w) continue;
        var pr = sp.r * cam.s; if (pr < 0.45) continue;
        var py = Y(sp.y + surface(sp.x)); if (py > H + pr) continue;
        ctx.fillStyle = sp.c > 0.72 ? 'rgba(150,118,84,.5)' : sp.c > 0.4 ? 'rgba(94,68,44,.55)' : 'rgba(10,7,4,.5)';
        ctx.beginPath(); ctx.ellipse(X(sp.x), py, pr, pr * sp.e, sp.c * 3, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    /* roots */
    if (rho > 0.001 && fadeWorld > 0.01) {
      pose(roots, rho, time, PI / 2, 0.006, 0, 0.004, 1.2);
      ctx.lineCap = 'round'; ctx.globalAlpha = fadeWorld;
      for (var r2 = 0; r2 < roots.length; r2++) {
        var rb = roots[r2]; if (rb.g <= 0.002) continue;
        var rw = Math.max(rb.w * cam.s, 0.7);
        ctx.strokeStyle = css(mix3(ROOT, hex('#a98f66'), sat(rb.depth / 4)), 0.95);
        ctx.lineWidth = rw; ctx.beginPath(); ctx.moveTo(X(rb.x0), Y(rb.y0)); ctx.quadraticCurveTo(X(rb.cx), Y(rb.cy), X(rb.x1), Y(rb.y1)); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    /* tree pose (needed before leaves) */
    pose(tree, tau, time, -PI / 2, tau > 0 ? wind : 0, 0, -0.004, 2.3);
    var woodA = 1 - sRange(M, 0.06, 0.5);

    var morphing = M > 0 && targetsReady;
    var dotR = EMBLEM.r * cam.s * Math.sqrt(1 / Math.max(leaves.length + twigs.length, 1)) * 1.5;
    var partA = 1 - sRange(M, 0.86, 1);

    function drawLeaves(back) {
      if (tau <= 0) return;
      for (var i = 0; i < leaves.length; i++) {
        var lf = leaves[i]; if (lf.back !== back) continue;
        var gl = sat((tau - lf.t0) / 0.1); if (gl <= 0) continue;
        gl = gl * gl * (3 - 2 * gl);
        var b = lf.b, f = lf.f, u = 1 - f;
        var flut = Math.sin(time * 1.9 + lf.phase) * wind * 0.25;
        var x = u * u * b.x0 + 2 * u * f * b.cx + f * f * b.x1 + lf.ox * gl + flut;
        var y = u * u * b.y0 + 2 * u * f * b.cy + f * f * b.y1 + lf.oy * gl + flut * 0.4;
        var col = LEAF[lf.shade], rx = lf.size * gl * cam.s, ry = rx * 0.52, rot = lf.rot + flut * 14, a = 1;
        if (morphing) {
          var m = easeInOut((M - lf.delay) / 0.5);
          if (m > 0) {
            var dx = lf.tx - x, dy = lf.ty - y, arc = Math.sin(PI * m);
            x += dx * m - dy * arc * lf.swirl + arc * 0.03;        // lift off, drift on the wind, curl in
            y += dy * m + dx * arc * lf.swirl + arc * 0.035 * (lf.swirl > 0 ? 1 : -0.4);
            col = mix3(col, lf.tc, smooth(m * 1.15));
            rx = lerp(rx, dotR, m); ry = lerp(ry, dotR, m); rot += lf.spin * arc;
            a = partA;
          }
        }
        if (a <= 0.01 || rx < 0.3) continue;
        ctx.fillStyle = css(col, a);
        ctx.beginPath(); ctx.ellipse(X(x), Y(y), rx, ry, rot, 0, TAU); ctx.fill();
      }
    }

    drawLeaves(true);

    /* trunk + branches */
    if (tau > 0 && woodA > 0.01) {
      ctx.lineCap = 'round'; ctx.globalAlpha = woodA;
      var young = 1 - sRange(tau, 0.2, 0.5);
      for (var t2 = 0; t2 < tree.length; t2++) {
        var tb = tree[t2]; if (tb.g <= 0.002) continue;
        var w0 = tb.w * cam.s, w1 = w0 * 0.66;
        if (w0 < 0.35) continue;
        var bc = mix3(mix3(BARK, hex('#5b4530'), sat(tb.depth / 6)), STEM, tb.depth === 0 ? young : young * 0.6);
        ctx.strokeStyle = css(bc);
        // tapered stroke: three segments along the curve
        var px = tb.x0, py2 = tb.y0;
        for (var sg = 1; sg <= 3; sg++) {
          var tt = sg / 3, uu = 1 - tt;
          var nx = uu * uu * tb.x0 + 2 * uu * tt * tb.cx + tt * tt * tb.x1, ny = uu * uu * tb.y0 + 2 * uu * tt * tb.cy + tt * tt * tb.y1;
          ctx.lineWidth = Math.max(lerp(w0, w1, (sg - 0.5) / 3), 0.6);
          ctx.beginPath(); ctx.moveTo(X(px), Y(py2)); ctx.lineTo(X(nx), Y(ny)); ctx.stroke();
          px = nx; py2 = ny;
        }
        if (tb.depth <= 1 && w0 > 5) {         // sunlit edge on the heavy wood
          ctx.strokeStyle = css(mix3(BARK_HI, STEM, young), 0.5 * day);
          ctx.lineWidth = w0 * 0.22;
          var off = w0 * 0.2;
          ctx.beginPath(); ctx.moveTo(X(tb.x0) + off, Y(tb.y0)); ctx.quadraticCurveTo(X(tb.cx) + off, Y(tb.cy), X(tb.x1) + off * 0.6, Y(tb.y1)); ctx.stroke();
        }
      }
      // root flare where the trunk meets the soil
      var tr = tree[0], fw = tr.w * cam.s;
      if (fw > 3) {
        ctx.fillStyle = css(mix3(BARK, STEM, young));
        ctx.beginPath(); ctx.moveTo(X(0) - fw * 1.25, gy + 2); ctx.quadraticCurveTo(X(0) - fw * 0.5, gy - fw * 0.3, X(0) - fw * 0.48, gy - fw * 1.6);
        ctx.lineTo(X(0) + fw * 0.48, gy - fw * 1.6); ctx.quadraticCurveTo(X(0) + fw * 0.5, gy - fw * 0.3, X(0) + fw * 1.25, gy + 2); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;

      /* seed leaves (cotyledons) on the first shoot */
      var cot = sRange(tau, 0.02, 0.2) * (1 - sRange(tau, 0.36, 0.52));
      if (cot > 0.01) {
        var cs = 0.03 * cot * cam.s, open = sRange(tau, 0.05, 0.3) * 1.15, tipx = X(tr.x1), tipy = Y(tr.y1);
        for (var sd = -1; sd <= 1; sd += 2) {
          ctx.save(); ctx.translate(tipx, tipy); ctx.rotate(tr.ang + PI / 2 + sd * (0.12 + open) + Math.sin(time * 1.4 + sd) * 0.04);
          var lg = ctx.createLinearGradient(0, 0, 0, -cs);
          lg.addColorStop(0, '#4f8a3b'); lg.addColorStop(1, sd > 0 ? '#a5cf6a' : '#7fb556');
          ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(0, 0);
          ctx.bezierCurveTo(cs * 0.42, -cs * 0.25, cs * 0.36, -cs * 0.8, 0, -cs);
          ctx.bezierCurveTo(-cs * 0.36, -cs * 0.8, -cs * 0.42, -cs * 0.25, 0, 0); ctx.fill();
          ctx.strokeStyle = 'rgba(40,80,35,.45)'; ctx.lineWidth = Math.max(cs * 0.02, 0.6);
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -cs * 0.86); ctx.stroke();
          ctx.restore();
        }
      }
    }

    /* wood dissolving into particles */
    if (morphing) {
      var born = sRange(M, 0.04, 0.3);
      for (var w2 = 0; w2 < twigs.length; w2++) {
        var tw = twigs[w2];
        var m2 = easeInOut((M - tw.delay) / 0.5), arc2 = Math.sin(PI * m2);
        var dx2 = tw.tx - tw.rx, dy2 = tw.ty - tw.ry;
        var a2 = born * partA; if (a2 <= 0.01) continue;
        ctx.fillStyle = css(mix3(BARK, tw.tc, smooth(m2 * 1.15)), a2);
        ctx.beginPath(); ctx.arc(X(tw.rx + dx2 * m2 - dy2 * arc2 * tw.swirl), Y(tw.ry + dy2 * m2 + dx2 * arc2 * tw.swirl), lerp(tw.size * cam.s * 0.6, dotR, m2), 0, TAU); ctx.fill();
      }
    }

    drawLeaves(false);

    /* seed */
    var seedA = 1 - sRange(p, 0.46, 0.54);
    if (seedA > 0.01 && cam.s * 0.02 > 2) {
      var vib = sRange(p, 0.07, 0.1) * (1 - sRange(p, 0.14, 0.18));
      var crack = range(p, 0.1, 0.16), split = sRange(p, 0.15, 0.3), fall = sRange(p, 0.31, 0.44);
      var srx = 0.021 * cam.s, sry = 0.0128 * cam.s;
      var sxp = X(0) + Math.sin(time * 41) * vib * srx * 0.05, syp = Y(-0.0085) + Math.cos(time * 37) * vib * srx * 0.03;
      ctx.save(); ctx.globalAlpha = seedA;
      ctx.fillStyle = 'rgba(0,0,0,.34)'; ctx.beginPath(); ctx.ellipse(X(0.004), Y(0.0035), srx * 1.2, sry * 0.36, 0, 0, TAU); ctx.fill();
      ctx.translate(sxp, syp); ctx.rotate(-0.22 + Math.sin(time * 33) * vib * 0.05);
      for (var half = 0; half < 2; half++) {
        ctx.save();
        var dir = half ? 1 : -1;
        ctx.translate(dir * (split * 0.16 + fall * 0.85) * srx, -split * sry * (half ? 0.05 : 0.2) + fall * sry * 0.7); ctx.rotate(dir * (split * 0.34 + fall * 0.75));
        ctx.beginPath(); ctx.rect(half ? 0 : -srx * 1.6, -sry * 1.6, srx * 1.6, sry * 3.2); ctx.clip();
        var sg2 = ctx.createRadialGradient(srx * 0.25, -sry * 0.55, sry * 0.1, 0, 0, srx * 1.15);
        sg2.addColorStop(0, '#c99a62'); sg2.addColorStop(0.45, '#8a5a30'); sg2.addColorStop(1, '#3d2412');
        ctx.fillStyle = sg2; ctx.beginPath(); ctx.ellipse(0, 0, srx, sry, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(40,22,10,.35)'; ctx.lineWidth = Math.max(srx * 0.015, 0.6);
        for (var gl2 = -2; gl2 <= 2; gl2++) { ctx.beginPath(); ctx.ellipse(0, 0, srx * 0.97, sry * Math.abs(gl2) * 0.32 + 0.1, 0, 0, TAU); ctx.stroke(); }
        ctx.restore();
      }
      if (crack > 0 && split < 0.98) {
        ctx.strokeStyle = 'rgba(18,9,4,' + (0.9 * (1 - split)) + ')'; ctx.lineWidth = Math.max(srx * 0.03, 0.8); ctx.lineJoin = 'round';
        var zig = [[0.02, -1], [-0.07, -0.55], [0.06, -0.15], [-0.05, 0.3], [0.04, 0.68], [-0.01, 1]];
        ctx.beginPath(); ctx.moveTo(zig[0][0] * srx, zig[0][1] * sry * 0.98);
        var upto = crack * (zig.length - 1);
        for (var z = 1; z < zig.length; z++) {
          var zt = sat(upto - (z - 1)); if (zt <= 0) break;
          ctx.lineTo(lerp(zig[z - 1][0], zig[z][0], zt) * srx, lerp(zig[z - 1][1], zig[z][1], zt) * sry * 0.98);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    /* soil crumbs pushed aside by the shoot */
    var burst = range(p, 0.355, 0.47);
    if (burst > 0 && burst < 1 && fadeWorld > 0) {
      ctx.fillStyle = '#4a321f';
      for (var c2 = 0; c2 < crumbs.length; c2++) {
        var cr = crumbs[c2], e = sat((burst - cr.d) / 0.6); if (e <= 0) continue;
        ctx.globalAlpha = 1 - sRange(e, 0.8, 1);
        ctx.beginPath(); ctx.arc(X(cr.dir * e * 0.03), Y(-4 * cr.h * e * (1 - e) - 0.002), Math.max(cr.r * cam.s, 0.8), 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    /* grass along the surface */
    if (fadeWorld > 0.01 && gy < H + 30) {
      ctx.lineCap = 'round';
      var gcol = [mix3(hex('#0f2a1b'), hex('#2f6b3c'), day), mix3(hex('#143422'), hex('#3f7f45'), day), mix3(hex('#0c2317'), hex('#255a35'), day), mix3(hex('#183b27'), hex('#5a9550'), day)];
      for (var gsh = 0; gsh < 4; gsh++) {
        ctx.strokeStyle = css(gcol[gsh], fadeWorld); ctx.lineWidth = clamp(cam.s * 0.0026, 1, 9); ctx.beginPath();
        for (var gi = 0; gi < grass.length; gi++) {
          var bl = grass[gi]; if (bl.shade !== gsh || bl.skip || bl.x < x0w || bl.x > x1w) continue;
          var bx = X(bl.x), by = Y(surface(bl.x)) + 1, bh = bl.h * cam.s;
          var sway2 = (bl.lean + Math.sin(time * 1.25 + bl.phase + bl.x * 5) * (0.2 + day * 0.35)) * bh * 0.45;
          ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + sway2 * 0.2, by - bh * 0.6, bx + sway2, by - bh);
        }
        ctx.stroke();
      }
    }

    /* close-up vignette — keeps the eye on the seed, then opens up */
    var vig = (1 - sRange(p, 0.3, 0.6)) * 0.72;
    if (vig > 0.01) {
      var vg = ctx.createRadialGradient(X(0), Y(0), Math.min(W, H) * 0.14, X(0), Y(0), Math.max(W, H) * 0.78);
      vg.addColorStop(0, 'rgba(4,10,7,0)'); vg.addColorStop(1, 'rgba(4,10,7,' + vig + ')');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }

    /* soft scrim behind the copy while it is set in light type */
    var scrim = (1 - sRange(p, 0.49, 0.55)) * 0.62;
    if (scrim > 0.01) {
      var sg3 = mobile ? ctx.createLinearGradient(0, 0, 0, H * 0.5) : ctx.createLinearGradient(0, 0, W * 0.6, 0);
      sg3.addColorStop(0, 'rgba(4,10,7,' + scrim + ')'); sg3.addColorStop(1, 'rgba(4,10,7,0)');
      ctx.fillStyle = sg3; ctx.fillRect(0, 0, W, H);
    }

    /* dust in the light */
    var dust = (1 - sRange(p, 0.7, 0.8)) * (0.45 + 0.55 * sRange(p, 0.05, 0.3));
    if (dust > 0.01) {
      ctx.fillStyle = '#ffe9bf';
      for (var d = 0; d < motes.length; d++) {
        var mo = motes[d];
        var mx = ((mo.x + time * 0.006 * mo.sp + Math.sin(time * 0.3 + mo.phase) * 0.012) % 1) * W;
        var my = ((mo.y - time * 0.004 * mo.sp + 1 + Math.cos(time * 0.24 + mo.phase) * 0.014) % 1) * Math.min(gy, H);
        ctx.globalAlpha = mo.a * dust * (0.6 + 0.4 * Math.sin(time * 0.9 + mo.phase));
        ctx.beginPath(); ctx.arc(mx, my, mo.r, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    /* the real logo resolves out of the particles */
    if (M > 0.6 && logoReady) {
      var la = sRange(M, 0.68, 0.98), ex = X(EMBLEM.x), ey = Y(EMBLEM.y), er = EMBLEM.r * cam.s;
      var glow = sRange(M, 0.62, 0.9) * (1 - 0.55 * sRange(p, 0.94, 1));
      var gg = ctx.createRadialGradient(ex, ey, er * 0.7, ex, ey, er * 2.1);
      gg.addColorStop(0, 'rgba(198,165,107,' + 0.4 * glow + ')'); gg.addColorStop(0.45, 'rgba(198,165,107,' + 0.14 * glow + ')'); gg.addColorStop(1, 'rgba(198,165,107,0)');
      ctx.fillStyle = gg; ctx.fillRect(ex - er * 2.2, ey - er * 2.2, er * 4.4, er * 4.4);
      var sc = lerp(0.965, 1, sRange(M, 0.68, 1));
      ctx.globalAlpha = la;
      // the emblem asset has a small transparent margin around the ring (740px canvas, 712px ring)
      var half2 = er * sc * (728 / 712);
      ctx.drawImage(logoImg, ex - half2, ey - half2, half2 * 2, half2 * 2);
      ctx.globalAlpha = 1;
      var wa = sRange(p, 0.925, 0.975);
      if (wa > 0.01 && wordReady) {
        var ww = er * 2.42, wh = ww * (240 / 708), wy = ey + er * 1.05 + (1 - wa) * er * 0.12;
        ctx.globalAlpha = wa; ctx.drawImage(wordImg, ex - ww / 2, wy, ww, wh); ctx.globalAlpha = 1;
      }
    }

    updateUI(p);
  }

  /* ---------------- copy panels + step markers ---------------- */
  function updateUI(p) {
    var F = 0.022;
    for (var i = 0; i < panels.length; i++) {
      var pn = panels[i];
      var inn = i === 0 ? 1 : smooth((p - pn.a) / F), out = smooth((p - (pn.b - F)) / F);
      var o = Math.round(inn * (1 - out) * 100) / 100;
      if (o === pn.o) continue;
      pn.o = o;
      pn.el.style.opacity = o;
      pn.el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
      var shift = (1 - inn) * 26 - out * 26;
      pn.el.style.transform = mobile ? 'translateY(' + shift.toFixed(1) + 'px)' : 'translateY(calc(-50% + ' + shift.toFixed(1) + 'px))';
    }
    for (var s = 0; s < stepEls.length; s++) {
      var on = p >= stepEls[s].at - 0.001;
      if (on !== stepEls[s].on) { stepEls[s].on = on; stepEls[s].el.classList.toggle('is-on', on); }
    }
    var light = p > 0.535;
    if (light !== isLight) { isLight = light; stage.classList.toggle('is-light', light); }
  }

  /* ---------------- loop: only runs while the scene is on screen ---------------- */
  function frame(t) {
    if (!running) return;
    var dt = Math.min((t - lastT) / 1000 || 0, 0.05); lastT = t; time += dt;
    draw();
    raf = requestAnimationFrame(frame);
  }
  function start() { if (running) return; running = true; lastT = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  /* ---------------- scroll → progress ---------------- */
  function rawProgress() {
    var r = section.getBoundingClientRect(), span = r.height - window.innerHeight;
    return span > 0 ? sat(-r.top / span) : 0;
  }
  var gsapTween = null, nativeScroll = null;
  function bindScroll() {
    var gsap = window.gsap, ST = window.ScrollTrigger;
    if (gsap && ST) {
      gsap.registerPlugin(ST);
      state.p = 0;
      gsapTween = gsap.to(state, { p: 1, ease: 'none', scrollTrigger: { trigger: section, start: 'top top', end: 'bottom bottom', scrub: mobile ? 0.5 : 0.9, invalidateOnRefresh: true } });
    } else {
      // no GSAP (blocked or failed to load): follow native scroll with light smoothing
      var target = rawProgress(); state.p = target;
      nativeScroll = function () { target = rawProgress(); };
      window.addEventListener('scroll', nativeScroll, { passive: true });
      (function ease() { state.p += (target - state.p) * 0.12; requestAnimationFrame(ease); })();
    }
  }

  /* ---------------- boot ---------------- */
  var booted = false;
  function boot() {
    if (booted) return; booted = true;
    logoImg.src = 'assets/logo-emblem.webp';
    wordImg.src = 'assets/logo-wordmark.webp';
    resize();
    bindScroll();
    var ro = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(stage); else window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', function () { W = 0; setTimeout(resize, 250); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { if (en[0].isIntersecting) start(); else stop(); }, { rootMargin: '10% 0px' }).observe(section);
    } else start();
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else if (section.getBoundingClientRect().bottom > 0 && section.getBoundingClientRect().top < window.innerHeight) start(); });
    window.addEventListener('pagehide', function () {      // release resources when leaving the page
      stop();
      if (gsapTween && gsapTween.scrollTrigger) gsapTween.scrollTrigger.kill();
      if (nativeScroll) window.removeEventListener('scroll', nativeScroll);
      if (ro) ro.disconnect();
    });
  }
  // The scene sits directly below the hero, so set it up as soon as the page is interactive —
  // it never blocks the hero or the rest of the content from rendering.
  if (document.readyState === 'complete') boot(); else window.addEventListener('load', boot);
  setTimeout(boot, 1800);
})();
