/**
 * Quick Wa Link — Shared JavaScript Classes
 * Author: Godlove Tikum (@godlovtikum)
 * Standard: ES6 Classes
 */

'use strict';

/* ============================================================
   ToastManager — displays ephemeral notification toasts
   ============================================================ */
class ToastManager {
  constructor() {
    this.toastRegion = this._createRegion();
    this.activeToastCount = 0;
    this.maxVisibleToasts = 4;
  }

  /** @private */
  _createRegion() {
    const existingRegion = document.getElementById('toastRegion');
    if (existingRegion) return existingRegion;

    const region = document.createElement('div');
    region.id = 'toastRegion';
    region.className = 'toast-region';
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'false');
    region.setAttribute('role', 'status');
    document.body.appendChild(region);
    return region;
  }

  /**
   * @param {string} message
   * @param {'success'|'error'|'info'} type
   * @param {number} durationMs
   */
  show(message, type = 'info', durationMs = 3800) {
    if (this.activeToastCount >= this.maxVisibleToasts) return;

    const iconMap = {
      success: '✓',
      error:   '✕',
      info:    'ℹ',
    };

    const toastEl = document.createElement('div');
    toastEl.className = `toast toast-${type}`;
    toastEl.setAttribute('role', 'status');
    toastEl.innerHTML = `
      <span class="toast-icon" aria-hidden="true">${iconMap[type]}</span>
      <span class="toast-message">${this._escapeHtml(message)}</span>
    `;

    this.toastRegion.appendChild(toastEl);
    this.activeToastCount++;

    const dismissTimer = setTimeout(() => this._dismiss(toastEl), durationMs);

    // Allow click to dismiss early
    toastEl.addEventListener('click', () => {
      clearTimeout(dismissTimer);
      this._dismiss(toastEl);
    });
  }

  /** @private */
  _dismiss(toastEl) {
    toastEl.classList.add('toast-exit');
    toastEl.addEventListener('animationend', () => {
      toastEl.remove();
      this.activeToastCount = Math.max(0, this.activeToastCount - 1);
    }, { once: true });
  }

  /** @private */
  _escapeHtml(raw) {
    const div = document.createElement('div');
    div.textContent = raw;
    return div.innerHTML;
  }

  /** Convenience methods */
  success(message) { this.show(message, 'success'); }
  error(message)   { this.show(message, 'error', 5000); }
  info(message)    { this.show(message, 'info'); }
}

/* ============================================================
   SiteHeader — manages sticky behaviour, hamburger menu,
   active nav link highlighting, and scroll detection
   ============================================================ */
class SiteHeader {
  constructor() {
    this.headerEl    = document.getElementById('siteHeader');
    this.menuToggle  = document.getElementById('menuToggle');
    this.mobileNav   = document.getElementById('mobileNav');
    this.navLinks    = document.querySelectorAll('.nav-link, .mobile-nav-link');
    this.isMenuOpen  = false;
    this.lastScrollY = 0;

    if (!this.headerEl) return;

    this._bindEvents();
    this._handleScroll();
  }

