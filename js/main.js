/* ===================================================
   TAJCOTTEX — Main JS v2.0
   Handles: dark mode, language switcher, nav, scroll,
            FAQ accordion, news filter, stagger reveals,
            counter animation
   =================================================== */

(function () {
  'use strict';

  /* ------ THEME ------ */
  const html = document.documentElement;

  function getSystemTheme() {
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  let currentTheme = getSystemTheme();
  html.setAttribute('data-theme', currentTheme);

  function updateThemeToggle() {
    const btn = document.querySelector('[data-theme-toggle]');
    if (!btn) return;
    const isDark = currentTheme === 'dark';
    btn.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} mode`);
    btn.innerHTML = isDark
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
  }

  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-theme-toggle]');
    if (!btn) return;
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', currentTheme);

    updateThemeToggle();
  });

  /* ------ LANGUAGE ------ */
  const LANG_KEY = 'tajcottex_lang';
  const SUPPORTED_LANGS = ['ru', 'en', 'tj'];

  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }

  function setCookie(name, value, days) {
    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }

  function getSavedLang() {
    const saved = getCookie(LANG_KEY);
    return SUPPORTED_LANGS.includes(saved) ? saved : 'ru';
  }

  function saveLang(lang) {
    setCookie(LANG_KEY, lang, 365);
  }

  let currentLang = getSavedLang();

  function applyLang(lang) {
    currentLang = lang;
    saveLang(lang);
    document.querySelectorAll('[data-lang]').forEach(el => {
      if (el.getAttribute('data-lang') === lang) {
        el.classList.add('lang-active');
      } else {
        el.classList.remove('lang-active');
      }
    });
    document.querySelectorAll('[data-lang-btn]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-lang-btn') === lang);
    });
  }

  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-lang-btn]');
    if (!btn) return;
    applyLang(btn.getAttribute('data-lang-btn'));
  });

  /* ------ NAV SCROLL ------ */
  const nav = document.querySelector('.site-nav');
  if (nav) {
    const handleScroll = () => {
      nav.classList.toggle('scrolled', window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
  }

  /* ------ MOBILE MENU ------ */
  const hamburger = document.querySelector('.nav-hamburger');
  const mobileMenu = document.querySelector('.nav-mobile');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', isOpen);
      // Prevent body scroll when menu is open
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });

    // Close on outside click
    document.addEventListener('click', function (e) {
      if (
        mobileMenu.classList.contains('open') &&
        !mobileMenu.contains(e.target) &&
        !hamburger.contains(e.target)
      ) {
        mobileMenu.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }

  /* ------ ACTIVE NAV LINK ------ */
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .nav-mobile a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  /* ------ SCROLL REVEAL (robust: content always visible if JS/IO fails) ------ */
  //
  // Strategy: We only hide .fade-up elements AFTER we confirm IntersectionObserver
  // is available AND we've registered observers. Until then content stays visible.
  // CSS uses .js-reveal-ready on <html> to activate the hidden state.
  //
  let revealObserver = null;

  function initFadeUp() {
    if (!('IntersectionObserver' in window)) {
      // No IO support — leave everything visible, skip animation
      return;
    }

    // Auto-stagger children within a .stagger-children container
    // Do this BEFORE marking ready so the delay is set when elements hide
    document.querySelectorAll('.stagger-children').forEach(parent => {
      parent.querySelectorAll(':scope > *').forEach((child, i) => {
        child.classList.add('fade-up');
        child.style.transitionDelay = `${i * 0.07}s`;
      });
    });

    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          // Preserve explicit data-delay attribute if present
          const delay = el.getAttribute('data-delay');
          if (delay) el.style.transitionDelay = delay;
          el.classList.add('visible');
          revealObserver.unobserve(el);
        }
      });
    }, {
      threshold: 0.08,
      rootMargin: '0px 0px -40px 0px'
    });

    // Mark html ready to activate CSS hiding THEN observe
    html.classList.add('js-reveal-ready');

    document.querySelectorAll('.fade-up').forEach(el => {
      // If element is already in or near the viewport on page load, mark visible immediately
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight + 60) {
        el.classList.add('visible');
      } else {
        revealObserver.observe(el);
      }
    });
  }

  /* ------ COUNTER ANIMATION ------ */
  function animateCounter(el) {
    const target = parseFloat(el.getAttribute('data-count'));
    const suffix = el.getAttribute('data-suffix') || '';
    const prefix = el.getAttribute('data-prefix') || '';
    const duration = 1800;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = eased * target;
      el.textContent = prefix + (Number.isInteger(target) ? Math.round(value).toLocaleString() : value.toFixed(1)) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  function initCounters() {
    document.querySelectorAll('[data-count]').forEach(el => counterObserver.observe(el));
  }

  /* ------ FAQ ACCORDION (native <details> enhancement) ------ */
  function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    if (!faqItems.length) return;

    faqItems.forEach(item => {
      const summary = item.querySelector('.faq-summary');
      if (!summary) return;

      // The chevron rotation is CSS-driven via [open] selector.
      // We add smooth animation for the body opening via JS.
      item.addEventListener('toggle', () => {
        const chevron = item.querySelector('.faq-chevron');
        if (chevron) {
          // CSS handles rotation — this is a hook for future JS animation
          chevron.setAttribute('aria-hidden', 'true');
        }
      });
    });
  }

  /* ------ NEWS FILTER TOGGLE ------ */
  function initNewsFilter() {
    const filterBtns = document.querySelectorAll('.news-filter-btn');
    if (!filterBtns.length) return;

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        // Remove active from all
        filterBtns.forEach(b => b.classList.remove('news-filter-btn--active'));
        // Set active on clicked
        btn.classList.add('news-filter-btn--active');
        // In a static site, all cards remain visible (no dynamic filtering)
        // This is a UI-only toggle for visual interaction
      });
    });
  }

  /* ------ SMOOTH HOVER EFFECTS (card depth) ------ */
  function initCardTilt() {
    // Subtle tilt-on-hover for hero/stat cards
    const tiltCards = document.querySelectorAll('.mission-card, .about-stat-card, .article-stat-card');
    tiltCards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `translateY(-4px) rotateX(${-y * 4}deg) rotateY(${x * 4}deg)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  /* ------ SCROLL-TO-TOP (auto-add if needed) ------ */
  function initScrollToTop() {
    // Show/hide scroll-to-top button if it exists
    const btn = document.querySelector('[data-scroll-top]');
    if (!btn) return;

    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 600);
    }, { passive: true });

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ------ NAV LINK SMOOTH HOVER ------ */
  function initNavHover() {
    // Add ink-style hover indicator to nav links
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
      link.addEventListener('mouseenter', () => {
        link.style.willChange = 'transform';
      });
      link.addEventListener('mouseleave', () => {
        link.style.willChange = '';
      });
    });
  }

  /* ------ INIT ------ */
  document.addEventListener('DOMContentLoaded', () => {
    updateThemeToggle();
    applyLang(currentLang);
    initFadeUp();
    initCounters();
    initFAQ();
    initNewsFilter();
    initCardTilt();
    initScrollToTop();
    initNavHover();
  });

})();
