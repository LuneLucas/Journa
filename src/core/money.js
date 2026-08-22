/* Journa core: monetary parsing and formatting.
   This file intentionally has no DOM or ledger-state dependency so it can be
   reused by the entry form, summaries, exports, and cloud serialization. */
(function exposeJournaMoney(global) {
  const MONEY_DECIMALS_STORAGE_KEY = "travel-ledger-show-money-decimals";

  function formatMoney(cents) {
    const showDecimals = global.localStorage?.getItem(MONEY_DECIMALS_STORAGE_KEY) === "true";
    const roundedCents = Math.round(Number(cents) || 0);
    const hasCents = Math.abs(roundedCents) % 100 !== 0;
    const fractionDigits = showDecimals || hasCents ? 2 : 0;
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(roundedCents / 100);
  }

  function expenseToCents(expense) {
    return Math.round(Number(expense?.amount) * 100);
  }

  function amountToCents(amount) {
    return Math.round(Number(amount) * 100) || 0;
  }

  function normalizeAmountDecimalSeparators(value) {
    return String(value ?? "").replace(/[，,。．٫]/g, ".");
  }

  function parseAmountInput(value) {
    const raw = normalizeAmountDecimalSeparators(value).trim();
    if (!raw) return NaN;
    if (!/^\d+(?:\.\d{0,2})?$/.test(raw) && !/^\.\d{1,2}$/.test(raw)) return NaN;
    const amount = Number(raw);
    return Number.isFinite(amount) ? amount : NaN;
  }

  function centsToAmount(cents) {
    return Math.round(cents) / 100;
  }

  function formatAmountInput(cents) {
    const amount = centsToAmount(cents);
    return amount > 0 ? amount.toFixed(2).replace(/\.00$/, "") : "";
  }

  global.JournaCore = global.JournaCore || {};
  global.JournaCore.money = Object.freeze({
    formatMoney,
    expenseToCents,
    amountToCents,
    normalizeAmountDecimalSeparators,
    parseAmountInput,
    centsToAmount,
    formatAmountInput,
  });
})(window);
