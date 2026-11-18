/* Pure calculation functions. No network, no storage: everything runs in the visitor's browser. */
const Calc = (() => {
  const r2 = x => Math.round((x + Number.EPSILON) * 100) / 100;

  // 50/30/20 budget split of monthly take-home income.
  function budget503020(income) {
    const needs = r2(income * 0.5), wants = r2(income * 0.3);
    return { needs, wants, savings: r2(income - needs - wants) };   // remainder, so the three always add up to the income
  }

  // Fixed-rate loan payment (amortizing). apr in percent, months > 0.
  function loanPayment(principal, apr, months) {
    const r = apr / 100 / 12;
    if (r === 0) return principal / months;
    return principal * r / (1 - Math.pow(1 + r, -months));
  }
  function amortize(principal, apr, months) {
    const pay = r2(loanPayment(principal, apr, months)); const r = apr / 100 / 12;
    let bal = principal, totalInt = 0; const rows = [];
    for (let m = 1; m <= months && bal > 0.004; m++) {
      const interest = r2(bal * r);
      let p = pay; if (m === months || p > bal + interest) p = r2(bal + interest);
      bal = r2(bal + interest - p); totalInt = r2(totalInt + interest);
      rows.push({ month: m, payment: p, interest, principal: r2(p - interest), balance: bal });
    }
    return { payment: pay, totalInterest: totalInt, totalPaid: r2(principal + totalInt), rows };
  }

  // Future value with monthly compounding and end-of-month contributions.
  function compound(start, monthly, apr, years) {
    const r = apr / 100 / 12, n = Math.round(years * 12);
    const fvStart = start * Math.pow(1 + r, n);
    const fvContrib = r === 0 ? monthly * n : monthly * (Math.pow(1 + r, n) - 1) / r;
    const total = fvStart + fvContrib, deposits = start + monthly * n;
    const yearly = [];
    let bal = start;
    for (let m = 1; m <= n; m++) { bal = bal * (1 + r) + monthly; if (m % 12 === 0 || m === n) yearly.push({ year: Math.ceil(m / 12), balance: r2(bal), deposits: r2(start + monthly * m) }); }
    return { total: r2(total), deposits: r2(deposits), interest: r2(total - deposits), yearly };
  }

  // Monthly saving needed to reach a goal in N months (end-of-month deposits, monthly compounding).
  function savingsNeeded(goal, current, months, apr) {
    const r = apr / 100 / 12;
    const grownCurrent = current * Math.pow(1 + r, months);
    const left = goal - grownCurrent;
    if (left <= 0) return 0;
    return r === 0 ? left / months : left * r / (Math.pow(1 + r, months) - 1);
  }
  // Months to reach a goal saving a fixed monthly amount. Returns null if never.
  function monthsToGoal(goal, current, monthly, apr) {
    const r = apr / 100 / 12; let bal = current, m = 0;
    if (bal >= goal) return 0;
    while (bal < goal - 0.004) { bal = bal * (1 + r) + monthly; m++; if (m > 1200) return null; }
    return m;
  }

  // Credit card payoff with a fixed monthly payment: interest is added monthly (APR/12), then the payment.
  function cardPayoff(balance, apr, payment) {
    const r = apr / 100 / 12; let bal = balance, m = 0, totalInt = 0;
    if (payment <= bal * r) return null;              // payment never covers the interest
    while (bal > 0.004 && m < 1200) {
      const i = r2(bal * r); totalInt = r2(totalInt + i);
      bal = r2(bal + i - Math.min(payment, bal + i)); m++;
    }
    return { months: m, totalInterest: totalInt, totalPaid: r2(balance + totalInt) };
  }

  // Debt snowball (smallest balance first) or avalanche (highest APR first).
  // debts: [{name, balance, apr, min}], extra: added on top of all minimums each month.
  function debtPlan(debts, extra, method) {
    const ds = debts.map(d => ({ ...d, bal: d.balance, paidOff: null, interest: 0 }));
    const budget = ds.reduce((s, d) => s + d.min, 0) + extra;
    const order = () => ds.filter(d => d.bal > 0.004).sort(method === 'avalanche' ? (a, b) => b.apr - a.apr || a.bal - b.bal : (a, b) => a.bal - b.bal || b.apr - a.apr);
    let m = 0, totalInt = 0;
    while (ds.some(d => d.bal > 0.004) && m < 1200) {
      m++;
      for (const d of ds) if (d.bal > 0.004) { const i = r2(d.bal * d.apr / 100 / 12); d.bal = r2(d.bal + i); d.interest = r2(d.interest + i); totalInt = r2(totalInt + i); }
      let money = budget;
      for (const d of ds) if (d.bal > 0.004) { const p = Math.min(d.min, d.bal); d.bal = r2(d.bal - p); money = r2(money - p); }
      for (const d of order()) { if (money <= 0) break; const p = Math.min(money, d.bal); d.bal = r2(d.bal - p); money = r2(money - p); }
      for (const d of ds) if (d.bal <= 0.004 && d.paidOff === null) d.paidOff = m;
      if (m === 1 && ds.every(d => d.bal >= d.balance)) return null;   // payments don't cover interest
    }
    if (m >= 1200) return null;
    return { months: m, totalInterest: totalInt, debts: ds.map(d => ({ name: d.name, paidOff: d.paidOff, interest: d.interest })) };
  }

  // Hourly <-> yearly pay.
  function payConvert(hourly, hoursPerWeek, weeksPerYear) {
    const year = hourly * hoursPerWeek * weeksPerYear;
    return { yearly: r2(year), monthly: r2(year / 12), biweekly: r2(year / 26), weekly: r2(hourly * hoursPerWeek), daily: r2(hourly * hoursPerWeek / 5) };
  }

  // Net worth.
  function netWorth(assets, debts) {
    const a = assets.reduce((s, x) => s + x, 0), d = debts.reduce((s, x) => s + x, 0);
    return { assets: r2(a), debts: r2(d), net: r2(a - d), ratio: a > 0 ? d / a : null };
  }

  // Split shared costs: people [{name, paid}] -> fewest simple "X pays Y $Z" transfers.
  function splitCosts(people) {
    const total = people.reduce((s, p) => s + p.paid, 0), share = total / people.length;
    const bal = people.map(p => ({ name: p.name, amt: Math.round((p.paid - share) * 100) }));   // in cents
    let diff = bal.reduce((s, b) => s + b.amt, 0);                                             // fix rounding drift
    for (let i = 0; diff !== 0 && i < bal.length; i++) { const step = diff > 0 ? -1 : 1; bal[i].amt += step; diff += step; }
    const cred = bal.filter(b => b.amt > 0).sort((a, b) => b.amt - a.amt), debt = bal.filter(b => b.amt < 0).sort((a, b) => a.amt - b.amt);
    const moves = []; let i = 0, j = 0;
    while (i < debt.length && j < cred.length) {
      const x = Math.min(-debt[i].amt, cred[j].amt);
      if (x > 0) moves.push({ from: debt[i].name, to: cred[j].name, amount: x / 100 });
      debt[i].amt += x; cred[j].amt -= x;
      if (debt[i].amt === 0) i++; if (cred[j].amt === 0) j++;
    }
    return { total: r2(total), share: r2(share), moves };
  }

  // Savings challenges: total saved.
  function challengeTotal(kind, amount) {
    if (kind === 'week52') return amount * 52 * 53 / 2;          // amount, 2x, ... 52x
    if (kind === 'env100') return amount * 100 * 101 / 2;
    if (kind === 'penny') return 365 * 366 / 2 / 100;            // 1 cent .. 365 cents
    if (kind === 'pay26') return amount * 26 * 27 / 2;
    return 0;
  }

  return { r2, budget503020, loanPayment, amortize, compound, savingsNeeded, monthsToGoal, cardPayoff, debtPlan, payConvert, netWorth, splitCosts, challengeTotal };
})();
if (typeof module !== 'undefined') module.exports = Calc;
