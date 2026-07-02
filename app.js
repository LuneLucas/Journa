const STORAGE_KEY = "travel-ledger-v3";
const LEGACY_STORAGE_KEYS = ["travel-ledger-v2", "travel-ledger-v1"];
const CLOUD_STATE_KEY = "travel-ledger-cloud";
const SUPABASE_URL = "https://qvphpeetzyvnwaehrifa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2cGhwZWV0enl2bndhZWhyaWZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NzIxMTAsImV4cCI6MjA5ODE0ODExMH0.k3FL_Ywt377guTfjzTu1bgucShpRfmnQCdxn4SqikuA";
const PUBLIC_APP_URL = "https://lunelucas.github.io/Journa/";
const MOTION_DELAYS = {
  ledgerSettle: 1783,
  ledgerClearBase: 580,
  ledgerClearMax: 1159,
  ledgerClearStagger: 63,
  settlementStagger: 58,
  categoryEnter: 1560,
  payerActivate: 760,
  categoryActivate: 760,
  splitSwitch: 260,
  addCelebrate: 1560,
  totalAbsorb: 1320,
  toast: 2600,
  toastWithAction: 5200,
};
const defaultFamilies = [
  { id: "family-a", name: "乐家" },
  { id: "family-b", name: "祺家" },
  { id: "family-c", name: "旦家" },
];
const familyVisuals = {
  "family-a": { color: "#7fa08f", gradient: "#a9ceb5", text: "#496f5f", soft: "rgba(127, 160, 143, 0.64)", wash: "rgba(127, 160, 143, 0.18)" },
  "family-b": { color: "#8fa0bd", gradient: "#b9c9e6", text: "#566a8a", soft: "rgba(143, 160, 189, 0.64)", wash: "rgba(143, 160, 189, 0.18)" },
  "family-c": { color: "#c89a9a", gradient: "#efc2bf", text: "#8a5d5d", soft: "rgba(200, 154, 154, 0.62)", wash: "rgba(200, 154, 154, 0.17)" },
};
const defaultCategories = ["交通", "住宿", "餐饮", "门票", "购物", "其他"];
// 空状态插画：复用 favicon 的三个交叠圆母题（三家庭色，低饱和）
const emptyStateArt = `<svg class="empty-state-art" viewBox="0 0 96 64" aria-hidden="true" focusable="false"><circle cx="38" cy="26" r="17" fill="#a9ceb5" opacity="0.6"/><circle cx="58" cy="25" r="17" fill="#b9c9e6" opacity="0.6"/><circle cx="48" cy="39" r="17" fill="#efc2bf" opacity="0.55"/></svg>`;
const splitModeOptions = [
  { id: "all", label: "全部家庭", description: "按人数自动分摊" },
  { id: "families", label: "指定家庭", description: "只让选中的家庭参与" },
  { id: "custom", label: "分别填写金额", description: "适合票价、房费、租车差异" },
];
const categoryVisuals = {
  "交通": { emoji: "🚄", bg: "#d9e8e2", text: "#486d62", border: "rgba(88, 126, 113, 0.28)", gradient: "#b9d8cc" },
  "住宿": { emoji: "🛏️", bg: "#dfe5f2", text: "#536782", border: "rgba(92, 112, 145, 0.26)", gradient: "#c1cde2" },
  "餐饮": { emoji: "🍽️", bg: "#f1dfce", text: "#7a5b3f", border: "rgba(143, 102, 62, 0.24)", gradient: "#e6c7aa" },
  "门票": { emoji: "🎫", bg: "#eadff0", text: "#69587b", border: "rgba(106, 83, 127, 0.24)", gradient: "#d8c3e3" },
  "购物": { emoji: "🛒", bg: "#eddcdf", text: "#7b565c", border: "rgba(133, 83, 92, 0.24)", gradient: "#e4bdc5" },
  "其他": { emoji: "🧩", bg: "#e5e2d8", text: "#696252", border: "rgba(104, 94, 72, 0.24)", gradient: "#d5cfbd" },
};
const categoryEmojiRules = [
  { keywords: ["车", "交通", "高铁", "火车", "机票", "飞机", "打车", "出租", "地铁", "公交", "油", "过路"], emoji: "🚄" },
  { keywords: ["住", "宿", "酒店", "民宿", "房", "宾馆"], emoji: "🛏️" },
  { keywords: ["餐", "饭", "吃", "早饭", "午饭", "晚饭", "饮", "咖啡", "奶茶", "小吃", "烧烤"], emoji: "🍽️" },
  { keywords: ["门票", "票", "景区", "乐园", "展", "馆", "演出"], emoji: "🎫" },
  { keywords: ["购物", "买", "超市", "礼物", "纪念品", "商场"], emoji: "🛒" },
  { keywords: ["娃", "孩子", "儿童", "宝宝"], emoji: "🧒" },
  { keywords: ["药", "医疗", "医院"], emoji: "💊" },
];
const customCategoryVisuals = [
  { emoji: "🧾", bg: "#dde8df", text: "#506b56", border: "rgba(82, 112, 90, 0.24)", gradient: "#c2d9c7" },
  { emoji: "📍", bg: "#e0e6ee", text: "#536578", border: "rgba(83, 102, 128, 0.24)", gradient: "#c5d2df" },
  { emoji: "☕", bg: "#eee0d1", text: "#735d46", border: "rgba(126, 95, 61, 0.24)", gradient: "#dfc7ad" },
  { emoji: "🎒", bg: "#e8dfed", text: "#65566f", border: "rgba(100, 80, 116, 0.24)", gradient: "#d3c2dc" },
  { emoji: "🌿", bg: "#dce8e6", text: "#4f6c68", border: "rgba(78, 111, 104, 0.24)", gradient: "#bdd8d4" },
];
const todayIso = () => new Date().toISOString().slice(0, 10);

const elements = {
  ledgerView: document.querySelector("#ledgerView"),
  settingsView: document.querySelector("#settingsView"),
  currentLedgerTitle: document.querySelector("#currentLedgerTitle"),
  syncStatus: document.querySelector("#syncStatus"),
  createCloudLedgerButton: document.querySelector("#createCloudLedgerButton"),
  copyShareLinkButton: document.querySelector("#copyShareLinkButton"),
  openSettingsButton: document.querySelector("#openSettingsButton"),
  closeSettingsButton: document.querySelector("#closeSettingsButton"),
  settingsBackdrop: document.querySelector("#settingsBackdrop"),
  settingsClearLedgerButton: document.querySelector("#settingsClearLedgerButton"),
  exportCsvButton: document.querySelector("#exportCsvButton"),
  exportJsonButton: document.querySelector("#exportJsonButton"),
  openLedgerManagerButton: document.querySelector("#openLedgerManagerButton"),
  ledgerManagementView: document.querySelector("#ledgerManagementView"),
  ledgerManagementBackdrop: document.querySelector("#ledgerManagementBackdrop"),
  closeLedgerManagerButton: document.querySelector("#closeLedgerManagerButton"),
  ledgerCreateForm: document.querySelector("#ledgerCreateForm"),
  ledgerCreateNameInput: document.querySelector("#ledgerCreateNameInput"),
  ledgerInheritSettingsInput: document.querySelector("#ledgerInheritSettingsInput"),
  ledgerJoinForm: document.querySelector("#ledgerJoinForm"),
  ledgerJoinInput: document.querySelector("#ledgerJoinInput"),
  entryPanel: document.querySelector(".entry-panel"),
  amountLabel: document.querySelector("#amountLabel"),
  payerField: document.querySelector("#payerField"),
  familyRoster: document.querySelector("#familyRoster"),
  totalMetric: document.querySelector("#totalMetric"),
  totalAmount: document.querySelector("#totalAmount"),
  shareAmount: document.querySelector("#shareAmount"),
  expenseCount: document.querySelector("#expenseCount"),
  expenseForm: document.querySelector("#expenseForm"),
  amountInput: document.querySelector("#amountInput"),
  categoryInput: document.querySelector("#categoryInput"),
  dateInput: document.querySelector("#dateInput"),
  noteInput: document.querySelector("#noteInput"),
  payerError: document.querySelector("#payerError"),
  formError: document.querySelector("#formError"),
  editBanner: document.querySelector("#editBanner"),
  cancelEditButton: document.querySelector("#cancelEditButton"),
  submitButtonLabel: document.querySelector("#submitButtonLabel"),
  categoryForm: document.querySelector("#categoryForm"),
  newCategoryInput: document.querySelector("#newCategoryInput"),
  settingsCategoryForm: document.querySelector("#settingsCategoryForm"),
  settingsNewCategoryInput: document.querySelector("#settingsNewCategoryInput"),
  categoryChips: document.querySelector("#categoryChips"),
  splitScopeToggle: document.querySelector("#splitScopeToggle"),
  splitScopeSummary: document.querySelector("#splitScopeSummary"),
  splitScopePanel: document.querySelector("#splitScopePanel"),
  splitModeButtons: document.querySelector("#splitModeButtons"),
  splitFamilyChoices: document.querySelector("#splitFamilyChoices"),
  splitCustomAmounts: document.querySelector("#splitCustomAmounts"),
  settingsCategoryChips: document.querySelector("#settingsCategoryChips"),
  settingsFamilyList: document.querySelector("#settingsFamilyList"),
  ledgerNameForm: document.querySelector("#ledgerNameForm"),
  currentLedgerNameInput: document.querySelector("#currentLedgerNameInput"),
  saveLedgerNameButton: document.querySelector("#saveLedgerNameButton"),
  currentLedgerSummary: document.querySelector("#currentLedgerSummary"),
  ledgerManagerList: document.querySelector("#ledgerManagerList"),
  settingsDataSummary: document.querySelector("#settingsDataSummary"),
  storageModeLabel: document.querySelector("#storageModeLabel"),
  paidByFamily: document.querySelector("#paidByFamily"),
  categorySummaryBlock: document.querySelector("#categorySummaryBlock"),
  categorySummary: document.querySelector("#categorySummary"),
  settlementList: document.querySelector("#settlementList"),
  ledgerFamilyFilter: document.querySelector("#ledgerFamilyFilter"),
  ledgerCategoryFilter: document.querySelector("#ledgerCategoryFilter"),
  ledgerFilterSummary: document.querySelector("#ledgerFilterSummary"),
  clearLedgerFiltersButton: document.querySelector("#clearLedgerFiltersButton"),
  ledgerSection: document.querySelector(".ledger-section"),
  ledgerList: document.querySelector("#ledgerList"),
  mobileSubmitBar: document.querySelector("#mobileSubmitBar"),
  mobileSubmitSummary: document.querySelector("#mobileSubmitSummary"),
  mobileSubmitButton: document.querySelector("#mobileSubmitButton"),
  confirmView: document.querySelector("#confirmView"),
  confirmBackdrop: document.querySelector("#confirmBackdrop"),
  confirmEyebrow: document.querySelector("#confirmEyebrow"),
  confirmTitle: document.querySelector("#confirmTitle"),
  confirmMessage: document.querySelector("#confirmMessage"),
  confirmCancelButton: document.querySelector("#confirmCancelButton"),
  confirmOkButton: document.querySelector("#confirmOkButton"),
  toastHost: document.querySelector("#toastHost"),
};

let appState = loadState();
activateLedgerFromUrl();
let state = getActiveLedger();
let activeSplitMode = "all";
let activeSplitFamilyIds = state.families.map((family) => family.id);
let activeSplitAmounts = {};
let splitScopeOpen = false;
let splitScopeCloseTimer = 0;
let splitScopeSwitching = false;
let splitScopeSwitchTimer = 0;
let lastAddedExpenseId = "";
let expandedExpenseId = "";
let lastAddedCategory = "";
let activatingPayerId = "";
let activatingCategory = "";
let editingExpenseId = "";
let toastTimer = 0;
let settingsCloseTimer = 0;
let ledgerManagementCloseTimer = 0;
let ledgerSwitchTimer = 0;
let editReturnState = null;
let editFormSnapshot = null;
let totalAmountText = "";
let totalAmountSwapTimer = 0;
let cloudState = loadCloudState();
let cloudBusy = false;
let cloudReady = false;
let pendingSettingsSync = 0;
let confirmResolve = null;

function loadState() {
  const storageKeys = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS];

  for (const key of storageKeys) {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "null");
      if (saved && Array.isArray(saved.ledgers)) {
        return normalizeAppState(saved);
      }

      if (saved && Array.isArray(saved.families) && Array.isArray(saved.categories) && Array.isArray(saved.expenses)) {
        const ledger = normalizeLedger({ ...saved, name: "旅行账本" });
        return {
          activeLedgerId: ledger.id,
          ledgers: [ledger],
        };
      }
    } catch {
      localStorage.removeItem(key);
    }
  }

  const ledger = createEmptyLedger("旅行账本");
  return {
    activeLedgerId: ledger.id,
    ledgers: [ledger],
  };
}

function normalizeAppState(saved) {
  const ledgers = saved.ledgers.map((ledger, index) => normalizeLedger(ledger, `账本 ${index + 1}`));
  const activeLedgerId = ledgers.some((ledger) => ledger.id === saved.activeLedgerId) ? saved.activeLedgerId : ledgers[0]?.id;

  if (ledgers.length) {
    return { activeLedgerId, ledgers };
  }

  const ledger = createEmptyLedger("旅行账本");
  return {
    activeLedgerId: ledger.id,
    ledgers: [ledger],
  };
}

function normalizeLedger(raw = {}, fallbackName = "旅行账本") {
  const today = todayIso();
  const expenses = Array.isArray(raw.expenses) ? raw.expenses.filter(isValidExpense).map(normalizeExpense) : [];
  const categories = normalizeCategories([...(Array.isArray(raw.categories) ? raw.categories : []), ...expenses.map((expense) => expense.category)]);

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : createId("ledger"),
    name: normalizeLedgerName(raw.name, fallbackName),
    families: defaultFamilies.map((family) => ({ ...family })),
    familyMembers: normalizeFamilyMembers(raw.familyMembers),
    categories,
    expenses,
    activeDate: expenses.length ? normalizeDate(raw.activeDate, today) : today,
    activeCategory: normalizeCategorySelection(raw.activeCategory, categories),
    selectedPayerId: normalizePayerId(raw.selectedPayerId),
    ledgerFamilyFilter: normalizePayerId(raw.ledgerFamilyFilter),
    ledgerCategoryFilter: normalizeCategoryFilter(raw.ledgerCategoryFilter, categories),
    cloudShareToken: typeof raw.cloudShareToken === "string" ? raw.cloudShareToken : "",
    createdAt: normalizeTimestamp(raw.createdAt),
    updatedAt: normalizeTimestamp(raw.updatedAt),
  };
}

