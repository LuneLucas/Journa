/* Journa core: expense shares, summaries, and pairwise settlements.
   The factory receives the current state and normalization functions so this
   module stays independent from DOM, storage, and cloud transport. */
(function exposeLedgerCalculation(global) {
  function createLedgerCalculator({
    getState,
    getActiveExpenses,
    expenseToCents,
    amountToCents,
    normalizeSplitMode,
    getSplitScopeFromMode,
    getSplitRuleFromMode,
    normalizeSplitFamilyIds,
    normalizeSplitAmounts,
  }) {
    function getTotalMembers() {
      const state = getState();
      return state.families.reduce((sum, family) => sum + (state.familyMembers[family.id] || 1), 0);
    }

    function calculateEqualFamilySharesForIds(totalCents, familyIds) {
      const state = getState();
      const shares = Object.fromEntries(state.families.map((family) => [family.id, 0]));
      const selectedFamilies = normalizeSplitFamilyIds(familyIds, state.families.map((family) => family.id))
        .map((familyId) => state.families.find((family) => family.id === familyId))
        .filter(Boolean);

      if (!selectedFamilies.length) return shares;

      const baseCents = Math.floor(totalCents / selectedFamilies.length);
      let remainingCents = totalCents - baseCents * selectedFamilies.length;
      selectedFamilies.forEach((family) => {
        shares[family.id] = baseCents + (remainingCents > 0 ? 1 : 0);
        remainingCents -= 1;
      });
      return shares;
    }

    function calculateFamilySharesForIds(totalCents, familyIds) {
      const state = getState();
      const shares = Object.fromEntries(state.families.map((family) => [family.id, 0]));
      const selectedFamilies = normalizeSplitFamilyIds(familyIds, state.families.map((family) => family.id))
        .map((familyId) => state.families.find((family) => family.id === familyId))
        .filter(Boolean);
      const totalMembers = selectedFamilies.reduce((sum, family) => sum + (state.familyMembers[family.id] || 1), 0);

      if (!totalMembers || !selectedFamilies.length) return shares;

      const roughShares = selectedFamilies.map((family) => {
        const members = state.familyMembers[family.id] || 1;
        const exactShare = (totalCents * members) / totalMembers;
        const cents = Math.floor(exactShare);
        return { family, cents, remainder: exactShare - cents };
      });

      let remainingCents = totalCents - roughShares.reduce((sum, item) => sum + item.cents, 0);
      const sortedByRemainder = [...roughShares].sort((a, b) => b.remainder - a.remainder);
      for (const item of sortedByRemainder) {
        if (remainingCents <= 0) break;
        item.cents += 1;
        remainingCents -= 1;
      }

      roughShares.forEach((item) => {
        shares[item.family.id] = item.cents;
      });
      return shares;
    }

    function calculateExpenseShares(expense) {
      const state = getState();
      const totalCents = expenseToCents(expense);
      const emptyShares = Object.fromEntries(state.families.map((family) => [family.id, 0]));
      const splitMode = normalizeSplitMode(expense.splitMode);

      if (splitMode === "custom") {
        const splitAmounts = normalizeSplitAmounts(expense.splitAmounts);
        let assignedCents = 0;
        let largestFamilyId = state.families[0]?.id || "";

        for (const family of state.families) {
          const cents = amountToCents(splitAmounts[family.id]);
          emptyShares[family.id] = cents;
          assignedCents += cents;
          if (cents > emptyShares[largestFamilyId]) largestFamilyId = family.id;
        }

        if (assignedCents > 0 && largestFamilyId) {
          emptyShares[largestFamilyId] += totalCents - assignedCents;
          return emptyShares;
        }
      }

      const allFamilyIds = state.families.map((family) => family.id);
      const splitFamilyIds = getSplitScopeFromMode(splitMode) === "selected"
        ? normalizeSplitFamilyIds(expense.splitFamilyIds, allFamilyIds)
        : allFamilyIds;
      if (getSplitRuleFromMode(splitMode) === "equal") return calculateEqualFamilySharesForIds(totalCents, splitFamilyIds);
      return calculateFamilySharesForIds(totalCents, splitFamilyIds);
    }

    function calculatePairwiseSettlements(owedByFamily) {
      const state = getState();
      const settlements = [];

      for (let firstIndex = 0; firstIndex < state.families.length; firstIndex += 1) {
        for (let secondIndex = firstIndex + 1; secondIndex < state.families.length; secondIndex += 1) {
          const firstFamily = state.families[firstIndex];
          const secondFamily = state.families[secondIndex];
          const firstOwesSecond = owedByFamily[firstFamily.id]?.[secondFamily.id] || 0;
          const secondOwesFirst = owedByFamily[secondFamily.id]?.[firstFamily.id] || 0;
          const netCents = firstOwesSecond - secondOwesFirst;

          if (netCents === 0) continue;
          const fromFamily = netCents > 0 ? firstFamily : secondFamily;
          const toFamily = netCents > 0 ? secondFamily : firstFamily;
          settlements.push({
            from: fromFamily.name,
            fromFamilyId: fromFamily.id,
            to: toFamily.name,
            toFamilyId: toFamily.id,
            cents: Math.abs(netCents),
          });
        }
      }

      return settlements.sort((first, second) => second.cents - first.cents);
    }

    function calculateSummary() {
      const state = getState();
      const paidByFamily = Object.fromEntries(state.families.map((family) => [family.id, 0]));
      const shareByFamily = Object.fromEntries(state.families.map((family) => [family.id, 0]));
      const owedByFamily = Object.fromEntries(
        state.families.map((family) => [
          family.id,
          Object.fromEntries(state.families.map((otherFamily) => [otherFamily.id, 0])),
        ]),
      );
      const categoryTotals = Object.fromEntries(state.categories.map((category) => [category, 0]));
      let totalCents = 0;
      let scopedExpenseCount = 0;

      for (const expense of getActiveExpenses()) {
        const cents = expenseToCents(expense);
        const expenseShares = calculateExpenseShares(expense);
        totalCents += cents;
        paidByFamily[expense.payerId] = (paidByFamily[expense.payerId] || 0) + cents;
        categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + cents;
        state.families.forEach((family) => {
          const shareCents = expenseShares[family.id] || 0;
          shareByFamily[family.id] = (shareByFamily[family.id] || 0) + shareCents;
          if (family.id !== expense.payerId && shareCents > 0) {
            owedByFamily[family.id][expense.payerId] += shareCents;
          }
        });
        const expenseSplitMode = normalizeSplitMode(expense.splitMode);
        if (getSplitScopeFromMode(expenseSplitMode) === "selected" || getSplitRuleFromMode(expenseSplitMode) === "custom") scopedExpenseCount += 1;
      }

      const totalMembers = getTotalMembers();
      const perPersonCents = totalMembers ? Math.round(totalCents / totalMembers) : 0;

      return {
        totalCents,
        shareCents: perPersonCents,
        totalMembers,
        shareByFamily,
        paidByFamily,
        categoryTotals,
        scopedExpenseCount,
        settlements: calculatePairwiseSettlements(owedByFamily),
      };
    }

    return {
      calculateSummary,
    };
  }

  global.JournaCore = global.JournaCore || {};
  global.JournaCore.createLedgerCalculator = createLedgerCalculator;
})(window);
