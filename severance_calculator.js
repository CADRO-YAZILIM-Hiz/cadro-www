/* Official periods: https://www.csgb.gov.tr/Media/ydelgoxf/kidem-tazminati-yillar-1980-2026.pdf — verified 2026-11-16. */
(function (win, doc) {
  'use strict';
  var config = doc.getElementById('severance-config');
  if (!config) return;
  try {
    var settings = JSON.parse(config.textContent);
    var periods = settings.periods;
    var form = doc.getElementById('severance-form');
    if (!form) throw new Error('Severance form is missing.');
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var years = Number(doc.getElementById('years').value);
      var months = Number(doc.getElementById('months').value);
      var salary = Number(doc.getElementById('salary').value);
      var periodKey = doc.getElementById('period').value;
      var result = doc.getElementById('result');
      var messages = settings.messages[doc.documentElement.lang] || settings.messages.tr;
      var errors = [];
      if (!Number.isInteger(years) || years < 1 || years > 60) errors.push(messages.years);
      if (!Number.isInteger(months) || months < 0 || months > 11) errors.push(messages.months);
      if (!Number.isFinite(salary) || salary <= 0) errors.push(messages.salary);
      result.replaceChildren();
      result.hidden = false;
      if (errors.length || !periods[periodKey]) {
        var error = doc.createElement('p');
        error.className = 'calc-warning';
        error.setAttribute('role', 'alert');
        error.textContent = errors.join(' ') + (periods[periodKey] ? '' : messages.period);
        result.appendChild(error);
        return;
      }
      var ceiling = periods[periodKey].ceiling;
      var base = Math.min(salary, ceiling);
      var gross = base * (years * 365 + months * 30) / 365;
      var tax = gross * 0.00759;
      var resultData = [
        [messages.service, years + '/' + months + ' — ' + periods[periodKey].label],
        [messages.base, base],
        [messages.gross, gross],
        [messages.tax, -tax],
        [messages.net, gross - tax]
      ];
      if (salary > ceiling) {
        var warning = doc.createElement('p');
        warning.className = 'calc-warning';
        warning.textContent = messages.capped;
        result.appendChild(warning);
      }
      resultData.forEach(function (entry, index) {
        var row = doc.createElement('div');
        row.className = 'calc-result-row';
        var label = doc.createElement('span');
        var value = doc.createElement('strong');
        label.textContent = entry[0];
        value.textContent = index === 0 ? entry[1] : new Intl.NumberFormat(doc.documentElement.lang === 'en' ? 'en-GB' : doc.documentElement.lang === 'de' ? 'de-DE' : doc.documentElement.lang === 'ar' ? 'ar' : 'tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 }).format(entry[1]);
        row.append(label, value);
        result.appendChild(row);
      });
    });
  } catch (error) {
    var fail = doc.getElementById('calculator-config-error');
    if (fail) fail.hidden = false;
    console.error('Severance calculator configuration is invalid.', error);
  }
})(window, document);
