/* Journa core: split-mode normalization shared by local state, cloud payloads,
   and the entry-form calculations. It deliberately has no DOM or persistence
   dependency. */
(function exposeJournaSplit(global) {
  function createSplitCore({ splitModeOptions = [], defaultFamilies = [] }) {
    let familyIds = defaultFamilies.map((family) => family.id);

    function normalizeFamilyIdList(familiesOrIds = []) {
      const source = Array.isArray(familiesOrIds) ? familiesOrIds : [];
      return [...new Set(source
        .map((item) => typeof item === "string" ? item : item?.id)
        .map((id) => String(id || "").trim())
        .filter(Boolean))];
    }

    function setFamilyIds(familiesOrIds = []) {
      const nextIds = normalizeFamilyIdList(familiesOrIds);
      familyIds = nextIds.length ? nextIds : defaultFamilies.map((family) => family.id);
      return [...familyIds];
    }

    function normalizePayerId(payerId, validFamilyIds = familyIds) {
      const normalized = String(payerId || "").trim();
      return normalizeFamilyIdList(validFamilyIds).includes(normalized) ? normalized : "";
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

    function normalizeSplitFamilyIds(familyIdsToNormalize = [], fallbackIds = [], validFamilyIds = familyIds) {
      const validIdSet = new Set(normalizeFamilyIdList(validFamilyIds));
      const ids = Array.isArray(familyIdsToNormalize) ? familyIdsToNormalize : [];
      const normalizeId = (id) => {
        const normalized = String(id || "").trim();
        return validIdSet.has(normalized) ? normalized : "";
      };
      const validIds = [...new Set(ids.map(normalizeId).filter(Boolean))];
      const fallback = [...new Set(fallbackIds.map(normalizeId).filter(Boolean))];
      return validIds.length ? validIds : fallback;
    }

    function normalizeSplitAmounts(amounts = {}, validFamilyIds = familyIds) {
      const source = amounts && typeof amounts === "object" ? amounts : {};
      return Object.fromEntries(
        normalizeFamilyIdList(validFamilyIds).map((familyId) => {
          const amount = Number(source[familyId]);
          const normalized = Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : 0;
          return [familyId, normalized];
        }),
      );
    }

    return {
      setFamilyIds,
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
