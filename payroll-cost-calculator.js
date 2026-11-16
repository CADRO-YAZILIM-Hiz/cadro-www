/* Simplified gross-cost scenario for standard 4/a employment only.
 * Ceiling, incentive eligibility, daily wage, exceptions and current official
 * parameters must be checked with a Turkish payroll specialist before payroll use.
 * Parameters reviewed 2026-11-16; legal register: PR_SOURCE_AND_DATA_REGISTER.md.
 */
(function () {
  'use strict';
  const form = document.getElementById('payroll-cost-form');
  if (!form) return;
  const employerSocialRate = 0.205;
  const employerUnemploymentRate = 0.02;
  const maxGross = 10000000;
  const maxEmployees = 10000;
  function value(id) { return Number(document.getElementById(id).value); }
  function validPositiveInteger(n, max) { return Number.isInteger(n) && n >= 1 && n <= max; }
  function format(n) { return `₺${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
  function setText(id, text) { document.getElementById(id).textContent = text; }
  function show(id, visible) { document.getElementById(id).hidden = !visible; }
  function calculate() {
    const input = value('gross-salary'), employees = value('emp-count');
    const help = document.getElementById('gross-salary-error');
    const grossError = !Number.isFinite(input) || input <= 0 || input > maxGross;
    const countError = !validPositiveInteger(employees, maxEmployees);
    setText('gross-salary-error', grossError ? '0’dan büyük ve en fazla 10.000.000 TL brüt tutar girin.' : '');
    document.getElementById('gross-salary').setAttribute('aria-invalid', grossError ? 'true' : 'false');
    setText('emp-count-error', countError ? '1–10.000 arasında tam çalışan sayısı girin.' : '');
    document.getElementById('emp-count').setAttribute('aria-invalid', countError ? 'true' : 'false');
    document.getElementById('payroll-results').hidden = grossError || countError;
    if (grossError || countError) return;
    const includeKidem = document.getElementById('kidem-check').checked;
    const includeBonus = document.getElementById('prim-check').checked;
    const includeIncentive = document.getElementById('tesvik-check').checked;
    const employerSocialBeforeIncentive = input * employerSocialRate;
    const employerUnemployment = input * employerUnemploymentRate;
    const incentive = includeIncentive ? input * 0.05 : 0;
    const employerSocialAfterIncentive = employerSocialBeforeIncentive - incentive;
    const severanceProvision = includeKidem ? input / 12 : 0;
    const bonusProvision = includeBonus ? input / 12 : 0;
    const total = input + employerSocialAfterIncentive + employerUnemployment + severanceProvision + bonusProvision;
    setText('r-gross', format(input));
    setText('r-sgk', format(employerSocialAfterIncentive));
    setText('r-isizlik', format(employerUnemployment));
    setText('r-kidem', format(severanceProvision));
    setText('r-prim', format(bonusProvision));
    setText('r-tesvik', `− ${format(incentive)}`);
    setText('r-total', format(total));
    setText('r-annual', format(total * 12));
    setText('r-team', format(total * employees));
    show('kidem-row', includeKidem);
    show('prim-row', includeBonus);
    show('tesvik-row', includeIncentive);
    show('team-row', employees > 1);
    setText('r-annual-label', `Tahmini yıllık toplam (${employees.toLocaleString('tr-TR')} kişi)`);
    setText('r-annual', format(total * 12 * employees));
    setText('r-team', `Aynı brüt ve seçimler ${employees.toLocaleString('tr-TR')} kişi için uygulandı.`);
    setText('r-cost-note', 'Tavan uygulanmamıştır. Aynı aylık brüt sürenin 12 ay devam ettiği, seçili indirimin tüm döneme ait olduğu ve farklı personel türleri/istisnalar bulunmadığı varsayılır.');
  }
  form.addEventListener('input', calculate);
  form.addEventListener('change', calculate);
  form.addEventListener('submit', event => event.preventDefault());
  calculate();
})();