  /** @private */
  _bindEvents() {
    // Scroll handler (passive for perf)
    window.addEventListener('scroll', () => this._handleScroll(), { passive: true });

    // Hamburger toggle
    if (this.menuToggle) {
      this.menuToggle.addEventListener('click', () => this._toggleMenu());
    }

    // Close mobile nav on link click
    this.navLinks.forEach(linkEl => {
      linkEl.addEventListener('click', () => {
        if (this.isMenuOpen) this._closeMenu();
      });
    });

    // Close on outside click
    document.addEventListener('click', (clickEvent) => {
      const isInsideHeader = this.headerEl.contains(clickEvent.target);
      const isInsideMobileNav = this.mobileNav && this.mobileNav.contains(clickEvent.target);
      if (!isInsideHeader && !isInsideMobileNav && this.isMenuOpen) {
        this._closeMenu();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (keyEvent) => {
      if (keyEvent.key === 'Escape' && this.isMenuOpen) {
        this._closeMenu();
        this.menuToggle?.focus();
      }
    });
  }

  /** @private */
  _handleScroll() {
    const currentScrollY = window.scrollY;
    const isScrolled = currentScrollY > 24;

    this.headerEl.classList.toggle('scrolled', isScrolled);
    this.lastScrollY = currentScrollY;
  }

  /** @private */
  _toggleMenu() {
    if (this.isMenuOpen) {
      this._closeMenu();
    } else {
      this._openMenu();
    }
  }

  /** @private */
  _openMenu() {
    this.isMenuOpen = true;
    this.menuToggle?.classList.add('open');
    this.mobileNav?.classList.add('open');
    this.menuToggle?.setAttribute('aria-expanded', 'true');
    this.mobileNav?.setAttribute('aria-hidden', 'false');

    // Focus first link for accessibility
    const firstMobileLink = this.mobileNav?.querySelector('.mobile-nav-link');
    firstMobileLink?.focus();
  }

  /** @private */
  _closeMenu() {
    this.isMenuOpen = false;
    this.menuToggle?.classList.remove('open');
    this.mobileNav?.classList.remove('open');
    this.menuToggle?.setAttribute('aria-expanded', 'false');
    this.mobileNav?.setAttribute('aria-hidden', 'true');
  }

  /** Highlight active nav link based on href match */
  setActiveLinkByHref(href) {
    this.navLinks.forEach(linkEl => {
      linkEl.classList.toggle('active', linkEl.getAttribute('href') === href);
    });
  }
}

/* ============================================================
   ScrollReveal — adds .visible class to .reveal elements
   when they enter the viewport, triggering CSS transitions
   ============================================================ */
class ScrollReveal {
  constructor(selector = '.reveal', rootMargin = '0px 0px -60px 0px') {
    this.revealTargets = document.querySelectorAll(selector);
    this.observerOptions = { rootMargin, threshold: 0.08 };

    if (this.revealTargets.length === 0) return;

    this._createObserver();
    this._observeAll();
  }

  /** @private */
  _createObserver() {
    this.observer = new IntersectionObserver(
      (entries) => this._handleIntersection(entries),
      this.observerOptions
    );
  }

  /** @private */
  _observeAll() {
    this.revealTargets.forEach(targetEl => this.observer.observe(targetEl));
  }

  /** @private */
  _handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        this.observer.unobserve(entry.target); // only animate once
      }
    });
  }
}

/* ============================================================
   COUNTRY_CODES — 199 countries as a plain array of objects
   { code, flag, name } — code is the numeric dial prefix
   ============================================================ */
