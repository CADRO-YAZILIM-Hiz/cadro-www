(function setupTemplateLeadGate() {
  var links = document.querySelectorAll('a.download-btn[data-template-name]');
  if (!links.length) return;

  var lang = (document.documentElement.getAttribute('lang') || 'tr').toLowerCase();
  var i18n = {
    tr: {
      title: 'Sablonu indirmeden once',
      text: 'Sablon baglantisini e-posta adresinize de iletmek icin bilgilerinizi birakabilirsiniz.',
      name: 'Ad Soyad',
      email: 'E-posta',
      phone: 'Telefon',
      company: 'Sirket',
      consent: 'Bilgilerimin CADRO tarafindan urun iletisimi icin kullanilmasini kabul ediyorum.',
      submit: 'Sablonu indir',
      skip: 'Atla ve indir',
      sending: 'Gonderiliyor...',
      required: 'Lutfen zorunlu alanlari doldurun.',
      invalidEmail: 'Lutfen gecerli bir e-posta girin.',
      close: 'Kapat',
      thankYouPath: '/tesekkur-sablon-indirme.html'
    },
    en: {
      title: 'Before you download',
      text: 'Leave your details to also receive the template link by email.',
      name: 'Full name',
      email: 'Email',
      phone: 'Phone',
      company: 'Company',
      consent: 'I agree that CADRO can use my details for product communication.',
      submit: 'Download template',
      skip: 'Skip and download',
      sending: 'Sending...',
      required: 'Please fill in the required fields.',
      invalidEmail: 'Please enter a valid email address.',
      close: 'Close',
      thankYouPath: '/en/template-download-thank-you.html'
    },
    de: {
      title: 'Vor dem Download',
      text: 'Hinterlassen Sie Ihre Daten, damit wir Ihnen den Vorlagenlink auch per E-Mail senden koennen.',
      name: 'Vollstaendiger Name',
      email: 'E-Mail',
      phone: 'Telefon',
      company: 'Unternehmen',
      consent: 'Ich stimme zu, dass CADRO meine Daten fuer Produktkommunikation nutzen darf.',
      submit: 'Vorlage herunterladen',
      skip: 'Ueberspringen und herunterladen',
      sending: 'Wird gesendet...',
      required: 'Bitte fuellen Sie die Pflichtfelder aus.',
      invalidEmail: 'Bitte geben Sie eine gueltige E-Mail-Adresse ein.',
      close: 'Schliessen',
      thankYouPath: '/de/vorlagen-download-danke.html'
    },
    ar: {
      title: 'قبل التحميل',
      text: 'اترك بياناتك للحصول على رابط القالب عبر البريد الالكتروني ايضا.',
      name: 'الاسم الكامل',
      email: 'البريد الالكتروني',
      phone: 'الهاتف',
      company: 'الشركة',
      consent: 'اوافق على استخدام CADRO لبياناتي للتواصل بخصوص المنتج.',
      submit: 'تحميل القالب',
      skip: 'تخطي والتحميل',
      sending: 'جار الارسال...',
      required: 'يرجى تعبئة الحقول المطلوبة.',
      invalidEmail: 'يرجى ادخال بريد الكتروني صحيح.',
      close: 'اغلاق',
      thankYouPath: '/ar/shukran-qawalib.html'
    }
  };

  var t = i18n[lang] || i18n.tr;
  var storageKey = 'cadro_template_lead_' + lang;

  var modal = document.createElement('div');
  modal.className = 'contact-modal';
  modal.setAttribute('hidden', '');
  modal.innerHTML =
    '<button type="button" class="contact-modal-close" aria-label="' + t.close + '">&times;</button>' +
    '<div class="contact-modal-dialog" role="dialog" aria-modal="true">' +
      '<div class="contact-form-wrapper">' +
        '<h2>' + t.title + '</h2>' +
        '<p class="contact-modal-desc">' + t.text + '</p>' +
        '<form class="contact-form" novalidate>' +
          '<label><span>' + t.name + '</span><input type="text" name="name" required></label>' +
          '<label><span>' + t.email + '</span><input type="email" name="email" required></label>' +
          '<label><span>' + t.phone + '</span><input type="tel" name="phone" required></label>' +
          '<label><span>' + t.company + '</span><input type="text" name="company" required></label>' +
          '<label style="display:flex;gap:8px;align-items:flex-start;line-height:1.4;">' +
            '<input type="checkbox" name="consent" required style="margin-top:4px;">' +
            '<span>' + t.consent + '</span>' +
          '</label>' +
          '<p class="cf-error-msg" style="color:var(--rose);font-weight:700;display:none;margin:0;"></p>' +
          '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
            '<button type="submit" class="primary-button lead-submit-btn">' + t.submit + '</button>' +
            '<button type="button" class="ghost-button lead-skip-btn">' + t.skip + '</button>' +
          '</div>' +
        '</form>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);

  var closeBtn = modal.querySelector('.contact-modal-close');
  var form = modal.querySelector('.contact-form');
  var err = modal.querySelector('.cf-error-msg');
  var submitBtn = modal.querySelector('.lead-submit-btn');
  var skipBtn = modal.querySelector('.lead-skip-btn');
  var pending = null;

  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  function getAttribution() {
    var params = new URLSearchParams(window.location.search || '');
    return {
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
      utm_term: params.get('utm_term') || '',
      utm_content: params.get('utm_content') || '',
      gclid: params.get('gclid') || '',
      fbclid: params.get('fbclid') || '',
      referrer: document.referrer || ''
    };
  }

  function openModal(link) {
    pending = link;
    form.reset();
    err.style.display = 'none';
    submitBtn.disabled = false;
    modal.removeAttribute('hidden');
    document.body.classList.add('lightbox-open');
    var first = form.querySelector('input[name="name"]');
    if (first) first.focus();
  }

  function closeModal() {
    modal.setAttribute('hidden', '');
    document.body.classList.remove('lightbox-open');
  }

  function fireDownloadEvent(link, leadCaptured) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'template_download', {
        page: window.location.pathname,
        template_name: link.getAttribute('data-template-name') || 'unknown-template',
        file_url: link.getAttribute('href') || '',
        lead_captured: leadCaptured ? 'yes' : 'no'
      });
    }
  }

  function runDownloadAndRedirect(link, leadCaptured) {
    var href = link.getAttribute('href') || '';
    fireDownloadEvent(link, leadCaptured);

    var a = document.createElement('a');
    a.href = href;
    a.download = link.getAttribute('download') || '';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();

    var templateName = encodeURIComponent(link.getAttribute('data-template-name') || 'template');
    window.setTimeout(function () {
      window.location.href = t.thankYouPath + '?template=' + templateName;
    }, 300);
  }

  async function submitLead(link) {
    var name = (form.elements.name.value || '').trim();
    var email = (form.elements.email.value || '').trim();
    var phone = (form.elements.phone.value || '').trim();
    var company = (form.elements.company.value || '').trim();
    var consent = !!form.elements.consent.checked;

    if (!name || !email || !phone || !company || !consent) {
      err.textContent = t.required;
      err.style.display = '';
      return;
    }
    if (!isValidEmail(email)) {
      err.textContent = t.invalidEmail;
      err.style.display = '';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = t.sending;
    err.style.display = 'none';

    var attribution = getAttribution();
    var attrParts = [];
    Object.keys(attribution).forEach(function (k) {
      if (attribution[k]) attrParts.push(k + '=' + attribution[k]);
    });
    var attrLine = attrParts.length ? ' | attribution=' + attrParts.join('&') : '';

    var payload = {
      name: name,
      email: email,
      phone: phone,
      company: company,
      message: 'Template download lead: ' + (link.getAttribute('data-template-name') || 'unknown') + ' | file=' + (link.getAttribute('href') || '') + attrLine,
      language: lang,
      source_page: window.location.pathname,
      source_query: window.location.search || '',
      utm_source: attribution.utm_source,
      utm_medium: attribution.utm_medium,
      utm_campaign: attribution.utm_campaign,
      utm_term: attribution.utm_term,
      utm_content: attribution.utm_content,
      gclid: attribution.gclid,
      fbclid: attribution.fbclid,
      referrer: attribution.referrer,
      source_meta: {
        page: window.location.pathname,
        query: window.location.search || '',
        attribution: attribution,
        template_name: link.getAttribute('data-template-name') || 'unknown-template',
        file_url: link.getAttribute('href') || ''
      }
    };

    try {
      var baseUrl = (window.CADRO_CONFIG && window.CADRO_CONFIG.api && window.CADRO_CONFIG.api.baseUrl) || '';
      var response = await fetch(baseUrl + '/api/v1/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('lead_send_failed');

      localStorage.setItem(storageKey, JSON.stringify({
        ts: Date.now(),
        email: email
      }));
      closeModal();
      runDownloadAndRedirect(link, true);
    } catch (e) {
      err.textContent = 'Sunucuya gonderim basarisiz. Indirme islemi baslatiliyor.';
      err.style.display = '';
      localStorage.setItem(storageKey, JSON.stringify({ ts: Date.now(), email: email }));
      closeModal();
      runDownloadAndRedirect(link, true);
    }
  }

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.hasAttribute('hidden')) closeModal();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!pending) return;
    submitLead(pending);
  });

  skipBtn.addEventListener('click', function () {
    if (!pending) return;
    closeModal();
    runDownloadAndRedirect(pending, false);
  });

  links.forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var existing = localStorage.getItem(storageKey);
      if (existing) {
        runDownloadAndRedirect(link, true);
        return;
      }
      openModal(link);
    });
  });
})();
