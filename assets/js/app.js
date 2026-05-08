/**
 * Quick Wa Link — App Page JavaScript
 * Author: Godlove Tikum (@godlovtikum)
 * Standard: ES6 Classes
 * Depends on: js/shared.js (must load first)
 */

'use strict';

/* ============================================================
   PhonePreview — renders an interactive WhatsApp-style
   phone mockup that reflects the current generator state
   ============================================================ */
class PhonePreview {
  /**
   * @param {string} containerSelector  CSS selector for the phone container
   */
  constructor(containerSelector) {
    this.containerEl       = document.querySelector(containerSelector);
    this.sentBubbleEl      = document.getElementById('previewSentBubble');
    this.contactNameEl     = document.getElementById('previewContactName');
    this.defaultMessage    = "Hi! I saw your offer and I'm interested. Can we chat?";
    this.defaultPhone      = '+237 6XX XXX XXX';
  }

  /**
   * Updates the phone preview with new data
   * @param {object} previewData
   * @param {string} previewData.countryCode
   * @param {string} previewData.phoneNumber
   * @param {string} previewData.message
   */
  update({ countryCode = '237', phoneNumber = '', message = '' }) {
    const displayPhone   = phoneNumber
      ? `+${countryCode} ${phoneNumber}`
      : this.defaultPhone;

    const displayMessage = message.trim() || this.defaultMessage;

    if (this.contactNameEl) {
      this.contactNameEl.textContent = displayPhone;
    }

    if (this.sentBubbleEl) {
      this.sentBubbleEl.textContent = displayMessage;
      this._animateBubble();
    }
  }

  /** @private — brief pop animation on message change */
  _animateBubble() {
    if (!this.sentBubbleEl) return;
    this.sentBubbleEl.style.transform = 'scale(0.94)';
    this.sentBubbleEl.style.transition = 'transform 0.12s ease';
    requestAnimationFrame(() => {
      setTimeout(() => {
        this.sentBubbleEl.style.transform = 'scale(1)';
      }, 80);
    });
  }
}

/* ============================================================
   LinkGenerator — handles the form, generates WA links,
   manages copy/reset/open actions, and notifies PhonePreview
   ============================================================ */
class LinkGenerator {
  /**
   * @param {object} dependencies
   * @param {PhonePreview}  dependencies.phonePreview
   * @param {ToastManager}  dependencies.toastManager  (from window.QWL)
   */
  constructor({ phonePreview, toastManager }) {
    this.phonePreview  = phonePreview;
    this.toastManager  = toastManager;

    // Form elements
    this.formEl           = document.getElementById('generatorForm');
    this.countrySelect    = document.getElementById('countryCodeSelect');
    this.phonePrefixEl    = document.getElementById('phonePrefixDisplay');
    this.phoneInput       = document.getElementById('phoneNumberInput');
    this.messageTextarea  = document.getElementById('messageTextarea');
    this.charCountEl      = document.getElementById('messageCharCount');

    // Action buttons
    this.generateBtn  = document.getElementById('generateBtn');
    this.previewBtn   = document.getElementById('previewBtn');
    this.resetBtn     = document.getElementById('resetBtn');
    this.copyBtn      = document.getElementById('copyLinkBtn');
    this.openBtn      = document.getElementById('openLinkBtn');

    // Output elements
    this.outputCard       = document.getElementById('outputCard');
    this.outputEmptyState = document.getElementById('outputEmptyState');
    this.outputResultArea = document.getElementById('outputResultArea');
    this.outputLinkText   = document.getElementById('outputLinkText');

    // State
    this.generatedLink   = '';
    this.isCopied        = false;
    this.copyResetTimer  = null;

    this._populateCountrySelect();
    this._bindEvents();
  }