const COUNTRY_CODES = [
  { code: "93",   flag: "🇦🇫", name: "Afghanistan" },
  { code: "355",  flag: "🇦🇱", name: "Albania" },
  { code: "213",  flag: "🇩🇿", name: "Algeria" },
  { code: "244",  flag: "🇦🇴", name: "Angola" },
  { code: "1264", flag: "🇦🇮", name: "Anguilla" },
  { code: "1268", flag: "🇦🇬", name: "Antigua & Barbuda" },
  { code: "54",   flag: "🇦🇷", name: "Argentina" },
  { code: "374",  flag: "🇦🇲", name: "Armenia" },
  { code: "297",  flag: "🇦🇼", name: "Aruba" },
  { code: "61",   flag: "🇦🇺", name: "Australia" },
  { code: "43",   flag: "🇦🇹", name: "Austria" },
  { code: "994",  flag: "🇦🇿", name: "Azerbaijan" },
  { code: "1242", flag: "🇧🇸", name: "Bahamas" },
  { code: "973",  flag: "🇧🇭", name: "Bahrain" },
  { code: "880",  flag: "🇧🇩", name: "Bangladesh" },
  { code: "1246", flag: "🇧🇧", name: "Barbados" },
  { code: "375",  flag: "🇧🇾", name: "Belarus" },
  { code: "32",   flag: "🇧🇪", name: "Belgium" },
  { code: "501",  flag: "🇧🇿", name: "Belize" },
  { code: "229",  flag: "🇧🇯", name: "Benin" },
  { code: "975",  flag: "🇧🇹", name: "Bhutan" },
  { code: "591",  flag: "🇧🇴", name: "Bolivia" },
  { code: "387",  flag: "🇧🇦", name: "Bosnia & Herzegovina" },
  { code: "267",  flag: "🇧🇼", name: "Botswana" },
  { code: "55",   flag: "🇧🇷", name: "Brazil" },
  { code: "1284", flag: "🇻🇬", name: "British Virgin Islands" },
  { code: "673",  flag: "🇧🇳", name: "Brunei" },
  { code: "359",  flag: "🇧🇬", name: "Bulgaria" },
  { code: "226",  flag: "🇧🇫", name: "Burkina Faso" },
  { code: "257",  flag: "🇧🇮", name: "Burundi" },
  { code: "855",  flag: "🇰🇭", name: "Cambodia" },
  { code: "237",  flag: "🇨🇲", name: "Cameroon" },
  { code: "1",    flag: "🇨🇦", name: "Canada" },
  { code: "238",  flag: "🇨🇻", name: "Cape Verde" },
  { code: "1345", flag: "🇰🇾", name: "Cayman Islands" },
  { code: "236",  flag: "🇨🇫", name: "Central African Republic" },
  { code: "235",  flag: "🇹🇩", name: "Chad" },
  { code: "56",   flag: "🇨🇱", name: "Chile" },
  { code: "86",   flag: "🇨🇳", name: "China" },
  { code: "57",   flag: "🇨🇴", name: "Colombia" },
  { code: "269",  flag: "🇰🇲", name: "Comoros" },
  { code: "242",  flag: "🇨🇬", name: "Congo" },
  { code: "506",  flag: "🇨🇷", name: "Costa Rica" },
  { code: "385",  flag: "🇭🇷", name: "Croatia" },
  { code: "53",   flag: "🇨🇺", name: "Cuba" },
  { code: "357",  flag: "🇨🇾", name: "Cyprus" },
  { code: "420",  flag: "🇨🇿", name: "Czech Republic" },
  { code: "45",   flag: "🇩🇰", name: "Denmark" },
  { code: "253",  flag: "🇩🇯", name: "Djibouti" },
  { code: "1767", flag: "🇩🇲", name: "Dominica" },
  { code: "1809", flag: "🇩🇴", name: "Dominican Republic" },
  { code: "243",  flag: "🇨🇩", name: "DR Congo" },
  { code: "593",  flag: "🇪🇨", name: "Ecuador" },
  { code: "20",   flag: "🇪🇬", name: "Egypt" },
  { code: "503",  flag: "🇸🇻", name: "El Salvador" },
  { code: "240",  flag: "🇬🇶", name: "Equatorial Guinea" },
  { code: "291",  flag: "🇪🇷", name: "Eritrea" },
  { code: "372",  flag: "🇪🇪", name: "Estonia" },
  { code: "268",  flag: "🇸🇿", name: "Eswatini" },
  { code: "251",  flag: "🇪🇹", name: "Ethiopia" },
  { code: "679",  flag: "🇫🇯", name: "Fiji" },
  { code: "358",  flag: "🇫🇮", name: "Finland" },
  { code: "33",   flag: "🇫🇷", name: "France" },
  { code: "241",  flag: "🇬🇦", name: "Gabon" },
  { code: "220",  flag: "🇬🇲", name: "Gambia" },
  { code: "995",  flag: "🇬🇪", name: "Georgia" },
  { code: "49",   flag: "🇩🇪", name: "Germany" },
  { code: "233",  flag: "🇬🇭", name: "Ghana" },
  { code: "30",   flag: "🇬🇷", name: "Greece" },
  { code: "1473", flag: "🇬🇩", name: "Grenada" },
  { code: "502",  flag: "🇬🇹", name: "Guatemala" },
  { code: "224",  flag: "🇬🇳", name: "Guinea" },
  { code: "245",  flag: "🇬🇼", name: "Guinea-Bissau" },
  { code: "592",  flag: "🇬🇾", name: "Guyana" },
  { code: "509",  flag: "🇭🇹", name: "Haiti" },
  { code: "504",  flag: "🇭🇳", name: "Honduras" },
  { code: "852",  flag: "🇭🇰", name: "Hong Kong" },
  { code: "36",   flag: "🇭🇺", name: "Hungary" },
  { code: "354",  flag: "🇮🇸", name: "Iceland" },
  { code: "91",   flag: "🇮🇳", name: "India" },
  { code: "62",   flag: "🇮🇩", name: "Indonesia" },
  { code: "98",   flag: "🇮🇷", name: "Iran" },
  { code: "964",  flag: "🇮🇶", name: "Iraq" },
  { code: "353",  flag: "🇮🇪", name: "Ireland" },
  { code: "972",  flag: "🇮🇱", name: "Israel" },
  { code: "39",   flag: "🇮🇹", name: "Italy" },
  { code: "225",  flag: "🇨🇮", name: "Ivory Coast" },
  { code: "1876", flag: "🇯🇲", name: "Jamaica" },
  { code: "81",   flag: "🇯🇵", name: "Japan" },
  { code: "962",  flag: "🇯🇴", name: "Jordan" },
  { code: "7",    flag: "🇰🇿", name: "Kazakhstan" },
  { code: "254",  flag: "🇰🇪", name: "Kenya" },
  { code: "686",  flag: "🇰🇮", name: "Kiribati" },
  { code: "383",  flag: "🇽🇰", name: "Kosovo" },
  { code: "965",  flag: "🇰🇼", name: "Kuwait" },
  { code: "996",  flag: "🇰🇬", name: "Kyrgyzstan" },
  { code: "856",  flag: "🇱🇦", name: "Laos" },
  { code: "371",  flag: "🇱🇻", name: "Latvia" },
  { code: "961",  flag: "🇱🇧", name: "Lebanon" },
  { code: "266",  flag: "🇱🇸", name: "Lesotho" },
  { code: "231",  flag: "🇱🇷", name: "Liberia" },
  { code: "218",  flag: "🇱🇾", name: "Libya" },
  { code: "423",  flag: "🇱🇮", name: "Liechtenstein" },
  { code: "370",  flag: "🇱🇹", name: "Lithuania" },
  { code: "352",  flag: "🇱🇺", name: "Luxembourg" },
  { code: "853",  flag: "🇲🇴", name: "Macau" },
  { code: "261",  flag: "🇲🇬", name: "Madagascar" },
  { code: "265",  flag: "🇲🇼", name: "Malawi" },
  { code: "60",   flag: "🇲🇾", name: "Malaysia" },
  { code: "960",  flag: "🇲🇻", name: "Maldives" },
  { code: "223",  flag: "🇲🇱", name: "Mali" },
  { code: "356",  flag: "🇲🇹", name: "Malta" },
  { code: "692",  flag: "🇲🇭", name: "Marshall Islands" },
  { code: "222",  flag: "🇲🇷", name: "Mauritania" },
  { code: "230",  flag: "🇲🇺", name: "Mauritius" },
  { code: "52",   flag: "🇲🇽", name: "Mexico" },
  { code: "691",  flag: "🇫🇲", name: "Micronesia" },
  { code: "373",  flag: "🇲🇩", name: "Moldova" },
  { code: "377",  flag: "🇲🇨", name: "Monaco" },
  { code: "976",  flag: "🇲🇳", name: "Mongolia" },
  { code: "382",  flag: "🇲🇪", name: "Montenegro" },
  { code: "212",  flag: "🇲🇦", name: "Morocco" },
  { code: "258",  flag: "🇲🇿", name: "Mozambique" },
  { code: "95",   flag: "🇲🇲", name: "Myanmar" },
  { code: "264",  flag: "🇳🇦", name: "Namibia" },
  { code: "674",  flag: "🇳🇷", name: "Nauru" },
  { code: "977",  flag: "🇳🇵", name: "Nepal" },
  { code: "31",   flag: "🇳🇱", name: "Netherlands" },
  { code: "64",   flag: "🇳🇿", name: "New Zealand" },
  { code: "505",  flag: "🇳🇮", name: "Nicaragua" },
  { code: "227",  flag: "🇳🇪", name: "Niger" },
  { code: "234",  flag: "🇳🇬", name: "Nigeria" },
  { code: "850",  flag: "🇰🇵", name: "North Korea" },
  { code: "389",  flag: "🇲🇰", name: "North Macedonia" },
  { code: "47",   flag: "🇳🇴", name: "Norway" },
  { code: "968",  flag: "🇴🇲", name: "Oman" },
  { code: "92",   flag: "🇵🇰", name: "Pakistan" },
  { code: "680",  flag: "🇵🇼", name: "Palau" },
  { code: "970",  flag: "🇵🇸", name: "Palestine" },
  { code: "507",  flag: "🇵🇦", name: "Panama" },
  { code: "675",  flag: "🇵🇬", name: "Papua New Guinea" },
  { code: "595",  flag: "🇵🇾", name: "Paraguay" },
  { code: "51",   flag: "🇵🇪", name: "Peru" },
  { code: "63",   flag: "🇵🇭", name: "Philippines" },
  { code: "48",   flag: "🇵🇱", name: "Poland" },
  { code: "351",  flag: "🇵🇹", name: "Portugal" },
  { code: "1",    flag: "🇵🇷", name: "Puerto Rico" },
  { code: "974",  flag: "🇶🇦", name: "Qatar" },
  { code: "40",   flag: "🇷🇴", name: "Romania" },
  { code: "7",    flag: "🇷🇺", name: "Russia" },
  { code: "250",  flag: "🇷🇼", name: "Rwanda" },
  { code: "685",  flag: "🇼🇸", name: "Samoa" },
  { code: "378",  flag: "🇸🇲", name: "San Marino" },
  { code: "239",  flag: "🇸🇹", name: "Sao Tome & Principe" },
  { code: "966",  flag: "🇸🇦", name: "Saudi Arabia" },
  { code: "221",  flag: "🇸🇳", name: "Senegal" },
  { code: "381",  flag: "🇷🇸", name: "Serbia" },
  { code: "248",  flag: "🇸🇨", name: "Seychelles" },
  { code: "232",  flag: "🇸🇱", name: "Sierra Leone" },
  { code: "65",   flag: "🇸🇬", name: "Singapore" },
  { code: "421",  flag: "🇸🇰", name: "Slovakia" },
  { code: "386",  flag: "🇸🇮", name: "Slovenia" },
  { code: "677",  flag: "🇸🇧", name: "Solomon Islands" },
  { code: "252",  flag: "🇸🇴", name: "Somalia" },
  { code: "27",   flag: "🇿🇦", name: "South Africa" },
  { code: "82",   flag: "🇰🇷", name: "South Korea" },
  { code: "211",  flag: "🇸🇸", name: "South Sudan" },
  { code: "34",   flag: "🇪🇸", name: "Spain" },
  { code: "94",   flag: "🇱🇰", name: "Sri Lanka" },
  { code: "249",  flag: "🇸🇩", name: "Sudan" },
  { code: "597",  flag: "🇸🇷", name: "Suriname" },
  { code: "46",   flag: "🇸🇪", name: "Sweden" },
  { code: "41",   flag: "🇨🇭", name: "Switzerland" },
  { code: "963",  flag: "🇸🇾", name: "Syria" },
  { code: "886",  flag: "🇹🇼", name: "Taiwan" },
  { code: "992",  flag: "🇹🇯", name: "Tajikistan" },
  { code: "255",  flag: "🇹🇿", name: "Tanzania" },
  { code: "66",   flag: "🇹🇭", name: "Thailand" },
  { code: "670",  flag: "🇹🇱", name: "Timor-Leste" },
  { code: "228",  flag: "🇹🇬", name: "Togo" },
  { code: "676",  flag: "🇹🇴", name: "Tonga" },
  { code: "1868", flag: "🇹🇹", name: "Trinidad & Tobago" },
  { code: "216",  flag: "🇹🇳", name: "Tunisia" },
  { code: "90",   flag: "🇹🇷", name: "Turkey" },
  { code: "993",  flag: "🇹🇲", name: "Turkmenistan" },
  { code: "688",  flag: "🇹🇻", name: "Tuvalu" },
  { code: "256",  flag: "🇺🇬", name: "Uganda" },
  { code: "380",  flag: "🇺🇦", name: "Ukraine" },
  { code: "971",  flag: "🇦🇪", name: "United Arab Emirates" },
  { code: "44",   flag: "🇬🇧", name: "United Kingdom" },
  { code: "1",    flag: "🇺🇸", name: "United States" },
  { code: "598",  flag: "🇺🇾", name: "Uruguay" },
  { code: "998",  flag: "🇺🇿", name: "Uzbekistan" },
  { code: "678",  flag: "🇻🇺", name: "Vanuatu" },
  { code: "58",   flag: "🇻🇪", name: "Venezuela" },
  { code: "84",   flag: "🇻🇳", name: "Vietnam" },
  { code: "967",  flag: "🇾🇪", name: "Yemen" },
  { code: "260",  flag: "🇿🇲", name: "Zambia" },
  { code: "263",  flag: "🇿🇼", name: "Zimbabwe" },
];

