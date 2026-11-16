/* Declared scenario model only. No benchmark/customer efficacy claim.
 * Formula/source disclosure: #hesaplama and editorial-inventory/evidence-register.csv.
 */
(function () {
  'use strict';
  const form = document.getElementById('roi-form');
  if (!form) return;
  const ids = ['emp-count','ik-count','ik-salary','manual-hours','hire-per-year','automation-rate','workweeks','hourly-cost','days-before','days-after','vacancy-day-cost','monthly-plan-cost'];
  const labels = { 'automation-rate': 'automation-val', workweeks: 'workweeks-val', 'days-before': 'days-before-val', 'days-after': 'days-after-val', 'hourly-cost': 'hourly-cost-val', 'vacancy-day-cost': 'vacancy-cost-val', 'monthly-plan-cost': 'plan-val' };
  function number(id) { return document.getElementById(id).valueAsNumber; }
  function valid(id, min, max) { const n = number(id); return Number.isFinite(n) && n >= min && n <= max; }
  function safeDays() { return number('days-after') <= number('days-before'); }
  function useValidInputs() { return valid('ik-count',1,10000) && valid('ik-salary',0.01,1000000) && valid('manual-hours',0,168) && valid('hire-per-year',0,10000) && valid('automation-rate',0,100) && valid('workweeks',1,52) && valid('hourly-cost',0.01,100000) && valid('days-before',0,365) && valid('days-after',0,365) && safeDays() && valid('vacancy-day-cost',0,1000000) && valid('monthly-plan-cost',1,1000000); }
  function fmt(value) { return `₺${value.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})}`; }
  function label(id,value) { const node = document.getElementById(labels[id]); if(node) node.textContent = value; }
  function setResult(id,value) { document.getElementById(id).textContent = value; }
  function updateLabels() {
    for (const [key,target] of Object.entries(labels)) label(key,number(key).toLocaleString('tr-TR'));
    const derived = number('ik-salary') / 176;
    label('hourly-cost',Number.isFinite(derived) ? fmt(derived) : '—');
  }
  function calculate() {
    updateLabels();
    const daysHelp = document.getElementById('roi-days-error');
    daysHelp.hidden = safeDays();
    const valid = useValidInputs();
    document.getElementById('roi-input-error').hidden = valid;
    document.getElementById('roi-results').hidden = !valid;
    if (!valid) return;
    const hoursSaved = number('ik-count') * number('manual-hours') * (number('automation-rate') / 100) * number('workweeks');
    const hourly = Number.isFinite(number('hourly-cost')) ? number('hourly-cost') : number('ik-salary') / 176;
    const laborBenefit = hoursSaved * hourly;
    const hiringBenefit = number('hire-per-year') * (number('days-before') - number('days-after')) * number('vacancy-day-cost');
    const totalBenefit = laborBenefit + hiringBenefit;
    const annualCost = number('monthly-plan-cost') * 12;
    const annualNet = totalBenefit - annualCost;
    setResult('res-annual-save',fmt(totalBenefit));
    setResult('res-payback', totalBenefit > 0 && annualCost > 0 ? `${(annualCost / (totalBenefit / 12)).toLocaleString('tr-TR',{minimumFractionDigits:1,maximumFractionDigits:1})} ay` : annualCost === 0 ? 'Maliyet girilmedi' : 'Bu senaryoda geri ödeme yok');
    setResult('res-efficiency',`${hoursSaved.toLocaleString('tr-TR',{maximumFractionDigits:1})} saat/yıl`);
    setResult('res-hiring',`${(number('days-before') - number('days-after')).toLocaleString('tr-TR')} gün/pozisyon`);
    setResult('res-roi', annualCost > 0 ? `%${((annualNet / annualCost) * 100).toLocaleString('tr-TR',{maximumFractionDigits:1})}` : 'Oran hesaplanamaz');
    setResult('res-3yr',fmt(annualNet * 3));
    setResult('res-annual-net',fmt(annualNet));
    setResult('res-benefit-detail',`${fmt(laborBenefit)} işgücü faydası + ${fmt(hiringBenefit)} işe alım faydası; ${fmt(annualCost)} yıllık plan maliyeti düşülerek hesaplandı.`);
  }
  form.addEventListener('input', calculate);
  form.addEventListener('change', calculate);
  form.addEventListener('submit', event => event.preventDefault());
  document.getElementById('derive-hourly').addEventListener('click', function () {
    if (valid('ik-salary',0.01,1000000)) { document.getElementById('hourly-cost').value = (number('ik-salary') / 176).toFixed(2); calculate(); }
  });
  calculate();
})();
