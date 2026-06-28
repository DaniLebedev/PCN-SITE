(function () {
  'use strict';

  const STORAGE_THEME = 'theme';
  const STORAGE_LANG = 'lang';
  const DEFAULT_LANG = 'ru';
  const DEFAULT_THEME = 'light';

  let strings = {};
  let currentLang = localStorage.getItem(STORAGE_LANG) || DEFAULT_LANG;
  let currentTheme = localStorage.getItem(STORAGE_THEME) || DEFAULT_THEME;

  const header = document.getElementById('header');
  const burger = document.getElementById('burger');
  const nav = document.getElementById('nav');
  const contactForm = document.getElementById('contactForm');
  const toast = document.getElementById('toast');
  const navLinks = document.querySelectorAll('.nav__link');
  const themeToggles = [
    document.getElementById('themeToggle'),
    document.getElementById('themeToggleMobile')
  ].filter(Boolean);
  const langSwitchers = [
    document.getElementById('langSwitcher'),
    document.getElementById('langSwitcherMobile')
  ].filter(Boolean);

  function t(key) {
    return key.split('.').reduce((obj, k) => (obj && obj[k] !== undefined ? obj[k] : null), strings) ?? key;
  }

  async function fetchJSON(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } catch (fetchErr) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.overrideMimeType('application/json');
        xhr.open('GET', url, true);
        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 0) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch (e) {
              reject(e);
            }
          } else {
            reject(new Error(`XHR ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(fetchErr);
        xhr.send();
      });
    }
  }

  async function loadLocale(lang) {
    try {
      strings = await fetchJSON(`locales/${lang}.json`);
      currentLang = lang;
    } catch (err) {
      console.warn('Locale load failed, using fallback:', err);
      if (lang !== DEFAULT_LANG) return loadLocale(DEFAULT_LANG);
    }
  }

  function applyTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_THEME, theme);

    const label = theme === 'dark' ? t('ui.themeLight') : t('ui.themeDark');
    themeToggles.forEach(btn => btn.setAttribute('aria-label', label));
  }

  function toggleTheme() {
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
  }

  function applyTranslations() {
    document.documentElement.setAttribute('lang', currentLang);
    document.title = t('meta.title');

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', t('meta.description'));

    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });

    document.querySelectorAll('#service option[data-i18n]').forEach(opt => {
      opt.textContent = t(opt.dataset.i18n);
    });

    burger.setAttribute('aria-label', t('ui.openMenu'));

    langSwitchers.forEach(switcher => {
      switcher.querySelectorAll('.lang-btn').forEach(btn => {
        const lang = btn.dataset.lang;
        btn.classList.toggle('active', lang === currentLang);
        btn.setAttribute('title', t(`ui.lang${lang === 'ru' ? 'Ru' : lang === 'en' ? 'En' : 'Kk'}`));
      });
    });

    applyTheme(currentTheme);
  }

  async function setLanguage(lang) {
    if (lang === currentLang && Object.keys(strings).length) return;
    await loadLocale(lang);
    localStorage.setItem(STORAGE_LANG, lang);
    applyTranslations();
  }

  function bindLangSwitchers() {
    langSwitchers.forEach(switcher => {
      switcher.addEventListener('click', e => {
        const btn = e.target.closest('.lang-btn');
        if (!btn) return;
        setLanguage(btn.dataset.lang);
      });
    });
  }

  function bindThemeToggles() {
    themeToggles.forEach(btn => btn.addEventListener('click', toggleTheme));
  }

  // Header scroll
  function onScroll() {
    header.classList.toggle('header--scrolled', window.scrollY > 20);
    updateActiveNav();
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile menu
  burger.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    burger.classList.toggle('active', isOpen);
    burger.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  function closeMobileMenu() {
    nav.classList.remove('open');
    burger.classList.remove('active');
    burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  navLinks.forEach(link => link.addEventListener('click', closeMobileMenu));
  document.querySelector('.nav__cta-mobile')?.addEventListener('click', closeMobileMenu);

  // Active nav
  const sections = document.querySelectorAll('section[id]');

  function updateActiveNav() {
    const scrollPos = window.scrollY + 100;
    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');
      if (scrollPos >= top && scrollPos < top + height) {
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
        });
      }
    });
  }

  // Counters
  function animateCounters() {
    document.querySelectorAll('.hero__stat-value[data-count]').forEach(counter => {
      const target = parseInt(counter.dataset.count, 10);
      const duration = 2000;
      const start = performance.now();

      function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        counter.textContent = Math.floor(eased * target);
        if (progress < 1) requestAnimationFrame(step);
        else counter.textContent = target;
      }

      requestAnimationFrame(step);
    });
  }

  // Scroll reveal
  const revealElements = document.querySelectorAll(
    '.service-card, .advantage, .process__step, .about__content, .about__visual, .contact__info, .contact__form, .section__header'
  );
  revealElements.forEach(el => el.classList.add('reveal'));

  const revealObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
  );
  revealElements.forEach(el => revealObserver.observe(el));

  const heroStats = document.querySelector('.hero__stats');
  if (heroStats) {
    const heroObs = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          animateCounters();
          heroObs.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    heroObs.observe(heroStats);
  }

  // Phone mask
  document.getElementById('phone').addEventListener('input', e => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.startsWith('8')) value = '7' + value.slice(1);
    if (!value.startsWith('7') && value.length > 0) value = '7' + value;

    let formatted = '';
    if (value.length > 0) formatted = '+7';
    if (value.length > 1) formatted += ' (' + value.slice(1, 4);
    if (value.length > 4) formatted += ') ' + value.slice(4, 7);
    if (value.length > 7) formatted += '-' + value.slice(7, 9);
    if (value.length > 9) formatted += '-' + value.slice(9, 11);
    e.target.value = formatted;
  });


  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  document.getElementById('email').addEventListener('input', e => {
    const email = e.target.value;
    const emailInput = document.getElementById('email');
    const errorSpan = document.querySelector('.form__error[data-for="email"]');

    if (email && !emailPattern.test(email)) {
      emailInput.classList.add('error');
      errorSpan.textContent = t('contact.errorEmail');
    } else {
      emailInput.classList.remove('error');
      errorSpan.textContent = '';
    }
  });

  function validateForm() {
    let valid = true;
    const name = document.getElementById('name');
    const phone = document.getElementById('phone');
    const email = document.getElementById('email');

    document.querySelectorAll('.form__error').forEach(el => (el.textContent = ''));
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));

    if (!name.value.trim()) {
      showError('name', t('contact.errorName'));
      valid = false;
    }

    if (phone.value.replace(/\D/g, '').length < 11) {
      showError('phone', t('contact.errorPhone'));
      valid = false;
    }

    if (!email.value || !emailPattern.test(email.value)) {
      showError('email', t('contact.errorEmail'));
      valid = false;
    }

    return valid;
  }

  function showError(field, message) {
    document.getElementById(field).classList.add('error');
    document.querySelector(`.form__error[data-for="${field}"]`).textContent = message;
  }

  contactForm.addEventListener('submit', e => {
    e.preventDefault();
    if (!validateForm()) return;

    const btn = contactForm.querySelector('button[type="submit"]');
    const submitText = t('contact.formSubmit');
    btn.disabled = true;
    btn.textContent = t('contact.formSubmitting');

    setTimeout(() => {
      contactForm.reset();
      btn.disabled = false;
      btn.textContent = submitText;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 4000);
    }, 1200);
  });

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const href = anchor.getAttribute('href');
      if (href === '#') return;
      e.preventDefault();
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Init
  bindLangSwitchers();
  bindThemeToggles();
  setLanguage(currentLang).then(() => {
    onScroll();
  });
})();
