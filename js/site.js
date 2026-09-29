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
      fetch(form.getAttribute('action'), { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (res && res.success) { say('ok', 'is-ok'); form.reset(); applyLang(lang(), false); }
          else say('fail', 'is-err');
        })
        .catch(function () { say('fail', 'is-err'); })
        .then(function () { btn.disabled = false; });
    });
    form.addEventListener('input', function (e) { if (e.target.getAttribute('aria-invalid') === 'true' && e.target.value.trim()) e.target.setAttribute('aria-invalid', 'false'); });
  }

  /* ---------- init ---------- */
  function init() {
    applyLang(lang(), false);
    $all('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
    initReveal();
    initCounters();
    initTilt();
    initRail();
    initFilter();
    initForm();
    onScroll();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
