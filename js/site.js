/* =========================================================
   TAJCOTTEX — site behaviour
   theme · language · navigation · reveal · counters ·
   3D tilt · parallax · news filter · contact form
   ========================================================= */
(function () {
  'use strict';

  var html = document.documentElement;
  var LANGS = ['ru', 'en', 'tj'];
  var LANG_KEY = 'tajcottex_lang';
  var THEME_KEY = 'tajcottex_theme';
  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;

  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function lang() { var l = html.getAttribute('data-l'); return LANGS.indexOf(l) > -1 ? l : 'ru'; }

  /* ---------- theme ---------- */
  function setTheme(theme, persist) {
    html.setAttribute('data-theme', theme);
    if (persist) { try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* storage unavailable */ } }
    var label = { ru: theme === 'dark' ? 'Светлая тема' : 'Тёмная тема', en: theme === 'dark' ? 'Light theme' : 'Dark theme', tj: theme === 'dark' ? 'Мавзӯи равшан' : 'Мавзӯи торик' }[lang()];
    $all('[data-theme-toggle]').forEach(function (b) { b.setAttribute('aria-label', label); b.setAttribute('title', label); });
  }
  document.addEventListener('click', function (e) {
    if (!e.target.closest('[data-theme-toggle]')) return;
    setTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
  });

  /* ---------- language ---------- */
  function applyLang(l, persist) {
    if (LANGS.indexOf(l) < 0) l = 'ru';
    html.setAttribute('data-l', l);
    html.lang = l === 'tj' ? 'tg' : l;
    if (persist) document.cookie = LANG_KEY + '=' + l + '; path=/; max-age=31536000; SameSite=Lax';
    $all('[data-lang-btn]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lang-btn') === l)); });
    var title = html.getAttribute('data-title-' + l);
    if (title) document.title = title.replace(/&amp;/g, '&');
    $all('[data-ph-' + l + ']').forEach(function (el) { el.setAttribute('placeholder', el.getAttribute('data-ph-' + l)); });
    $all('option[data-' + l + ']').forEach(function (o) { o.textContent = o.getAttribute('data-' + l).replace(/&amp;/g, '&'); });
    setTheme(html.getAttribute('data-theme') || 'light', false);
    formatCounters();
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-lang-btn]');
    if (b) applyLang(b.getAttribute('data-lang-btn'), true);
  });

  /* ---------- navigation ---------- */
  var nav = document.querySelector('[data-nav]');
  var progress = document.querySelector('[data-progress]');
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var y = window.scrollY || 0;
      if (nav) nav.classList.toggle('is-scrolled', y > 24);
      if (progress) {
        var max = document.documentElement.scrollHeight - innerHeight;
        progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
      }
      parallax();
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  var burger = document.querySelector('[data-burger]');
  var drawer = document.querySelector('[data-drawer]');
  function setDrawer(open) {
    if (!burger || !drawer) return;
    burger.setAttribute('aria-expanded', String(open));
    if (open) {
      drawer.hidden = false;
      requestAnimationFrame(function () { drawer.classList.add('is-open'); });
      document.body.style.overflow = 'hidden';
      var first = drawer.querySelector('a');
      if (first) setTimeout(function () { first.focus(); }, 60);
    } else {
      drawer.classList.remove('is-open');
      document.body.style.overflow = '';
      setTimeout(function () { if (!drawer.classList.contains('is-open')) drawer.hidden = true; }, 500);
    }
  }
  if (burger && drawer) {
    burger.addEventListener('click', function () { setDrawer(burger.getAttribute('aria-expanded') !== 'true'); });
    drawer.addEventListener('click', function (e) { if (e.target.closest('a')) setDrawer(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') { setDrawer(false); burger.focus(); }
    });
    window.addEventListener('resize', function () { if (innerWidth > 1180) setDrawer(false); });
  }

  /* ---------- reveal on scroll ---------- */
  function initReveal() {
    var items = $all('.rv');
    if (!('IntersectionObserver' in window) || reduceMotion) { items.forEach(function (el) { el.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < innerHeight * 0.95 && r.bottom > 0) el.classList.add('in'); else io.observe(el);
    });
    html.classList.add('rv-ready');
  }

  /* ---------- counters ---------- */
  var counters = $all('[data-count]');
  function fmt(n) {
    var s = String(Math.round(n));
    var sep = lang() === 'en' ? ',' : ' ';
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  }
  function formatCounters() {
    counters.forEach(function (el) {
      if (el._running || el._v === undefined) return;
      el.textContent = fmt(el._done ? +el.getAttribute('data-count') : el._v);
    });
  }
  function initCounters() {
    if (!counters.length) return;
    if (!('IntersectionObserver' in window) || reduceMotion) { counters.forEach(function (el) { el._done = true; el._v = +el.getAttribute('data-count'); }); formatCounters(); return; }
    counters.forEach(function (el) { el._v = 0; el.textContent = fmt(0); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var el = en.target, target = +el.getAttribute('data-count'), t0 = performance.now(), dur = 2200;
        el._running = true;
        (function tick(now) {
          var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 4);
          el._v = target * e;
          el.textContent = fmt(el._v);
          if (p < 1) requestAnimationFrame(tick); else { el._running = false; el._done = true; }
        })(t0);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 3D tilt ---------- */
  function initTilt() {
    if (!finePointer || reduceMotion) return;
    $all('[data-tilt]').forEach(function (el) {
      var max = parseFloat(el.getAttribute('data-tilt-max')) || 7;
      var raf = 0, px = 0, py = 0;
      function apply() {
        raf = 0;
        el.style.setProperty('--ry', (px * max).toFixed(2) + 'deg');
        el.style.setProperty('--rx', (-py * max).toFixed(2) + 'deg');
      }
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        px = x - 0.5; py = y - 0.5;
        el.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
        el.classList.add('is-tilting');
        if (!raf) raf = requestAnimationFrame(apply);
      });
      el.addEventListener('pointerleave', function () {
        el.classList.remove('is-tilting');
        px = py = 0;
        if (!raf) raf = requestAnimationFrame(apply);
      });
    });
  }

  /* ---------- parallax images ---------- */
  var plx = $all('[data-parallax]');
  function parallax() {
    if (reduceMotion || !plx.length) return;
    plx.forEach(function (img) {
      var r = img.parentNode.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      var p = (r.top + r.height / 2 - innerHeight / 2) / (innerHeight + r.height);
      img.style.transform = 'translate3d(0,' + (p * -14).toFixed(2) + '%,0)';
    });
  }

  /* ---------- home: value-chain rail ---------- */
  function initRail() {
    var rail = $all('.cycle__rail li');
    var steps = $all('.cycle__step');
    if (!rail.length || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var i = +en.target.getAttribute('data-step');
        rail.forEach(function (li, k) { li.classList.toggle('on', k === i); });
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach(function (s) { io.observe(s); });
  }

  /* ---------- news filter ---------- */
  function initFilter() {
    var chips = $all('[data-filter]');
    if (!chips.length) return;
    var posts = $all('[data-cat]');
    var empty = document.querySelector('[data-empty]');
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var f = chip.getAttribute('data-filter'), shown = 0;
        chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
        posts.forEach(function (p) {
          var on = f === 'all' || p.getAttribute('data-cat') === f;
          p.classList.toggle('is-hidden', !on);
          if (on) { shown++; p.classList.add('in'); }
        });
        if (empty) empty.hidden = shown > 0;
      });
    });
  }

  /* ---------- contact form ---------- */
  var MSG = {
    ru: { sending: 'Отправка…', ok: 'Спасибо! Сообщение отправлено — мы ответим в ближайшее время.', required: 'Пожалуйста, заполните обязательные поля.', email: 'Проверьте адрес электронной почты.', fail: 'Не удалось отправить сообщение. Напишите нам на chairman@tajcottex.tj.' },
    en: { sending: 'Sending…', ok: 'Thank you! Your message has been sent — we will reply shortly.', required: 'Please fill in the required fields.', email: 'Please check the email address.', fail: 'The message could not be sent. Please write to chairman@tajcottex.tj.' },
    tj: { sending: 'Фиристода мешавад…', ok: 'Ташаккур! Паём фиристода шуд — мо ба зудӣ ҷавоб медиҳем.', required: 'Лутфан майдонҳои ҳатмиро пур кунед.', email: 'Суроғаи почтаи электрониро санҷед.', fail: 'Паём фиристода нашуд. Ба chairman@tajcottex.tj нависед.' }
  };
  function initForm() {
    var form = document.querySelector('[data-contact-form]');
    if (!form) return;
    var status = form.querySelector('[data-form-status]');
    var btn = form.querySelector('button[type="submit"]');
    function say(key, cls) { var m = MSG[lang()] || MSG.ru; status.textContent = m[key]; status.className = 'form__status' + (cls ? ' ' + cls : ''); }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = {};
      ['name', 'email', 'company', 'subject', 'message', 'website'].forEach(function (k) { var f = form.elements[k]; data[k] = f ? f.value.trim() : ''; });
      var bad = false;
      ['name', 'email', 'message'].forEach(function (k) {
        var f = form.elements[k], empty = !data[k];
        f.setAttribute('aria-invalid', String(empty));
        if (empty) bad = true;
      });
      if (bad) { say('required', 'is-err'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) { form.elements.email.setAttribute('aria-invalid', 'true'); say('email', 'is-err'); return; }
      data.lang = lang();
      btn.disabled = true;
      say('sending');
      // Static hosting (GitHub Pages) cannot run send_mail.php, so the form
      // is relayed through FormSubmit there; on PHP hosting it posts locally.
      var relay = form.getAttribute('data-relay');
      var useRelay = relay && /\.github\.io$/.test(location.hostname);
      var url = useRelay ? relay : form.getAttribute('action');
      var payload = data;
      if (useRelay) {
        var topic = form.elements.subject ? form.elements.subject.options[form.elements.subject.selectedIndex].getAttribute('data-ru') : '';
        payload = {
          _subject: 'Сайт TAJCOTTEX: ' + (topic || 'обращение'),
          _template: 'table', _replyto: data.email, _honey: data.website,
          'Имя': data.name, 'Email': data.email, 'Компания': data.company, 'Тема': topic, 'Сообщение': data.message, 'Язык': data.lang
        };
      }
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload) })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (res && (res.success === true || res.success === 'true')) { say('ok', 'is-ok'); form.reset(); applyLang(lang(), false); }
          else say('fail', 'is-err');
        })
        .catch(function () { say('fail', 'is-err'); })
        .then(function () { btn.disabled = false; });
    });
    form.addEventListener('input', function (e) { if (e.target.getAttribute('aria-invalid') === 'true' && e.target.value.trim()) e.target.setAttribute('aria-invalid', 'false'); });
  }


  /* ---------- headings: word-by-word reveal ---------- */
  function splitWords() {
    var heads = $all('.hero__title, .phero__title, .shead__title, .cycle__h, .cycle__title, .cta__title, .manifesto__text');
    heads.forEach(function (h) {
      $all('[data-lang]', h).forEach(function (span) {
        var nodes = [];
        (function walk(n) {
          Array.prototype.forEach.call(n.childNodes, function (c) {
            if (c.nodeType === 3) nodes.push(c); else if (c.nodeType === 1 && c.tagName !== 'BR') walk(c);
          });
        })(span);
        var idx = 0;
        nodes.forEach(function (tn) {
          var frag = document.createDocumentFragment();
          tn.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var w = document.createElement('span'), inner = document.createElement('span');
            w.className = 'w'; inner.textContent = part; inner.style.transitionDelay = (idx++ * 0.05) + 's';
            w.appendChild(inner); frag.appendChild(w);
          });
          tn.parentNode.replaceChild(frag, tn);
        });
      });
      h.classList.add('words');
    });
    if (reduceMotion || !('IntersectionObserver' in window)) { heads.forEach(function (h) { h.classList.add('is-shown'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-shown'); io.unobserve(en.target); } });
    }, { threshold: 0.2 });
    heads.forEach(function (h) { io.observe(h); });
  }

  /* ---------- drifting cotton fibres over dark headers ---------- */
  function initDust() {
    if (reduceMotion) return;
    $all('[data-dust]').forEach(function (host) {
      var c = document.createElement('canvas');
      c.className = 'dust'; c.setAttribute('aria-hidden', 'true');
      host.appendChild(c);
      var ctx = c.getContext('2d'), w = 0, h = 0, pts = [], on = false, raf = 0, last = 0;
      var count = +host.getAttribute('data-dust') || 60;
      function size() {
        w = c.width = host.clientWidth; h = c.height = host.clientHeight;
        pts = [];
        for (var i = 0; i < count; i++) pts.push(seed(true));
      }
      function seed(anywhere) {
        var gold = Math.random() < 0.35;
        return { x: Math.random() * w, y: anywhere ? Math.random() * h : h + 10, r: 0.6 + Math.random() * 1.8,
          vy: 6 + Math.random() * 14, sway: 10 + Math.random() * 30, ph: Math.random() * 6.28, sp: 0.3 + Math.random() * 0.5,
          a: 0.25 + Math.random() * 0.5, gold: gold };
      }
      function draw(now) {
        if (!on) { raf = 0; return; }
        var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
        ctx.clearRect(0, 0, w, h);
        for (var i = 0; i < pts.length; i++) {
          var p = pts[i];
          p.y -= p.vy * dt; p.ph += p.sp * dt;
          var x = p.x + Math.sin(p.ph) * p.sway;
          if (p.y < -10) { pts[i] = p = seed(false); x = p.x; }
          var tw = 0.6 + 0.4 * Math.sin(p.ph * 3.1);
          ctx.beginPath();
          ctx.fillStyle = p.gold ? 'rgba(236,206,140,' + (p.a * tw) + ')' : 'rgba(243,236,220,' + (p.a * tw * 0.8) + ')';
          ctx.arc(x, p.y, p.r, 0, 6.2832); ctx.fill();
          if (p.gold && p.r > 1.6) { ctx.beginPath(); ctx.fillStyle = 'rgba(236,206,140,' + (p.a * 0.12) + ')'; ctx.arc(x, p.y, p.r * 4, 0, 6.2832); ctx.fill(); }
        }
        raf = requestAnimationFrame(draw);
      }
      function start() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(draw); } }
      size();
      window.addEventListener('resize', size);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (en) { on = en[0].isIntersecting && !document.hidden; if (on) start(); }).observe(host);
        document.addEventListener('visibilitychange', function () { on = !document.hidden && on; if (on) start(); });
      } else { on = true; start(); }
    });
  }

  /* ---------- magnetic buttons & pointer spotlight ---------- */
  function initMagnet() {
    if (!finePointer || reduceMotion) return;
    $all('.btn--gold').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) * 0.22, dy = (e.clientY - (r.top + r.height / 2)) * 0.3;
        b.style.setProperty('--dx', dx.toFixed(1) + 'px'); b.style.setProperty('--dy', dy.toFixed(1) + 'px');
      });
      b.addEventListener('pointerleave', function () { b.style.setProperty('--dx', '0px'); b.style.setProperty('--dy', '0px'); });
    });
    var spot = document.createElement('div');
    spot.className = 'spot'; spot.setAttribute('aria-hidden', 'true');
    document.body.appendChild(spot);
    var sx = innerWidth / 2, sy = innerHeight / 2, cx = sx, cy = sy, raf = 0;
    function tick() {
      cx += (sx - cx) * 0.12; cy += (sy - cy) * 0.12;
      spot.style.transform = 'translate3d(' + (cx - 400).toFixed(0) + 'px,' + (cy - 400).toFixed(0) + 'px,0)';
      if (Math.abs(sx - cx) + Math.abs(sy - cy) > 0.5) raf = requestAnimationFrame(tick); else raf = 0;
    }
    window.addEventListener('pointermove', function (e) { sx = e.clientX; sy = e.clientY; spot.classList.add('is-on'); if (!raf) raf = requestAnimationFrame(tick); }, { passive: true });
    document.addEventListener('pointerleave', function () { spot.classList.remove('is-on'); });
  }

  /* ---------- opening curtain (once per browser session) ---------- */
  function initCurtain() {
    var seen = false;
    try { seen = sessionStorage.getItem('tajcottex_seen') === '1'; sessionStorage.setItem('tajcottex_seen', '1'); } catch (e) { /* private mode */ }
    if (seen || reduceMotion) return;
    var cur = document.createElement('div');
    cur.className = 'curtain'; cur.setAttribute('aria-hidden', 'true');
    var logo = document.querySelector('.brand__mark');
    cur.innerHTML = (logo ? '<img src="' + logo.getAttribute('src') + '" alt="">' : '') + '<span class="curtain__line"></span>';
    document.body.appendChild(cur);
    html.classList.add('is-opening');
    setTimeout(function () { cur.classList.add('is-done'); html.classList.remove('is-opening'); }, 950);
    setTimeout(function () { if (cur.parentNode) cur.parentNode.removeChild(cur); }, 1900);
  }

  /* ---------- whole-site depth: pointer light, auto-tilt, scroll roll ---------- */
  function initDepth() {
    if (reduceMotion) return;
    // every panel on the site tilts, not only the hand-marked ones
    if (finePointer) {
      $all('.post, .fig, .frame, .tl__card, .leader, .plan, .astat, .gov__p, .dept, .mile, .cinfo__item, .step, .quote').forEach(function (el) {
        if (el.hasAttribute('data-tilt') || el.closest('[data-tilt]')) return;
        el.setAttribute('data-tilt', '');
        if (!el.hasAttribute('data-tilt-max')) el.setAttribute('data-tilt-max', '5');
      });
    }
    html.classList.add('has-depth');

    // pointer turns the hero stacks and swings the extrusion of the lettering
    var tx = 0, ty = 0, cx = 0, cy = 0, praf = 0, rs = html.style;
    function ptick() {
      cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
      rs.setProperty('--px', cx.toFixed(3));
      rs.setProperty('--py', cy.toFixed(3));
      rs.setProperty('--ex', (0.55 - cx * 0.9).toFixed(3));
      rs.setProperty('--ey', (0.9 - cy * 0.6).toFixed(3));
      praf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.002 ? requestAnimationFrame(ptick) : 0;
    }
    if (finePointer) {
      window.addEventListener('pointermove', function (e) {
        tx = e.clientX / innerWidth * 2 - 1; ty = e.clientY / innerHeight * 2 - 1;
        if (!praf) praf = requestAnimationFrame(ptick);
      }, { passive: true });
    }

    // content blocks roll like pages on a drum as they cross the screen
    var blocks = $all('.section > .wrap > *, .article > .wrap > *, .cycle__card').filter(function (el) {
      return !el.hasAttribute('data-tilt') && !el.matches('.ring, .org, .table-wrap');
    });
    var visible = [];
    blocks.forEach(function (el) { el.classList.add('dz'); });
    function roll() {
      var vh = innerHeight;
      visible.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var h = Math.min(r.height, vh);
        var p = (r.top + h / 2 - vh / 2) / (vh / 2 + h / 2);
        p = Math.max(-1, Math.min(1, p));
        var a = Math.abs(p), dead = 0.3;
        var s = a < dead ? 0 : (a - dead) / (1 - dead) * (p < 0 ? -1 : 1);
        el.style.setProperty('--sp', (s * Math.abs(s)).toFixed(3));
        el.style.setProperty('--sa', (s * s).toFixed(3));
      });
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          var i = visible.indexOf(en.target);
          if (en.isIntersecting && i < 0) visible.push(en.target);
          if (!en.isIntersecting && i > -1) visible.splice(i, 1);
        });
        roll();
      }, { rootMargin: '10% 0px 10% 0px' });
      blocks.forEach(function (el) { io.observe(el); });
    }
    var sraf = 0;
    window.addEventListener('scroll', function () { if (!sraf) sraf = requestAnimationFrame(function () { sraf = 0; roll(); }); }, { passive: true });
    window.addEventListener('resize', roll);
  }

  /* ---------- init ---------- */
  function init() {
    applyLang(lang(), false);
    $all('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
    initCurtain();
    splitWords();
    initReveal();
    initCounters();
    initDust();
    initMagnet();
    initDepth();
    initTilt();
    initRail();
    initFilter();
    initForm();
    onScroll();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
