/* Form wiring for each tool page. The page's <body data-tool="..."> picks which one runs. */
(() => {
  const { money, $, num, show, error, esc, onSubmit, months } = UI;
  const T = {};

  T['budget'] = () => onSubmit('f', () => {
    try {
      const inc = num('income', { label: 'your monthly take-home pay' }); const b = Calc.budget503020(inc);
      show('out', `<p>On ${money(inc)} a month:</p><table><tr><th>Part</th><th class="n">Per month</th><th class="n">Per year</th></tr>
        <tr><td>Needs (50%)</td><td class="n">${money(b.needs)}</td><td class="n">${money(b.needs * 12)}</td></tr>
        <tr><td>Wants (30%)</td><td class="n">${money(b.wants)}</td><td class="n">${money(b.wants * 12)}</td></tr>
        <tr><td>Savings and debt payoff (20%)</td><td class="n">${money(b.savings)}</td><td class="n">${money(b.savings * 12)}</td></tr></table>`);
    } catch (e) { error('out', e); }
  });

  T['loan'] = () => onSubmit('f', () => {
    try {
      const P = num('amount', { min: 1, label: 'the loan amount' }), apr = num('apr', { max: 100, label: 'the interest rate' }), yrs = num('years', { min: 0.0833, max: 50, label: 'the loan length' });
      const n = Math.round(yrs * 12), L = Calc.amortize(P, apr, n);
      let rows = ''; const yearly = {};
      L.rows.forEach(r => { const y = Math.ceil(r.month / 12); yearly[y] = yearly[y] || { i: 0, p: 0, b: 0 }; yearly[y].i += r.interest; yearly[y].p += r.principal; yearly[y].b = r.balance; });
      for (const y in yearly) rows += `<tr><td>Year ${y}</td><td class="n">${money(yearly[y].p)}</td><td class="n">${money(yearly[y].i)}</td><td class="n">${money(yearly[y].b)}</td></tr>`;
      show('out', `<p>Monthly payment</p><p class="big">${money(L.payment)}</p>
        <p>Over ${months(n)} you pay ${money(L.totalPaid)} in total, of which <strong>${money(L.totalInterest)}</strong> is interest.</p>
        <div class="tablewrap"><table><tr><th>Year</th><th class="n">Principal paid</th><th class="n">Interest paid</th><th class="n">Balance left</th></tr>${rows}</table></div>`);
    } catch (e) { error('out', e); }
  });

  T['compound'] = () => onSubmit('f', () => {
    try {
      const s = num('start', { label: 'the starting amount' }), m = num('monthly', { label: 'the monthly deposit' }), apr = num('apr', { max: 50, label: 'the yearly return' }), y = num('years', { min: 1, max: 80, label: 'the number of years' });
      const C = Calc.compound(s, m, apr, y);
      const rows = C.yearly.map(r => `<tr><td>Year ${r.year}</td><td class="n">${money(r.deposits)}</td><td class="n">${money(r.balance - r.deposits)}</td><td class="n">${money(r.balance)}</td></tr>`).join('');
      show('out', `<p>After ${y} years</p><p class="big">${money(C.total)}</p><p>You put in ${money(C.deposits)}. Growth adds <strong>${money(C.interest)}</strong>.</p>
        <div class="tablewrap"><table><tr><th>Year</th><th class="n">Total deposited</th><th class="n">Growth so far</th><th class="n">Balance</th></tr>${rows}</table></div>`);
    } catch (e) { error('out', e); }
  });

  T['savings-goal'] = () => onSubmit('f', () => {
    try {
      const g = num('goal', { min: 1, label: 'your goal' }), c = num('current', { label: 'what you have saved' }), mo = num('months', { min: 1, max: 600, label: 'the number of months' }), apr = num('apr', { max: 20, label: 'the interest rate' });
      const need = Calc.savingsNeeded(g, c, Math.round(mo), apr);
      if (need === 0) return show('out', `<p class="big">You're already there.</p><p>What you have saved reaches ${money(g)} within ${months(Math.round(mo))}.</p>`);
      const per = Math.ceil(need * 100) / 100;
      show('out', `<p>Save this much each month</p><p class="big">${money(per)}</p><p>That's about ${money(per * 12 / 52)} a week, or ${money(per * 12 / 365)} a day, to reach ${money(g)} in ${months(Math.round(mo))}.</p>`);
    } catch (e) { error('out', e); }
  });

  T['card'] = () => onSubmit('f', () => {
    try {
      const b = num('balance', { min: 1, label: 'the card balance' }), apr = num('apr', { max: 60, label: 'the APR' }), p = num('payment', { min: 1, label: 'your monthly payment' });
      const R = Calc.cardPayoff(b, apr, p);
      if (!R) return show('out', `<p class="err">A payment of ${money(p)} doesn't cover the monthly interest (about ${money(b * apr / 1200)}), so the balance would never go down. Try a bigger payment.</p>`);
      show('out', `<p>Debt-free in</p><p class="big">${months(R.months)}</p><p>You'd pay ${money(R.totalPaid)} in total, including <strong>${money(R.totalInterest)}</strong> in interest.</p>`);
    } catch (e) { error('out', e); }
  });

  T['debt'] = () => {
    const list = $('debts');
    const add = (n = '', b = '', a = '', m = '') => {
      const row = document.createElement('div'); row.className = 'debt';
      row.innerHTML = `<input aria-label="Debt name" placeholder="Name" value="${esc(n)}"><input aria-label="Balance" inputmode="decimal" placeholder="Balance $" value="${b}"><input aria-label="APR %" inputmode="decimal" placeholder="APR %" value="${a}"><input aria-label="Minimum payment" inputmode="decimal" placeholder="Min $" value="${m}"><button type="button" class="ghost" aria-label="Remove this debt">X</button>`;
      row.querySelector('button').onclick = () => row.remove(); list.appendChild(row);
    };
    add('Card A', 2500, 22.9, 75); add('Card B', 900, 18.5, 30); add('Car loan', 7800, 7.4, 210);
    $('add').onclick = () => add();
    onSubmit('f', () => {
      try {
        const debts = [...list.querySelectorAll('.debt')].map((r, i) => {
          const inp = [...r.querySelectorAll('input')], v = inp.map(x => x.value.replace(/[$,%\s]/g, ''));
          const d = { name: inp[0].value.trim() || `Debt ${i + 1}`, balance: +v[1], apr: +v[2], min: +v[3] };
          if (!(d.balance > 0) || !(d.apr >= 0) || !(d.min > 0) || d.apr > 100) throw new Error(`Check the numbers for "${d.name}": balance and minimum must be above 0, APR between 0 and 100.`);
          return d;
        });
        if (!debts.length) throw new Error('Add at least one debt.');
        const extra = num('extra', { label: 'the extra amount' });
        const S = Calc.debtPlan(debts, extra, 'snowball'), A = Calc.debtPlan(debts, extra, 'avalanche');
        if (!S || !A) throw new Error("These payments don't cover the interest, so the debts would never be paid off. Try a bigger extra payment.");
        const tbl = P => '<table><tr><th>Debt</th><th class="n">Paid off after</th><th class="n">Interest</th></tr>' + [...P.debts].sort((a, b) => a.paidOff - b.paidOff).map(d => `<tr><td>${esc(d.name)}</td><td class="n">${months(d.paidOff)}</td><td class="n">${money(d.interest)}</td></tr>`).join('') + '</table>';
        const save = Calc.r2(S.totalInterest - A.totalInterest);
        show('out', `<h3>Snowball (smallest balance first)</h3><p>Debt-free in <strong>${months(S.months)}</strong>, total interest <strong>${money(S.totalInterest)}</strong>.</p>${tbl(S)}
          <h3>Avalanche (highest interest first)</h3><p>Debt-free in <strong>${months(A.months)}</strong>, total interest <strong>${money(A.totalInterest)}</strong>.</p>${tbl(A)}
          <p>${save > 0 ? `Avalanche saves ${money(save)} in interest. Snowball pays off a debt sooner, which keeps some people going.` : 'Both methods cost the same here, so pick the one that keeps you motivated.'}</p>`);
      } catch (e) { error('out', e); }
    });
  };

  T['pay'] = () => onSubmit('f', () => {
    try {
      const h = num('hourly', { min: 0.01, label: 'your hourly pay' }), w = num('hours', { min: 1, max: 100, label: 'hours per week' }), y = num('weeks', { min: 1, max: 52, label: 'weeks per year' });
      const P = Calc.payConvert(h, w, y);
      show('out', `<p>Yearly (before taxes)</p><p class="big">${money(P.yearly)}</p><table><tr><td>Monthly</td><td class="n">${money(P.monthly)}</td></tr><tr><td>Every two weeks</td><td class="n">${money(P.biweekly)}</td></tr><tr><td>Weekly</td><td class="n">${money(P.weekly)}</td></tr><tr><td>Per day (5-day week)</td><td class="n">${money(P.daily)}</td></tr></table>`);
    } catch (e) { error('out', e); }
  });

  T['networth'] = () => onSubmit('f', () => {
    try {
      const ids = s => [...document.querySelectorAll(`[data-${s}]`)].map(el => { const v = +(el.value || '0').replace(/[$,\s]/g, ''); if (!isFinite(v) || v < 0) throw new Error('Amounts must be numbers of 0 or more.'); return v; });
      const N = Calc.netWorth(ids('a'), ids('d'));
      show('out', `<p>Your net worth</p><p class="big">${money(N.net)}</p><table><tr><td>Total assets</td><td class="n">${money(N.assets)}</td></tr><tr><td>Total debts</td><td class="n">${money(N.debts)}</td></tr>${N.ratio !== null ? `<tr><td>Debt-to-asset ratio</td><td class="n">${(N.ratio * 100).toFixed(1)}%</td></tr>` : ''}</table>
        <p class="note">${N.net < 0 ? "A negative net worth is common, especially with student loans or a new car loan. Tracking it every few months shows whether it's moving the right way." : 'Check it again in a few months to see which way it is moving.'}</p>`);
    } catch (e) { error('out', e); }
  });

  T['split'] = () => {
    const list = $('people');
    const add = (n = '', p = '') => { const row = document.createElement('div'); row.className = 'row'; row.innerHTML = `<input aria-label="Name" placeholder="Name" value="${esc(n)}"><input aria-label="Amount paid" inputmode="decimal" placeholder="Paid $" value="${p}">`; list.appendChild(row); };
    add('Sam', 240); add('Alex', 60); add('Jordan', 0);
    $('add').onclick = () => add();
    onSubmit('f', () => {
      try {
        const people = [...list.querySelectorAll('.row')].map((r, i) => { const [n, p] = r.querySelectorAll('input'); const v = +(p.value || '0').replace(/[$,\s]/g, ''); if (!isFinite(v) || v < 0) throw new Error('Amounts must be numbers of 0 or more.'); return { name: n.value.trim() || `Person ${i + 1}`, paid: v }; });
        if (people.length < 2) throw new Error('Add at least two people.');
        const S = Calc.splitCosts(people);
        show('out', `<p>Total ${money(S.total)}, which is <strong>${money(S.share)}</strong> each.</p>` + (S.moves.length ? '<ul>' + S.moves.map(m => `<li><strong>${esc(m.from)}</strong> pays <strong>${esc(m.to)}</strong> ${money(m.amount)}</li>`).join('') + '</ul>' : '<p>Everyone paid their share. Nobody owes anything.</p>'));
      } catch (e) { error('out', e); }
    });
  };

  T['challenge'] = () => onSubmit('f', () => {
    try {
      const k = $('kind').value, a = k === 'penny' ? 0 : num('amount', { min: 0.01, max: 1000, label: 'the starting amount' });
      const tot = Calc.challengeTotal(k, a);
      const desc = { week52: `Week 1 you save ${money(a)}, week 2 ${money(a * 2)}, and so on up to ${money(a * 52)} in week 52.`, env100: `100 envelopes numbered 1 to 100, each worth ${money(a)} times its number. The biggest is ${money(a * 100)}.`, penny: 'Save 1 cent on day 1, 2 cents on day 2, and so on up to $3.65 on day 365.', pay26: `Paid every two weeks? Save ${money(a)} on the first payday, ${money(a * 2)} on the second, up to ${money(a * 26)} on the 26th.` }[k];
      show('out', `<p>Total saved when you finish</p><p class="big">${money(tot)}</p><p>${desc}</p>`);
    } catch (e) { error('out', e); }
  });

  const k = document.body.dataset.tool; if (k && T[k]) T[k]();
  const sel = $('kind'); if (sel && $('amountWrap')) { const f = () => $('amountWrap').hidden = sel.value === 'penny'; sel.onchange = f; f(); }
})();
