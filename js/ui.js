/* Small page helpers. Nothing typed here is sent anywhere or saved. */
const UI = (() => {
  const money = x => (x < 0 ? '-$' : '$') + Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const $ = id => document.getElementById(id);
  function num(id, { min = 0, max = 1e12, label } = {}) {
    const el = $(id), raw = (el.value || '').replace(/[$,\s%]/g, '');
    if (raw === '') throw new Error(`Please enter ${label || 'a number'}.`);
    const v = Number(raw);
    if (!isFinite(v)) throw new Error(`${label || 'That value'} must be a number.`);
    if (v < min) throw new Error(`${label || 'That value'} can't be less than ${min}.`);
    if (v > max) throw new Error(`${label || 'That value'} looks too large.`);
    return v;
  }
  function show(id, html) { const el = $(id); el.innerHTML = html; el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); }
  function error(id, e) { $(id).innerHTML = `<p class="err" role="alert">${esc(e.message)}</p>`; }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function onSubmit(formId, fn) { $(formId).addEventListener('submit', ev => { ev.preventDefault(); fn(); }); }
  const months = m => m === 1 ? '1 month' : m < 12 ? `${m} months` : `${Math.floor(m / 12)} yr${m >= 24 ? 's' : ''}${m % 12 ? ' ' + (m % 12) + ' mo' : ''}`;
  return { money, $, num, show, error, esc, onSubmit, months };
})();