function createEmptyLedger(name) {
  const now = new Date().toISOString();
  return {
    id: createId("ledger"),
    name: normalizeLedgerName(name, "旅行账本"),
    families: defaultFamilies.map((family) => ({ ...family })),
    familyMembers: normalizeFamilyMembers(),
    categories: [...defaultCategories],
    expenses: [],
    activeDate: todayIso(),
    activeCategory: "",
    selectedPayerId: "",
    ledgerFamilyFilter: "",
    ledgerCategoryFilter: "",
    cloudShareToken: "",
    createdAt: now,
    updatedAt: now,
  };
}

function createId(prefix) {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeLedgerName(name, fallback = "新账本") {
  const normalized = String(name || "").trim();
  return normalized || fallback;
}

function normalizeTimestamp(value) {
  const date = new Date(value || Date.now());
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function getActiveLedger() {
  const ledger = appState.ledgers.find((item) => item.id === appState.activeLedgerId) || appState.ledgers[0];
  appState.activeLedgerId = ledger.id;
  return ledger;
}

function activateLedgerFromUrl() {
  const shareToken = getLedgerTokenFromLocation();
  if (!shareToken) return;

  const existingLedger = appState.ledgers.find((ledger) => ledger.cloudShareToken === shareToken);
  if (existingLedger) {
    appState.activeLedgerId = existingLedger.id;
    return;
  }

  const ledger = createEmptyLedger("云账本");
  ledger.cloudShareToken = shareToken;
  appState.ledgers.push(ledger);
  appState.activeLedgerId = ledger.id;
}

function replaceActiveLedger(nextLedger) {
  const normalizedLedger = normalizeLedger(nextLedger, state?.name || "旅行账本");
  const index = appState.ledgers.findIndex((ledger) => ledger.id === normalizedLedger.id);
  if (index >= 0) {
    appState.ledgers[index] = normalizedLedger;
  } else {
    appState.ledgers.push(normalizedLedger);
  }
  appState.activeLedgerId = normalizedLedger.id;
  state = normalizedLedger;
}

function normalizeFamilies(families) {
  return defaultFamilies.map((family) => ({ ...family }));
}

function normalizeFamilyMembers(memberCounts = {}) {
  return Object.fromEntries(
    defaultFamilies.map((family) => {
      const count = Number(memberCounts[family.id]);
      return [family.id, Number.isInteger(count) && count > 0 ? Math.min(count, 20) : 1];
    }),
  );
}

function normalizeCategories(categories) {
  const merged = [...defaultCategories, ...categories].map((category) => String(category).trim()).filter(Boolean);
  return [...new Set(merged)];
}

function normalizePayerId(payerId) {
  return defaultFamilies.some((family) => family.id === payerId) ? payerId : "";
}

function normalizeSplitMode(mode) {
  return splitModeOptions.some((option) => option.id === mode) ? mode : "all";
}

function normalizeSplitFamilyIds(familyIds = [], fallbackIds = []) {
  const ids = Array.isArray(familyIds) ? familyIds : [];
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

function normalizeDate(value, fallback = todayIso()) {
  const date = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fallback;
  return Number.isNaN(new Date(`${date}T00:00:00`).getTime()) ? fallback : date;
}

function normalizeCategory(category, fallback = defaultCategories[0]) {
  const normalized = String(category || "").trim();
  return normalized || fallback;
}

function normalizeCategorySelection(category, categories = defaultCategories) {
  const normalized = String(category || "").trim();
  return categories.includes(normalized) ? normalized : "";
}

function normalizeCategoryFilter(category, categories) {
  const normalized = String(category || "").trim();
  return categories.includes(normalized) ? normalized : "";
}

function normalizeExpense(expense) {
  const splitMode = normalizeSplitMode(expense.splitMode);
  return {
    id: expense.id,
    amount: Math.round(Number(expense.amount) * 100) / 100,
    payerId: normalizePayerId(expense.payerId),
    category: normalizeCategory(expense.category),
    note: String(expense.note || "").trim(),
    date: normalizeDate(expense.date),
    splitMode,
    splitFamilyIds: normalizeSplitFamilyIds(expense.splitFamilyIds, splitMode === "families" ? defaultFamilies.map((family) => family.id) : []),
    splitAmounts: normalizeSplitAmounts(expense.splitAmounts),
    syncState: normalizeExpenseSyncState(expense.syncState),
  };
}

function normalizeExpenseSyncState(syncState) {
  return ["pending", "synced", "failed"].includes(syncState) ? syncState : "synced";
}

function isValidExpense(expense) {
  return (
    expense &&
    typeof expense.id === "string" &&
    Number.isFinite(Number(expense.amount)) &&
    Number(expense.amount) > 0 &&
    Boolean(normalizePayerId(expense.payerId)) &&
    typeof expense.category === "string" &&
    typeof expense.date === "string"
  );
}

function saveState() {
  state.updatedAt = new Date().toISOString();
  const index = appState.ledgers.findIndex((ledger) => ledger.id === state.id);
  if (index >= 0) {
    appState.ledgers[index] = state;
  } else {
    appState.ledgers.push(state);
  }
  appState.activeLedgerId = state.id;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function loadCloudState() {
  const tokenFromUrl = getLedgerTokenFromLocation();

  return {
    shareToken: tokenFromUrl || state.cloudShareToken || "",
    lastPulledAt: "",
  };
}

function getLedgerTokenFromLocation() {
  const queryToken = new URLSearchParams(window.location.search).get("ledger") || "";
  const hashToken = parseLedgerTokenFromHash(window.location.hash);
  return hashToken || queryToken;
}

function parseLedgerTokenFromHash(hash) {
  const normalizedHash = String(hash || "").replace(/^#/, "").trim();
  if (!normalizedHash) return "";
  const params = new URLSearchParams(normalizedHash);
  return params.get("ledger") || params.get("token") || "";
}

function saveCloudState() {
  state.cloudShareToken = cloudState.shareToken;
  localStorage.removeItem(CLOUD_STATE_KEY);
  saveState();
}

function isCloudConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes("填"));
}

function isCloudLedgerActive() {
  return isCloudConfigured() && Boolean(cloudState.shareToken);
}

async function supabaseRpc(functionName, payload = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Supabase 请求失败：${response.status}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function normalizeRemotePayload(payload) {
  const ledger = payload?.ledger || {};
  const expenses = Array.isArray(payload?.expenses) ? payload.expenses : [];
  const categories = Array.isArray(ledger.categories) ? ledger.categories : defaultCategories;
  const familyMembers = ledger.family_members && typeof ledger.family_members === "object" ? ledger.family_members : {};

  return {
    name: normalizeRemoteLedgerName(ledger.name),
    families: normalizeFamilies(ledger.families || defaultFamilies),
    familyMembers: normalizeFamilyMembers(familyMembers),
    categories: normalizeCategories([...categories, ...expenses.map((expense) => expense.category)]),
    expenses: expenses
      .map((expense) => ({
        id: String(expense.id),
        amount: Math.round(Number(expense.amount) * 100) / 100,
        payerId: normalizePayerId(expense.payer_id),
        category: normalizeCategory(expense.category),
        note: String(expense.note || "").trim(),
        date: normalizeDate(expense.expense_date),
        splitMode: normalizeSplitMode(expense.split_mode),
        splitFamilyIds: normalizeSplitFamilyIds(expense.split_family_ids),
        splitAmounts: normalizeSplitAmounts(expense.split_amounts),
        syncState: "synced",
      }))
      .filter(isValidExpense),
    activeDate: state.activeDate || todayIso(),
    activeCategory: normalizeCategorySelection(state.activeCategory, categories),
    selectedPayerId: normalizePayerId(state.selectedPayerId),
    ledgerFamilyFilter: normalizePayerId(state.ledgerFamilyFilter),
    ledgerCategoryFilter: normalizeCategoryFilter(state.ledgerCategoryFilter, categories),
  };
}

function normalizeRemoteLedgerName(name) {
  const remoteName = normalizeLedgerName(name, state.name);
  const legacyDefaultNames = new Set(["三家庭旅游账本", "云账本"]);
  if (legacyDefaultNames.has(remoteName) && state.name && !legacyDefaultNames.has(state.name)) {
    return state.name;
  }
  return remoteName;
}

async function pullCloudLedger({ announce = false } = {}) {
  if (!isCloudLedgerActive()) return false;

  cloudBusy = true;
  updateCloudControls();
  try {
    const payload = await supabaseRpc("get_travel_ledger", { p_share_token: cloudState.shareToken });
    replaceActiveLedger({
      ...state,
      ...normalizeRemotePayload(payload),
      id: state.id,
      cloudShareToken: cloudState.shareToken,
    });
    cloudReady = true;
    cloudState.lastPulledAt = new Date().toISOString();
    saveCloudState();
    render({ skipCloudSave: true, animateFinancialChanges: announce });
    if (announce) showToast({ message: "已同步云账本" });
    return true;
  } catch (error) {
    cloudReady = false;
    updateCloudControls("同步失败");
    showToast({ message: "云账本同步失败，先保留本地数据" });
    return false;
  } finally {
    cloudBusy = false;
    updateLedgerUrl();
    updateCloudControls();
  }
}

async function refreshCloudLedgerFromLifecycle() {
  if (!isCloudLedgerActive()) return;
  if (navigator.onLine === false) return;
  const synced = await syncPendingCloudExpenses({ silent: true });
  if (!synced) {
    showToast({ message: "还有账单未同步，先不覆盖本地账本" });
    return;
  }
  await pullCloudLedger();
}

async function createCloudLedger() {
  if (!isCloudConfigured()) {
    showToast({ message: "还需要填写 Supabase anon public key" });
    return;
  }

  cloudBusy = true;
  updateCloudControls();
  try {
    const payload = await supabaseRpc("create_travel_ledger");
    cloudState.shareToken = payload?.ledger?.share_token || "";
    if (!cloudState.shareToken) throw new Error("Missing share token");
    saveCloudState();
    updateLedgerUrl();
    await syncAllLocalDataToCloud();
    await pullCloudLedger({ announce: true });
  } catch (error) {
    showToast({ message: "创建云账本失败，请确认 SQL 已执行" });
  } finally {
    cloudBusy = false;
    updateCloudControls();
  }
}

async function syncAllLocalDataToCloud() {
  if (!isCloudLedgerActive()) return;
  await syncCloudSettingsNow();
  for (const expense of state.expenses) {
    await syncCloudExpense(expense);
  }
}

function updateLedgerUrl() {
  if (window.location.protocol === "file:") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("ledger");
  const hashToken = parseLedgerTokenFromHash(url.hash);
  if (hashToken) url.hash = "";
  window.history.replaceState({}, "", url);
}

async function copyShareLink() {
  if (!cloudState.shareToken) return;
  const url = getShareUrl();
  if (!url) {
    showToast({ message: "先发布到网页地址，再复制邀请链接" });
    return;
  }
  setLedgerTokenHash(url, cloudState.shareToken);
  await navigator.clipboard.writeText(url.toString());
  const isLocalUrl = ["localhost", "127.0.0.1", ""].includes(url.hostname);
  showToast({ message: isLocalUrl ? "已复制本机测试链接，发布后再发给家人" : "邀请链接已复制" });
}

function getShareUrl() {
  if (PUBLIC_APP_URL) return new URL(PUBLIC_APP_URL);
  if (window.location.protocol === "file:") return null;
  return new URL(window.location.href);
}

function setLedgerTokenHash(url, shareToken) {
  url.searchParams.delete("ledger");
  url.hash = new URLSearchParams({ ledger: shareToken }).toString();
}

function queueCloudSettingsSync() {
  if (!isCloudLedgerActive()) return;
  window.clearTimeout(pendingSettingsSync);
  pendingSettingsSync = window.setTimeout(() => {
    syncCloudSettingsNow().catch(() => {
      showToast({ message: "云端设置同步失败，本地已保留" });
    });
  }, 350);
}

async function syncCloudSettingsNow() {
  if (!isCloudLedgerActive()) return;
  const basePayload = {
    p_share_token: cloudState.shareToken,
    p_categories: state.categories,
    p_family_members: state.familyMembers,
  };
  const namePayload = {
    ...basePayload,
    p_name: state.name,
  };

  try {
    await supabaseRpc("update_travel_ledger_settings", namePayload);
  } catch (error) {
    if (!isSettingsRpcCompatibilityError(error)) throw error;
    await supabaseRpc("update_travel_ledger_settings", basePayload);
  }
}

function isSettingsRpcCompatibilityError(error) {
  const message = String(error?.message || error || "");
  return message.includes("p_name") || message.includes("schema cache") || message.includes("PGRST202");
}

async function syncCloudExpense(expense) {
  if (!isCloudLedgerActive()) return;
  const basePayload = {
    p_share_token: cloudState.shareToken,
    p_id: expense.id,
    p_amount: expense.amount,
    p_payer_id: expense.payerId,
    p_category: expense.category,
    p_note: expense.note,
    p_expense_date: expense.date,
  };
  const splitPayload = {
    ...basePayload,
    p_split_mode: normalizeSplitMode(expense.splitMode),
    p_split_family_ids: normalizeSplitFamilyIds(expense.splitFamilyIds),
    p_split_amounts: normalizeSplitAmounts(expense.splitAmounts),
  };

  try {
    await supabaseRpc("save_travel_expense", splitPayload);
  } catch (error) {
    if (!isSplitRpcCompatibilityError(error)) throw error;
    await supabaseRpc("save_travel_expense", basePayload);
  }
}

async function syncCloudExpenseWithState(expenseId, { silent = false } = {}) {
  if (!isCloudLedgerActive()) return true;
  const expense = state.expenses.find((item) => item.id === expenseId);
  if (!expense) return true;

  markExpenseSyncState(expenseId, "pending");
  try {
    await syncCloudExpense({ ...expense, syncState: "synced" });
    markExpenseSyncState(expenseId, "synced");
    return true;
  } catch (error) {
    markExpenseSyncState(expenseId, "failed");
    if (!silent) showToast({ message: "云端保存失败，本地已保留，稍后会重试" });
    return false;
  }
}

function markExpenseSyncState(expenseId, syncState) {
  const expense = state.expenses.find((item) => item.id === expenseId);
  if (!expense) return;
  expense.syncState = normalizeExpenseSyncState(syncState);
  saveState();
  renderLedger();
}

async function syncPendingCloudExpenses({ silent = true } = {}) {
  if (!isCloudLedgerActive()) return true;
  const unsyncedExpenses = state.expenses.filter((expense) => ["pending", "failed"].includes(normalizeExpenseSyncState(expense.syncState)));
  if (!unsyncedExpenses.length) return true;

  let allSynced = true;
  for (const expense of unsyncedExpenses) {
    const synced = await syncCloudExpenseWithState(expense.id, { silent });
    if (!synced) allSynced = false;
  }
  return allSynced;
}

function isSplitRpcCompatibilityError(error) {
  const message = String(error?.message || error || "");
  return message.includes("p_split_") || message.includes("schema cache") || message.includes("PGRST202");
}

async function deleteCloudExpense(expenseId) {
  if (!isCloudLedgerActive()) return;
  await supabaseRpc("delete_travel_expense", {
    p_share_token: cloudState.shareToken,
    p_id: expenseId,
  });
}

async function clearCloudLedger() {
  if (!isCloudLedgerActive()) return;
  await supabaseRpc("clear_travel_ledger", { p_share_token: cloudState.shareToken });
}

function updateCloudControls(forcedStatus = "") {
  const configured = isCloudConfigured();
  const active = isCloudLedgerActive();
  elements.syncStatus.classList.toggle("is-cloud", active && !forcedStatus);
  elements.syncStatus.classList.toggle("is-error", Boolean(forcedStatus));
  elements.syncStatus.textContent = forcedStatus || (active ? (cloudBusy ? "云账本同步中" : "云账本") : configured ? "本地账本" : "本地账本");
  elements.createCloudLedgerButton.hidden = active;
  elements.createCloudLedgerButton.disabled = cloudBusy;
  elements.copyShareLinkButton.hidden = !active;
  elements.copyShareLinkButton.disabled = cloudBusy;
  if (elements.storageModeLabel) {
    elements.storageModeLabel.textContent = active ? "Supabase 云端" : "当前浏览器";
  }
}

function formatMoney(cents) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatLedgerMoney(cents) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function expenseToCents(expense) {
  return Math.round(Number(expense.amount) * 100);
}

function amountToCents(amount) {
  return Math.round(Number(amount) * 100) || 0;
}

function parseAmountInput(value) {
  const raw = String(value || "").trim().replace(/[，,]/g, ".");
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

function getFamilyName(familyId) {
  return state.families.find((family) => family.id === familyId)?.name || "未知家庭";
}

function getFamilyVisual(familyId) {
  return familyVisuals[familyId] || familyVisuals[defaultFamilies[0].id];
}

function getCategoryVisual(category) {
  const baseVisual = categoryVisuals[category] || customCategoryVisuals[stringHash(category) % customCategoryVisuals.length];
  const emoji = getCategoryEmoji(category, baseVisual.emoji);
  return { ...baseVisual, emoji };
}

function formatCategoryLabel(category) {
  const visual = getCategoryVisual(category);
  return `${visual.emoji} ${category}`;
}

function getCategoryEmoji(category, fallback) {
  const normalized = String(category || "").trim();
  const matchedRule = categoryEmojiRules.find((rule) => rule.keywords.some((keyword) => normalized.includes(keyword)));
  return matchedRule?.emoji || fallback;
}

function categoryStyle(category) {
  const visual = getCategoryVisual(category);
  return `--category-bg: ${visual.bg}; --category-text: ${visual.text}; --category-border: ${visual.border}; --category-gradient: ${visual.gradient};`;
}

function stringHash(value) {
  return [...String(value)].reduce((hash, char) => (hash * 31 + char.codePointAt(0)) >>> 0, 7);
}

function calculateSummary() {
  const paidByFamily = Object.fromEntries(state.families.map((family) => [family.id, 0]));
  const shareByFamily = Object.fromEntries(state.families.map((family) => [family.id, 0]));
  const categoryTotals = Object.fromEntries(state.categories.map((category) => [category, 0]));
  let totalCents = 0;
  let scopedExpenseCount = 0;

  for (const expense of state.expenses) {
    const cents = expenseToCents(expense);
    const expenseShares = calculateExpenseShares(expense);
    totalCents += cents;
    paidByFamily[expense.payerId] = (paidByFamily[expense.payerId] || 0) + cents;
    categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + cents;
    state.families.forEach((family) => {
      shareByFamily[family.id] = (shareByFamily[family.id] || 0) + (expenseShares[family.id] || 0);
    });
    if (normalizeSplitMode(expense.splitMode) !== "all") scopedExpenseCount += 1;
  }

  const totalMembers = getTotalMembers();
  const perPersonCents = totalMembers ? Math.round(totalCents / totalMembers) : 0;
  const balances = state.families.map((family) => ({
    family,
    cents: (paidByFamily[family.id] || 0) - shareByFamily[family.id],
  }));

  return {
    totalCents,
    shareCents: perPersonCents,
    totalMembers,
    shareByFamily,
    paidByFamily,
    categoryTotals,
    scopedExpenseCount,
    settlements: calculateSettlements(balances),
  };
}

function getTotalMembers() {
  return state.families.reduce((sum, family) => sum + (state.familyMembers[family.id] || 1), 0);
}

function calculateExpenseShares(expense) {
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
  const splitFamilyIds = splitMode === "families" ? normalizeSplitFamilyIds(expense.splitFamilyIds, allFamilyIds) : allFamilyIds;
  return calculateFamilySharesForIds(totalCents, splitFamilyIds);
}

function calculateFamilySharesForIds(totalCents, familyIds) {
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
    return {
      family,
      cents,
      remainder: exactShare - cents,
    };
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

function calculateSettlements(balances) {
  const debtors = balances
    .filter((item) => item.cents < 0)
    .map((item) => ({ ...item, cents: Math.abs(item.cents) }))
    .sort((a, b) => b.cents - a.cents);
  const creditors = balances.filter((item) => item.cents > 0).sort((a, b) => b.cents - a.cents);
  const settlements = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const cents = Math.min(debtor.cents, creditor.cents);

    if (cents > 0) {
      settlements.push({
        from: debtor.family.name,
        fromFamilyId: debtor.family.id,
        to: creditor.family.name,
        toFamilyId: creditor.family.id,
        cents,
      });
    }

    debtor.cents -= cents;
    creditor.cents -= cents;

    if (debtor.cents === 0) debtorIndex += 1;
    if (creditor.cents === 0) creditorIndex += 1;
  }

  return settlements;
}

function render(options = {}) {
  const { animateFinancialChanges = false } = options;
  renderCurrentLedgerLabel();
  updateClearLedgerButton();
  updateCloudControls();
  renderFormOptions();
  renderFamilyRoster();
  renderCategories();
  renderSplitScope();
  renderLedgerFilters();
  renderSummary({ animateFinancialChanges });
  renderLedger({ animateFinancialChanges });
  renderSettings();
  renderEditState();
  renderMobileSubmitBar();
  applySelectedFamilyTheme();
  applySubmitButtonTheme();
  updateAmountMotionState();
  saveState();
}

function renderCurrentLedgerLabel() {
  elements.currentLedgerTitle.textContent = state.name;
}

function renderFormOptions() {
  elements.dateInput.value = state.activeDate;
  state.activeCategory = normalizeCategorySelection(state.activeCategory, state.categories);
  elements.categoryInput.value = state.activeCategory;
}

function renderLedgerFilters() {
  elements.ledgerFamilyFilter.innerHTML = [
    `<option value="">全部家庭</option>`,
    ...state.families.map((family) => `<option value="${escapeHtml(family.id)}">${escapeHtml(family.name)}</option>`),
  ].join("");
  elements.ledgerFamilyFilter.value = state.ledgerFamilyFilter || "";

  elements.ledgerCategoryFilter.innerHTML = [
    `<option value="">全部类别</option>`,
    ...state.categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(formatCategoryLabel(category))}</option>`),
  ].join("");
  elements.ledgerCategoryFilter.value = state.ledgerCategoryFilter || "";
  renderLedgerFilterSummary();
}

function renderLedgerFilterSummary() {
  const active = hasActiveLedgerFilters();
  elements.ledgerFilterSummary.hidden = !active;
  elements.clearLedgerFiltersButton.hidden = !active;
  if (!active) {
    elements.ledgerFilterSummary.textContent = "";
    return;
  }

  const summary = calculateVisibleExpensesSummary();
  elements.ledgerFilterSummary.textContent = `筛选合计 ${formatMoney(summary.totalCents)}（${summary.count} 笔）`;
}

function renderFamilyRoster() {
  elements.familyRoster.innerHTML = state.families
    .map((family) => {
      const selected = family.id === state.selectedPayerId;
      const activating = selected && family.id === activatingPayerId ? " is-activating" : "";
      return `
        <button class="family-tag${selected ? " is-selected" : ""}${activating}" type="button" data-payer-id="${escapeHtml(family.id)}" style="${familyStyle(family.id)}" aria-pressed="${selected}">
          <span>${escapeHtml(family.name)}</span>
        </button>
      `;
    })
    .join("");
}

function renderCategories() {
  elements.categoryChips.innerHTML = state.categories
    .map((category) => {
      const isNew = category === lastAddedCategory ? " is-entering" : "";
      const selected = category === state.activeCategory;
      const activating = selected && category === activatingCategory ? " is-activating" : "";
      return `
        <button class="chip category-chip selectable-category-chip${selected ? " is-selected" : ""}${isNew}${activating}" type="button" data-category="${escapeHtml(category)}" style="${categoryStyle(category)}" aria-pressed="${selected}">
          <span>${escapeHtml(formatCategoryLabel(category))}</span>
        </button>
      `;
    })
    .join("");
}

function renderSplitScope() {
  ensureActiveSplitState();
  elements.splitScopeToggle.setAttribute("aria-expanded", String(splitScopeOpen));
  elements.splitScopeSummary.textContent = formatActiveSplitSummary();
  elements.splitScopePanel.classList.toggle("is-switching", splitScopeSwitching);
  updateSplitScopePanelState();

  elements.splitModeButtons.innerHTML = splitModeOptions
    .map((option) => {
      const selected = activeSplitMode === option.id;
      return `
        <button class="split-mode-button${selected ? " is-selected" : ""}" type="button" data-split-mode="${escapeHtml(option.id)}" aria-pressed="${selected}">
          <span>${escapeHtml(option.label)}</span>
          <small>${escapeHtml(option.description)}</small>
        </button>
      `;
    })
    .join("");

  elements.splitFamilyChoices.hidden = activeSplitMode !== "families";
  elements.splitFamilyChoices.innerHTML = state.families
    .map((family) => {
      const selected = activeSplitFamilyIds.includes(family.id);
      return `
        <button class="family-tag split-family-chip${selected ? " is-selected" : ""}" type="button" data-split-family="${escapeHtml(family.id)}" style="${familyStyle(family.id)}" aria-pressed="${selected}">
          <span>${escapeHtml(family.name)}</span>
        </button>
      `;
    })
    .join("");

  elements.splitCustomAmounts.hidden = activeSplitMode !== "custom";
  elements.splitCustomAmounts.innerHTML = `
    ${state.families
      .map((family) => {
        const amount = Number(activeSplitAmounts[family.id]) || 0;
        return `
          <label class="split-amount-row" style="${familyStyle(family.id)}">
            <span>${escapeHtml(family.name)}</span>
            <input type="text" inputmode="decimal" autocomplete="off" data-split-amount="${escapeHtml(family.id)}" value="${amount > 0 ? escapeHtml(String(amount)) : ""}" placeholder="0.00" />
          </label>
        `;
      })
      .join("")}
    <p class="split-total-line">${escapeHtml(formatCustomSplitTotalLine())}</p>
  `;
  updateAmountFieldForSplitMode();
}

function updateSplitScopePanelState() {
  const panel = elements.splitScopePanel;

  if (splitScopeOpen) {
    window.clearTimeout(splitScopeCloseTimer);
    panel.hidden = false;
    panel.classList.remove("is-closing");
    panel.classList.add("is-open");
    return;
  }

  panel.classList.remove("is-open");

  if (panel.hidden) {
    panel.classList.remove("is-closing");
    return;
  }

  panel.classList.add("is-closing");
  const delay = prefersReducedMotion() ? 0 : getCssDurationMs("--motion-fast", 401) + 80;

  window.clearTimeout(splitScopeCloseTimer);
  splitScopeCloseTimer = window.setTimeout(() => {
    if (splitScopeOpen) return;
    panel.hidden = true;
    panel.classList.remove("is-closing");
  }, delay);
}

function ensureActiveSplitState() {
  activeSplitMode = normalizeSplitMode(activeSplitMode);
  const fallbackIds = activeSplitMode === "families" ? [] : state.families.map((family) => family.id);
  activeSplitFamilyIds = normalizeSplitFamilyIds(activeSplitFamilyIds, fallbackIds);
  activeSplitAmounts = normalizeSplitAmounts(activeSplitAmounts);
}

function formatActiveSplitSummary() {
  if (activeSplitMode === "custom") {
    const totalCents = getActiveCustomSplitTotalCents();
    return totalCents ? `分别填写 · ${formatMoney(totalCents)}` : "分别填写金额";
  }

  if (activeSplitMode === "families") {
    const names = activeSplitFamilyIds.map(getFamilyName).join("、");
    return `${names || "未选家庭"} · 按人数`;
  }

  return "全部家庭 · 按人数";
}

function formatExpenseSplitSummary(expense) {
  const splitMode = normalizeSplitMode(expense.splitMode);
  if (splitMode === "custom") {
    const splitAmounts = normalizeSplitAmounts(expense.splitAmounts);
    const parts = state.families
      .filter((family) => amountToCents(splitAmounts[family.id]) > 0)
      .map((family) => `${family.name} ${formatMoney(amountToCents(splitAmounts[family.id]))}`);
    return parts.length ? parts.join(" · ") : "分别填写金额";
  }

  if (splitMode === "families") {
    const ids = normalizeSplitFamilyIds(expense.splitFamilyIds, state.families.map((family) => family.id));
    return `${ids.map(getFamilyName).join("、")} · 按人数`;
  }

  return "全部家庭 · 按人数";
}

function formatCustomSplitTotalLine() {
  const totalCents = getActiveCustomSplitTotalCents();
  return totalCents ? `金额栏由分摊金额自动求和 · 当前合计 ${formatMoney(totalCents)}` : "金额栏由分摊金额自动求和";
}

function getActiveCustomSplitTotalCents() {
  return state.families.reduce((sum, family) => sum + amountToCents(activeSplitAmounts[family.id]), 0);
}

function updateAmountFieldForSplitMode() {
  const isCustom = activeSplitMode === "custom";
  elements.amountInput.disabled = isCustom;
  elements.amountLabel.classList.toggle("amount-auto-total", isCustom);
  elements.amountInput.placeholder = isCustom ? "自动求和" : "0.00";
  if (!isCustom) return;

  const totalCents = getActiveCustomSplitTotalCents();
  elements.amountInput.value = formatAmountInput(totalCents);
}

function renderSettings() {
  const summary = calculateSummary();
  const usedCategories = new Set(state.expenses.map((expense) => expense.category));
  elements.currentLedgerNameInput.value = state.name;
  elements.currentLedgerSummary.innerHTML = renderCurrentLedgerSummary(summary);
  renderLedgerManager();

  elements.settingsFamilyList.innerHTML = state.families
    .map(
      (family) => `
        <div class="settings-family" style="${familyStyle(family.id)}">
          <span>${escapeHtml(family.name)}<small>已付 ${formatMoney(summary.paidByFamily[family.id] || 0)} · 应承担 ${formatMoney(summary.shareByFamily[family.id] || 0)}</small></span>
          <div class="member-stepper" aria-label="${escapeHtml(family.name)}人数">
            <button type="button" data-member-step="${escapeHtml(family.id)}" data-step="-1" aria-label="减少${escapeHtml(family.name)}人数">−</button>
            <strong>${state.familyMembers[family.id] || 1} 人</strong>
            <button type="button" data-member-step="${escapeHtml(family.id)}" data-step="1" aria-label="增加${escapeHtml(family.name)}人数">+</button>
          </div>
        </div>
      `,
    )
    .join("");

  elements.settingsCategoryChips.innerHTML = state.categories
    .map((category) => {
      const isDefault = defaultCategories.includes(category);
      const isUsed = usedCategories.has(category);
      const status = isDefault ? "预设" : isUsed ? "使用中" : "可删除";
      const removeButton =
        isDefault || isUsed
          ? ""
          : `<button class="chip-remove-button" type="button" data-remove-category="${escapeHtml(category)}" aria-label="删除 ${escapeHtml(category)}">×</button>`;

      return `
        <span class="chip category-chip settings-category-chip" style="${categoryStyle(category)}">
          <span>${escapeHtml(formatCategoryLabel(category))}</span>
          <small>${status}</small>
          ${removeButton}
        </span>
      `;
    })
    .join("");

  elements.settingsDataSummary.innerHTML = `
    <div class="settings-data-item">
      <span>总支出</span>
      <strong>${formatMoney(summary.totalCents)}</strong>
    </div>
    <div class="settings-data-item">
      <span>账单笔数</span>
      <strong>${state.expenses.length}</strong>
    </div>
    <div class="settings-data-item">
      <span>总人数</span>
      <strong>${summary.totalMembers}</strong>
    </div>
    <div class="settings-data-item">
      <span>类别数量</span>
      <strong>${state.categories.length}</strong>
    </div>
  `;
}

function renderCurrentLedgerSummary(summary) {
  const status = state.cloudShareToken ? "云账本" : "本地账本";
  return `
    <div class="current-ledger-card">
      <div>
        <span>${escapeHtml(status)}</span>
        <strong>${escapeHtml(state.name)}</strong>
      </div>
      <small>${state.expenses.length} 笔 · ${formatMoney(summary.totalCents)} · ${summary.totalMembers} 人</small>
    </div>
  `;
}

function renderLedgerManager() {
  if (!elements.ledgerManagerList) return;

  elements.ledgerManagerList.innerHTML = appState.ledgers
    .map((ledger) => renderLedgerManagerItem(ledger))
    .join("");
}

function renderLedgerManagerItem(ledger) {
  const summary = calculateLedgerSummary(ledger);
  const isActive = ledger.id === state.id;
  const canDelete = appState.ledgers.length > 1;
  const cloudLabel = ledger.cloudShareToken ? "云账本" : "本地账本";
  const updatedLabel = formatUpdatedAt(ledger.updatedAt || ledger.createdAt);
  const familySummary = defaultFamilies
    .map((family) => `${family.name}${ledger.familyMembers?.[family.id] || 1}`)
    .join(" · ");
  const copyButton = ledger.cloudShareToken
    ? `<button class="secondary-button compact-button" type="button" data-copy-ledger="${escapeHtml(ledger.id)}">复制邀请链接</button>`
    : "";
  const deleteButton = canDelete
    ? `<button class="ledger-delete-button" type="button" data-delete-ledger="${escapeHtml(ledger.id)}" aria-label="删除 ${escapeHtml(ledger.name)}">删除</button>`
    : `<span class="ledger-active-badge">保留</span>`;

  return `
    <article class="ledger-manager-card${isActive ? " is-active" : ""}">
      <div class="ledger-card-main">
        <div>
          <span class="ledger-card-status">${escapeHtml(cloudLabel)}</span>
          <h3>${escapeHtml(ledger.name)}</h3>
        </div>
        ${isActive ? `<span class="ledger-active-badge">当前</span>` : ""}
      </div>
      <div class="ledger-card-stats">
        <div><span>总支出</span><strong>${formatMoney(summary.totalCents)}</strong></div>
        <div><span>账单</span><strong>${summary.expenseCount}</strong></div>
        <div><span>更新</span><strong>${escapeHtml(updatedLabel)}</strong></div>
      </div>
      <p class="ledger-card-meta">${escapeHtml(familySummary)} · ${summary.categoryCount} 个类别</p>
      <div class="ledger-card-actions">
        <button class="primary-button compact-ledger-action" type="button" data-switch-ledger="${escapeHtml(ledger.id)}" ${isActive ? "disabled" : ""}>${isActive ? "已打开" : "打开"}</button>
        ${copyButton}
        ${deleteButton}
      </div>
    </article>
  `;
}

function calculateLedgerSummary(ledger) {
  const expenses = Array.isArray(ledger.expenses) ? ledger.expenses : [];
  return {
    expenseCount: expenses.length,
    totalCents: expenses.reduce((sum, expense) => sum + expenseToCents(expense), 0),
    categoryCount: Array.isArray(ledger.categories) ? ledger.categories.length : defaultCategories.length,
  };
}

function formatUpdatedAt(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return "刚刚";
  const now = new Date();
  const sameYear = date.getFullYear() === now.getFullYear();
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(date);
}

function renderTotalAmount(nextText, shouldAnimate) {
  const previousText = totalAmountText || elements.totalAmount.textContent || nextText;
  totalAmountText = nextText;
  window.clearTimeout(totalAmountSwapTimer);

  if (!shouldAnimate || previousText === nextText || prefersReducedMotion()) {
    elements.totalAmount.classList.remove("is-soft-refresh");
    elements.totalAmount.textContent = nextText;
    return;
  }

  elements.totalAmount.classList.remove("is-soft-refresh");
  elements.totalAmount.textContent = nextText;
  void elements.totalAmount.offsetWidth;
  elements.totalAmount.classList.add("is-soft-refresh");

  totalAmountSwapTimer = window.setTimeout(() => {
    elements.totalAmount.classList.remove("is-soft-refresh");
    elements.totalAmount.textContent = totalAmountText;
  }, getCssDurationMs("--number-swap-motion", 980) + 60);
}

function renderSoftText(element, nextText, shouldAnimate = false) {
  if (!element) return;
  const currentText = element.textContent || "";
  if (!shouldAnimate || currentText === nextText || prefersReducedMotion()) {
    element.classList.remove("is-soft-refresh");
    element.textContent = nextText;
    return;
  }

  element.classList.remove("is-soft-refresh");
  element.textContent = nextText;
  void element.offsetWidth;
  element.classList.add("is-soft-refresh");
  window.setTimeout(() => {
    element.classList.remove("is-soft-refresh");
  }, getCssDurationMs("--motion", 534) + 80);
}

function renderSummary({ animateFinancialChanges = false } = {}) {
  const summary = calculateSummary();
  const enterClass = animateFinancialChanges ? " is-entering" : "";
  renderTotalAmount(formatMoney(summary.totalCents), animateFinancialChanges);
  renderSoftText(elements.shareAmount, formatMoney(summary.shareCents), animateFinancialChanges);
  renderSoftText(elements.expenseCount, String(state.expenses.length), animateFinancialChanges);
  renderTotalMetricGradient(summary);

  elements.paidByFamily.innerHTML = state.families
    .map(
      (family) => `
        <div class="row-item family-row${enterClass}" style="${familyStyle(family.id)}">
          <span>${escapeHtml(family.name)}<small>${state.familyMembers[family.id] || 1} 人 · 应承担 ${formatMoney(summary.shareByFamily[family.id] || 0)}</small></span>
          <strong>${formatMoney(summary.paidByFamily[family.id] || 0)}</strong>
        </div>
      `,
    )
    .join("");

  const activeCategoryRows = state.categories.filter((category) => summary.categoryTotals[category] > 0);
  renderCategorySummaryGradient(summary, activeCategoryRows);
  elements.categorySummary.innerHTML = activeCategoryRows.length
    ? activeCategoryRows
        .map(
          (category) => `
            <div class="row-item category-row${enterClass}" style="${categoryStyle(category)}">
              <span>${escapeHtml(formatCategoryLabel(category))}</span>
              <strong>${formatMoney(summary.categoryTotals[category])}</strong>
            </div>
          `,
        )
        .join("")
    : `<div class="empty-state${enterClass}">${emptyStateArt}暂无类别支出<br><small>添加账单后按类别自动汇总。</small></div>`;

  elements.settlementList.innerHTML = summary.settlements.length
    ? `
      <div class="settlement-overview${enterClass}">
        <span>${escapeHtml(formatSettlementOverview(summary))}</span>
        <strong>${summary.settlements.length} 笔转账完成平账</strong>
      </div>
      ${summary.settlements
        .map((settlement, index) => renderSettlementItem(settlement, index, enterClass))
        .join("")}
    `
    : `<div class="settlement-done${enterClass}">
        ${emptyStateArt}
        <strong>当前无需转账</strong>
        <small>各家已付金额已经覆盖应承担金额。</small>
      </div>`;
}

function formatSettlementOverview(summary) {
  if (summary.scopedExpenseCount > 0) {
    return `已按每笔账的分摊范围计算，${summary.scopedExpenseCount} 笔不是全员分摊`;
  }

  return `按 ${summary.totalMembers} 人分摊，每人承担 ${formatMoney(summary.shareCents)}`;
}

function renderSettlementItem(settlement, index, enterClass) {
  return `
    <article class="settlement-item${enterClass}" style="${familyStyle(settlement.fromFamilyId)} --settlement-target-color: ${getFamilyVisual(settlement.toFamilyId).color}; --settlement-target-text: ${getFamilyVisual(settlement.toFamilyId).text}; --settlement-delay: ${index * MOTION_DELAYS.settlementStagger}ms;">
      <div class="settlement-party settlement-from">
        <span>付款</span>
        <strong>${escapeHtml(settlement.from)}</strong>
      </div>
      <div class="settlement-flow" aria-hidden="true">
        <span>→</span>
      </div>
      <div class="settlement-party settlement-to">
        <span>收款</span>
        <strong>${escapeHtml(settlement.to)}</strong>
      </div>
      <div class="settlement-amount">
        <span>转账金额</span>
        <strong>${formatMoney(settlement.cents)}</strong>
      </div>
    </article>
  `;
}

function renderLedger({ animateFinancialChanges = false } = {}) {
  const visibleExpenses = getVisibleExpenses();
  const enterClass = animateFinancialChanges ? " is-entering" : "";

  if (!state.expenses.length) {
    elements.ledgerList.innerHTML = `<div class="empty-state${enterClass}">${emptyStateArt}还没有账单<br><small>记下第一笔，开始这次旅行。</small></div>`;
    return;
  }

  if (!visibleExpenses.length) {
    elements.ledgerList.innerHTML = `<div class="empty-state${enterClass}">没有符合筛选的账单</div>`;
    return;
  }

  const groups = groupExpensesByDate(visibleExpenses);
  elements.ledgerList.innerHTML = groups
    .map(
      (group) => `
        <section class="ledger-day-group${enterClass}">
          <div class="ledger-day-heading">
            <time datetime="${escapeHtml(group.date)}">${escapeHtml(formatLedgerDate(group.date))}</time>
            <strong>${formatLedgerMoney(group.totalCents)}</strong>
          </div>
          <div class="ledger-day-items">
            ${group.expenses
              .map(
                (expense) => {
                  const isExpanded = expense.id === expandedExpenseId;
                  const syncState = getExpenseSyncState(expense);
                  return `
                  <article class="ledger-item${expense.id === lastAddedExpenseId ? " is-entering" : ""}${expense.id === editingExpenseId ? " is-editing" : ""}${isExpanded ? " is-expanded" : ""}${syncState ? ` is-sync-${syncState}` : ""}" style="${familyStyle(expense.payerId)}" data-expense-id="${escapeHtml(expense.id)}" tabindex="0" aria-expanded="${isExpanded}" aria-label="${isExpanded ? "收起这笔账单" : "展开这笔账单"}">
                    <div class="ledger-main">
                      <div class="ledger-title">
                        <span class="ledger-family">${escapeHtml(getFamilyName(expense.payerId))}</span>
                        <span class="category-pill" style="${categoryStyle(expense.category)}">${escapeHtml(formatCategoryLabel(expense.category))}</span>
                      </div>
                      <p class="ledger-note">${escapeHtml(expense.note || "无备注")}</p>
                      <small class="ledger-scope">${escapeHtml(formatExpenseSplitSummary(expense))}</small>
                      ${syncState ? `<small class="ledger-sync-state">${escapeHtml(formatExpenseSyncState(syncState))}</small>` : ""}
                    </div>
                    <time class="ledger-date" datetime="${escapeHtml(expense.date)}">${formatLedgerCardDate(expense.date)}</time>
                    <strong class="ledger-amount">${formatLedgerMoney(expenseToCents(expense))}</strong>
                    <div class="ledger-item-actions">
                      <button class="ledger-edit-button" type="button" data-edit-id="${escapeHtml(expense.id)}">编辑</button>
                      <button class="delete-button" type="button" data-delete-id="${escapeHtml(expense.id)}" aria-label="删除这笔账">×</button>
                    </div>
                  </article>
                `;
                },
              )
              .join("")}
          </div>
        </section>
      `,
    )
    .join("");
}

function getExpenseSyncState(expense) {
  if (!isCloudLedgerActive()) return "";
  const syncState = normalizeExpenseSyncState(expense.syncState);
  return syncState === "synced" ? "" : syncState;
}

function formatExpenseSyncState(syncState) {
  return syncState === "failed" ? "未同步，回到前台会重试" : "同步中";
}

function getVisibleExpenses() {
  return state.expenses
    .filter(isExpenseVisible)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

function isExpenseVisible(expense) {
  return (!state.ledgerFamilyFilter || expense.payerId === state.ledgerFamilyFilter) && (!state.ledgerCategoryFilter || expense.category === state.ledgerCategoryFilter);
}

function hasActiveLedgerFilters() {
  return Boolean(state.ledgerFamilyFilter || state.ledgerCategoryFilter);
}

function calculateVisibleExpensesSummary() {
  const expenses = state.expenses.filter(isExpenseVisible);
  return {
    count: expenses.length,
    totalCents: expenses.reduce((sum, expense) => sum + expenseToCents(expense), 0),
  };
}

function clearLedgerFilters() {
  if (!hasActiveLedgerFilters()) return;
  state.ledgerFamilyFilter = "";
  state.ledgerCategoryFilter = "";
  smoothContainerResize(elements.ledgerSection, () => {
    render({ animateFinancialChanges: true });
  });
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
  return new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "short" }).format(parsed);
}

function formatLedgerCardDate(date) {
  const [month, day] = String(date || "").split("-").slice(1);
  if (!month || !day) return escapeHtml(date || "");
  return `<span>${escapeHtml(month)}月</span><strong>${escapeHtml(day)}日</strong>`;
}

function renderEditState() {
  const isEditing = Boolean(editingExpenseId);
  elements.editBanner.hidden = !isEditing;
  elements.submitButtonLabel.textContent = isEditing ? "保存修改" : "添加账单";
  elements.expenseForm.classList.toggle("is-editing", isEditing);
}

// 是否已填齐提交所需信息：有效金额 + 已选家庭 + 已选类别
function isExpenseReady() {
  const amount = parseAmountInput(elements.amountInput.value);
  const hasPayer = state.families.some((family) => family.id === state.selectedPayerId);
  const hasCategory = Boolean(state.activeCategory || elements.categoryInput.value);
  return Number.isFinite(amount) && amount > 0 && hasPayer && hasCategory;
}

function renderMobileSubmitBar() {
  const family = state.selectedPayerId ? getFamilyName(state.selectedPayerId) : "未选家庭";
  const category = state.activeCategory ? formatCategoryLabel(state.activeCategory) : "未选类别";
  const date = state.activeDate === todayIso() ? "今天" : state.activeDate.slice(5);
  const action = editingExpenseId ? "保存修改" : "添加账单";
  const split = activeSplitMode === "all" ? "" : ` · ${formatActiveSplitSummary()}`;
  elements.mobileSubmitSummary.textContent = `${family} · ${category} · ${date}${split}`;
  elements.mobileSubmitButton.querySelector(".button-label").textContent = action;
  // 信息未填齐时按钮呈“不可点击”态（中性灰，非主题色）；仍保留点击以提示缺项
  const blocked = !isExpenseReady();
  elements.mobileSubmitButton.classList.toggle("is-blocked", blocked);
  elements.mobileSubmitButton.setAttribute("aria-disabled", blocked ? "true" : "false");
}

function getSplitDetailsForSubmit() {
  ensureActiveSplitState();

  if (activeSplitMode === "custom") {
    const totalCents = getActiveCustomSplitTotalCents();
    return {
      amount: centsToAmount(totalCents),
      splitMode: "custom",
      splitFamilyIds: [],
      splitAmounts: normalizeSplitAmounts(activeSplitAmounts),
      error: totalCents > 0 ? "" : "请至少填写一个家庭的承担金额。",
    };
  }

  if (activeSplitMode === "families") {
    return {
      amount: parseAmountInput(elements.amountInput.value),
      splitMode: "families",
      splitFamilyIds: [...activeSplitFamilyIds],
      splitAmounts: normalizeSplitAmounts(),
      error: activeSplitFamilyIds.length ? "" : "请选择参与分摊的家庭。",
    };
  }

  return {
    amount: parseAmountInput(elements.amountInput.value),
    splitMode: "all",
    splitFamilyIds: [],
    splitAmounts: normalizeSplitAmounts(),
    error: "",
  };
}

function handleExpenseSubmit(event) {
  event.preventDefault();
  elements.formError.textContent = "";
  elements.payerError.textContent = "";

  const wasEditing = Boolean(editingExpenseId);
  const splitDetails = getSplitDetailsForSubmit();
  const amount = splitDetails.amount;
  const payerId = state.selectedPayerId;
  const category = elements.categoryInput.value;
  const date = normalizeDate(elements.dateInput.value, state.activeDate);
  const note = elements.noteInput.value.trim();

  if (splitDetails.error) {
    elements.formError.textContent = splitDetails.error;
    elements.splitScopeToggle.focus();
    return;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    elements.formError.textContent = "请输入大于 0 的有效金额。";
    elements.amountInput.focus();
    return;
  }

  if (!state.families.some((family) => family.id === payerId)) {
    elements.payerError.textContent = "请选择付款家庭。";
    elements.familyRoster.querySelector(".family-tag")?.focus();
    return;
  }

  if (!category) {
    elements.formError.textContent = "请选择类别。";
    elements.categoryChips.querySelector(".selectable-category-chip")?.focus();
    return;
  }

  const expenseId = editingExpenseId || crypto.randomUUID();
  const savedExpense = {
    id: expenseId,
    amount: Math.round(amount * 100) / 100,
    payerId,
    category,
    note,
    date,
    splitMode: splitDetails.splitMode,
    splitFamilyIds: splitDetails.splitFamilyIds,
    splitAmounts: splitDetails.splitAmounts,
    syncState: isCloudLedgerActive() ? "pending" : "synced",
  };

  if (wasEditing) {
    state.expenses = state.expenses.map((expense) => (expense.id === editingExpenseId ? savedExpense : expense));
    editingExpenseId = "";
    lastAddedExpenseId = expenseId;
    showToast({ message: "已更新账单" });
  } else {
    state.expenses.push(savedExpense);
    lastAddedExpenseId = expenseId;
    triggerAddEffect(payerId, savedExpense.amount);
  }

  if (wasEditing) {
    restoreEntryPreferenceState();
  } else {
    state.activeDate = date;
    state.activeCategory = category;
    state.selectedPayerId = payerId;
  }

  elements.expenseForm.reset();
  if (!wasEditing) resetSplitScope();
  smoothContainerResize(elements.ledgerSection, () => {
    render({ animateFinancialChanges: true });
  });
  if (wasEditing && hasActiveLedgerFilters() && !isExpenseVisible(savedExpense)) {
    showToast({
      message: "已保存，但不在当前筛选内",
      actionLabel: "清除筛选",
      onAction: clearLedgerFilters,
    });
  }
  syncCloudExpenseWithState(expenseId).catch(() => {
    showToast({ message: "云端保存失败，本地已保留，稍后会重试" });
  });
  elements.amountInput.focus();
  window.setTimeout(() => {
    if (lastAddedExpenseId === expenseId) lastAddedExpenseId = "";
  }, MOTION_DELAYS.ledgerSettle);
}

function handleInlineCategoryAdd(event) {
  event.preventDefault();
  addCategoryFromInput(elements.newCategoryInput);
}

function handleNewCategoryKeydown(event) {
  if (event.key !== "Enter") return;
  event.preventDefault();
  addCategoryFromInput(elements.newCategoryInput);
}

function handleSettingsCategorySubmit(event) {
  event.preventDefault();
  addCategoryFromInput(elements.settingsNewCategoryInput);
}

function addCategoryFromInput(input) {
  const category = input.value.trim();
  if (!category) return;

  if (!state.categories.includes(category)) {
    state.categories.push(category);
    lastAddedCategory = category;
  }
  state.activeCategory = category;

  input.value = "";
  render();
  queueCloudSettingsSync();
  window.setTimeout(() => {
    if (lastAddedCategory === category) lastAddedCategory = "";
  }, MOTION_DELAYS.categoryEnter);
}

function handleCategorySelection(event) {
  const button = event.target.closest("[data-category]");
  if (!button) return;

  const nextCategory = normalizeCategory(button.dataset.category, state.activeCategory);
  if (nextCategory !== state.activeCategory) markCategoryActivating(nextCategory);
  state.activeCategory = nextCategory;
  elements.categoryInput.value = state.activeCategory;
  renderCategories();
  renderMobileSubmitBar();
  saveState();
}

function handleSplitScopeToggle() {
  splitScopeOpen = !splitScopeOpen;
  renderSplitScope();
}

function handleSplitScopeClick(event) {
  const modeButton = event.target.closest("[data-split-mode]");
  if (modeButton) {
    const nextMode = normalizeSplitMode(modeButton.dataset.splitMode);
    if (nextMode !== activeSplitMode) {
      markSplitScopeSwitching();
      activeSplitMode = nextMode;
      if (activeSplitMode === "families" && !activeSplitFamilyIds.length) {
        activeSplitFamilyIds = state.families.map((family) => family.id);
      }
    }
    renderSplitScope();
    renderMobileSubmitBar();
    return;
  }

  const familyButton = event.target.closest("[data-split-family]");
  if (!familyButton) return;

  const familyId = normalizePayerId(familyButton.dataset.splitFamily);
  if (!familyId) return;
  if (activeSplitFamilyIds.includes(familyId)) {
    activeSplitFamilyIds = activeSplitFamilyIds.filter((id) => id !== familyId);
  } else {
    activeSplitFamilyIds = [...activeSplitFamilyIds, familyId];
  }
  renderSplitScope();
  renderMobileSubmitBar();
}

function markSplitScopeSwitching() {
  if (prefersReducedMotion()) return;
  splitScopeSwitching = true;
  window.clearTimeout(splitScopeSwitchTimer);
  splitScopeSwitchTimer = window.setTimeout(() => {
    splitScopeSwitching = false;
    elements.splitScopePanel.classList.remove("is-switching");
  }, MOTION_DELAYS.splitSwitch);
}

function handleSplitAmountInput(event) {
  const input = event.target.closest("[data-split-amount]");
  if (!input) return;

  const familyId = normalizePayerId(input.dataset.splitAmount);
  if (!familyId) return;
  const amount = parseAmountInput(input.value);
  activeSplitAmounts[familyId] = Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : 0;

  const totalCents = getActiveCustomSplitTotalCents();
  elements.amountInput.value = formatAmountInput(totalCents);

  elements.splitScopeSummary.textContent = formatActiveSplitSummary();
  const totalLine = elements.splitCustomAmounts.querySelector(".split-total-line");
  if (totalLine) totalLine.textContent = formatCustomSplitTotalLine();
  renderMobileSubmitBar();
  updateAmountMotionState();
}

function resetSplitScope() {
  activeSplitMode = "all";
  activeSplitFamilyIds = state.families.map((family) => family.id);
  activeSplitAmounts = {};
  splitScopeOpen = false;
}

function setSplitScopeFromExpense(expense) {
  activeSplitMode = normalizeSplitMode(expense.splitMode);
  activeSplitFamilyIds = normalizeSplitFamilyIds(expense.splitFamilyIds, state.families.map((family) => family.id));
  activeSplitAmounts = normalizeSplitAmounts(expense.splitAmounts);
  splitScopeOpen = activeSplitMode !== "all";
}

function handleSettingsCategoryClick(event) {
  const button = event.target.closest("[data-remove-category]");
  if (!button) return;

  const category = button.dataset.removeCategory;
  if (defaultCategories.includes(category)) return;
  if (state.expenses.some((expense) => expense.category === category)) return;
  const categoryIndex = state.categories.indexOf(category);
  state.categories = state.categories.filter((item) => item !== category);
  if (state.activeCategory === category) {
    state.activeCategory = "";
  }
  render();
  queueCloudSettingsSync();
  showToast({
    message: `已删除“${category}”`,
    actionLabel: "撤销",
    onAction: () => {
      state.categories.splice(Math.max(categoryIndex, 0), 0, category);
      state.categories = normalizeCategories(state.categories);
      state.activeCategory = category;
      render();
      queueCloudSettingsSync();
    },
  });
}

function handleFamilyMemberStep(event) {
  const button = event.target.closest("[data-member-step]");
  if (!button) return;

  const familyId = normalizePayerId(button.dataset.memberStep);
  if (!familyId) return;

  const current = state.familyMembers[familyId] || 1;
  const step = Number(button.dataset.step) || 0;
  const count = Math.max(1, Math.min(20, current + step));
  state.familyMembers[familyId] = count;
  render({ animateFinancialChanges: true });
  queueCloudSettingsSync();
}

function handleLedgerClick(event) {
  const editButton = event.target.closest("[data-edit-id]");
  if (editButton) {
    requestStartEditExpense(editButton.dataset.editId);
    return;
  }

  const button = event.target.closest("[data-delete-id]");
  if (button) {
    deleteExpense(button.dataset.deleteId, button.closest(".ledger-item"));
    return;
  }

  const item = event.target.closest("[data-expense-id]");
  if (!item) return;
  toggleLedgerItem(item.dataset.expenseId);
}

function handleLedgerKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  const item = event.target.closest("[data-expense-id]");
  if (!item || event.target.closest("button")) return;
  event.preventDefault();
  toggleLedgerItem(item.dataset.expenseId);
}

function toggleLedgerItem(expenseId) {
  if (!expenseId) return;
  if (expandedExpenseId === expenseId) {
    collapseLedgerItem(expenseId);
    return;
  }
  expandLedgerItem(expenseId);
}

function expandLedgerItem(expenseId) {
  if (!expenseId || expandedExpenseId === expenseId) return;
  const items = [...elements.ledgerList.querySelectorAll(".ledger-item")];
  const flipRects = captureLedgerTransitionRects(items);
  expandedExpenseId = expenseId;
  items.forEach((item) => {
    const isExpanded = item.dataset.expenseId === expenseId;
    item.classList.toggle("is-expanded", isExpanded);
    item.setAttribute("aria-expanded", String(isExpanded));
    item.setAttribute("aria-label", isExpanded ? "收起这笔账单" : "展开这笔账单");
  });
  playLedgerTransitionRects(flipRects);
}

function collapseLedgerItem(expenseId) {
  if (!expenseId || expandedExpenseId !== expenseId) return;
  const items = [...elements.ledgerList.querySelectorAll(".ledger-item")];
  const flipRects = captureLedgerTransitionRects(items);
  expandedExpenseId = "";
  items.forEach((item) => {
    item.classList.remove("is-expanded");
    item.setAttribute("aria-expanded", "false");
    item.setAttribute("aria-label", "展开这笔账单");
  });
  playLedgerTransitionRects(flipRects);
}

function captureLedgerTransitionRects(items) {
  if (prefersReducedMotion()) return new Map();
  const rects = new Map();
  const selectors = [".ledger-main", ".ledger-family", ".category-pill", ".ledger-note", ".ledger-amount", ".ledger-date", ".ledger-edit-button", ".delete-button"];
  items.forEach((item) => {
    item.querySelectorAll(selectors.join(",")).forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.width > 1 && rect.height > 1) rects.set(element, rect);
    });
  });
  return rects;
}

function playLedgerTransitionRects(rects) {
  if (!rects.size || prefersReducedMotion()) return;
  const duration = getCssDurationMs("--motion", 534);
  const easing = getComputedStyle(document.documentElement).getPropertyValue("--settle").trim() || "cubic-bezier(0.16, 0.9, 0.14, 1)";

  rects.forEach((fromRect, element) => {
    if (!element.isConnected) return;
    const toRect = element.getBoundingClientRect();
    if (toRect.width <= 1 || toRect.height <= 1) return;

    const dx = fromRect.left - toRect.left;
    const dy = fromRect.top - toRect.top;
    const moved = Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5;
    if (!moved) return;

    element.animate(
      [
        { transform: `translate(${dx}px, ${dy}px)` },
        { transform: "translate(0, 0)" },
      ],
      { duration, easing, fill: "both" },
    );
  });
}

function deleteExpense(expenseId, item) {
  const expenseIndex = state.expenses.findIndex((expense) => expense.id === expenseId);
  if (expenseIndex < 0) return;
  const [deletedExpense] = state.expenses.slice(expenseIndex, expenseIndex + 1);
  if (expandedExpenseId === expenseId) expandedExpenseId = "";
  item?.classList.add("is-removing");
  const button = item?.querySelector("[data-delete-id]");
  if (button) button.disabled = true;

  const delay = getCssDurationMs("--motion", 240) + 40;
  window.setTimeout(() => {
    state.expenses = state.expenses.filter((expense) => expense.id !== expenseId);
    deleteCloudExpense(expenseId).catch(() => {
      showToast({ message: "云端删除失败，本地已删除" });
    });
    if (editingExpenseId === expenseId) cancelEdit();
    smoothContainerResize(elements.ledgerSection, () => {
      render({ animateFinancialChanges: true });
    });
    showToast({
      message: "已删除账单",
      actionLabel: "撤销",
      onAction: () => {
        state.expenses.splice(Math.min(expenseIndex, state.expenses.length), 0, deletedExpense);
        smoothContainerResize(elements.ledgerSection, () => {
          render({ animateFinancialChanges: true });
        });
        syncCloudExpense(deletedExpense).catch(() => {
          showToast({ message: "云端撤销失败，本地已恢复" });
        });
      },
    });
  }, delay);
}

async function handleClearLedger() {
  if (!state.expenses.length) return;
  const confirmed = await showConfirmDialog({
    eyebrow: "清空账本",
    title: "清空当前账本？",
    message: `会删除“${state.name}”里的 ${state.expenses.length} 笔账单，本地会先保留撤销入口。`,
    confirmLabel: "清空",
    danger: true,
  });
  if (!confirmed) return;

  const deletedExpenses = [...state.expenses];
  expandedExpenseId = "";
  const previousDate = state.activeDate;
  const items = [...elements.ledgerList.querySelectorAll(".ledger-item")];
  items.forEach((item, index) => {
    window.setTimeout(() => item.classList.add("is-removing"), index * MOTION_DELAYS.ledgerClearStagger);
  });

  window.setTimeout(
    () => {
      state.expenses = [];
      state.activeDate = todayIso();
      editingExpenseId = "";
      editReturnState = null;
      editFormSnapshot = null;
      clearCloudLedger().catch(() => {
        showToast({ message: "云端清空失败，本地已清空" });
      });
      smoothContainerResize(elements.ledgerSection, () => {
        render({ animateFinancialChanges: true });
      });
      showToast({
        message: "已清空账本",
        actionLabel: "撤销",
        onAction: () => {
          state.expenses = deletedExpenses;
          state.activeDate = previousDate;
          smoothContainerResize(elements.ledgerSection, () => {
            render({ animateFinancialChanges: true });
          });
          syncAllLocalDataToCloud().catch(() => {
            showToast({ message: "云端撤销失败，本地已恢复" });
          });
        },
      });
    },
    items.length ? Math.min(MOTION_DELAYS.ledgerClearMax, MOTION_DELAYS.ledgerClearBase + items.length * MOTION_DELAYS.ledgerClearStagger) : 0,
  );
}

function handleLedgerCreateSubmit(event) {
  event.preventDefault();
  const name = elements.ledgerCreateNameInput.value.trim() || nextLedgerName();
  const inheritSettings = elements.ledgerInheritSettingsInput.checked;
  createLedgerWithOptions({ name, inheritSettings });
  elements.ledgerCreateForm.reset();
  elements.ledgerInheritSettingsInput.checked = true;
}

function createLedgerWithOptions({ name, inheritSettings = true }) {
  const ledger = createEmptyLedger(name);
  if (inheritSettings) {
    ledger.familyMembers = normalizeFamilyMembers(state.familyMembers);
    ledger.categories = normalizeCategories(state.categories);
    ledger.activeCategory = normalizeCategorySelection(state.activeCategory, ledger.categories);
  }

  appState.ledgers.push(ledger);
  switchLedger(ledger.id, { announce: false });
  renderLedgerManager();
  showToast({ message: `已创建“${ledger.name}”` });
}

function nextLedgerName() {
  return `账本 ${appState.ledgers.length + 1}`;
}

function switchLedger(ledgerId, { announce = true } = {}) {
  const ledger = appState.ledgers.find((item) => item.id === ledgerId);
  if (!ledger || ledger.id === state.id) return;

  state = ledger;
  appState.activeLedgerId = ledger.id;
  cloudState.shareToken = state.cloudShareToken || "";
  localStorage.removeItem(CLOUD_STATE_KEY);
  editingExpenseId = "";
  editReturnState = null;
  editFormSnapshot = null;
  lastAddedExpenseId = "";
  lastAddedCategory = "";
  totalAmountText = "";
  elements.expenseForm.reset();
  resetSplitScope();
  updateLedgerUrl();
  render({ animateFinancialChanges: true });
  markLedgerSwitching();
  if (announce) showToast({ message: `已切换到“${state.name}”` });
}

function renameCurrentLedger() {
  const nextName = normalizeLedgerName(elements.currentLedgerNameInput.value, state.name);
  if (nextName === state.name) return;

  state.name = nextName;
  render();
  queueCloudSettingsSync();
  showToast({ message: "账本名称已更新" });
}

function handleLedgerManagerClick(event) {
  const copyButton = event.target.closest("[data-copy-ledger]");
  if (copyButton) {
    copyLedgerShareLink(copyButton.dataset.copyLedger);
    return;
  }

  const switchButton = event.target.closest("[data-switch-ledger]");
  if (switchButton) {
    switchLedger(switchButton.dataset.switchLedger);
    return;
  }

  const deleteButton = event.target.closest("[data-delete-ledger]");
  if (!deleteButton) return;
  deleteLedger(deleteButton.dataset.deleteLedger);
}

async function copyLedgerShareLink(ledgerId) {
  const ledger = appState.ledgers.find((item) => item.id === ledgerId);
  if (!ledger?.cloudShareToken) return;
  const url = getShareUrl();
  if (!url) {
    showToast({ message: "先发布到网页地址，再复制邀请链接" });
    return;
  }

  setLedgerTokenHash(url, ledger.cloudShareToken);
  await navigator.clipboard.writeText(url.toString());
  showToast({ message: "邀请链接已复制" });
}

function exportJsonBackup() {
  saveState();
  const payload = {
    exportedAt: new Date().toISOString(),
    storageKey: STORAGE_KEY,
    appState,
  };
  downloadTextFile(`${slugifyFileName(state.name)}-backup.json`, JSON.stringify(payload, null, 2), "application/json");
  showToast({ message: "JSON 备份已下载" });
}

function exportCsvBackup() {
  const rows = [
    ["日期", "付款家庭", "类别", "金额", "备注", "分摊方式", "分摊家庭", "分摊明细"],
    ...state.expenses
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
      .map((expense) => [
        expense.date,
        getFamilyName(expense.payerId),
        expense.category,
        (expenseToCents(expense) / 100).toFixed(2),
        expense.note || "",
        formatSplitModeForExport(expense),
        formatSplitFamilyIdsForExport(expense),
        formatSplitAmountsForExport(expense),
      ]),
  ];
  const csv = rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n");
  downloadTextFile(`${slugifyFileName(state.name)}-expenses.csv`, `\uFEFF${csv}`, "text/csv;charset=utf-8");
  showToast({ message: "CSV 已下载" });
}

function formatSplitModeForExport(expense) {
  const splitMode = normalizeSplitMode(expense.splitMode);
  if (splitMode === "custom") return "分别填写金额";
  if (splitMode === "families") return "指定家庭";
  return "全部家庭";
}

function formatSplitFamilyIdsForExport(expense) {
  const splitMode = normalizeSplitMode(expense.splitMode);
  if (splitMode === "all") return state.families.map((family) => family.name).join(" / ");
  if (splitMode === "custom") {
    return state.families
      .filter((family) => amountToCents(expense.splitAmounts?.[family.id]) > 0)
      .map((family) => family.name)
      .join(" / ");
  }
  return normalizeSplitFamilyIds(expense.splitFamilyIds, state.families.map((family) => family.id)).map(getFamilyName).join(" / ");
}

function formatSplitAmountsForExport(expense) {
  if (normalizeSplitMode(expense.splitMode) !== "custom") return "";
  const splitAmounts = normalizeSplitAmounts(expense.splitAmounts);
  return state.families
    .filter((family) => amountToCents(splitAmounts[family.id]) > 0)
    .map((family) => `${family.name}:${(amountToCents(splitAmounts[family.id]) / 100).toFixed(2)}`)
    .join(" / ");
}

function escapeCsvValue(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function slugifyFileName(value) {
  const normalized = String(value || "旅行账本").trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-");
  return normalized || "旅行账本";
}

function downloadTextFile(fileName, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function handleLedgerJoinSubmit(event) {
  event.preventDefault();
  const token = extractShareToken(elements.ledgerJoinInput.value);
  if (!token) {
    showToast({ message: "没有识别到云账本链接" });
    elements.ledgerJoinInput.focus();
    return;
  }

  joinCloudLedger(token);
  elements.ledgerJoinForm.reset();
}

function extractShareToken(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    return parseLedgerTokenFromHash(url.hash) || url.searchParams.get("ledger") || "";
  } catch {
    return parseLedgerTokenFromHash(raw) || raw.replace(/^(ledger|token)=/, "").trim();
  }
}

function joinCloudLedger(shareToken) {
  const existingLedger = appState.ledgers.find((ledger) => ledger.cloudShareToken === shareToken);
  if (existingLedger) {
    switchLedger(existingLedger.id);
    showToast({ message: `已打开“${existingLedger.name}”` });
    return;
  }

  const ledger = createEmptyLedger("云账本");
  ledger.cloudShareToken = shareToken;
  appState.ledgers.push(ledger);
  switchLedger(ledger.id, { announce: false });
  pullCloudLedger({ announce: true });
}

async function deleteLedger(ledgerId) {
  if (appState.ledgers.length <= 1) return;

  const ledgerIndex = appState.ledgers.findIndex((ledger) => ledger.id === ledgerId);
  if (ledgerIndex < 0) return;

  const ledger = appState.ledgers[ledgerIndex];
  const confirmed = await showConfirmDialog({
    eyebrow: "删除账本",
    title: `删除“${ledger.name}”？`,
    message: "这个操作只会删除当前浏览器里的这个账本，不会清空其他人手里的云端数据。",
    confirmLabel: "删除",
    danger: true,
  });
  if (!confirmed) return;

  appState.ledgers.splice(ledgerIndex, 1);
  if (state.id === ledgerId) {
    const nextLedger = appState.ledgers[Math.min(ledgerIndex, appState.ledgers.length - 1)];
    state = nextLedger;
    appState.activeLedgerId = nextLedger.id;
    cloudState.shareToken = state.cloudShareToken || "";
    localStorage.removeItem(CLOUD_STATE_KEY);
    updateLedgerUrl();
  }

  editingExpenseId = "";
  render({ animateFinancialChanges: true });
  showToast({ message: `已删除“${ledger.name}”` });
}

function openSettings() {
  window.clearTimeout(settingsCloseTimer);
  elements.settingsView.hidden = false;
  elements.settingsView.classList.remove("is-closing");
  document.body.classList.add("settings-open");
  renderSettings();
  elements.closeSettingsButton.focus();
}

function closeSettings() {
  if (elements.settingsView.hidden || elements.settingsView.classList.contains("is-closing")) return;

  elements.settingsView.classList.add("is-closing");
  const delay = prefersReducedMotion() ? 0 : getCssDurationMs("--motion", 534) + 60;

  window.clearTimeout(settingsCloseTimer);
  settingsCloseTimer = window.setTimeout(() => {
    elements.settingsView.hidden = true;
    elements.settingsView.classList.remove("is-closing");
    document.body.classList.remove("settings-open");
    elements.openSettingsButton.focus();
  }, delay);
}

function openLedgerManager() {
  window.clearTimeout(ledgerManagementCloseTimer);
  elements.ledgerManagementView.hidden = false;
  elements.ledgerManagementView.classList.remove("is-closing");
  document.body.classList.add("ledger-management-open");
  renderLedgerManager();
  elements.closeLedgerManagerButton.focus();
}

function closeLedgerManager() {
  if (elements.ledgerManagementView.hidden || elements.ledgerManagementView.classList.contains("is-closing")) return;

  elements.ledgerManagementView.classList.add("is-closing");
  const delay = prefersReducedMotion() ? 0 : getCssDurationMs("--motion", 534) + 60;

  window.clearTimeout(ledgerManagementCloseTimer);
  ledgerManagementCloseTimer = window.setTimeout(() => {
    elements.ledgerManagementView.hidden = true;
    elements.ledgerManagementView.classList.remove("is-closing");
    document.body.classList.remove("ledger-management-open");
    elements.openLedgerManagerButton.focus();
  }, delay);
}

function showConfirmDialog({ eyebrow = "请确认", title, message, confirmLabel = "确认", danger = false }) {
  if (confirmResolve) closeConfirmDialog(false);

  elements.confirmEyebrow.textContent = eyebrow;
  elements.confirmTitle.textContent = title;
  elements.confirmMessage.textContent = message;
  elements.confirmOkButton.textContent = confirmLabel;
  elements.confirmOkButton.classList.toggle("danger-action", danger);
  elements.confirmView.hidden = false;
  document.body.classList.add("confirm-open");
  elements.confirmCancelButton.focus();

  return new Promise((resolve) => {
    confirmResolve = resolve;
  });
}

function closeConfirmDialog(result = false) {
  if (elements.confirmView.hidden) return;
  elements.confirmView.hidden = true;
  document.body.classList.remove("confirm-open");
  const resolve = confirmResolve;
  confirmResolve = null;
  resolve?.(result);
}

function handleFamilySelection(event) {
  const button = event.target.closest("[data-payer-id]");
  if (!button) return;

  const nextPayerId = normalizePayerId(button.dataset.payerId);
  if (nextPayerId && nextPayerId !== state.selectedPayerId) markPayerActivating(nextPayerId);
  state.selectedPayerId = nextPayerId;
  elements.payerError.textContent = "";
  applySelectedFamilyTheme();
  renderFamilyRoster();
  applySubmitButtonTheme();
  renderMobileSubmitBar();
  updateAmountMotionState();
  saveState();
}

function markPayerActivating(payerId) {
  activatingPayerId = payerId;
  window.setTimeout(() => {
    if (activatingPayerId === payerId) activatingPayerId = "";
  }, MOTION_DELAYS.payerActivate);
}

function markCategoryActivating(category) {
  activatingCategory = category;
  window.setTimeout(() => {
    if (activatingCategory === category) activatingCategory = "";
  }, MOTION_DELAYS.categoryActivate);
}

function renderTotalMetricGradient(summary) {
  const activeSegments = getPaidSegments(summary);
  const gradientStops = buildSoftGradientStops(activeSegments);
  const aura = buildGradientAura(activeSegments);
  const firstFamily = activeSegments[0].family;
  const lastFamily = activeSegments[activeSegments.length - 1].family;
  const firstVisual = getFamilyVisual(firstFamily.id);
  const lastVisual = getFamilyVisual(lastFamily.id);
  const blendedBase = mixHexColors(firstVisual.gradient, lastVisual.gradient, 0.5);

  elements.totalMetric.style.setProperty("--total-gradient", `linear-gradient(135deg, ${gradientStops.join(", ")})`);
  elements.totalMetric.style.setProperty("--total-aura", aura);
  elements.totalMetric.style.setProperty("--total-glow-left", colorWithAlpha(firstVisual.gradient, 0.42));
  elements.totalMetric.style.setProperty("--total-glow-right", colorWithAlpha(lastVisual.gradient, 0.42));
  elements.totalMetric.style.setProperty("--total-edge-left", colorWithAlpha(firstVisual.gradient, 0.34));
  elements.totalMetric.style.setProperty("--total-edge-right", colorWithAlpha(lastVisual.gradient, 0.34));
  elements.totalMetric.style.setProperty("--total-edge-soft", colorWithAlpha(blendedBase, 0.22));
}

function renderCategorySummaryGradient(summary, activeCategories) {
  const segments = getCategorySegments(summary, activeCategories);
  const gradientStops = buildCategoryGradientStops(segments);
  const aura = buildCategoryGradientAura(segments);
  const firstCategory = segments[0].category;
  const lastCategory = segments[segments.length - 1].category;

  elements.categorySummaryBlock.style.setProperty("--category-summary-gradient", `linear-gradient(135deg, ${gradientStops.join(", ")})`);
  elements.categorySummaryBlock.style.setProperty("--category-summary-aura", aura);
  elements.categorySummaryBlock.style.setProperty("--category-glow-left", colorWithAlpha(getCategoryVisual(firstCategory).gradient, 0.46));
  elements.categorySummaryBlock.style.setProperty("--category-glow-right", colorWithAlpha(getCategoryVisual(lastCategory).gradient, 0.46));
}

function getPaidSegments(summary) {
  const paidFamilies =
    summary.totalCents > 0
      ? state.families.filter((family) => (summary.paidByFamily[family.id] || 0) > 0)
      : state.families;
  const families = paidFamilies.length ? paidFamilies : [state.families[0]];
  let cursor = 0;

  return families.map((family, index) => {
    const paid = summary.paidByFamily[family.id] || 0;
    const share = summary.totalCents > 0 ? paid / summary.totalCents : 1 / families.length;
    const start = cursor;
    const end = index === families.length - 1 ? 100 : cursor + share * 100;
    cursor = end;
    return { family, start, end, share };
  });
}

function buildSoftGradientStops(segments) {
  if (segments.length === 1) {
    const color = getFamilyVisual(segments[0].family.id).gradient;
    return [
      `${colorWithAlpha(color, 0.52)} 0%`,
      `${colorWithAlpha(color, 0.62)} 52%`,
      `${colorWithAlpha(color, 0.46)} 100%`,
    ];
  }

  const stops = [`${colorWithAlpha(getFamilyVisual(segments[0].family.id).gradient, 0.54)} 0%`];

  for (let index = 0; index < segments.length - 1; index += 1) {
    const current = segments[index];
    const next = segments[index + 1];
    const currentColor = getFamilyVisual(current.family.id).gradient;
    const nextColor = getFamilyVisual(next.family.id).gradient;
    const boundary = current.end;
    const softWidth = Math.min(14, Math.max(6, Math.min(current.end - current.start, next.end - next.start) * 0.34));
    const left = Math.max(current.start, boundary - softWidth);
    const right = Math.min(next.end, boundary + softWidth);
    const mixed = mixHexColors(currentColor, nextColor, 0.5);

    stops.push(
      `${colorWithAlpha(currentColor, 0.54)} ${formatPercent(left)}`,
      `${colorWithAlpha(mixed, 0.58)} ${formatPercent(boundary)}`,
      `${colorWithAlpha(nextColor, 0.54)} ${formatPercent(right)}`,
    );
  }

  const finalColor = getFamilyVisual(segments[segments.length - 1].family.id).gradient;
  stops.push(`${colorWithAlpha(finalColor, 0.48)} 100%`);
  return stops;
}

function buildGradientAura(segments) {
  return segments
    .map((segment, index) => {
      const center = segment.start + (segment.end - segment.start) / 2;
      const y = index % 2 === 0 ? 16 : 52;
      const color = colorWithAlpha(getFamilyVisual(segment.family.id).gradient, 0.32);
      return `radial-gradient(circle at ${formatPercent(center)} ${y}%, ${color}, transparent 48%)`;
    })
    .join(", ");
}

function getCategorySegments(summary, activeCategories) {
  const categories = activeCategories.length ? activeCategories : defaultCategories.slice(0, 3);
  let cursor = 0;

  return categories.map((category, index) => {
    const cents = summary.categoryTotals[category] || 0;
    const share = summary.totalCents > 0 ? cents / summary.totalCents : 1 / categories.length;
    const start = cursor;
    const end = index === categories.length - 1 ? 100 : cursor + share * 100;
    cursor = end;
    return { category, start, end, share };
  });
}

function buildCategoryGradientStops(segments) {
  if (segments.length === 1) {
    const color = getCategoryVisual(segments[0].category).gradient;
    return [
      `${colorWithAlpha(color, 0.52)} 0%`,
      `${colorWithAlpha(color, 0.62)} 54%`,
      `${colorWithAlpha(color, 0.46)} 100%`,
    ];
  }

  const stops = [`${colorWithAlpha(getCategoryVisual(segments[0].category).gradient, 0.52)} 0%`];

  for (let index = 0; index < segments.length - 1; index += 1) {
    const current = segments[index];
    const next = segments[index + 1];
    const currentColor = getCategoryVisual(current.category).gradient;
    const nextColor = getCategoryVisual(next.category).gradient;
    const boundary = current.end;
    const softWidth = Math.min(16, Math.max(7, Math.min(current.end - current.start, next.end - next.start) * 0.36));
    const left = Math.max(current.start, boundary - softWidth);
    const right = Math.min(next.end, boundary + softWidth);
    const mixed = mixHexColors(currentColor, nextColor, 0.5);

    stops.push(
      `${colorWithAlpha(currentColor, 0.52)} ${formatPercent(left)}`,
      `${colorWithAlpha(mixed, 0.58)} ${formatPercent(boundary)}`,
      `${colorWithAlpha(nextColor, 0.52)} ${formatPercent(right)}`,
    );
  }

  const finalColor = getCategoryVisual(segments[segments.length - 1].category).gradient;
  stops.push(`${colorWithAlpha(finalColor, 0.46)} 100%`);
  return stops;
}

function buildCategoryGradientAura(segments) {
  return segments
    .map((segment, index) => {
      const center = segment.start + (segment.end - segment.start) / 2;
      const y = index % 2 === 0 ? 16 : 52;
      const color = colorWithAlpha(getCategoryVisual(segment.category).gradient, 0.32);
      return `radial-gradient(circle at ${formatPercent(center)} ${y}%, ${color}, transparent 45%)`;
    })
    .join(", ");
}

function familyStyle(familyId) {
  const visual = getFamilyVisual(familyId);
  return `--family-color: ${visual.color}; --family-text: ${visual.text}; --family-soft: ${visual.soft}; --family-wash: ${visual.wash};`;
}

function applySelectedFamilyTheme() {
  if (!state.selectedPayerId) {
    elements.amountLabel.classList.remove("amount-themed");
    elements.amountLabel.style.removeProperty("--selected-family-color");
    elements.amountLabel.style.removeProperty("--selected-family-text");
    elements.amountLabel.style.removeProperty("--selected-family-soft");
    elements.amountLabel.style.removeProperty("--selected-family-wash");
    elements.amountLabel.style.removeProperty("--selected-family-glow");
    return;
  }

  const style = getFamilyVisual(state.selectedPayerId);
  elements.amountLabel.classList.add("amount-themed");
  elements.amountLabel.style.setProperty("--selected-family-color", style.color);
  elements.amountLabel.style.setProperty("--selected-family-text", style.text);
  elements.amountLabel.style.setProperty("--selected-family-soft", style.soft);
  elements.amountLabel.style.setProperty("--selected-family-wash", colorWithAlpha(style.color, 0.24));
  elements.amountLabel.style.setProperty("--selected-family-glow", colorWithAlpha(style.color, 0.42));
}

function applySubmitButtonTheme() {
  const style = state.selectedPayerId ? getFamilyVisual(state.selectedPayerId) : null;
  const color = style?.color || "#176c5f";
  const text = style?.text || "#176c5f";
  const wash = style?.wash || "rgba(23, 108, 95, 0.14)";
  const glow = colorWithAlpha(color, state.selectedPayerId ? 0.30 : 0.22);
  [elements.expenseForm, elements.mobileSubmitBar].forEach((element) => {
    element.style.setProperty("--submit-color", color);
    element.style.setProperty("--submit-text", text);
    element.style.setProperty("--submit-wash", wash);
    element.style.setProperty("--submit-glow", glow);
  });
  elements.expenseForm.classList.toggle("submit-themed", Boolean(state.selectedPayerId));
  elements.mobileSubmitBar.classList.toggle("submit-themed", Boolean(state.selectedPayerId));
}

function getCssDurationMs(variableName, fallback) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  if (raw.endsWith("ms")) return Number.parseFloat(raw) || fallback;
  if (raw.endsWith("s")) return (Number.parseFloat(raw) || fallback / 1000) * 1000;
  return fallback;
}

function smoothContainerResize(element, update) {
  if (!element || prefersReducedMotion()) {
    update();
    return;
  }

  element._resizeAnimation?.cancel();
  window.clearTimeout(element._resizeTimer);
  const startHeight = element.getBoundingClientRect().height;
  element.classList.add("is-resizing");
  element.style.height = `${startHeight}px`;
  element.style.overflow = "hidden";

  update();

  element.style.height = "auto";
  const endHeight = element.getBoundingClientRect().height;

  if (Math.abs(startHeight - endHeight) < 1) {
    element.style.removeProperty("height");
    element.style.removeProperty("overflow");
    element.classList.remove("is-resizing");
    return;
  }

  element.style.height = `${endHeight}px`;
  const duration = getCssDurationMs("--motion", 534);
  const easing = getComputedStyle(document.documentElement).getPropertyValue("--settle").trim() || "cubic-bezier(0.16, 0.9, 0.14, 1)";
  const animation = element.animate([{ height: `${startHeight}px` }, { height: `${endHeight}px` }], { duration, easing, fill: "both" });
  element._resizeAnimation = animation;

  const cleanup = () => {
    if (element._resizeAnimation !== animation) return;
    element.style.removeProperty("height");
    element.style.removeProperty("overflow");
    element.classList.remove("is-resizing");
    element._resizeAnimation = null;
    window.clearTimeout(element._resizeTimer);
  };

  animation.addEventListener("finish", cleanup, { once: true });
  element._resizeTimer = window.setTimeout(cleanup, duration + 140);
}

function colorWithAlpha(hex, alpha) {
  const { red, green, blue } = hexToRgb(hex);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function mixHexColors(firstHex, secondHex, weight) {
  const first = hexToRgb(firstHex);
  const second = hexToRgb(secondHex);
  const mix = (from, to) => Math.round(from + (to - from) * weight);
  return rgbToHex(mix(first.red, second.red), mix(first.green, second.green), mix(first.blue, second.blue));
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return {
    red: (value >> 16) & 255,
    green: (value >> 8) & 255,
    blue: value & 255,
  };
}

function rgbToHex(red, green, blue) {
  const toHex = (value) => value.toString(16).padStart(2, "0");
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

function formatPercent(value) {
  return `${value.toFixed(2)}%`;
}

function updateAmountMotionState() {
  elements.amountLabel.classList.toggle("amount-active", document.activeElement === elements.amountInput);
}

function formatAmountFieldOnBlur() {
  updateAmountMotionState();
  if (activeSplitMode === "custom") return;

  const amount = parseAmountInput(elements.amountInput.value);
  if (!Number.isFinite(amount) || amount <= 0) return;
  elements.amountInput.value = (Math.round(amount * 100) / 100).toFixed(2).replace(/\.00$/, "");
}

function pulseAmountField() {
  elements.amountLabel.classList.remove("amount-pulse");
  void elements.amountLabel.offsetWidth;
  elements.amountLabel.classList.add("amount-pulse");
}

async function requestStartEditExpense(expenseId) {
  if (editingExpenseId === expenseId) {
    elements.expenseForm.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    elements.amountInput.focus();
    showToast({ message: "正在编辑这笔账单" });
    return;
  }

  if (editingExpenseId && editingExpenseId !== expenseId && hasUnsavedEditChanges()) {
    const confirmed = await showConfirmDialog({
      eyebrow: "切换编辑",
      title: "放弃当前修改？",
      message: "当前表单里有未保存的改动，切换到另一笔账单会丢掉这些修改。",
      confirmLabel: "放弃并切换",
      danger: true,
    });
    if (!confirmed) return;
  }

  startEditExpense(expenseId);
}

function startEditExpense(expenseId) {
  const expense = state.expenses.find((item) => item.id === expenseId);
  if (!expense) return;

  if (!editingExpenseId) {
    editReturnState = captureEntryPreferenceState();
  }
  editingExpenseId = expense.id;
  expandedExpenseId = expense.id;
  state.selectedPayerId = expense.payerId;
  state.activeCategory = expense.category;
  state.activeDate = expense.date;
  setSplitScopeFromExpense(expense);
  smoothContainerResize(elements.entryPanel, () => {
    render();
  });
  elements.amountInput.value = activeSplitMode === "custom" ? formatAmountInput(getActiveCustomSplitTotalCents()) : String(expense.amount);
  elements.noteInput.value = expense.note;
  editFormSnapshot = captureExpenseFormSnapshot();
  elements.expenseForm.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  elements.amountInput.focus();
  showToast({ message: "已载入账单，可直接修改" });
}

function cancelEdit() {
  editingExpenseId = "";
  elements.expenseForm.reset();
  restoreEntryPreferenceState();
  smoothContainerResize(elements.entryPanel, () => {
    render();
  });
  elements.amountInput.focus();
}

function captureEntryPreferenceState() {
  return {
    activeDate: state.activeDate,
    activeCategory: state.activeCategory,
    selectedPayerId: state.selectedPayerId,
    splitMode: activeSplitMode,
    splitFamilyIds: [...activeSplitFamilyIds],
    splitAmounts: { ...activeSplitAmounts },
  };
}

function restoreEntryPreferenceState() {
  if (!editReturnState) {
    editFormSnapshot = null;
    return;
  }

  state.activeDate = normalizeDate(editReturnState.activeDate, todayIso());
  state.activeCategory = normalizeCategorySelection(editReturnState.activeCategory, state.categories);
  state.selectedPayerId = normalizePayerId(editReturnState.selectedPayerId);
  activeSplitMode = normalizeSplitMode(editReturnState.splitMode);
  activeSplitFamilyIds = normalizeSplitFamilyIds(editReturnState.splitFamilyIds, state.families.map((family) => family.id));
  activeSplitAmounts = normalizeSplitAmounts(editReturnState.splitAmounts);
  editReturnState = null;
  editFormSnapshot = null;
}

function captureExpenseFormSnapshot() {
  const splitAmounts = normalizeSplitAmounts(activeSplitAmounts);
  return {
    amountCents: activeSplitMode === "custom" ? getActiveCustomSplitTotalCents() : amountToCents(parseAmountInput(elements.amountInput.value)),
    payerId: normalizePayerId(state.selectedPayerId),
    category: elements.categoryInput.value || "",
    date: normalizeDate(elements.dateInput.value, state.activeDate),
    note: elements.noteInput.value.trim(),
    splitMode: normalizeSplitMode(activeSplitMode),
    splitFamilyIds: normalizeSplitFamilyIds(activeSplitFamilyIds, state.families.map((family) => family.id)),
    splitAmounts: Object.fromEntries(state.families.map((family) => [family.id, amountToCents(splitAmounts[family.id])])),
  };
}

function hasUnsavedEditChanges() {
  if (!editingExpenseId || !editFormSnapshot) return false;
  return JSON.stringify(captureExpenseFormSnapshot()) !== JSON.stringify(editFormSnapshot);
}

function showToast({ message, actionLabel = "", onAction = null }) {
  window.clearTimeout(toastTimer);
  elements.toastHost.innerHTML = `
    <div class="toast is-visible">
      <span>${escapeHtml(message)}</span>
      ${actionLabel ? `<button class="toast-action" type="button">${escapeHtml(actionLabel)}</button>` : ""}
    </div>
  `;

  const actionButton = elements.toastHost.querySelector(".toast-action");
  actionButton?.addEventListener(
    "click",
    () => {
      window.clearTimeout(toastTimer);
      elements.toastHost.innerHTML = "";
      onAction?.();
    },
    { once: true },
  );

  toastTimer = window.setTimeout(() => {
    elements.toastHost.innerHTML = "";
  }, actionLabel ? MOTION_DELAYS.toastWithAction : MOTION_DELAYS.toast);
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function markLedgerSwitching() {
  if (prefersReducedMotion()) return;

  elements.ledgerView.classList.remove("is-switching-ledger");
  void elements.ledgerView.offsetWidth;
  elements.ledgerView.classList.add("is-switching-ledger");

  window.clearTimeout(ledgerSwitchTimer);
  ledgerSwitchTimer = window.setTimeout(() => {
    elements.ledgerView.classList.remove("is-switching-ledger");
  }, getCssDurationMs("--motion", 534) + 160);
}

function triggerAddEffect(payerId, amount) {
  const visual = getFamilyVisual(payerId);
  const themedGlow = colorWithAlpha(visual.color, 0.36);
  elements.expenseForm.classList.remove("form-celebrate");
  elements.expenseForm.style.setProperty("--submit-color", visual.color);
  elements.expenseForm.style.setProperty("--submit-glow", themedGlow);
  void elements.expenseForm.offsetWidth;
  elements.expenseForm.classList.add("form-celebrate");
  triggerTotalAbsorbEffect(visual);
  emitLedgerToken(visual, amount);
  window.setTimeout(() => {
    elements.expenseForm.classList.remove("form-celebrate");
  }, MOTION_DELAYS.addCelebrate);
}

function triggerTotalAbsorbEffect(visual) {
  elements.totalMetric.classList.remove("is-absorbing");
  elements.totalMetric.style.setProperty("--absorb-color", colorWithAlpha(visual.color, 0.18));
  elements.totalMetric.style.setProperty("--absorb-glow", colorWithAlpha(visual.gradient, 0.30));
  void elements.totalMetric.offsetWidth;
  elements.totalMetric.classList.add("is-absorbing");
  window.setTimeout(() => {
    elements.totalMetric.classList.remove("is-absorbing");
  }, MOTION_DELAYS.totalAbsorb);
}

function emitLedgerToken(visual, amount) {
  if (prefersReducedMotion()) return;

  const amountRect = elements.amountLabel.getBoundingClientRect();
  const startX = amountRect.left + amountRect.width * 0.5;
  const startY = amountRect.top + amountRect.height * 0.38;
  const token = document.createElement("div");

  token.className = "ledger-token";
  token.textContent = formatMoney(Math.round(Number(amount) * 100));
  token.style.setProperty("--token-color", visual.color);
  token.style.setProperty("--token-text", visual.text);
  token.style.setProperty("--token-glow", colorWithAlpha(visual.color, 0.34));
  token.style.setProperty("--start-x", `${startX}px`);
  token.style.setProperty("--start-y", `${startY}px`);
  document.body.append(token);
  token.addEventListener("animationend", () => token.remove(), { once: true });
}

function updateClearLedgerButton() {
  const isEmpty = state.expenses.length === 0;
  elements.settingsClearLedgerButton.disabled = isEmpty;
  elements.settingsClearLedgerButton.setAttribute("aria-disabled", String(isEmpty));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

elements.expenseForm.addEventListener("submit", handleExpenseSubmit);
elements.categoryForm.addEventListener("click", (event) => {
  if (event.target.closest("button")) handleInlineCategoryAdd(event);
});
elements.newCategoryInput.addEventListener("keydown", handleNewCategoryKeydown);
elements.categoryChips.addEventListener("click", handleCategorySelection);
elements.splitScopeToggle.addEventListener("click", handleSplitScopeToggle);
elements.splitScopePanel.addEventListener("click", handleSplitScopeClick);
elements.splitScopePanel.addEventListener("input", handleSplitAmountInput);
elements.ledgerNameForm.addEventListener("submit", (event) => {
  event.preventDefault();
  renameCurrentLedger();
});
elements.openLedgerManagerButton.addEventListener("click", openLedgerManager);
elements.closeLedgerManagerButton.addEventListener("click", closeLedgerManager);
elements.ledgerManagementBackdrop.addEventListener("click", closeLedgerManager);
elements.ledgerCreateForm.addEventListener("submit", handleLedgerCreateSubmit);
elements.ledgerJoinForm.addEventListener("submit", handleLedgerJoinSubmit);
elements.ledgerManagerList.addEventListener("click", handleLedgerManagerClick);
elements.settingsCategoryForm.addEventListener("submit", handleSettingsCategorySubmit);
elements.settingsCategoryChips.addEventListener("click", handleSettingsCategoryClick);
elements.settingsFamilyList.addEventListener("click", handleFamilyMemberStep);
elements.familyRoster.addEventListener("click", handleFamilySelection);
elements.ledgerList.addEventListener("click", handleLedgerClick);
elements.ledgerList.addEventListener("keydown", handleLedgerKeydown);
elements.settingsClearLedgerButton.addEventListener("click", handleClearLedger);
elements.exportCsvButton.addEventListener("click", exportCsvBackup);
elements.exportJsonButton.addEventListener("click", exportJsonBackup);
elements.createCloudLedgerButton.addEventListener("click", createCloudLedger);
elements.copyShareLinkButton.addEventListener("click", copyShareLink);
elements.openSettingsButton.addEventListener("click", openSettings);
elements.closeSettingsButton.addEventListener("click", closeSettings);
elements.settingsBackdrop.addEventListener("click", closeSettings);
elements.confirmBackdrop.addEventListener("click", () => closeConfirmDialog(false));
elements.confirmCancelButton.addEventListener("click", () => closeConfirmDialog(false));
elements.confirmOkButton.addEventListener("click", () => closeConfirmDialog(true));
elements.cancelEditButton.addEventListener("click", cancelEdit);
elements.mobileSubmitButton.addEventListener("click", () => {
  elements.expenseForm.requestSubmit();
});
elements.amountInput.addEventListener("focus", updateAmountMotionState);
elements.amountInput.addEventListener("blur", formatAmountFieldOnBlur);
elements.amountInput.addEventListener("input", () => {
  updateAmountMotionState();
  pulseAmountField();
  renderMobileSubmitBar();
});
elements.categoryInput.addEventListener("change", () => {
  state.activeCategory = elements.categoryInput.value || state.activeCategory;
  renderMobileSubmitBar();
  saveState();
});
elements.dateInput.addEventListener("change", () => {
  state.activeDate = normalizeDate(elements.dateInput.value, state.activeDate);
  elements.dateInput.value = state.activeDate;
  renderMobileSubmitBar();
  saveState();
});
elements.ledgerFamilyFilter.addEventListener("change", () => {
  state.ledgerFamilyFilter = normalizePayerId(elements.ledgerFamilyFilter.value);
  smoothContainerResize(elements.ledgerSection, () => {
    render({ animateFinancialChanges: true });
  });
});
elements.ledgerCategoryFilter.addEventListener("change", () => {
  state.ledgerCategoryFilter = normalizeCategoryFilter(elements.ledgerCategoryFilter.value, state.categories);
  smoothContainerResize(elements.ledgerSection, () => {
    render({ animateFinancialChanges: true });
  });
});
elements.clearLedgerFiltersButton.addEventListener("click", clearLedgerFilters);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") refreshCloudLedgerFromLifecycle();
});
window.addEventListener("online", refreshCloudLedgerFromLifecycle);
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!elements.confirmView.hidden) {
    closeConfirmDialog(false);
    return;
  }
  if (!elements.ledgerManagementView.hidden) {
    closeLedgerManager();
    return;
  }
  if (!elements.settingsView.hidden) {
    closeSettings();
  }
});

render();
pullCloudLedger({ announce: Boolean(cloudState.shareToken) });

// 屏幕键盘弹出标记：文本类控件聚焦时给 body 加 keyboard-open，
// CSS 据此隐藏移动端固定提交栏，避免悬在键盘上方挡住表单。
// focusout 延迟一拍再判断，防止焦点在输入间切换时提交栏闪烁。
(() => {
  const isTextEntry = (el) =>
    el && (el.tagName === "SELECT" || (el.tagName === "INPUT" && !["button", "checkbox", "radio", "range", "submit"].includes(el.type)));
  const syncKeyboardFlag = () => {
    document.body.classList.toggle("keyboard-open", isTextEntry(document.activeElement));
  };
  document.addEventListener("focusin", syncKeyboardFlag);
  document.addEventListener("focusout", () => setTimeout(syncKeyboardFlag, 0));
})();