/* ============================================================
   ServiceWorkerManager — registers the PWA service worker
   ============================================================ */
class ServiceWorkerManager {
  constructor(swPath = '/sw.js') {
    this.swPath = swPath;
    this._register();
  }

  /** @private */
  async _register() {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.register(this.swPath);
      console.log('[SW] Registered, scope:', registration.scope);
    } catch (registrationError) {
      console.warn('[SW] Registration failed:', registrationError);
    }
  }
}

/* ============================================================
   ThemeManager — light / dark mode toggle with system-preference
   auto-detection and localStorage persistence.
   Depends on an inline <script> in <head> to apply the saved
   theme before stylesheets paint (anti-FOUC).
   ============================================================ */
class ThemeManager {
  constructor() {
    this.htmlEl     = document.documentElement;
    this.toggleBtn  = document.getElementById('themeToggle');
    this.storageKey = 'qwl-theme';

    this._bindEvents();
    this._syncAriaLabel();
  }

  /** Returns 'light' or 'dark' based on the current <html> attribute. */
  currentTheme() {
    return this.htmlEl.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  /** Applies a theme, persists it, and updates the toggle ARIA label. */
  applyTheme(theme) {
    if (theme === 'light') {
      this.htmlEl.setAttribute('data-theme', 'light');
    } else {
      this.htmlEl.removeAttribute('data-theme');
    }
    localStorage.setItem(this.storageKey, theme);
    this._syncAriaLabel();
  }

  /** @private */
  _syncAriaLabel() {
    if (!this.toggleBtn) return;
    const isDark = this.currentTheme() === 'dark';
    this.toggleBtn.setAttribute('aria-label',   isDark ? 'Switch to light mode' : 'Switch to dark mode');
    this.toggleBtn.setAttribute('aria-pressed', String(!isDark));
  }

  /** @private */
  _bindEvents() {
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => {
        this.applyTheme(this.currentTheme() === 'dark' ? 'light' : 'dark');
      });
    }

    // Follow system changes only when the user hasn't set a preference
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
      if (!localStorage.getItem(this.storageKey)) {
        this.applyTheme(e.matches ? 'light' : 'dark');
      }
    });
  }
}

/* Export via global namespace for use in non-module scripts */
window.QWL = window.QWL || {};
Object.assign(window.QWL, {
  ToastManager,
  SiteHeader,
  ScrollReveal,
  ServiceWorkerManager,
  ThemeManager,
  COUNTRY_CODES,
});
