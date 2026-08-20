/* Journa core: split-mode normalization shared by local state, cloud payloads,
   and the entry-form calculations. It deliberately has no DOM or persistence
   dependency. */
(function exposeJournaSplit(global) {
  function createSplitCore({ splitModeOptions = [], defaultFamilies = [] }) {
    const familyIds = defaultFamilies.map((family) => family.id);

    function normalizePayerId(payerId) {
      return familyIds.includes(payerId) ? payerId : "";
    }

    function normalizeSplitMode(mode) {
      return splitModeOptions.some((option) => option.id === mode) ? mode : "all";
    }

    function getSplitScopeFromMode(mode) {
      const normalized = normalizeSplitMode(mode);
      return normalized === "families" || normalized === "families_equal" ? "selected" : "all";
    }

    function getSplitRuleFromMode(mode) {
      const normalized = normalizeSplitMode(mode);
      if (normalized === "custom") return "custom";
      if (normalized === "equal" || normalized === "families_equal") return "equal";
      return "per_person";
    }

    function getSplitModeForState(scope, rule) {
      if (rule === "custom") return "custom";
      if (scope === "selected") return rule === "equal" ? "families_equal" : "families";
      return rule === "equal" ? "equal" : "all";
    }

    function normalizeSplitFamilyIds(familyIdsToNormalize = [], fallbackIds = []) {
      const ids = Array.isArray(familyIdsToNormalize) ? familyIdsToNormalize : [];
      const validIds = [...new Set(ids.map(normalizePayerId).filter(Boolean))];
      const fallback = [...new Set(fallbackIds.map(normalizePayerId).filter(Boolean))];
      return validIds.length ? validIds : fallback;
    }

    function normalizeSplitAmounts(amounts = {}) {
      const source = amounts && typeof amounts === "object" ? amounts : {};
      return Object.fromEntries(
        defaultFamilies.map((family) => {
          const amount = Number(source[family.id]);
          const normalized = Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : 0;
          return [family.id, normalized];
        }),
      );
    }

    return {
      normalizePayerId,
      normalizeSplitMode,
      getSplitScopeFromMode,
      getSplitRuleFromMode,
      getSplitModeForState,
      normalizeSplitFamilyIds,
      normalizeSplitAmounts,
    };
  }

  global.JournaCore = global.JournaCore || {};
  global.JournaCore.createSplitCore = createSplitCore;
})(window);
