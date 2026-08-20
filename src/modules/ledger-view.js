(function attachLedgerViewModule(global) {
  "use strict";

  function createLedgerViewHelpers({
    getState,
    isCloudLedgerActive,
    normalizeExpenseSyncState,
    expenseToCents,
    escapeHtml,
  }) {
    function getExpenseSyncState(expense) {
      if (!isCloudLedgerActive()) return "";
      const syncState = normalizeExpenseSyncState(expense.syncState);
      return syncState === "synced" ? "" : syncState;
    }

    function formatExpenseSyncState(syncState) {
      return syncState === "failed" ? "未同步，回到前台会重试" : "同步中";
    }

    function formatExpenseSyncBadge(syncState) {
      return syncState === "failed" ? "未同步" : "同步中";
    }

    function compareExpensesNewestFirst(a, b) {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return (b.createdAt || b.updatedAt || "").localeCompare(a.createdAt || a.updatedAt || "")
        || (b.updatedAt || "").localeCompare(a.updatedAt || "")
        || b.id.localeCompare(a.id);
    }

    function isExpenseVisible(expense) {
      const state = getState();
      if (expense.isDeleted) return false;
      return (!state.ledgerFamilyFilter || expense.payerId === state.ledgerFamilyFilter)
        && (!state.ledgerCategoryFilter || expense.category === state.ledgerCategoryFilter);
    }

    function getVisibleExpenses() {
      return getState().expenses.filter(isExpenseVisible).sort(compareExpensesNewestFirst);
    }

    function hasActiveLedgerFilters() {
      const state = getState();
      return Boolean(state.ledgerFamilyFilter || state.ledgerCategoryFilter);
    }

    function calculateVisibleExpensesSummary() {
      const expenses = getState().expenses.filter(isExpenseVisible);
      return {
        count: expenses.length,
        totalCents: expenses.reduce((sum, expense) => sum + expenseToCents(expense), 0),
      };
    }

    function groupExpensesByDate(expenses) {
      const groups = [];
      for (const expense of expenses) {
        let group = groups[groups.length - 1];
        if (!group || group.date !== expense.date) {
          group = { date: expense.date, totalCents: 0, expenses: [] };
          groups.push(group);
        }
        group.expenses.push(expense);
        group.totalCents += expenseToCents(expense);
      }
      return groups;
    }

    function formatLedgerDate(date) {
      const parsed = new Date(`${date}T00:00:00`);
      if (Number.isNaN(parsed.getTime())) return date;
      const weekday = new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(parsed);
      return `${parsed.getMonth() + 1}/${parsed.getDate()} ${weekday}`;
    }

    function formatLedgerCardDate(date) {
      const [month, day] = String(date || "").split("-").slice(1);
      if (!month || !day) return escapeHtml(date || "");
      return `<span>${escapeHtml(month)}月</span><strong>${escapeHtml(day)}日</strong>`;
    }

    return {
      getExpenseSyncState,
      formatExpenseSyncState,
      formatExpenseSyncBadge,
      getVisibleExpenses,
      isExpenseVisible,
      hasActiveLedgerFilters,
      calculateVisibleExpensesSummary,
      groupExpensesByDate,
      formatLedgerDate,
      formatLedgerCardDate,
    };
  }

  global.JournaModules = global.JournaModules || {};
  global.JournaModules.createLedgerViewHelpers = createLedgerViewHelpers;
})(window);
