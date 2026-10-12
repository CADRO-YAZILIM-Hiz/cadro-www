(function () {
  'use strict';
  var key = 'cadro_analytics_consent';
  var clarityId = 'xuly9fxhfn';
  var path = window.location.pathname;
  var language = path.split('/').filter(Boolean)[0] || 'tr';
  if (['tr', 'en', 'de', 'ar'].indexOf(language) === -1) language = 'tr';
  var copy = {
    tr: { label: '\u00c7erez bildirimi', title: 'Gizlilik ve \u00e7erezler', text: 'Analitik izlemeyi yaln\u0131zca onay\u0131n\u0131zla kullan\u0131r\u0131z.', privacy: 'Gizlilik Politikas\u0131', accept: 'Kabul Et', reject: 'Reddet', settings: '\u00c7erez ayarlar\u0131' },
    en: { label: 'Cookie notice', title: 'Privacy and cookies', text: 'We use analytics only with your consent.', privacy: 'Privacy Policy', accept: 'Accept', reject: 'Reject', settings: 'Cookie settings' },
    de: { label: 'Cookie-Hinweis', title: 'Datenschutz und Cookies', text: 'Wir verwenden Analysen nur mit Ihrer Einwilligung.', privacy: 'Datenschutz', accept: 'Akzeptieren', reject: 'Ablehnen', settings: 'Cookie-Einstellungen' },
    ar: { label: '\u0625\u0634\u0639\u0627\u0631 \u0645\u0644\u0641\u0627\u062a \u0627\u0644\u0627\u0631\u062a\u0628\u0627\u0637', title: '\u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629 \u0648\u0645\u0644\u0641\u0627\u062a \u0627\u0644\u0627\u0631\u062a\u0628\u0627\u0637', text: '\u0646\u0633\u062a\u062e\u062f\u0645 \u0627\u0644\u062a\u062d\u0644\u064a\u0644\u0627\u062a \u0628\u0639\u062f \u0645\u0648\u0627\u0641\u0642\u062a\u0643 \u0641\u0642\u0637.', privacy: '\u0633\u064a\u0627\u0633\u0629 \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629', accept: '\u0645\u0648\u0627\u0641\u0642\u0629', reject: '\u0631\u0641\u0636', settings: '\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0645\u0644\u0641\u0627\u062a \u0627\u0644\u0627\u0631\u062a\u0628\u0627\u0637' }
  }[language];
  var prefix = language === 'tr' ? './' : '../';

  function loadClarity() {
    if (window.__cadroClarityLoaded) return;
    window.__cadroClarityLoaded = true;
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.clarity.ms/tag/' + clarityId;
    document.head.appendChild(script);
  }

  function applyConsent(value) {
    if (value) loadClarity();
    if (typeof window.clarity === 'function') window.clarity('consent', value);
  }

  function renderBanner() {
    var banner = document.createElement('aside');
    banner.setAttribute('aria-label', copy.label);
    banner.style.cssText = 'position:fixed;z-index:9999;left:16px;right:16px;bottom:16px;max-width:760px;margin:auto;padding:18px 20px;background:#0f172a;color:#e2e8f0;border-radius:14px;box-shadow:0 16px 40px rgba(15,23,42,.25);font:14px/1.5 Manrope,Arial,sans-serif;';
    banner.innerHTML = '<strong style="display:block;color:#fff;margin-bottom:6px">' + copy.title + '</strong><span>' + copy.text + ' <a href="' + prefix + 'privacy.html" style="color:#67e8f9">' + copy.privacy + '</a></span><div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap"><button type="button" data-consent="accept" style="border:0;border-radius:8px;padding:9px 14px;background:#06b6d4;color:#082f49;font-weight:700;cursor:pointer">' + copy.accept + '</button><button type="button" data-consent="reject" style="border:1px solid #64748b;border-radius:8px;padding:9px 14px;background:transparent;color:#e2e8f0;font-weight:700;cursor:pointer">' + copy.reject + '</button></div>';
    document.body.appendChild(banner);
    banner.addEventListener('click', function (event) {
      var action = event.target.getAttribute('data-consent');
      if (!action) return;
      localStorage.setItem(key, action === 'accept' ? 'accepted' : 'rejected');
      banner.remove();
      applyConsent(action === 'accept');
    });
  }

  function renderSettings() {
    var button = document.createElement('button');
    button.type = 'button';
    button.textContent = copy.settings;
    button.style.cssText = 'position:fixed;z-index:9998;left:16px;bottom:16px;border:1px solid #64748b;border-radius:8px;padding:7px 10px;background:#0f172a;color:#e2e8f0;font:12px Manrope,Arial,sans-serif;cursor:pointer;';
    button.addEventListener('click', function () { button.remove(); renderBanner(); });
    document.body.appendChild(button);
  }

  var saved = localStorage.getItem(key);
  if (saved === 'accepted') applyConsent(true);
  else if (saved === 'rejected') renderSettings();
  else renderBanner();
}());