  /** @private — fills the <select> with country options */
  _populateCountrySelect() {
    if (!this.countrySelect) return;

    const { COUNTRY_CODES } = window.QWL;
    const fragment = document.createDocumentFragment();

    // Default placeholder option
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = '— Select country —';
    fragment.appendChild(placeholderOption);

    COUNTRY_CODES.forEach(({ code, flag, name }) => {
      const optionEl = document.createElement('option');
      optionEl.value = code;
      optionEl.textContent = `${flag} ${name} (+${code})`;
      // Pre-select Cameroon as default
      if (code === '237' && name === 'Cameroon') {
        optionEl.selected = true;
      }
      fragment.appendChild(optionEl);
    });

    this.countrySelect.appendChild(fragment);
    this._updatePhonePrefix('237'); // match pre-selected
  }

  /** @private */
  _bindEvents() {
    // Country code change — update prefix badge
    this.countrySelect?.addEventListener('change', () => {
      this._updatePhonePrefix(this.countrySelect.value);
      this._liveUpdatePreview();
    });

    // Phone input — strip non-digits, live preview
    this.phoneInput?.addEventListener('input', () => {
      this.phoneInput.value = this.phoneInput.value.replace(/\D/g, '');
      this._liveUpdatePreview();
    });

    // Message textarea — char count, live preview
    this.messageTextarea?.addEventListener('input', () => {
      this._updateCharCount();
      this._liveUpdatePreview();
    });

    // Form submit → generate
    this.formEl?.addEventListener('submit', (submitEvent) => {
      submitEvent.preventDefault();
      this._handleGenerate();
    });

    // Buttons
    this.previewBtn?.addEventListener('click', () => this._handleScrollToPreview());
    this.resetBtn?.addEventListener('click',   () => this._handleReset());
    this.copyBtn?.addEventListener('click',    () => this._handleCopy());
    this.openBtn?.addEventListener('click',    () => this._handleOpenLink());
  }

  /** @private — update +prefix badge next to phone field */
  _updatePhonePrefix(code) {
    if (!this.phonePrefixEl) return;
    this.phonePrefixEl.textContent = code ? `+${code}` : '+—';
    this.phonePrefixEl.classList.toggle('active', Boolean(code));
  }

  /** @private — update live char count on message textarea */
  _updateCharCount() {
    if (!this.charCountEl || !this.messageTextarea) return;
    const currentLength = this.messageTextarea.value.length;
    this.charCountEl.textContent = `${currentLength}/800`;
    this.charCountEl.style.color = currentLength > 750
      ? '#ff6b6b'
      : 'var(--text-muted)';
  }

  /** @private — silently push current state to phone preview */
  _liveUpdatePreview() {
    this.phonePreview?.update({
      countryCode: this.countrySelect?.value || '237',
      phoneNumber: this.phoneInput?.value || '',
      message:     this.messageTextarea?.value || '',
    });
  }

  /**
   * @private
   * @returns {string|null} validated wa.me URL or null on failure
   */
  _buildWaLink(countryCode, phoneNumber, message) {
    const fullNumber = `${countryCode}${phoneNumber}`;
    const trimmedMessage = message.trim();

    return trimmedMessage
      ? `https://wa.me/${fullNumber}?text=${encodeURIComponent(trimmedMessage)}`
      : `https://wa.me/${fullNumber}`;
  }

  /** @private — validates form fields; returns error message or null */
  _validateForm() {
    const countryCode  = this.countrySelect?.value?.trim();
    const phoneNumber  = this.phoneInput?.value?.trim();

    if (!countryCode) return 'Please select a country code.';
    if (!phoneNumber) return 'Please enter a phone number.';
    if (!/^\d{7,15}$/.test(phoneNumber)) {
      return 'Enter a valid phone number (7–15 digits, no leading 0 or spaces).';
    }
    return null;
  }

