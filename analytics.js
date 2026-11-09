(function () {
  'use strict';

  var config = window.CADRO_ANALYTICS_CONFIG || {};
  var measurementId = config.ga4MeasurementId || '';
  var language = (document.documentElement.lang || 'tr').toLowerCase().slice(0, 2);
  var pageType = document.body && document.body.dataset.page ? document.body.dataset.page : 'content';
  var sentScroll = {};

  function baseParams(extra) {
    var params = {
      language: language,
      page_path: window.location.pathname,
      page_type: pageType
    };
    Object.keys(extra || {}).forEach(function (key) { params[key] = extra[key]; });
    return params;
  }

  function track(name, params) {
    var payload = baseParams(params);
    if (typeof window.gtag === 'function') window.gtag('event', name, payload);
    if (typeof window.clarity === 'function') {
      window.clarity('set', 'event_' + name, JSON.stringify(payload));
    }
  }

  function loadGa4() {
    if (!measurementId || window.__cadroGa4Loaded) return;
    window.__cadroGa4Loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', measurementId, { anonymize_ip: true });
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
    document.head.appendChild(script);
  }

  function isCta(element) {
    return element.matches('a.primary-button, a.ghost-button, button.primary-button, button.ghost-button, [data-analytics-cta], [data-checkout-plan]');
  }

  function labelFor(element) {
    return (element.getAttribute('data-analytics-label') || element.getAttribute('data-i18n-key') || element.textContent || '')
      .replace(/\s+/g, ' ').trim().slice(0, 100);
  }

  function bind() {
    loadGa4();
    track('page_view', { referrer: document.referrer || '' });

    document.addEventListener('click', function (event) {
      var element = event.target.closest('a,button');
      if (!element) return;
      if (isCta(element)) {
        track('cta_click', {
          cta_label: labelFor(element),
          destination: element.href || '',
          cta_position: element.closest('header,main,footer') ? element.closest('header,main,footer').tagName.toLowerCase() : 'other'
        });
      }
      if (element.matches('a[href^="https://app.cadro.io"], a[href^="mailto:"], a[href*="wa.me"]')) {
        track('contact_or_app_click', { destination: element.href || '' });
      }
      if (element.matches('[data-checkout-plan]')) {
        track('checkout_plan_select', {
          plan: element.getAttribute('data-checkout-plan') || '',
          billing: element.getAttribute('data-billing') || 'monthly'
        });
      }
      if (element.matches('#calc-btn, [data-calculator-submit], .calc-btn')) {
        track('calculator_complete', { calculator: pageType });
      }
      if (element.matches('[data-analytics-cta="calculator"]')) {
        track('calculator_cta_click', { calculator: labelFor(element) });
      }
      if (element.matches('[data-analytics-cta="industry-guide"]')) {
        track('industry_guide_click', { guide: labelFor(element) });
      }
      if (element.matches('[data-analytics-cta="ats-guide"]')) {
        track('ats_guide_click', { guide: labelFor(element) });
      }
      if (element.matches('[data-analytics-cta="ats-product"]')) {
        track('ats_product_click', { destination: element.href || '' });
      }
      if (element.matches('[data-analytics-cta="analytics-product"]')) {
        track('analytics_product_click', { destination: element.href || '' });
      }
      if (element.matches('[data-analytics-cta="analytics-demo"]')) {
        track('analytics_demo_click', { destination: element.href || '' });
      }
    }, { passive: true });

    document.addEventListener('change', function (event) {
      if (event.target.matches('#lang-switch, .lang-switch')) {
        track('language_switch', { selected_language: event.target.value || '' });
      }
    });

    document.addEventListener('focusin', function (event) {
      if (event.target.matches('form input, form select, form textarea')) {
        var form = event.target.form;
        if (form && !form.dataset.analyticsStarted) {
          form.dataset.analyticsStarted = 'true';
          track('form_start', { form_id: form.id || form.getAttribute('name') || 'unnamed_form' });
        }
      }
    });

    window.addEventListener('scroll', function () {
      var height = document.documentElement.scrollHeight - window.innerHeight;
      if (height <= 0) return;
      var percent = Math.floor((window.scrollY / height) * 100);
      [25, 50, 75, 90].forEach(function (threshold) {
        if (percent >= threshold && !sentScroll[threshold]) {
          sentScroll[threshold] = true;
          track('scroll_depth', { percent: threshold });
        }
      });
    }, { passive: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
}());
