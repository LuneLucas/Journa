(function attachNaturalEntryModule(global) {
  "use strict";

  function createNaturalEntryHelpers({
    entryModeStorageKey,
    marksHiddenStorageKey,
    todayIso,
    getElements,
    getState,
    getActiveSplitMode,
    getActiveSplitFamilyIds,
    getFamilyName,
    getSplitRuleFromMode,
    getSplitScopeFromMode,
  }) {
    function getEntryMode() {
      return global.localStorage.getItem(entryModeStorageKey) === "standard" ? "standard" : "natural";
    }

    function areNaturalEntryMarksHidden() {
      return global.localStorage.getItem(marksHiddenStorageKey) !== "false";
    }

    function applyNaturalEntryMarksPreference() {
      const hidden = areNaturalEntryMarksHidden();
      const elements = getElements();
      global.document.documentElement.dataset.naturalEntryMarksHidden = String(hidden);
      if (elements.settingsNaturalEntryMarksHiddenInput) {
        elements.settingsNaturalEntryMarksHiddenInput.checked = !hidden;
      }
      if (elements.naturalEntryHint) {
        elements.naturalEntryHint.textContent = hidden ? "点文字修改" : "点标记文字修改";
      }
    }

    function formatNaturalEntryDate(date) {
      if (!date || date === todayIso()) return "今天";
      const [, month, day] = String(date).split("-");
      if (!month || !day) return date;
      return `${Number(month)}月${Number(day)}日`;
    }

    function formatNaturalFamilyCount(count) {
      const chinese = ["零", "一", "两", "三", "四", "五", "六", "七", "八", "九", "十"];
      return chinese[count] || String(count);
    }

    function formatNaturalEntrySplit() {
      const activeSplitMode = getActiveSplitMode();
      if (activeSplitMode === "custom") return "自定金额分摊";
      const ruleLabel = getSplitRuleFromMode(activeSplitMode) === "equal" ? "均分" : "按人数分摊";
      if (getSplitScopeFromMode(activeSplitMode) === "selected") {
        const names = getActiveSplitFamilyIds().map(getFamilyName).filter(Boolean);
        if (!names.length) return `指定家庭 · ${ruleLabel}`;
        if (names.length === 1) return `${names[0]}承担全部`;
        if (names.length >= 3) return `${formatNaturalFamilyCount(names.length)}家${ruleLabel}`;
        return `${names.join("、")}${ruleLabel}`;
      }
      const familyCount = getState().families.length;
      return familyCount >= 3
        ? `${formatNaturalFamilyCount(familyCount)}家${ruleLabel}`
        : `全部家庭${ruleLabel}`;
    }

    function formatNaturalEntryAmount(cents) {
      const normalizedCents = Math.round(Number(cents) || 0);
      const hasCents = Math.abs(normalizedCents) % 100 !== 0;
      const digits = new Intl.NumberFormat("zh-CN", {
        useGrouping: false,
        minimumFractionDigits: hasCents ? 2 : 0,
        maximumFractionDigits: hasCents ? 2 : 0,
      }).format(normalizedCents / 100);
      return `¥ ${digits}`;
    }

    function setNaturalAmountTokenDisplay(token, displayText) {
      if (!token) return;
      const label = token.querySelector(".natural-entry-token-label") || token;
      const text = String(displayText || "¥ 0.00");
      const digits = text.replace(/^¥\s*/, "") || "0.00";
      if (!label.classList.contains("natural-entry-token-label")) {
        label.textContent = text;
        return;
      }
      let currency = label.querySelector(".natural-entry-amount-currency");
      let value = label.querySelector(".natural-entry-amount-digits");
      if (!currency || !value) {
        currency = global.document.createElement("span");
        currency.className = "natural-entry-amount-currency";
        value = global.document.createElement("span");
        value.className = "natural-entry-amount-digits";
        label.replaceChildren(currency, value);
      }
      currency.textContent = "¥";
      value.textContent = digits;
      token.setAttribute("aria-label", text);
    }

    return {
      getEntryMode,
      applyNaturalEntryMarksPreference,
      formatNaturalEntryDate,
      formatNaturalEntrySplit,
      formatNaturalEntryAmount,
      setNaturalAmountTokenDisplay,
    };
  }

  global.JournaModules = global.JournaModules || {};
  global.JournaModules.createNaturalEntryHelpers = createNaturalEntryHelpers;
})(window);