  /** @private — main generate handler */
  _handleGenerate() {
    const validationError = this._validateForm();
    if (validationError) {
      this.toastManager.error(validationError);
      this.phoneInput?.focus();
      return;
    }

    const countryCode = this.countrySelect.value;
    const phoneNumber = this.phoneInput.value;
    const message     = this.messageTextarea?.value || '';

    this.generatedLink = this._buildWaLink(countryCode, phoneNumber, message);

    this._showOutputResult(this.generatedLink);

    this.phonePreview?.update({ countryCode, phoneNumber, message });

    this.toastManager.success('Your WhatsApp link is ready! 🎉');

    // Scroll output into view on mobile
    this.outputCard?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /** @private — render the generated link in the output card */
  _showOutputResult(link) {
    this.outputEmptyState?.classList.add('is-hidden');
    this.outputResultArea?.classList.remove('is-hidden');
    if (this.outputLinkText) {
      this.outputLinkText.href = link;
      this.outputLinkText.textContent = link;
    }
    this.outputCard?.classList.add('has-link');
    this.resetBtn?.classList.remove('is-hidden');
  }

  /** @private */
  _handleScrollToPreview() {
    const previewSection = document.getElementById('previewPanel');
    previewSection?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /** @private */
  _handleReset() {
    // Reset form values
    if (this.countrySelect) {
      // Re-select Cameroon
      const cameroonOption = this.countrySelect.querySelector('option[value="237"]');
      if (cameroonOption) cameroonOption.selected = true;
      this.countrySelect.value = '237';
    }
    if (this.phoneInput) this.phoneInput.value = '';
    if (this.messageTextarea) this.messageTextarea.value = '';

    // Reset state
    this.generatedLink = '';
    this._updatePhonePrefix('237');
    this._updateCharCount();

    // Reset output UI
    this.outputEmptyState?.classList.remove('is-hidden');
    this.outputResultArea?.classList.add('is-hidden');
    this.outputCard?.classList.remove('has-link');
    this.resetBtn?.classList.add('is-hidden');

    // Reset phone preview
    this.phonePreview?.update({ countryCode: '237', phoneNumber: '', message: '' });

    this.toastManager.info('Form cleared and reset.');
  }

  /** @private */
  async _handleCopy() {
    if (!this.generatedLink) {
      this.toastManager.error('Generate a link first, then copy.');
      return;
    }

    try {
      await navigator.clipboard.writeText(this.generatedLink);
      this._setCopiedState();
      this.toastManager.success('Link copied to clipboard!');
    } catch {
      // Fallback for browsers without clipboard API
      this._fallbackCopy(this.generatedLink);
    }
  }

  /** @private */
  _setCopiedState() {
    if (!this.copyBtn) return;

    this.isCopied = true;
    this.copyBtn.classList.add('copied');
    this.copyBtn.textContent = '✓ Copied!';

    clearTimeout(this.copyResetTimer);
    this.copyResetTimer = setTimeout(() => {
      this.isCopied = false;
      this.copyBtn.classList.remove('copied');
      this.copyBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <rect x="9" y="9" width="13" height="13" rx="2"/>
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
        </svg>
        Copy Link
      `;
    }, 2800);
  }

  /** @private — execCommand fallback for older browsers */
  _fallbackCopy(textToCopy) {
    const tempTextarea = document.createElement('textarea');
    tempTextarea.value = textToCopy;
    tempTextarea.style.position = 'fixed';
    tempTextarea.style.opacity = '0';
    document.body.appendChild(tempTextarea);
    tempTextarea.select();

    try {
      document.execCommand('copy');
      this._setCopiedState();
      this.toastManager.success('Link copied!');
    } catch {
      this.toastManager.error('Copy failed. Select the link and copy manually.');
    } finally {
      document.body.removeChild(tempTextarea);
    }
  }

  /** @private */
  _handleOpenLink() {
    if (this.generatedLink) {
      window.open(this.generatedLink, '_blank', 'noopener,noreferrer');
    }
  }
}

/* ============================================================
   ContactForm — handles the contact form submission on
   the landing page, posting to the Netlify Function endpoint
   ============================================================ */
class ContactForm {
  /**
   * @param {ToastManager} toastManager
   */
  constructor(toastManager) {
    this.toastManager = toastManager;
    this.formEl       = document.getElementById('contactForm');
    this.submitBtn    = document.getElementById('contactSubmitBtn');
    this.successState = document.getElementById('contactSuccessState');
    this.formState    = document.getElementById('contactFormState');
    this.sendAnotherBtn = document.getElementById('sendAnotherBtn');

    this.isSubmitting = false;

    this._bindEvents();
  }

  /** @private */
  _bindEvents() {
    this.formEl?.addEventListener('submit', (submitEvent) => {
      submitEvent.preventDefault();
      this._handleSubmit();
    });

    this.sendAnotherBtn?.addEventListener('click', () => this._resetToForm());

    // Live char count for message field
    const messageField = document.getElementById('contactMessage');
    const charCounter  = document.getElementById('contactMsgCharCount');
    if (messageField && charCounter) {
      messageField.addEventListener('input', () => {
        charCounter.textContent = `${messageField.value.length}/2000`;
      });
    }
  }

  /** @private */
  async _handleSubmit() {
    if (this.isSubmitting) return;

    const formData = this._getFormData();
    const validationError = this._validateFormData(formData);

    if (validationError) {
      this.toastManager.error(validationError);
      return;
    }

    this._setLoadingState(true);

    try {
      const response = await fetch('/.netlify/functions/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(responseData.message || 'Submission failed. Please try again.');
      }

      this._showSuccessState();
      this.toastManager.success("Message sent! Godlove will reply within 24 hours.");

    } catch (submitError) {
      this.toastManager.error(submitError.message || 'Something went wrong. Please try WhatsApp instead.');
    } finally {
      this._setLoadingState(false);
    }
  }

  /** @private */
  _getFormData() {
    return {
      name:    document.getElementById('contactName')?.value?.trim()    || '',
      email:   document.getElementById('contactEmail')?.value?.trim()   || '',
      subject: document.getElementById('contactSubject')?.value?.trim() || '',
      message: document.getElementById('contactMessage')?.value?.trim() || '',
    };
  }

  /** @private */
  _validateFormData({ name, email, subject, message }) {
    if (!name)    return 'Please enter your name.';
    if (!email)   return 'Please enter your email address.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.';
    if (!subject) return 'Please select a subject.';
    if (!message) return 'Please write a message.';
    if (message.length < 10) return 'Your message is too short (minimum 10 characters).';
    if (message.length > 2000) return 'Your message is too long (maximum 2000 characters).';
    return null;
  }

  /** @private */
  _setLoadingState(isLoading) {
    this.isSubmitting = isLoading;
    if (!this.submitBtn) return;

    if (isLoading) {
      this.submitBtn.disabled = true;
      this.submitBtn.innerHTML = `<span class="spinner" aria-hidden="true"></span> Sending…`;
    } else {
      this.submitBtn.disabled = false;
      this.submitBtn.textContent = 'Send Message →';
    }
  }

  /** @private */
  _showSuccessState() {
    this.formState?.classList.add('is-hidden');
    this.successState?.classList.remove('is-hidden');
    this.successState?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /** @private */
  _resetToForm() {
    if (this.formEl)       this.formEl.reset();
    this.successState?.classList.add('is-hidden');
    this.formState?.classList.remove('is-hidden');

    const charCounter = document.getElementById('contactMsgCharCount');
    if (charCounter) charCounter.textContent = '0/2000';
  }
}

/* ── Boot: initialise app page classes ─────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const { ToastManager, SiteHeader, ScrollReveal, ServiceWorkerManager } = window.QWL;

  const toastManager = new ToastManager();
  new SiteHeader();
  new ScrollReveal();
  new ServiceWorkerManager();

  // Only init generator/preview if on app page
  const generatorFormEl = document.getElementById('generatorForm');
  if (generatorFormEl) {
    const phonePreview = new PhonePreview('#previewPanel');
    new LinkGenerator({ phonePreview, toastManager });
  }

  // Only init contact form if on landing page
  const contactFormEl = document.getElementById('contactForm');
  if (contactFormEl) {
    new ContactForm(toastManager);
  }
});
