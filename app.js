const STORAGE_KEY = "travel-ledger-v3";
const LEGACY_STORAGE_KEYS = ["travel-ledger-v2", "travel-ledger-v1"];
const CLOUD_STATE_KEY = "travel-ledger-cloud";
const APP_VERSION = "journa-bar-gel-morph-v6-20260709";
const SUPABASE_URL = "https://qvphpeetzyvnwaehrifa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2cGhwZWV0enl2bndhZWhyaWZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NzIxMTAsImV4cCI6MjA5ODE0ODExMH0.k3FL_Ywt377guTfjzTu1bgucShpRfmnQCdxn4SqikuA";
const PUBLIC_APP_URL = "https://lunelucas.github.io/Journa/";
document.documentElement.dataset.appVersion = APP_VERSION;
const MOTION_DELAYS = {
  ledgerSettle: 1783,
  ledgerClearBase: 580,
  ledgerClearMax: 1159,
  ledgerClearStagger: 63,
  settlementStagger: 58,
  categoryEnter: 1560,
  payerActivate: 760,
  categoryActivate: 760,
  choiceRelease: 460,
  splitSwitch: 260,
  mobilePanelOut: 120,
  mobilePanelIn: 500,
  mobilePanelIndicator: 620,
  barMorph: 620,
  addCelebrate: 1560,
  totalAbsorb: 1320,
  tokenFlight: 680,
  totalBloom: 460,
  catchPulse: 420,
  toast: 2600,
  toastWithAction: 5200,
};
/* Bottom bar FLIP springs: underdamped (ζ≈0.59/0.58) so the shape lands with one
   clearly visible elastic rebound rather than easing flatly into place. */
const SPRING_BAR_COLLAPSE = { stiffness: 260, damping: 19, mass: 1 };
const SPRING_BAR_EXPAND = { stiffness: 240, damping: 18, mass: 1 };
const BAR_ARC_LIFT_PX = 5;
const BAR_ARC_REBOUND_PX = 1.4;
const defaultFamilies = [
  { id: "family-a", name: "乐家" },
  { id: "family-b", name: "祺家" },
  { id: "family-c", name: "旦家" },
];
const defaultFamilyVisuals = {
  "family-a": deriveFamilyVisual("#7eab98"),
  "family-b": deriveFamilyVisual("#849fcd"),
  "family-c": deriveFamilyVisual("#c88f8d"),
};
/* 全局主题色预设：色值真身在 CSS（variables.css/dark.css 的 [data-theme] 块），
   这里只存 id/名称/亮色 swatch 供设置面板渲染。偏好设备级存 localStorage。 */
const THEME_STORAGE_KEY = "travel-ledger-theme";
const THEME_PRESETS = [
  { id: "clay", name: "陶土橙粉", color: "#9d5745" },
  { id: "pine", name: "墨松绿", color: "#176c5f" },
  { id: "harbor", name: "雾港蓝", color: "#4a6b91" },
  { id: "lotus", name: "藕荷紫", color: "#7d5c88" },
  { id: "malt", name: "茶麦棕", color: "#87683f" },
];
const familyPalettePresets = [
  {
    id: "morning-map",
    name: "清晨地图",
    description: "绿、蓝、珊瑚，清楚但柔和",
    colors: [
      { color: "#7eab98" },
      { color: "#849fcd" },
      { color: "#c88f8d" },
      { color: "#b9a064" },
      { color: "#9b8aba" },
    ],
  },
  {
    id: "seaside-ledger",
    name: "海边账本",
    description: "青、靛蓝、陶橙，识别更轻快",
    colors: [
      { color: "#78a5a5" },
      { color: "#8799cf" },
      { color: "#c89573" },
      { color: "#969764" },
      { color: "#a27a96" },
    ],
  },
  {
    id: "garden-receipt",
    name: "花园票据",
    description: "草绿、湖蓝、玫瑰，温柔偏鲜明",
    colors: [
      { color: "#88a978" },
      { color: "#789fc0" },
      { color: "#c88898" },
      { color: "#ad915f" },
      { color: "#9286ba" },
    ],
  },
];
const presetFamilyVisuals = familyPalettePresets.map((palette) => palette.colors).flat();
const familyColorChoices = [
  { color: "#7eab98" },
  { color: "#849fcd" },
  { color: "#c88f8d" },
  { color: "#b9a064" },
  { color: "#9b8aba" },
  { color: "#78a5a5" },
  { color: "#c89573" },
  { color: "#a27a96" },
];
const defaultCategories = ["交通", "住宿", "餐饮", "门票", "购物", "其他"];
// 空状态插画：复用 favicon 的三个交叠圆母题（三家庭色，低饱和）
const emptyStateArt = `<svg class="empty-state-art" viewBox="0 0 96 64" aria-hidden="true" focusable="false"><circle cx="38" cy="26" r="17" fill="#bddbc8" opacity="0.6"/><circle cx="58" cy="25" r="17" fill="#cbd9ef" opacity="0.6"/><circle cx="48" cy="39" r="17" fill="#f2cfce" opacity="0.55"/></svg>`;
const splitModeOptions = [
  { id: "all", label: "全部家庭", description: "按人数自动分摊" },
  { id: "families", label: "指定家庭", description: "只让选中的家庭参与" },
  { id: "custom", label: "自定金额", description: "逐家填写承担金额" },
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
  syncStatusLabel: document.querySelector("#syncStatusLabel"),
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
  mobilePanelSwitch: document.querySelector("#mobilePanelSwitch"),
  mobileEntryTab: document.querySelector("#mobileEntryTab"),
  mobileDataTab: document.querySelector("#mobileDataTab"),
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
  submitButton: document.querySelector("#submitButton"),
  submitButtonLabel: document.querySelector("#submitButtonLabel"),
  categoryForm: document.querySelector("#categoryForm"),
  newCategoryInput: document.querySelector("#newCategoryInput"),
  settingsCategoryForm: document.querySelector("#settingsCategoryForm"),
  settingsNewCategoryInput: document.querySelector("#settingsNewCategoryInput"),
  categoryChips: document.querySelector("#categoryChips"),
  splitScope: document.querySelector("#splitScope"),
  splitScopeToggle: document.querySelector("#splitScopeToggle"),
  splitScopeSummary: document.querySelector("#splitScopeSummary"),
  splitScopePanel: document.querySelector("#splitScopePanel"),
  splitModeButtons: document.querySelector("#splitModeButtons"),
  splitDetailArea: document.querySelector("#splitDetailArea"),
  splitFamilyChoices: document.querySelector("#splitFamilyChoices"),
  splitCustomAmounts: document.querySelector("#splitCustomAmounts"),
  settingsCategoryChips: document.querySelector("#settingsCategoryChips"),
  settingsFamilyList: document.querySelector("#settingsFamilyList"),
  settingsThemeList: document.querySelector("#settingsThemeList"),
  settingsPaletteList: document.querySelector("#settingsPaletteList"),
  settingsFamilyColorList: document.querySelector("#settingsFamilyColorList"),
  ledgerNameForm: document.querySelector("#ledgerNameForm"),
  currentLedgerNameInput: document.querySelector("#currentLedgerNameInput"),
  saveLedgerNameButton: document.querySelector("#saveLedgerNameButton"),
  settingsOperatorForm: document.querySelector("#settingsOperatorForm"),
  settingsOperatorInput: document.querySelector("#settingsOperatorInput"),
  operatorModalView: document.querySelector("#operatorModalView"),
  operatorModalForm: document.querySelector("#operatorModalForm"),
  operatorModalInput: document.querySelector("#operatorModalInput"),
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
let activatingSplitMode = "";
let deactivatingSplitMode = "";
const activatingSplitFamilyIds = new Set();
const deactivatingSplitFamilyIds = new Set();
let lastAddedExpenseId = "";
let expandedExpenseId = "";
let lastAddedCategory = "";
let activatingPayerId = "";
let deactivatingPayerId = "";
let activatingCategory = "";
let deactivatingCategory = "";
let editingExpenseId = "";
let toastTimer = 0;
let settingsCloseTimer = 0;
let ledgerManagementCloseTimer = 0;
let ledgerSwitchTimer = 0;
let mobilePanelSwitchTimer = 0;
let mobilePanelIndicatorTimer = 0;
let barMorphTimer = 0;
let ledgerMorphTimer = 0;
let barFlipAnimations = [];
let barFlipRunId = 0;
let editReturnState = null;
let editFormSnapshot = null;
let totalAmountText = "";
let totalAmountSwapTimer = 0;
let hasPlayedInitialTotalReveal = false;
let totalRevealFrameId = 0;
let totalRevealTargetText = "";
let amountLabelScrollFrameId = 0;
let cloudState = loadCloudState();
/* 启动瞬间本地是否有数据：Safari ITP 可能清掉 localStorage，
   为空且 IndexedDB 里还留有云凭据备份时走自动恢复（见 bootstrap）。 */
const bootHadLocalData = (() => {
  try {
    return Boolean(localStorage.getItem(STORAGE_KEY));
  } catch (error) {
    return true;
  }
})();
let cloudBusy = false;
let syncStatusWasSyncing = false;
let syncLampTimer = 0;
/* 同步中至少展示时长：快速同步不足此时长时挂起收尾渲染，避免状态“闪一下” */
const SYNC_MIN_VISIBLE_MS = 800;
let syncShownAt = 0;
let syncHoldTimer = 0;
let cloudReady = false;
let pendingSettingsSync = 0;
let confirmResolve = null;
let confirmCloseTimer = 0;
let settingsReturnFocus = null;
let ledgerManagementReturnFocus = null;
let confirmReturnFocus = null;
let activeMobilePanel = "entry";

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
  const savedCategories = Array.isArray(raw.categories) ? raw.categories : defaultCategories;
  const categories = normalizeCategories([...savedCategories, ...expenses.map((expense) => expense.category)]);
  const families = normalizeFamilies(raw.families || defaultFamilies);
  const familyVisuals = normalizeFamilyVisuals(raw.familyVisuals, families);

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : createId("ledger"),
    name: normalizeLedgerName(raw.name, fallbackName),
    families: families.map((family) => ({ ...family, visual: familyVisuals[family.id] })),
    familyVisuals,
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
    families: normalizeFamilies(defaultFamilies),
    familyVisuals: normalizeFamilyVisuals(),
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
  const shareTokenInUrl = getLedgerTokenFromLocation();
  
  let ledger;
  if (shareTokenInUrl) {
    ledger = appState.ledgers.find((item) => item.cloudShareToken === shareTokenInUrl);
  }
  
  if (!ledger) {
    const lastActive = appState.ledgers.find((item) => item.id === appState.activeLedgerId);
    if (lastActive && (shareTokenInUrl || !lastActive.cloudShareToken)) {
      ledger = lastActive;
    }
  }
  
  if (!ledger) {
    if (!shareTokenInUrl) {
      ledger = appState.ledgers.find((item) => !item.cloudShareToken);
      if (!ledger) {
        ledger = createEmptyLedger("旅行账本");
        appState.ledgers.push(ledger);
      }
    } else {
      ledger = appState.ledgers[0];
    }
  }

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
  const source = Array.isArray(families) ? families : [];
  const visualsById = Object.fromEntries(source.map((family) => [family?.id, family?.visual]).filter(([id]) => typeof id === "string"));
  return defaultFamilies.map((family) => {
    const visual = normalizeFamilyVisual(visualsById[family.id] || defaultFamilyVisuals[family.id]);
    return { ...family, visual };
  });
}

function normalizeFamilyVisuals(visuals = {}, families = defaultFamilies) {
  const source = visuals && typeof visuals === "object" && !Array.isArray(visuals) ? visuals : {};
  const familyVisualsFromRows = Object.fromEntries(
    (Array.isArray(families) ? families : [])
      .map((family) => [family?.id, family?.visual])
      .filter(([id, visual]) => typeof id === "string" && visual && typeof visual === "object"),
  );

  return Object.fromEntries(
    defaultFamilies.map((family, index) => {
      const visual = source[family.id] || familyVisualsFromRows[family.id] || defaultFamilyVisuals[family.id] || presetFamilyVisuals[index % presetFamilyVisuals.length];
      return [family.id, normalizeFamilyVisual(visual)];
    }),
  );
}

function normalizeFamilyVisual(visual = {}) {
  const fallback = defaultFamilyVisuals["family-a"];
  const color = normalizeHexColor(visual.color, fallback.color);
  const derived = deriveFamilyVisual(color);
  return {
    color,
    gradient: normalizeHexColor(visual.gradient, derived.gradient),
    text: normalizeHexColor(visual.text, derived.text),
    soft: normalizeCssColor(visual.soft, derived.soft),
    wash: normalizeCssColor(visual.wash, derived.wash),
  };
}

function deriveFamilyVisual(baseColor) {
  const color = normalizeHexColor(baseColor, "#7eab98");
  return {
    color,
    gradient: mixHexColors(color, "#ffffff", 0.42),
    text: mixHexColors(color, "#000000", 0.50),
    soft: colorWithAlpha(color, 0.60),
    wash: colorWithAlpha(color, 0.16),
  };
}

function normalizeHexColor(value, fallback) {
  const color = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : fallback;
}

function normalizeCssColor(value, fallback) {
  const color = String(value || "").trim();
  return color ? color : fallback;
}

function syncFamilyVisualRows() {
  const visuals = normalizeFamilyVisuals(state.familyVisuals, state.families);
  state.familyVisuals = visuals;
  state.families = normalizeFamilies(state.families).map((family) => ({ ...family, visual: visuals[family.id] }));
}

function serializeFamiliesForCloud() {
  syncFamilyVisualRows();
  return state.families.map((family) => ({
    id: family.id,
    name: family.name,
    visual: state.familyVisuals[family.id],
  }));
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
  const merged = categories.map((category) => String(category).trim()).filter(Boolean);
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

function normalizeOperator(val) {
  if (!val) return null;
  if (typeof val === "object") {
    const name = String(val.name || "").trim();
    return name ? { name } : null;
  }
  const name = String(val).trim();
  return name ? { name } : null;
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
    createdBy: normalizeOperator(expense.createdBy),
    updatedBy: normalizeOperator(expense.updatedBy),
    syncState: normalizeExpenseSyncState(expense.syncState),
    isDeleted: Boolean(expense.isDeleted),
    updatedAt: expense.updatedAt || new Date().toISOString(),
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

function getActiveExpenses(expenses = state.expenses) {
  return (Array.isArray(expenses) ? expenses : []).filter((expense) => !expense.isDeleted);
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
  mirrorCloudBackup();
}

/* ---------- IndexedDB 云凭据备份 ----------
   localStorage 可能被 Safari ITP 清掉；把当前账本的云 shareToken
   镜像到 IndexedDB（清理策略更宽松），本地数据丢失时能自动从云端拉回。 */
const IDB_BACKUP_DB = "travel-ledger-backup";
const IDB_BACKUP_STORE = "kv";

function idbBackupStore(mode) {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error("no idb"));
    const request = indexedDB.open(IDB_BACKUP_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(IDB_BACKUP_STORE);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(IDB_BACKUP_STORE, mode);
      tx.oncomplete = () => db.close();
      tx.onabort = () => db.close();
      resolve(tx.objectStore(IDB_BACKUP_STORE));
    };
  });
}

async function idbBackupGet(key) {
  const store = await idbBackupStore("readonly");
  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbBackupSet(key, value) {
  const store = await idbBackupStore("readwrite");
  store.put(value, key);
}

function mirrorCloudBackup() {
  const payload = cloudState.shareToken
    ? { shareToken: cloudState.shareToken, ledgerName: state.name, savedAt: new Date().toISOString() }
    : null;
  idbBackupSet("cloud-credentials", payload).catch(() => {
    /* 私密模式等场景 IndexedDB 不可用，跳过备份 */
  });
}

async function restoreLedgerFromCloudBackup() {
  if (bootHadLocalData) return false;
  if (!isCloudConfigured() || cloudState.shareToken) return false;
  let backup = null;
  try {
    backup = await idbBackupGet("cloud-credentials");
  } catch (error) {
    return false;
  }
  if (!backup?.shareToken) return false;
  cloudState.shareToken = backup.shareToken;
  const restored = await pullCloudLedger();
  if (restored) {
    showToast({ message: "本地数据被浏览器清理，已从云端恢复账本" });
  } else {
    cloudState.shareToken = "";
  }
  return restored;
}

function isCloudConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes("填"));
}

function isCloudLedgerActive() {
  return isCloudConfigured() && Boolean(cloudState.shareToken);
}

function getSyncSummary() {
  if (!isCloudConfigured()) {
    return { state: "local", label: "本地账本", detail: "未启用云同步", pending: 0, failed: 0 };
  }
  if (!isCloudLedgerActive()) {
    return { state: "local-ready", label: "本地账本", detail: "可创建云账本", pending: 0, failed: 0 };
  }
  const pending = state.expenses.filter((expense) => normalizeExpenseSyncState(expense.syncState) === "pending").length;
  const failed = state.expenses.filter((expense) => normalizeExpenseSyncState(expense.syncState) === "failed").length;
  if (cloudBusy) return { state: "syncing", label: "云账本同步中", detail: "正在保存或拉取最新数据", pending, failed };
  if (failed) return { state: "failed", label: "同步失败待重试", detail: `${failed} 笔账单稍后会自动重试`, pending, failed };
  if (pending) return { state: "pending", label: "待同步", detail: `${pending} 笔账单等待网络恢复`, pending, failed };
  const pulledAt = cloudState.lastPulledAt ? `上次同步 ${formatUpdatedAt(cloudState.lastPulledAt)}` : "云端已启用";
  return { state: "synced", label: "云账本已同步", detail: pulledAt, pending, failed };
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
  const families = normalizeFamilies(ledger.families || defaultFamilies);
  const familyVisuals = normalizeFamilyVisuals(ledger.family_visuals || ledger.familyVisuals, families);

  return {
    name: normalizeRemoteLedgerName(ledger.name),
    families: families.map((family) => ({ ...family, visual: familyVisuals[family.id] })),
    familyVisuals,
    familyMembers: normalizeFamilyMembers(familyMembers),
    categories: normalizeCategories([...categories, ...expenses.map((expense) => expense.category)]),
    updatedAt: ledger.updated_at || new Date().toISOString(),
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
        createdBy: normalizeOperator(expense.created_by),
        updatedBy: normalizeOperator(expense.updated_by),
        syncState: "synced",
        isDeleted: Boolean(expense.is_deleted),
        updatedAt: expense.updated_at || new Date().toISOString(),
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
    const remote = normalizeRemotePayload(payload);

    // LWW Merge for settings
    if (state.updatedAt && remote.updatedAt < state.updatedAt) {
      remote.name = state.name;
      remote.families = state.families;
      remote.familyVisuals = state.familyVisuals;
      remote.familyMembers = state.familyMembers;
      remote.categories = state.categories;
      remote.updatedAt = state.updatedAt;
    }

    // LWW Merge for expenses
    const localExpensesMap = new Map(state.expenses.map((e) => [e.id, e]));
    const mergedExpenses = remote.expenses.map((remoteExpense) => {
      const localExpense = localExpensesMap.get(remoteExpense.id);
      if (localExpense && localExpense.updatedAt > remoteExpense.updatedAt) {
        return localExpense; // Local is newer
      }
      localExpensesMap.delete(remoteExpense.id);
      return remoteExpense; // Remote is newer or equal
    });

    for (const localExpense of localExpensesMap.values()) {
      if (["pending", "failed"].includes(normalizeExpenseSyncState(localExpense.syncState))) {
        mergedExpenses.push(localExpense);
      }
    }

    remote.expenses = mergedExpenses;
    replaceActiveLedger({
      ...state,
      ...remote,
      id: state.id,
      cloudShareToken: cloudState.shareToken,
    });
    cloudReady = true;
    cloudState.lastPulledAt = new Date().toISOString();
    saveCloudState();
    render({ skipCloudSave: true, animateFinancialChanges: announce && hasPlayedInitialTotalReveal });
    if (announce) showToast({ message: "已同步云账本" });
    const unsyncedExpenses = state.expenses.filter((expense) => ["pending", "failed"].includes(normalizeExpenseSyncState(expense.syncState)));
    if (unsyncedExpenses.length) syncPendingCloudExpenses({ silent: true }).catch(() => {});
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

let lastLifecycleRefreshAt = 0;

async function refreshCloudLedgerFromLifecycle() {
  if (!isCloudLedgerActive()) return;
  if (navigator.onLine === false) return;
  /* visibilitychange/online/pageshow 都会触发，30 秒内只拉一次 */
  const now = Date.now();
  if (now - lastLifecycleRefreshAt < 30_000) return;
  lastLifecycleRefreshAt = now;
  const synced = await syncPendingCloudExpenses({ silent: true });
  if (!synced) {
    showToast({ message: "还有账单未同步，先不覆盖本地账本" });
    return;
  }
  await pullCloudLedger();
}

async function handleManualCloudSync() {
  if (!isCloudConfigured()) {
    showToast({ message: "还需要填写 Supabase anon public key" });
    return;
  }
  if (!isCloudLedgerActive()) {
    showToast({ message: "先在设置里创建或加入云账本" });
    return;
  }
  if (cloudBusy) return;
  if (navigator.onLine === false) {
    showToast({ message: "当前离线，恢复网络后再同步" });
    return;
  }

  lastLifecycleRefreshAt = Date.now();
  window.clearTimeout(pendingSettingsSync);
  pendingSettingsSync = 0;
  cloudBusy = true;
  updateCloudControls();

  let settingsSynced = true;
  try {
    await syncCloudSettingsNow();
  } catch (error) {
    settingsSynced = false;
  }

  const expensesSynced = await syncPendingCloudExpenses({ silent: false });
  cloudBusy = false;
  updateCloudControls();

  if (!settingsSynced || !expensesSynced) {
    showToast({ message: "还有内容未同步，先保留本地账本" });
    return;
  }

  await pullCloudLedger({ announce: true });
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
    checkOperatorNamePrompt();
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
  showToast({ message: isLocalUrl ? "已复制本机测试链接，请不要直接发给家人" : "邀请链接已复制，可发给家人一起记账" });
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
  state.updatedAt = new Date().toISOString();
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
  syncFamilyVisualRows();
  const basePayload = {
    p_share_token: cloudState.shareToken,
    p_categories: state.categories,
    p_family_members: state.familyMembers,
    p_updated_at: state.updatedAt,
  };
  const namePayload = {
    ...basePayload,
    p_name: state.name,
  };
  const visualPayload = {
    ...namePayload,
    p_families: serializeFamiliesForCloud(),
  };

  try {
    await supabaseRpc("update_travel_ledger_settings", visualPayload);
  } catch (error) {
    if (!isSettingsRpcCompatibilityError(error)) throw error;
    try {
      await supabaseRpc("update_travel_ledger_settings", namePayload);
    } catch (fallbackError) {
      if (!isSettingsRpcCompatibilityError(fallbackError)) throw fallbackError;
      await supabaseRpc("update_travel_ledger_settings", basePayload);
    }
  }
}

function isSettingsRpcCompatibilityError(error) {
  const message = String(error?.message || error || "");
  return message.includes("p_name") || message.includes("p_families") || message.includes("schema cache") || message.includes("PGRST202");
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
    p_created_by: expense.createdBy || null,
    p_updated_by: expense.updatedBy || null,
    p_is_deleted: Boolean(expense.isDeleted),
    p_updated_at: expense.updatedAt,
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
  const syncing = isCloudLedgerActive() && cloudBusy && !forcedStatus;
  if (forcedStatus) {
    /* 错误态直出：不参与最短展示，并取消挂起的收尾渲染以免稍后覆盖错误提示 */
    window.clearTimeout(syncHoldTimer);
    syncHoldTimer = 0;
    renderCloudControls(forcedStatus);
    return;
  }
  if (syncing) {
    window.clearTimeout(syncHoldTimer);
    syncHoldTimer = 0;
    /* 仅在真正的进入边沿记时；hold 期间再次开始同步不重置，灯持续亮 */
    if (!syncStatusWasSyncing) syncShownAt = Date.now();
    renderCloudControls("");
    return;
  }
  if (syncStatusWasSyncing && !prefersReducedMotion()) {
    const remain = SYNC_MIN_VISIBLE_MS - (Date.now() - syncShownAt);
    if (remain > 0) {
      window.clearTimeout(syncHoldTimer);
      syncHoldTimer = window.setTimeout(() => {
        syncHoldTimer = 0;
        renderCloudControls("");
      }, remain);
      return;
    }
  }
  window.clearTimeout(syncHoldTimer);
  syncHoldTimer = 0;
  renderCloudControls("");
}

function renderCloudControls(forcedStatus = "") {
  const configured = isCloudConfigured();
  const active = isCloudLedgerActive();
  const syncing = active && cloudBusy && !forcedStatus;
  const syncSummary = getSyncSummary();
  elements.syncStatus.classList.toggle("is-cloud", active && !forcedStatus);
  elements.syncStatus.classList.toggle("is-error", Boolean(forcedStatus));
  elements.syncStatus.classList.toggle("is-pending", !forcedStatus && syncSummary.state === "pending");
  elements.syncStatus.classList.toggle("is-failed", !forcedStatus && syncSummary.state === "failed");
  elements.syncStatus.classList.toggle("is-syncing", syncing);
  elements.syncStatus.setAttribute("aria-disabled", String(!active || cloudBusy));
  elements.syncStatus.setAttribute("aria-busy", String(syncing));
  elements.syncStatus.setAttribute("title", syncSummary.detail);
  elements.syncStatus.setAttribute("aria-label", active ? `同步云账本，${syncSummary.detail}` : syncSummary.detail);
  if (syncStatusWasSyncing && !syncing && active && !forcedStatus) playSyncLampIgnite();
  syncStatusWasSyncing = syncing;
  const nextLabel = forcedStatus || syncSummary.label;
  if (elements.syncStatusLabel.textContent !== nextLabel) {
    elements.syncStatusLabel.textContent = nextLabel;
    if (!prefersReducedMotion()) {
      elements.syncStatusLabel.classList.remove("is-label-swap");
      void elements.syncStatusLabel.offsetWidth;
      elements.syncStatusLabel.classList.add("is-label-swap");
    }
  }
  elements.createCloudLedgerButton.hidden = active;
  elements.createCloudLedgerButton.disabled = cloudBusy;
  elements.copyShareLinkButton.hidden = !active;
  elements.copyShareLinkButton.disabled = cloudBusy;
  if (elements.storageModeLabel) {
    elements.storageModeLabel.textContent = active ? syncSummary.label : configured ? "当前浏览器" : "当前浏览器";
  }
}

function playSyncLampIgnite() {
  if (prefersReducedMotion()) return;
  window.clearTimeout(syncLampTimer);
  elements.syncStatus.classList.remove("is-just-synced");
  void elements.syncStatus.offsetWidth;
  elements.syncStatus.classList.add("is-just-synced");
  /* 820ms > sync-lamp-overshoot 720ms，动画播完后再摘类，随后灯保持常亮 */
  syncLampTimer = window.setTimeout(() => {
    elements.syncStatus.classList.remove("is-just-synced");
    syncLampTimer = 0;
  }, 820);
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
  return state?.familyVisuals?.[familyId] || state?.families?.find((family) => family.id === familyId)?.visual || defaultFamilyVisuals[familyId] || defaultFamilyVisuals[defaultFamilies[0].id];
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

// HTML 上下文用：emoji 是装饰，读屏跳过，只读类别名。
function categoryLabelHtml(category) {
  const visual = getCategoryVisual(category);
  return `<span aria-hidden="true">${visual.emoji}</span> ${escapeHtml(category)}`;
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

  const performUpdate = () => {
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
    renderMobilePanelState();
    renderMobileSubmitBar();
    applySelectedFamilyTheme();
    applySubmitButtonTheme();
    updateAmountMotionState();
    saveState();
  };

  if (document.startViewTransition && animateFinancialChanges) {
    document.startViewTransition(performUpdate);
  } else {
    performUpdate();
  }
}

function springSamples({ stiffness, damping, mass = 1 }, epsilon = 0.005) {
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const settle = Math.log(1 / epsilon) / (zeta * w0);
  const duration = Math.min(900, Math.max(250, settle * 1000));
  const count = Math.max(24, Math.min(96, Math.round(duration / 8)));
  const values = [];

  for (let i = 0; i <= count; i++) {
    const t = (settle * i) / count;
    if (zeta < 1) {
      const wd = w0 * Math.sqrt(1 - zeta * zeta);
      values.push(1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t)));
    } else {
      values.push(1 - Math.exp(-w0 * t));
    }
  }

  values[count] = 1;
  return { values, duration };
}

function cancelBarFlip() {
  barFlipRunId += 1;
  barFlipAnimations.forEach((animation) => animation.cancel());
  barFlipAnimations = [];
  document.querySelectorAll(".bar-morph-glow").forEach((node) => node.remove());
}

function clearBarMorphState() {
  elements.mobileSubmitBar.classList.remove("is-flip-morphing", "is-bar-morphing-to-data", "is-bar-morphing-to-entry");
}

function spawnSummaryGhost(rect) {
  if (!rect.width) return;

  document.querySelectorAll(".bar-summary-ghost").forEach((ghost) => ghost.remove());
  const ghost = document.createElement("span");
  ghost.className = "bar-summary-ghost";
  ghost.textContent = elements.mobileSubmitSummary.textContent;
  ghost.style.left = `${rect.left}px`;
  ghost.style.top = `${rect.top}px`;
  ghost.style.maxWidth = `${rect.width}px`;
  document.body.appendChild(ghost);
  ghost.addEventListener("animationend", () => ghost.remove());
  window.setTimeout(() => {
    if (ghost.isConnected) ghost.remove();
  }, 400);
}

/*
 * A soft themed halo that lives OUTSIDE the transformed bar (fixed-position, not
 * a child), so the FLIP's non-uniform scale never shears it. On collapse it
 * ramps up as the shape becomes a circle — the button "lights up" as it forms —
 * and finishes with the FLIP, so it reads as part of the same colour/shape
 * morph instead of a second glow pass after landing. On expand it eases away as
 * the pill stretches open.
 */
function spawnBarMorphGlow(rect, toData, duration) {
  if (!rect.width || !rect.height) return null;

  document.querySelectorAll(".bar-morph-glow").forEach((node) => node.remove());
  const glow = document.createElement("span");
  glow.className = "bar-morph-glow";
  glow.style.left = `${rect.left}px`;
  glow.style.top = `${rect.top}px`;
  glow.style.width = `${rect.width}px`;
  glow.style.height = `${rect.height}px`;
  document.body.appendChild(glow);

  let frames;
  let total;
  if (toData) {
    total = duration;
    frames = [
      { offset: 0, opacity: 0, transform: "scale(0.68)" },
      { offset: 0.24, opacity: 0.10, transform: "scale(0.86)" },
      { offset: 0.58, opacity: 0.24, transform: "scale(1.05)" },
      { offset: 0.78, opacity: 0.18, transform: "scale(1.12)" },
      { offset: 0.92, opacity: 0, transform: "scale(1.22)" },
      { offset: 1, opacity: 0, transform: "scale(1.30)" },
    ];
  } else {
    total = Math.round(duration * 0.8);
    frames = [
      { offset: 0, opacity: 1, transform: "scale(1)" },
      { offset: 1, opacity: 0, transform: "scale(1.12)" },
    ];
  }

  const animation = glow.animate(frames, {
    duration: total,
    easing: toData ? "cubic-bezier(0.4, 0, 0.2, 1)" : "cubic-bezier(0.4, 0, 0.7, 1)",
    fill: "forwards",
  });
  const cleanup = () => glow.remove();
  animation.onfinish = cleanup;
  animation.oncancel = cleanup;
  window.setTimeout(() => {
    if (glow.isConnected) glow.remove();
  }, total + 150);
  return animation;
}

function barArcLift(offset) {
  const lift = -BAR_ARC_LIFT_PX * Math.sin(Math.PI * offset);
  const landing = offset < 0.68 ? 0 : Math.sin(((offset - 0.68) / 0.32) * Math.PI);
  return lift + BAR_ARC_REBOUND_PX * landing;
}

function animateBarFlip(nextPanel) {
  const bar = elements.mobileSubmitBar;
  const button = elements.mobileSubmitButton;
  const summary = elements.mobileSubmitSummary;
  const toData = nextPanel === "data";
  const flipRunId = barFlipRunId + 1;
  const firstBar = bar.getBoundingClientRect();
  const firstButton = button.getBoundingClientRect();
  const firstSummary = summary.getBoundingClientRect();

  cancelBarFlip();
  barFlipRunId = flipRunId;
  bar.classList.add("is-flip-morphing");
  bar.classList.remove("is-bar-morphing-to-data", "is-bar-morphing-to-entry");
  void bar.offsetWidth;
  bar.classList.add(toData ? "is-bar-morphing-to-data" : "is-bar-morphing-to-entry");
  document.body.classList.toggle("mobile-panel-entry", !toData);
  document.body.classList.toggle("mobile-panel-data", toData);

  const lastBar = bar.getBoundingClientRect();
  const lastButton = button.getBoundingClientRect();
  if (!firstBar.width || !lastBar.width || !firstButton.width || !lastButton.width) {
    clearBarMorphState();
    return;
  }

  const { values, duration } = springSamples(toData ? SPRING_BAR_COLLAPSE : SPRING_BAR_EXPAND);
  const relX = lastButton.left - lastBar.left;
  const relY = lastButton.top - lastBar.top;
  const barFrames = [];
  const buttonFrames = [];

  values.forEach((progress, index) => {
    const offset = index / (values.length - 1);
    const width = firstBar.width + (lastBar.width - firstBar.width) * progress;
    const height = firstBar.height + (lastBar.height - firstBar.height) * progress;
    const x = firstBar.left + (lastBar.left - firstBar.left) * progress;
    const y = firstBar.top + (lastBar.top - firstBar.top) * progress;
    const scaleX = width / lastBar.width;
    const scaleY = height / lastBar.height;
    const translateX = x - lastBar.left;
    const translateY = y - lastBar.top;
    const arcLift = barArcLift(offset);
    barFrames.push({ offset, transform: `translate(${translateX}px, ${translateY + arcLift}px) scale(${scaleX}, ${scaleY})` });

    if (toData) {
      // Collapse has one geometry carrier: the outer bar. Let the button ride
      // that transform instead of taking a second, desynchronizable FLIP path.
      buttonFrames.push({ offset, transform: "translate(0px, 0px) scale(1)" });
      return;
    }

    const buttonWidth = firstButton.width + (lastButton.width - firstButton.width) * progress;
    const buttonHeight = firstButton.height + (lastButton.height - firstButton.height) * progress;
    const buttonX = firstButton.left + (lastButton.left - firstButton.left) * progress;
    const buttonY = firstButton.top + (lastButton.top - firstButton.top) * progress;
    const childScaleX = buttonWidth / (scaleX * lastButton.width);
    const childScaleY = buttonHeight / (scaleY * lastButton.height);
    const childTranslateX = (buttonX - lastBar.left - translateX) / scaleX - relX;
    const childTranslateY = (buttonY - lastBar.top - translateY) / scaleY - relY;
    buttonFrames.push({ offset, transform: `translate(${childTranslateX}px, ${childTranslateY}px) scale(${childScaleX}, ${childScaleY})` });
  });

  const options = { duration, easing: "linear", fill: "none", composite: "replace" };
  const animationStart = performance.now();
  const barAnimation = bar.animate(barFrames, options);
  const buttonAnimation = button.animate(buttonFrames, options);
  barFlipAnimations = [barAnimation, buttonAnimation];

  const glowAnimation = spawnBarMorphGlow(toData ? lastBar : firstBar, toData, duration);
  if (glowAnimation) barFlipAnimations.push(glowAnimation);

  if (toData) {
    spawnSummaryGhost(firstSummary);
  } else {
    barFlipAnimations.push(summary.animate(
      [
        { opacity: 0, transform: "translateX(-14px)" },
        { opacity: 1, transform: "translateX(0)" },
      ],
      { duration: 240, delay: 180, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)", fill: "backwards" }
    ));
  }

  const cleanupFlip = () => {
    if (barFlipRunId !== flipRunId || !barFlipAnimations.includes(barAnimation)) return;
    clearBarMorphState();
    barFlipAnimations = [];
  };
  barAnimation.onfinish = () => {
    const remaining = duration - (performance.now() - animationStart);
    if (remaining > 40) {
      window.setTimeout(cleanupFlip, remaining);
    } else {
      cleanupFlip();
    }
  };
  window.setTimeout(cleanupFlip, duration + 80);
}

function setMobilePanel(panel, options = {}) {
  const nextPanel = panel === "data" ? "data" : "entry";
  const panelChanged = activeMobilePanel !== nextPanel;
  const visualPanel = document.body.classList.contains("mobile-panel-data") ? "data" : "entry";
  const visualChanged = visualPanel !== nextPanel;
  if (nextPanel === "data" && elements.expenseForm.contains(document.activeElement)) {
    document.activeElement.blur();
  }
  const canAnimate = options.animate && !prefersReducedMotion();
  const shouldAnimatePanel = panelChanged && canAnimate;
  const shouldAnimateChrome = (panelChanged || visualChanged) && canAnimate;

  window.clearTimeout(mobilePanelSwitchTimer);
  window.clearTimeout(mobilePanelIndicatorTimer);
  window.clearTimeout(barMorphTimer);
  elements.ledgerView.classList.remove("is-mobile-panel-switching-out", "is-mobile-panel-switching-in");
  elements.ledgerView.dataset.switchDirection = nextPanel === "data" ? "forward" : "backward";

  /* liquid-glass indicator slide — cleared after keyframes complete */
  elements.mobilePanelSwitch?.classList.remove("is-indicator-forward", "is-indicator-backward");

  /*
   * Slide the pill immediately on tap so it stays glued to the finger, rather
   * than waiting out the 150ms panel-fade before moving (that delay read as lag).
   */
  if (shouldAnimateChrome && elements.mobilePanelSwitch) {
    // force reflow so re-adding the class retriggers the keyframes
    void elements.mobilePanelSwitch.offsetWidth;
    elements.mobilePanelSwitch.classList.add(nextPanel === "data" ? "is-indicator-forward" : "is-indicator-backward");
    mobilePanelIndicatorTimer = window.setTimeout(() => {
      elements.mobilePanelSwitch.classList.remove("is-indicator-forward", "is-indicator-backward");
      mobilePanelIndicatorTimer = 0;
    }, MOTION_DELAYS.mobilePanelIndicator);
  }

  /*
   * Morph the submit bar immediately on tap (in parallel with the panel fade).
   * WAAPI-capable browsers use a FLIP spring so the expensive glass geometry is
   * laid out once, then the visible motion stays on transform.
   */
  const canFlipBar = typeof elements.mobileSubmitBar.animate === "function" && typeof elements.mobileSubmitButton.animate === "function";
  if (shouldAnimateChrome && canFlipBar) {
    animateBarFlip(nextPanel);
  } else if (shouldAnimateChrome) {
    cancelBarFlip();
    clearBarMorphState();
    /* Add the morph class BEFORE toggling the body mode class so the direction-
     * scoped geometry easing is already in effect when the geometry transition
     * starts. This remains as the no-WAAPI fallback path. */
    void elements.mobileSubmitBar.offsetWidth;
    elements.mobileSubmitBar.classList.add(nextPanel === "data" ? "is-bar-morphing-to-data" : "is-bar-morphing-to-entry");
    document.body.classList.toggle("mobile-panel-entry", nextPanel === "entry");
    document.body.classList.toggle("mobile-panel-data", nextPanel === "data");
    barMorphTimer = window.setTimeout(() => {
      elements.mobileSubmitBar.classList.remove("is-bar-morphing-to-data", "is-bar-morphing-to-entry");
      barMorphTimer = 0;
    }, MOTION_DELAYS.barMorph);
  } else {
    cancelBarFlip();
    clearBarMorphState();
  }

  const scrollToPanel = () => {
    if (!options.scroll) return;
    const target = nextPanel === "data" ? elements.ledgerSection : elements.entryPanel;
    window.requestAnimationFrame(() => {
      target?.scrollIntoView({ block: "start", behavior: options.behavior || "smooth" });
    });
  };

  const commitPanel = () => {
    activeMobilePanel = nextPanel;
    renderMobilePanelState();
    scrollToPanel();

    if (!shouldAnimatePanel) return;

    /* bar morph already started on tap (see setMobilePanel top) */

    elements.ledgerView.classList.remove("is-mobile-panel-switching-out");
    elements.ledgerView.classList.add("is-mobile-panel-switching-in");
    mobilePanelSwitchTimer = window.setTimeout(() => {
      elements.ledgerView.classList.remove("is-mobile-panel-switching-in");
      mobilePanelSwitchTimer = 0;
    }, MOTION_DELAYS.mobilePanelIn);
  };

  if (!shouldAnimatePanel) {
    commitPanel();
    return;
  }

  elements.ledgerView.classList.add("is-mobile-panel-switching-out");
  mobilePanelSwitchTimer = window.setTimeout(commitPanel, MOTION_DELAYS.mobilePanelOut);
}

function renderMobilePanelState() {
  elements.ledgerView.dataset.mobilePanel = activeMobilePanel;
  document.body.classList.toggle("mobile-panel-entry", activeMobilePanel === "entry");
  document.body.classList.toggle("mobile-panel-data", activeMobilePanel === "data");
  [
    [elements.mobileEntryTab, "entry"],
    [elements.mobileDataTab, "data"],
  ].forEach(([tab, panel]) => {
    if (!tab) return;
    const active = activeMobilePanel === panel;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
    tab.tabIndex = active ? 0 : -1;
  });
}

function handleMobilePanelSwitchKeydown(event) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const nextPanel = event.key === "ArrowLeft" || event.key === "Home" ? "entry" : "data";
  setMobilePanel(nextPanel, { animate: true });
  const nextTab = nextPanel === "entry" ? elements.mobileEntryTab : elements.mobileDataTab;
  nextTab.focus();
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

function classNames(...tokens) {
  return tokens.filter(Boolean).join(" ");
}

function renderFamilyChoiceButton(family, { dataName, extraClass = "", selected = false, activating = false, deactivating = false, singleSelect = false }) {
  // 单选组用 radio 语义（读屏播报"第 x 项，已选中"），多选保留 toggle 按钮语义。
  const stateAttr = singleSelect ? `role="radio" aria-checked="${selected}"` : `aria-pressed="${selected}"`;
  return `
    <button class="${classNames("family-tag", extraClass, selected && "is-selected", activating && "is-activating", deactivating && "is-deactivating")}" type="button" ${dataName}="${escapeHtml(family.id)}" style="${familyStyle(family.id)}" ${stateAttr}>
      <span>${escapeHtml(family.name)}</span>
    </button>
  `;
}

function renderFamilyRoster() {
  elements.familyRoster.innerHTML = state.families
    .map((family) => {
      const selected = family.id === state.selectedPayerId;
      return renderFamilyChoiceButton(family, {
        dataName: "data-payer-id",
        singleSelect: true,
        selected,
        activating: selected && family.id === activatingPayerId,
        deactivating: !selected && family.id === deactivatingPayerId,
      });
    })
    .join("");
}

function renderCategories() {
  const recentCategories = new Set(getRecentCategories(3));
  elements.categoryChips.innerHTML = state.categories
    .map((category) => {
      const isNew = category === lastAddedCategory;
      const selected = category === state.activeCategory;
      const recent = !selected && recentCategories.has(category);
      const activating = selected && category === activatingCategory;
      const deactivating = !selected && category === deactivatingCategory;
      return `
        <button class="${classNames("chip", "category-chip", "selectable-category-chip", selected && "is-selected", recent && "is-recent", isNew && "is-entering", activating && "is-activating", deactivating && "is-deactivating")}" type="button" data-category="${escapeHtml(category)}" style="${categoryStyle(category)}" role="radio" aria-checked="${selected}">
          <span>${categoryLabelHtml(category)}</span>
        </button>
      `;
    })
    .join("");
  scheduleCategoryEdgeFades();
}

let categoryFadeFrame = 0;

function scheduleCategoryEdgeFades() {
  if (categoryFadeFrame) return;
  categoryFadeFrame = window.requestAnimationFrame(() => {
    categoryFadeFrame = 0;
    updateCategoryEdgeFades();
  });
}

// 按横滚位置切换两侧渐隐：只在该侧仍有内容可滚时显示（iOS 边缘行为）
function updateCategoryEdgeFades() {
  const el = elements.categoryChips;
  if (!el) return;
  const maxScroll = el.scrollWidth - el.clientWidth;
  const threshold = 2;
  el.classList.toggle("can-fade-start", el.scrollLeft > threshold);
  el.classList.toggle("can-fade-end", el.scrollLeft < maxScroll - threshold);
}

// 类别横滑到头的橡皮筋回弹：原生滚动触底后继续拖动/滚，用阻尼位移把整条类别带
// “拉出”一点，松手（或滚轮停）后平滑弹回。刻意收敛：位移小、阻力大、无过冲，
// 只是“到头了”的物理暗示，不做吸睛动效。触摸与触控板都支持。
function setupCategoryOverscroll(el) {
  if (!el) return;
  const LIMIT = 22; // 最大拉出距离（渐近上限）
  const RESIST = 190; // 阻尼系数：越大越“沉”
  const maxScroll = () => el.scrollWidth - el.clientWidth;
  const atStart = () => el.scrollLeft <= 0;
  const atEnd = () => el.scrollLeft >= maxScroll() - 0.5;
  // 累积越界量 raw → 渐近阻尼位移：拉得越多，增量越小，永不超过 LIMIT
  const damp = (r) => Math.sign(r) * LIMIT * (1 - 1 / (Math.abs(r) / RESIST + 1));

  let raw = 0; // 当前累积的越界拖动量（未阻尼，带正负）
  let settle = null; // 松手回弹动画

  const paint = () => {
    el.style.transform = raw ? `translateX(${damp(raw).toFixed(2)}px)` : "";
  };
  const cancelSettle = () => {
    if (settle) { settle.cancel(); settle = null; }
  };
  const springBack = () => {
    if (!raw) return;
    const from = damp(raw);
    raw = 0;
    el.style.transform = "";
    if (prefersReducedMotion()) { el.style.willChange = ""; return; }
    el.style.willChange = "transform";
    settle = el.animate(
      [{ transform: `translateX(${from.toFixed(2)}px)` }, { transform: "translateX(0)" }],
      { duration: 260, easing: "cubic-bezier(0.25, 0.8, 0.3, 1)" }
    );
    settle.onfinish = settle.oncancel = () => {
      el.style.willChange = "";
      settle = null;
    };
  };

  // ── 触摸拖动 ──
  let lastX = 0;
  let dragging = false;
  el.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    cancelSettle();
    paint();
    lastX = e.touches[0].clientX;
    dragging = true;
  }, { passive: true });

  el.addEventListener("touchmove", (e) => {
    if (!dragging || e.touches.length !== 1 || prefersReducedMotion()) return;
    const x = e.touches[0].clientX;
    const dx = x - lastX;
    lastX = x;
    if (raw > 0) { // 正从起点方向拉伸
      raw = Math.max(0, raw + dx);
      if (raw) e.preventDefault();
      paint();
    } else if (raw < 0) { // 正从末端方向拉伸
      raw = Math.min(0, raw + dx);
      if (raw) e.preventDefault();
      paint();
    } else if (atStart() && dx > 0) {
      raw = dx; e.preventDefault(); paint();
    } else if (atEnd() && dx < 0) {
      raw = dx; e.preventDefault(); paint();
    }
  }, { passive: false });

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    springBack();
  };
  el.addEventListener("touchend", endDrag, { passive: true });
  el.addEventListener("touchcancel", endDrag, { passive: true });

  // ── 触控板/滚轮（横向）──
  let wheelTimer = 0;
  el.addEventListener("wheel", (e) => {
    if (prefersReducedMotion()) return;
    const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : 0;
    if (!dx) return;
    const beyondStart = dx < 0 && atStart();
    const beyondEnd = dx > 0 && atEnd();
    if (raw === 0 && !beyondStart && !beyondEnd) return; // 常规滚动，放行
    e.preventDefault();
    cancelSettle();
    const next = raw - dx; // 位移方向与滚动相反
    raw = raw > 0 ? Math.max(0, next) : raw < 0 ? Math.min(0, next) : next;
    paint();
    window.clearTimeout(wheelTimer);
    wheelTimer = window.setTimeout(springBack, 110);
  }, { passive: false });
}

function getRecentCategories(limit = 3) {
  const categories = [];
  const sortedExpenses = [...state.expenses].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  for (const expense of sortedExpenses) {
    if (!state.categories.includes(expense.category) || categories.includes(expense.category)) continue;
    categories.push(expense.category);
    if (categories.length >= limit) break;
  }
  return categories;
}

function renderSplitScope() {
  ensureActiveSplitState();
  elements.splitScopeToggle.setAttribute("aria-expanded", String(splitScopeOpen));
  elements.splitScopeSummary.textContent = formatActiveSplitSummary();
  elements.splitScopePanel.classList.toggle("is-switching", splitScopeSwitching);
  elements.splitScopePanel.dataset.activeSplitMode = activeSplitMode;
  updateSplitScopePanelState();

  syncSplitModeButtons();
  elements.splitDetailArea.hidden = activeSplitMode === "all";
  elements.splitFamilyChoices.hidden = activeSplitMode !== "families";
  syncSplitFamilyChoices();
  elements.splitCustomAmounts.hidden = activeSplitMode !== "custom";
  syncSplitCustomAmounts();
  updateAmountFieldForSplitMode();
}

// 面板内的按钮结构固定，切换时只改类名/aria，不重建 DOM：
// 避免高度动画期间的布局抖动，也保住键盘用户的焦点。
function syncSplitModeButtons() {
  const container = elements.splitModeButtons;
  let buttons = [...container.querySelectorAll("[data-split-mode]")];
  if (buttons.length !== splitModeOptions.length || buttons.some((button, index) => button.dataset.splitMode !== splitModeOptions[index].id)) {
    container.innerHTML = splitModeOptions
      .map(
        (option) => `
        <button class="split-mode-button" type="button" data-split-mode="${escapeHtml(option.id)}" role="radio" aria-checked="false">
          <span>${escapeHtml(option.label)}</span>
          <small>${escapeHtml(option.description)}</small>
        </button>
      `,
      )
      .join("");
    buttons = [...container.querySelectorAll("[data-split-mode]")];
  }
  buttons.forEach((button) => {
    const id = button.dataset.splitMode;
    const selected = activeSplitMode === id;
    button.classList.toggle("is-selected", selected);
    button.classList.toggle("is-activating", selected && id === activatingSplitMode);
    button.classList.toggle("is-deactivating", !selected && id === deactivatingSplitMode);
    button.setAttribute("aria-checked", String(selected));
  });
}

function syncSplitFamilyChoices() {
  const container = elements.splitFamilyChoices;
  let buttons = [...container.querySelectorAll("[data-split-family]")];
  if (buttons.length !== state.families.length || buttons.some((button, index) => button.dataset.splitFamily !== state.families[index].id)) {
    container.innerHTML = state.families
      .map((family) => renderFamilyChoiceButton(family, { dataName: "data-split-family", extraClass: "split-family-chip" }))
      .join("");
    buttons = [...container.querySelectorAll("[data-split-family]")];
  }
  buttons.forEach((button) => {
    const id = button.dataset.splitFamily;
    const selected = activeSplitFamilyIds.includes(id);
    button.classList.toggle("is-selected", selected);
    button.classList.toggle("is-activating", activatingSplitFamilyIds.has(id));
    button.classList.toggle("is-deactivating", !selected && deactivatingSplitFamilyIds.has(id));
    button.setAttribute("aria-pressed", String(selected));
  });
}

function syncSplitCustomAmounts() {
  const container = elements.splitCustomAmounts;
  let inputs = [...container.querySelectorAll("[data-split-amount]")];
  if (inputs.length !== state.families.length || inputs.some((input, index) => input.dataset.splitAmount !== state.families[index].id)) {
    container.innerHTML = `
      ${state.families
        .map(
          (family) => `
          <label class="split-amount-row" style="${familyStyle(family.id)}">
            <span>${escapeHtml(family.name)}</span>
            <input type="text" inputmode="decimal" autocomplete="off" data-split-amount="${escapeHtml(family.id)}" placeholder="0.00" />
          </label>
        `,
        )
        .join("")}
      <p class="split-total-line"></p>
    `;
    inputs = [...container.querySelectorAll("[data-split-amount]")];
  }
  inputs.forEach((input) => {
    if (document.activeElement === input) return; // 正在输入时不回写，避免打断
    const amount = Number(activeSplitAmounts[input.dataset.splitAmount]) || 0;
    input.value = amount > 0 ? String(amount) : "";
  });
  const totalLine = container.querySelector(".split-total-line");
  if (totalLine) totalLine.textContent = formatCustomSplitTotalLine();
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
  // 等高度动画（--motion）跑完再真正 hidden，避免中途整块消失
  const delay = prefersReducedMotion() ? 0 : getCssDurationMs("--motion", 534) + 80;

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
    return totalCents ? `规则：自定承担 · ${formatMoney(totalCents)}` : "规则：自定承担";
  }

  if (activeSplitMode === "families") {
    if (!activeSplitFamilyIds.length) return "规则：指定家庭";
    const names = activeSplitFamilyIds.map(getFamilyName);
    return names.length > 2 ? `规则：${names.length}家按人数` : `规则：${names.join("、")}按人数`;
  }

  return "规则：全部家庭按人数";
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
  elements.amountInput.placeholder = "0.00";
  if (!isCustom) return;

  const totalCents = getActiveCustomSplitTotalCents();
  elements.amountInput.value = formatAmountInput(totalCents);
}

function renderSettings() {
  const summary = calculateSummary();
  const usedCategories = new Set(state.expenses.map((expense) => expense.category));
  const syncSummary = getSyncSummary();
  elements.currentLedgerNameInput.value = state.name;
  elements.settingsOperatorInput.value = localStorage.getItem("travel-ledger-operator-name") || "";
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
  renderPersonalizationSettings();

  elements.settingsCategoryChips.innerHTML = state.categories
    .map((category, index) => {
      const isDefault = defaultCategories.includes(category);
      const isUsed = usedCategories.has(category);
      const status = isUsed ? "使用中" : isDefault ? "预设" : "可删除";
      const removeButton = isUsed
        ? ""
        : `<button class="chip-icon-button chip-remove-button" type="button" data-remove-category="${escapeHtml(category)}" aria-label="删除 ${escapeHtml(category)}"><svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>`;
      const moveControls = `
        <button class="chip-icon-button" type="button" data-move-category="${escapeHtml(category)}" data-direction="-1" aria-label="上移 ${escapeHtml(category)}" ${index === 0 ? "disabled" : ""}><svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg></button>
        <button class="chip-icon-button" type="button" data-move-category="${escapeHtml(category)}" data-direction="1" aria-label="下移 ${escapeHtml(category)}" ${index === state.categories.length - 1 ? "disabled" : ""}><svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
      `;

      return `
        <span class="chip category-chip settings-category-chip" style="${categoryStyle(category)}">
          <span>${categoryLabelHtml(category)}</span>
          <small>${status}</small>
          ${moveControls}
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
    <div class="settings-data-item is-${escapeHtml(syncSummary.state)}">
      <span>同步状态</span>
      <strong>${escapeHtml(syncSummary.label)}</strong>
    </div>
    <div class="settings-data-item">
      <span>数据位置</span>
      <strong>${escapeHtml(syncSummary.detail)}</strong>
    </div>
  `;
}

function getActiveThemeId() {
  const current = document.documentElement.dataset.theme;
  return THEME_PRESETS.some((preset) => preset.id === current) ? current : THEME_PRESETS[0].id;
}

/* 让 Safari 状态栏/工具栏 tint 跟随应用内主题预设：
   把与当前明暗模式匹配的 theme-color meta 更新为主题实际背景色（--bg）。 */
function syncThemeColorMeta() {
  const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
  if (!bg) return;
  const isDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const meta = document.querySelector(`meta[name="theme-color"][media*="${isDark ? "dark" : "light"}"]`);
  meta?.setAttribute("content", bg);
}

function renderThemePresetList() {
  if (!elements.settingsThemeList) return;
  const activeThemeId = getActiveThemeId();
  elements.settingsThemeList.innerHTML = THEME_PRESETS
    .map((preset) => {
      const isSelected = preset.id === activeThemeId;
      return `
        <button class="theme-choice${isSelected ? " is-selected" : ""}" type="button" role="radio" data-theme-id="${escapeHtml(preset.id)}" aria-checked="${isSelected}">
          <span class="family-color-choice${isSelected ? " is-selected" : ""}" style="${familyVisualSwatchStyle({ color: preset.color })}" aria-hidden="true"></span>
          <small>${escapeHtml(preset.name)}</small>
        </button>
      `;
    })
    .join("");
}

function renderPersonalizationSettings() {
  renderThemePresetList();
  if (!elements.settingsPaletteList || !elements.settingsFamilyColorList) return;
  const detailsOpen = Boolean(elements.settingsFamilyColorList.querySelector(".family-color-details")?.open);
  syncFamilyVisualRows();
  const activePaletteId = getMatchedPaletteId();
  const presetColors = getFamilyColorChoices();

  elements.settingsPaletteList.innerHTML = familyPalettePresets
    .map((palette) => {
      const isActive = palette.id === activePaletteId;
      const primarySwatches = palette.colors.slice(0, state.families.length);
      const extraSwatches = palette.colors.slice(state.families.length);
      return `
        <button class="palette-card${isActive ? " is-active" : ""}" type="button" data-palette-id="${escapeHtml(palette.id)}" style="${paletteCardStyle(palette)}" aria-pressed="${isActive}">
          <span class="palette-card-copy">
            <strong>${escapeHtml(palette.name)}</strong>
            <small>${escapeHtml(palette.description)}</small>
          </span>
          <span class="palette-swatch-row" aria-hidden="true">
            ${primarySwatches.map((visual) => `<span class="palette-swatch is-primary" style="${familyVisualSwatchStyle(visual)}"></span>`).join("")}
            ${extraSwatches.map((visual) => `<span class="palette-swatch is-extra" style="${familyVisualSwatchStyle(visual)}"></span>`).join("")}
          </span>
        </button>
      `;
    })
    .join("");

  const customStatus = activePaletteId ? "当前跟随套装" : "当前为自定义组合";
  const familyRows = state.families
    .map((family) => {
      const activeVisual = getFamilyVisual(family.id);
      return `
        <div class="family-color-row" style="${familyStyle(family.id)}">
          <div class="family-color-label">
            <span class="family-color-current" style="${familyVisualSwatchStyle(activeVisual)}" aria-hidden="true"></span>
            <span>${escapeHtml(family.name)}</span>
          </div>
          <div class="family-color-options" aria-label="${escapeHtml(family.name)}主题色">
            ${presetColors
              .map((visual, index) => {
                const isSelected = activeVisual.color === visual.color;
                return `
                  <button class="family-color-choice${isSelected ? " is-selected" : ""}" type="button" data-family-color="${escapeHtml(family.id)}" data-color-index="${index}" style="${familyVisualSwatchStyle(visual)}" aria-label="将${escapeHtml(family.name)}设为${visual.color}" aria-pressed="${isSelected}"></button>
                `;
              })
              .join("")}
          </div>
        </div>
      `;
    })
    .join("");

  elements.settingsFamilyColorList.innerHTML = `
    <details class="family-color-details"${detailsOpen ? " open" : ""}>
      <summary>
        <span>逐家微调</span>
        <small>${customStatus}</small>
      </summary>
      <div class="family-color-detail-body">
        ${familyRows}
      </div>
    </details>
  `;
}

function getMatchedPaletteId() {
  return familyPalettePresets.find((palette) => paletteMatchesCurrentFamilies(palette))?.id || "";
}

function paletteMatchesCurrentFamilies(palette) {
  return state.families.every((family, index) => {
    const expected = normalizeFamilyVisual(palette.colors[index % palette.colors.length]);
    return getFamilyVisual(family.id).color === expected.color;
  });
}

function getFamilyColorChoices() {
  const seen = new Set();
  return familyColorChoices.map(normalizeFamilyVisual).filter((visual) => {
    if (seen.has(visual.color)) return false;
    seen.add(visual.color);
    return true;
  });
}

function paletteCardStyle(palette) {
  const accent = normalizeFamilyVisual(palette.colors[0]);
  return `--palette-accent: ${accent.color}; --palette-accent-text: ${accent.text};`;
}

function familyVisualSwatchStyle(visual) {
  const normalized = normalizeFamilyVisual(visual);
  return `--swatch-color: ${normalized.color}; --swatch-gradient: ${normalized.gradient}; --swatch-text: ${normalized.text};`;
}

function renderCurrentLedgerSummary(summary) {
  const syncSummary = getSyncSummary();
  const status = state.cloudShareToken ? syncSummary.label : "本地账本";
  return `
    <div class="current-ledger-card">
      <div>
        <span>${escapeHtml(status)}</span>
        <strong>${escapeHtml(state.name)}</strong>
      </div>
      <small>${state.expenses.length} 笔 · ${formatMoney(summary.totalCents)} · ${summary.totalMembers} 人 · ${escapeHtml(syncSummary.detail)}</small>
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
  const expenses = getActiveExpenses(Array.isArray(ledger.expenses) ? ledger.expenses : []);
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

function renderTotalAmount(nextText, shouldAnimate, options = {}) {
  if (options.revealOnEntry) {
    playInitialTotalReveal(nextText);
    return;
  }

  const previousText = totalAmountText || elements.totalAmount.textContent || nextText;
  totalAmountText = nextText;
  window.clearTimeout(totalAmountSwapTimer);
  cancelInitialTotalReveal();

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

function revealInitialTotalAmount() {
  renderTotalAmount(formatMoney(calculateSummary().totalCents), false, { revealOnEntry: true });
}

function playInitialTotalReveal(targetText) {
  if (hasPlayedInitialTotalReveal) {
    elements.totalAmount.textContent = targetText;
    totalAmountText = targetText;
    return;
  }

  hasPlayedInitialTotalReveal = true;
  totalRevealTargetText = targetText;
  totalAmountText = targetText;
  window.clearTimeout(totalAmountSwapTimer);
  cancelInitialTotalReveal();
  elements.totalAmount.classList.remove("is-soft-refresh");

  if (prefersReducedMotion()) {
    elements.totalAmount.classList.remove("is-scrambling");
    elements.totalAmount.textContent = targetText;
    return;
  }

  const glyphs = "0123456789¥#%*&@";
  const duration = 1450;
  const introDelay = 120;
  const stagger = 92;
  const growEvery = 112;
  const holdWindow = Math.max(260, duration - stagger * Math.max(targetText.length - 1, 0));
  const startedAt = window.performance.now() + introDelay;
  const targetChars = [...targetText];

  elements.totalAmount.classList.add("is-scrambling");
  elements.totalAmount.textContent = targetChars[0] || "";

  let scrambleFrameCount = 0;

  const renderFrame = (now) => {
    const elapsed = Math.max(0, now - startedAt);
    const isFinalFrame = elapsed >= duration || totalRevealTargetText !== targetText;

    /* 隔帧跳过：字符切换本身有节奏间隔，30fps 更新肉眼不可辨，减半 textContent 重排开销 */
    scrambleFrameCount += 1;
    if (!isFinalFrame && scrambleFrameCount % 2 !== 0) {
      totalRevealFrameId = window.requestAnimationFrame(renderFrame);
      return;
    }

    const visibleLength = Math.min(targetChars.length, Math.max(1, Math.floor(elapsed / growEvery) + 1));
    const nextText = targetChars
      .slice(0, visibleLength)
      .map((char, index) => {
        if (char === "," || char === "." || char === "¥") return char;
        const progress = Math.min(1, Math.max(0, (elapsed - index * stagger) / holdWindow));
        if (progress >= 1) return char;
        const slowdownProgress = Math.max(0, (progress - 0.5) / 0.5);
        const slowedProgress = easeOutCubic(slowdownProgress);
        const glyphInterval = 24 + slowedProgress * 126;
        const glyphIndex = Math.floor((elapsed / glyphInterval + index * 5 + slowedProgress * 3) % glyphs.length);
        return glyphs[glyphIndex];
      })
      .join("");

    elements.totalAmount.textContent = nextText;

    if (!isFinalFrame) {
      totalRevealFrameId = window.requestAnimationFrame(renderFrame);
      return;
    }

    elements.totalAmount.textContent = targetText;
    elements.totalAmount.classList.remove("is-scrambling");
    totalRevealFrameId = 0;
  };

  totalRevealFrameId = window.requestAnimationFrame(renderFrame);
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function cancelInitialTotalReveal() {
  if (totalRevealFrameId) {
    window.cancelAnimationFrame(totalRevealFrameId);
    totalRevealFrameId = 0;
  }
  elements.totalAmount.classList.remove("is-scrambling");
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
              <span>${categoryLabelHtml(category)}</span>
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
    elements.ledgerList.innerHTML = renderLedgerEmptyState("还没有账单", "记下第一笔，开始这次旅行。", enterClass);
    return;
  }

  if (!visibleExpenses.length) {
    elements.ledgerList.innerHTML = renderLedgerEmptyState(
      "没有符合筛选的账单",
      `<button class="secondary-button compact-button empty-state-action" type="button" data-clear-filter-empty>清除筛选</button>`,
      enterClass,
      { includeArt: false, suffixIsHtml: true },
    );
    return;
  }

  elements.ledgerList.innerHTML = groupExpensesByDate(visibleExpenses).map((group) => renderLedgerDayGroup(group, enterClass)).join("");
}

function renderLedgerEmptyState(message, suffix = "", enterClass = "", { includeArt = true, suffixIsHtml = false } = {}) {
  const suffixContent = suffixIsHtml ? suffix : suffix ? `<br><small>${escapeHtml(suffix)}</small>` : "";
  return `<div class="empty-state${enterClass}">${includeArt ? emptyStateArt : ""}${escapeHtml(message)}${suffixContent}</div>`;
}

function renderLedgerDayGroup(group, enterClass = "") {
  return `
    <section class="ledger-day-group${enterClass}">
      <div class="ledger-day-heading">
        <time datetime="${escapeHtml(group.date)}">${escapeHtml(formatLedgerDate(group.date))}</time>
        <strong>${formatLedgerMoney(group.totalCents)}</strong>
      </div>
      <div class="ledger-day-items">
        ${group.expenses.map(renderLedgerItem).join("")}
      </div>
    </section>
  `;
}

function renderLedgerItem(expense) {
  const isExpanded = expense.id === expandedExpenseId;
  const syncState = getExpenseSyncState(expense);
  const itemClass = classNames(
    "ledger-item",
    expense.id === lastAddedExpenseId && "is-entering",
    expense.id === editingExpenseId && "is-editing",
    isExpanded && "is-expanded",
    syncState && `is-sync-${syncState}`,
  );
  const syncBadge = syncState ? `<span class="ledger-sync-badge">${escapeHtml(formatExpenseSyncBadge(syncState))}</span>` : "";
  const syncLine = syncState ? `<small class="ledger-sync-state">${escapeHtml(formatExpenseSyncState(syncState))}</small>` : "";
  const expandCue = isExpanded ? `<span class="ledger-expand-cue" aria-hidden="true">收起</span>` : "";

  let metaHtml = "";
  if (isExpanded) {
    const createdName = expense.createdBy?.name || expense.createdBy;
    const updatedName = expense.updatedBy?.name || expense.updatedBy;
    
    let metaItems = "";
    if (createdName) {
      metaItems += `<span>✍️ 创建: ${escapeHtml(createdName)}</span>`;
    }
    if (updatedName && updatedName !== createdName) {
      metaItems += `<span>✏️ 更新: ${escapeHtml(updatedName)}</span>`;
    }
    if (metaItems) {
      metaHtml = `<div class="ledger-meta-info">${metaItems}</div>`;
    }
  }

  const transitionStyle = expense.id === lastAddedExpenseId ? "view-transition-name: expense-new" : "";
  const combinedStyle = [familyStyle(expense.payerId), transitionStyle].filter(Boolean).join(";");

  return `
    <article class="${itemClass}" style="${combinedStyle}" data-expense-id="${escapeHtml(expense.id)}" tabindex="0" aria-expanded="${isExpanded}" aria-label="${isExpanded ? "收起这笔账单" : "展开这笔账单"}">
      <div class="ledger-main">
        <div class="ledger-title">
          <span class="ledger-family">${escapeHtml(getFamilyName(expense.payerId))}</span>
          <span class="category-pill" style="${categoryStyle(expense.category)}">${categoryLabelHtml(expense.category)}</span>
          ${syncBadge}
        </div>
        <p class="ledger-note">${escapeHtml(expense.note || "无备注")}</p>
        <small class="ledger-scope">${escapeHtml(formatExpenseSplitSummary(expense))}</small>
        ${syncLine}
        ${metaHtml}
      </div>
      <time class="ledger-date" datetime="${escapeHtml(expense.date)}">${formatLedgerCardDate(expense.date)}</time>
      <strong class="ledger-amount">${formatLedgerMoney(expenseToCents(expense))}</strong>
      ${expandCue}
      <div class="ledger-item-actions">
        <button class="ledger-edit-button" type="button" data-edit-id="${escapeHtml(expense.id)}">编辑</button>
        <button class="delete-button" type="button" data-delete-id="${escapeHtml(expense.id)}" aria-label="删除这笔账">×</button>
      </div>
    </article>
  `;
}

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

function getVisibleExpenses() {
  return state.expenses
    .filter(isExpenseVisible)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

function isExpenseVisible(expense) {
  if (expense.isDeleted) return false;
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

function focusExpenseMissingTarget(target = getExpenseMissingState().target) {
  const scrollOptions = { block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" };

  if (target === "payer") {
    elements.payerField.scrollIntoView(scrollOptions);
    elements.familyRoster.querySelector(".family-tag")?.focus();
    elements.payerError.textContent = "请选择付款家庭。";
    return;
  }

  if (target === "amount") {
    elements.amountLabel.scrollIntoView({ block: "center", behavior: "auto" });
    elements.amountInput.focus();
    elements.formError.textContent = "请输入金额。";
    return;
  }

  if (target === "split") {
    if (!splitScopeOpen) {
      splitScopeOpen = true;
      smoothSplitScopeResize(renderSplitScope);
    }
    elements.splitScope.scrollIntoView(scrollOptions);
    window.setTimeout(() => {
      const splitInput = elements.splitCustomAmounts.querySelector("[data-split-amount]");
      if (splitInput) {
        splitInput.focus();
      } else {
        elements.splitScopeToggle.focus();
      }
    }, prefersReducedMotion() ? 0 : 120);
    elements.formError.textContent = "请填写分摊金额。";
    return;
  }

  if (target === "category") {
    elements.categoryChips.scrollIntoView(scrollOptions);
    elements.categoryChips.querySelector(".selectable-category-chip")?.focus();
    elements.formError.textContent = "请选择类别。";
  }
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
  
  const label = elements.submitButtonLabel;
  const newText = isEditing ? "保存修改" : "添加账单";
  
  if (label.textContent !== newText) {
    label.classList.add("text-slide-out");
    window.setTimeout(() => {
      label.textContent = newText;
      label.classList.remove("text-slide-out");
      label.classList.add("text-slide-in");
      window.setTimeout(() => {
        label.classList.remove("text-slide-in");
      }, 210);
    }, 150);
  }
  
  elements.expenseForm.classList.toggle("is-editing", isEditing);
}

// 是否已填齐提交所需信息：有效金额 + 已选家庭 + 已选类别
function isExpenseReady() {
  return getExpenseMissingState().target === "";
}

function getExpenseMissingPrompt() {
  return getExpenseMissingState().summary;
}

function getExpenseMissingState() {
  const amount = parseAmountInput(elements.amountInput.value);
  const hasPayer = state.families.some((family) => family.id === state.selectedPayerId);
  const hasCategory = Boolean(state.activeCategory || elements.categoryInput.value);

  if (!hasPayer) {
    return {
      target: "payer",
      summary: "还差：付款家庭",
      action: "去选择",
    };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      target: activeSplitMode === "custom" ? "split" : "amount",
      summary: activeSplitMode === "custom" ? "还差：分摊金额" : "还差：金额",
      action: "去填写",
    };
  }
  if (!hasCategory) {
    return {
      target: "category",
      summary: "还差：类别",
      action: "去选择",
    };
  }
  return {
    target: "",
    summary: "",
    action: "",
  };
}

function renderMobileSubmitBar() {
  const family = state.selectedPayerId ? getFamilyName(state.selectedPayerId) : "未选家庭";
  const category = state.activeCategory ? formatCategoryLabel(state.activeCategory) : "未选类别";
  const date = state.activeDate === todayIso() ? "今天" : state.activeDate.slice(5);
  const action = editingExpenseId ? "保存修改" : "添加账单";
  const split = activeSplitMode === "all" ? "" : ` · ${formatActiveSplitSummary()}`;
  // 信息未填齐时按钮呈中性引导态，点击会跳到对应缺项。
  const missing = getExpenseMissingState();
  const blocked = Boolean(missing.target);
  elements.mobileSubmitBar.dataset.state = blocked ? "needs-input" : "ready";
  elements.mobileSubmitBar.dataset.missingTarget = missing.target;
  elements.mobileSubmitSummary.textContent = blocked ? missing.summary : `${family} · ${category} · ${date}${split}`;
  elements.mobileSubmitButton.querySelector(".button-label").textContent = blocked ? missing.action : action;
  elements.mobileSubmitButton.classList.toggle("is-blocked", blocked);
  elements.mobileSubmitButton.setAttribute("aria-disabled", "false");
  elements.mobileSubmitButton.setAttribute("aria-label", blocked ? missing.summary : action);
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
  const missing = getExpenseMissingState();

  if (missing.target) {
    setMobilePanel("entry", { behavior: "auto", scroll: false });
    focusExpenseMissingTarget(missing.target);
    return;
  }

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
  const operatorName = localStorage.getItem("travel-ledger-operator-name") || getFamilyName(payerId);
  const originalExpense = wasEditing ? state.expenses.find((item) => item.id === editingExpenseId) : null;

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
    createdBy: wasEditing ? (originalExpense?.createdBy || { name: operatorName }) : { name: operatorName },
    updatedBy: wasEditing ? { name: operatorName } : null,
    syncState: isCloudLedgerActive() ? "pending" : "synced",
    isDeleted: false,
    updatedAt: new Date().toISOString(),
  };

  if (wasEditing) {
    state.expenses = state.expenses.map((expense) => (expense.id === editingExpenseId ? savedExpense : expense));
    editingExpenseId = "";
    lastAddedExpenseId = expenseId;
    showToast({ message: "已更新账单" });
  } else {
    state.expenses.push(savedExpense);
    lastAddedExpenseId = expenseId;
    triggerSubmitCelebrate(payerId);
  }

  if (wasEditing) {
    restoreEntryPreferenceState();
  } else {
    state.activeDate = date;
    state.activeCategory = category;
    state.selectedPayerId = payerId;
  }

  // 落账拍的起点：金额输入框中心。须在 reset()/render() 之前测量。
  const addStartRect = wasEditing ? null : elements.amountLabel.getBoundingClientRect();
  elements.expenseForm.reset();
  if (!wasEditing) resetSplitScope();
  smoothContainerResize(elements.ledgerSection, () => {
    render({ animateFinancialChanges: true });
  });
  if (!wasEditing) {
    landAddCeremony(payerId, savedExpense.amount, expenseId, addStartRect);
  }
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
  if (wasEditing) {
    elements.amountInput.focus();
  } else if (elements.expenseForm.contains(document.activeElement) && typeof document.activeElement.blur === "function") {
    document.activeElement.blur();
  }
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

function handleSettingsThemeClick(event) {
  const button = event.target.closest("[data-theme-id]");
  if (!button) return;

  const preset = THEME_PRESETS.find((item) => item.id === button.dataset.themeId);
  if (!preset || preset.id === getActiveThemeId()) return;

  document.documentElement.dataset.theme = preset.id;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preset.id);
  } catch (error) {
    /* 私密模式等场景存不了就只在本次会话生效 */
  }
  /* 未选家庭时提交条/切换条的兜底色跟随新主题 */
  applySubmitButtonTheme();
  syncThemeColorMeta();
  renderThemePresetList();
  showToast({ message: `主题色已换成「${preset.name}」` });
}

function handleSettingsPaletteClick(event) {
  const button = event.target.closest("[data-palette-id]");
  if (!button) return;

  const palette = familyPalettePresets.find((item) => item.id === button.dataset.paletteId);
  if (!palette) return;

  state.familyVisuals = Object.fromEntries(
    state.families.map((family, index) => [family.id, normalizeFamilyVisual(palette.colors[index % palette.colors.length])]),
  );
  syncFamilyVisualRows();
  render({ animateFinancialChanges: true });
  queueCloudSettingsSync();
  showToast({ message: `已套用「${palette.name}」` });
}

function handleSettingsFamilyColorClick(event) {
  const button = event.target.closest("[data-family-color]");
  if (!button) return;

  const familyId = normalizePayerId(button.dataset.familyColor);
  const visual = getFamilyColorChoices()[Number(button.dataset.colorIndex)];
  if (!familyId || !visual) return;

  state.familyVisuals = {
    ...normalizeFamilyVisuals(state.familyVisuals, state.families),
    [familyId]: normalizeFamilyVisual(visual),
  };
  syncFamilyVisualRows();
  render({ animateFinancialChanges: true });
  queueCloudSettingsSync();
  showToast({ message: `已更新${getFamilyName(familyId)}颜色` });
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

  elements.formError.textContent = "";
  const nextCategory = normalizeCategory(button.dataset.category, state.activeCategory);
  const previousCategory = elements.categoryList?.querySelector(".selectable-category-chip.is-selected")?.dataset.category || state.activeCategory;
  const categorySwitched = nextCategory !== previousCategory;
  if (categorySwitched) {
    markCategoryDeactivating(previousCategory);
    markCategoryActivating(nextCategory);
  }
  state.activeCategory = nextCategory;
  elements.categoryInput.value = state.activeCategory;
  renderCategories();
  applyChoiceStateClass("[data-category]", "data-category", categorySwitched ? nextCategory : "", "is-activating");
  applyChoiceStateClass("[data-category]", "data-category", categorySwitched ? previousCategory : "", "is-deactivating");
  renderMobileSubmitBar();
  saveState();
}

function handleSplitScopeToggle() {
  splitScopeOpen = !splitScopeOpen;
  smoothSplitScopeResize(renderSplitScope);
}

function handleSplitScopeClick(event) {
  const modeButton = event.target.closest("[data-split-mode]");
  if (modeButton) {
    const nextMode = normalizeSplitMode(modeButton.dataset.splitMode);
    const previousMode = activeSplitMode;
    const modeSwitched = nextMode !== previousMode;
    if (modeSwitched) {
      markSplitScopeSwitching();
      markSplitModeDeactivating(previousMode);
      markSplitModeActivating(nextMode);
      activeSplitMode = nextMode;
      if (activeSplitMode === "families" && !activeSplitFamilyIds.length) {
        activeSplitFamilyIds = state.families.map((family) => family.id);
      }
    }
    smoothSplitScopeResize(renderSplitScope);
    applyChoiceStateClass("[data-split-mode]", "data-split-mode", modeSwitched ? nextMode : "", "is-activating");
    applyChoiceStateClass("[data-split-mode]", "data-split-mode", modeSwitched ? previousMode : "", "is-deactivating");
    renderMobileSubmitBar();
    return;
  }

  const familyButton = event.target.closest("[data-split-family]");
  if (!familyButton) return;

  const familyId = normalizePayerId(familyButton.dataset.splitFamily);
  if (!familyId) return;
  if (activeSplitFamilyIds.includes(familyId)) {
    markSplitFamilyDeactivating(familyId);
    activeSplitFamilyIds = activeSplitFamilyIds.filter((id) => id !== familyId);
  } else {
    markSplitFamilyActivating(familyId);
    activeSplitFamilyIds = [...activeSplitFamilyIds, familyId];
  }
  // 勾选家庭不改变面板高度，直接增量渲染，跳过测量流程（否则会闪一帧）
  renderSplitScope();
  applyChoiceStateClass("[data-split-family]", "data-split-family", familyId, activeSplitFamilyIds.includes(familyId) ? "is-activating" : "is-deactivating");
  renderMobileSubmitBar();
}

// 高度动画直接做在面板自己身上：面板逐帧变高/变矮，
// 下方的日期/备注/提交按钮随布局自然跟随，不会瞬移。
function smoothSplitScopeResize(update) {
  const panel = elements.splitScopePanel;
  const restoreSplitAnchor = createSplitScopeAnchorRestorer();

  if (!panel || prefersReducedMotion()) {
    update();
    restoreSplitAnchor();
    return;
  }

  const readBox = () => {
    if (panel.hidden) return { height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0 };
    const style = getComputedStyle(panel);
    return {
      height: panel.getBoundingClientRect().height,
      marginTop: Number.parseFloat(style.marginTop) || 0,
      paddingTop: Number.parseFloat(style.paddingTop) || 0,
      paddingBottom: Number.parseFloat(style.paddingBottom) || 0,
    };
  };

  const from = readBox();
  update();
  panel._panelResizeAnimation?.cancel();
  // 收起的目标是 0（面板随后才真正 hidden），展开/切换量实际布局
  const to = splitScopeOpen ? readBox() : { height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0 };

  if (Math.abs(from.height - to.height) < 1) {
    restoreSplitAnchor();
    return;
  }

  panel.style.overflow = "hidden";
  const duration = getCssDurationMs("--motion", 534);
  const easing = getComputedStyle(document.documentElement).getPropertyValue("--settle").trim() || "cubic-bezier(0.16, 0.9, 0.14, 1)";
  const toKeyframe = (box) => ({
    height: `${box.height}px`,
    marginTop: `${box.marginTop}px`,
    paddingTop: `${box.paddingTop}px`,
    paddingBottom: `${box.paddingBottom}px`,
  });
  const animation = panel.animate([toKeyframe(from), toKeyframe(to)], { duration, easing, fill: "both" });
  panel._panelResizeAnimation = animation;
  animation.addEventListener(
    "finish",
    () => {
      if (panel._panelResizeAnimation !== animation) return;
      animation.cancel();
      panel.style.removeProperty("overflow");
      panel._panelResizeAnimation = null;
    },
    { once: true },
  );
  restoreSplitAnchor();
}

function createSplitScopeAnchorRestorer() {
  const anchor = elements.splitScopeToggle;
  if (!anchor) return () => {};

  const startTop = anchor.getBoundingClientRect().top;
  return () => {
    const nextTop = anchor.getBoundingClientRect().top;
    const delta = nextTop - startTop;
    if (Math.abs(delta) > 0.5) window.scrollBy(0, delta);
  };
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

function markSplitModeActivating(mode) {
  if (prefersReducedMotion()) return;
  activatingSplitMode = mode;
  window.setTimeout(() => {
    if (activatingSplitMode === mode) activatingSplitMode = "";
    removeChoiceStateClass("[data-split-mode]", "data-split-mode", mode, "is-activating");
  }, MOTION_DELAYS.categoryActivate);
}

function markSplitModeDeactivating(mode) {
  if (prefersReducedMotion() || !mode) return;
  deactivatingSplitMode = mode;
  window.setTimeout(() => {
    if (deactivatingSplitMode === mode) deactivatingSplitMode = "";
    removeChoiceStateClass("[data-split-mode]", "data-split-mode", mode, "is-deactivating");
  }, MOTION_DELAYS.choiceRelease);
}

function markSplitFamilyActivating(familyId) {
  if (prefersReducedMotion()) return;
  deactivatingSplitFamilyIds.delete(familyId);
  activatingSplitFamilyIds.add(familyId);
  window.setTimeout(() => {
    activatingSplitFamilyIds.delete(familyId);
    removeChoiceStateClass("[data-split-family]", "data-split-family", familyId, "is-activating");
  }, MOTION_DELAYS.payerActivate);
}

function markSplitFamilyDeactivating(familyId) {
  if (prefersReducedMotion() || !familyId) return;
  activatingSplitFamilyIds.delete(familyId);
  deactivatingSplitFamilyIds.add(familyId);
  window.setTimeout(() => {
    deactivatingSplitFamilyIds.delete(familyId);
    removeChoiceStateClass("[data-split-family]", "data-split-family", familyId, "is-deactivating");
  }, MOTION_DELAYS.choiceRelease);
}

function handleSplitAmountInput(event) {
  const input = event.target.closest("[data-split-amount]");
  if (!input) return;

  elements.formError.textContent = "";
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
  const moveButton = event.target.closest("[data-move-category]");
  if (moveButton) {
    moveCategory(moveButton.dataset.moveCategory, Number(moveButton.dataset.direction));
    return;
  }

  const button = event.target.closest("[data-remove-category]");
  if (!button) return;

  removeCategory(button.dataset.removeCategory);
}

function moveCategory(category, direction) {
  const index = state.categories.indexOf(category);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= state.categories.length) return;

  const nextCategories = [...state.categories];
  [nextCategories[index], nextCategories[nextIndex]] = [nextCategories[nextIndex], nextCategories[index]];
  state.categories = nextCategories;
  render();
  queueCloudSettingsSync();
  saveState();
}

function removeCategory(category) {
  if (state.expenses.some((expense) => expense.category === category)) return;
  const categoryIndex = state.categories.indexOf(category);
  if (categoryIndex < 0) return;

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
  if (event.target.closest("[data-clear-filter-empty]")) {
    clearLedgerFilters();
    return;
  }

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
  const transitionItems = getLedgerTransitionItems(items, expenseId);
  const flipRects = captureLedgerTransitionRects(transitionItems);
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
  const transitionItems = getLedgerTransitionItems(items, expenseId);
  const flipRects = captureLedgerTransitionRects(transitionItems);
  expandedExpenseId = "";
  items.forEach((item) => {
    item.classList.remove("is-expanded");
    item.setAttribute("aria-expanded", "false");
    item.setAttribute("aria-label", "展开这笔账单");
  });
  playLedgerTransitionRects(flipRects);
}

function getLedgerTransitionItems(items, nextExpenseId) {
  const ids = new Set([expandedExpenseId, nextExpenseId].filter(Boolean));
  return items.filter((item) => ids.has(item.dataset.expenseId));
}

function captureLedgerTransitionRects(items) {
  if (prefersReducedMotion()) return new Map();
  const rects = new Map();
  const selectors = [".ledger-main", ".ledger-family", ".category-pill", ".ledger-note", ".ledger-amount", ".ledger-date", ".ledger-edit-button", ".delete-button"];
  items.forEach((item) => {
    // 卡片自身也入表：高度变化由 play 阶段按实测值做动画
    rects.set(item, item.getBoundingClientRect());
    item.querySelectorAll(selectors.join(",")).forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.width > 1 && rect.height > 1) rects.set(element, rect);
    });
  });
  return rects;
}

function playLedgerTransitionRects(rects) {
  if (!rects.size || prefersReducedMotion() || typeof Element.prototype.animate !== "function") return;
  const duration = getCssDurationMs("--motion", 534);
  const easing = getComputedStyle(document.documentElement).getPropertyValue("--settle").trim() || "cubic-bezier(0.16, 0.9, 0.14, 1)";
  const animations = [];
  const settleLedgerMorph = () => {
    window.clearTimeout(ledgerMorphTimer);
    ledgerMorphTimer = window.setTimeout(() => {
      elements.ledgerList?.classList.remove("is-morphing-ledger-items");
    }, duration + 34);
  };

  elements.ledgerList?.classList.add("is-morphing-ledger-items");
  settleLedgerMorph();

  // 先取消上一轮高度动画（fill: both 会夹住高度），保证下面量到真实终点
  rects.forEach((fromRect, element) => {
    if (element.classList?.contains("ledger-item")) {
      element._heightAnimation?.cancel();
      element._heightAnimation = null;
    }
  });

  rects.forEach((fromRect, element) => {
    if (!element.isConnected) return;
    const toRect = element.getBoundingClientRect();

    // 卡片自身：按前后实测高度过渡（min/max 同步夹紧，兼容各断点的尺寸差异）
    if (element.classList.contains("ledger-item")) {
      if (Math.abs(fromRect.height - toRect.height) < 1) return;
      const animation = element.animate(
        [
          { minHeight: `${fromRect.height}px`, maxHeight: `${fromRect.height}px` },
          { minHeight: `${toRect.height}px`, maxHeight: `${toRect.height}px` },
        ],
        { duration, easing, fill: "both" },
      );
      element._heightAnimation = animation;
      animations.push(animation);
      animation.addEventListener(
        "finish",
        () => {
          animation.cancel();
          if (element._heightAnimation === animation) element._heightAnimation = null;
        },
        { once: true },
      );
      return;
    }

    if (toRect.width <= 1 || toRect.height <= 1) return;

    const dx = fromRect.left - toRect.left;
    const dy = fromRect.top - toRect.top;
    const moved = Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5;
    if (!moved) return;

    const animation = element.animate(
      [
        { transform: `translate(${dx}px, ${dy}px)` },
        { transform: "translate(0, 0)" },
      ],
      { duration, easing, fill: "both" },
    );
    animations.push(animation);
    animation.addEventListener("finish", () => animation.cancel(), { once: true });
  });

  if (animations.length) {
    Promise.allSettled(animations.map((animation) => animation.finished)).then(settleLedgerMorph);
  }
}

function deleteExpense(expenseId, item) {
  const expense = state.expenses.find((expense) => expense.id === expenseId);
  if (!expense) return;

  if (expandedExpenseId === expenseId) expandedExpenseId = "";
  item?.classList.add("is-removing");
  if (item) {
    item.style.viewTransitionName = "expense-removing";
  }
  const button = item?.querySelector("[data-delete-id]");
  if (button) button.disabled = true;

  const delay = getCssDurationMs("--motion", 240) + 40;
  window.setTimeout(() => {
    expense.isDeleted = true;
    expense.updatedAt = new Date().toISOString();
    syncCloudExpenseWithState(expenseId, { silent: true }).catch(() => {});

    if (editingExpenseId === expenseId) cancelEdit();
    smoothContainerResize(elements.ledgerSection, () => {
      render({ animateFinancialChanges: true });
    });
    showToast({
      message: "已删除账单",
      actionLabel: "撤销",
      onAction: () => {
        expense.isDeleted = false;
        expense.updatedAt = new Date().toISOString();
        smoothContainerResize(elements.ledgerSection, () => {
          render({ animateFinancialChanges: true });
        });
        syncCloudExpenseWithState(expenseId, { silent: true }).catch(() => {});
      },
    });
  }, delay);
}

async function handleClearLedger() {
  const activeExpenses = getActiveExpenses();
  if (!activeExpenses.length) return;
  const confirmed = await showConfirmDialog({
    eyebrow: "清空账本",
    title: "清空当前账本？",
    message: `会删除“${state.name}”里的 ${activeExpenses.length} 笔账单，本地会先保留撤销入口。`,
    confirmLabel: "清空",
    danger: true,
  });
  if (!confirmed) return;

  expandedExpenseId = "";
  const previousDate = state.activeDate;
  const items = [...elements.ledgerList.querySelectorAll(".ledger-item")];
  items.forEach((item, index) => {
    window.setTimeout(() => item.classList.add("is-removing"), index * MOTION_DELAYS.ledgerClearStagger);
  });

  window.setTimeout(
    () => {
      const now = new Date().toISOString();
      activeExpenses.forEach(e => {
        e.isDeleted = true;
        e.updatedAt = now;
        syncCloudExpenseWithState(e.id, { silent: true }).catch(() => {});
      });
      state.activeDate = todayIso();
      editingExpenseId = "";
      editReturnState = null;
      editFormSnapshot = null;

      smoothContainerResize(elements.ledgerSection, () => {
        render({ animateFinancialChanges: true });
      });
      showToast({
        message: "已清空账本",
        actionLabel: "撤销",
        onAction: () => {
          const undoNow = new Date().toISOString();
          activeExpenses.forEach(e => {
            e.isDeleted = false;
            e.updatedAt = undoNow;
            syncCloudExpenseWithState(e.id, { silent: true }).catch(() => {});
          });
          state.activeDate = previousDate;
          smoothContainerResize(elements.ledgerSection, () => {
            render({ animateFinancialChanges: true });
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
    ledger.familyVisuals = normalizeFamilyVisuals(state.familyVisuals, state.families);
    ledger.families = normalizeFamilies(state.families).map((family) => ({ ...family, visual: ledger.familyVisuals[family.id] }));
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
  checkOperatorNamePrompt();
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
  pullCloudLedger({ announce: true }).then(() => {
    checkOperatorNamePrompt();
  });
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

function openDismissiblePanel({ view, bodyClass, closeButton, fallbackFocus, renderPanel, getCloseTimer, setCloseTimer, setReturnFocus }) {
  setReturnFocus(document.activeElement instanceof HTMLElement ? document.activeElement : fallbackFocus);
  window.clearTimeout(getCloseTimer());
  view.hidden = false;
  view.classList.remove("is-closing");
  document.body.classList.add(bodyClass);
  renderPanel?.();
  closeButton.focus();
}

function closeDismissiblePanel({ view, bodyClass, fallbackFocus, getCloseTimer, setCloseTimer, getReturnFocus, setReturnFocus }) {
  if (view.hidden || view.classList.contains("is-closing")) return;

  view.classList.add("is-closing");
  const delay = prefersReducedMotion() ? 0 : getCssDurationMs("--motion", 534) + 60;

  window.clearTimeout(getCloseTimer());
  setCloseTimer(window.setTimeout(() => {
    view.hidden = true;
    view.classList.remove("is-closing");
    document.body.classList.remove(bodyClass);
    restoreFocus(getReturnFocus() || fallbackFocus);
    setReturnFocus(null);
  }, delay));
}

function openSettings() {
  openDismissiblePanel({
    view: elements.settingsView,
    bodyClass: "settings-open",
    closeButton: elements.closeSettingsButton,
    fallbackFocus: elements.openSettingsButton,
    renderPanel: renderSettings,
    getCloseTimer: () => settingsCloseTimer,
    setCloseTimer: (timer) => {
      settingsCloseTimer = timer;
    },
    setReturnFocus: (element) => {
      settingsReturnFocus = element;
    },
  });
}

function closeSettings() {
  closeDismissiblePanel({
    view: elements.settingsView,
    bodyClass: "settings-open",
    fallbackFocus: elements.openSettingsButton,
    getCloseTimer: () => settingsCloseTimer,
    setCloseTimer: (timer) => {
      settingsCloseTimer = timer;
    },
    getReturnFocus: () => settingsReturnFocus,
    setReturnFocus: (element) => {
      settingsReturnFocus = element;
    },
  });
}

function openLedgerManager() {
  openDismissiblePanel({
    view: elements.ledgerManagementView,
    bodyClass: "ledger-management-open",
    closeButton: elements.closeLedgerManagerButton,
    fallbackFocus: elements.openLedgerManagerButton,
    renderPanel: renderLedgerManager,
    getCloseTimer: () => ledgerManagementCloseTimer,
    setCloseTimer: (timer) => {
      ledgerManagementCloseTimer = timer;
    },
    setReturnFocus: (element) => {
      ledgerManagementReturnFocus = element;
    },
  });
}

function closeLedgerManager() {
  closeDismissiblePanel({
    view: elements.ledgerManagementView,
    bodyClass: "ledger-management-open",
    fallbackFocus: elements.openLedgerManagerButton,
    getCloseTimer: () => ledgerManagementCloseTimer,
    setCloseTimer: (timer) => {
      ledgerManagementCloseTimer = timer;
    },
    getReturnFocus: () => ledgerManagementReturnFocus,
    setReturnFocus: (element) => {
      ledgerManagementReturnFocus = element;
    },
  });
}

function showConfirmDialog({ eyebrow = "请确认", title, message, confirmLabel = "确认", danger = false }) {
  if (confirmResolve) closeConfirmDialog(false);
  /* 若上一个对话框仍在退场动画中，立即复位以复用视图 */
  window.clearTimeout(confirmCloseTimer);
  elements.confirmView.classList.remove("is-closing");
  confirmReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

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
  if (elements.confirmView.hidden || elements.confirmView.classList.contains("is-closing")) return;
  document.body.classList.remove("confirm-open");
  restoreFocus(confirmReturnFocus);
  confirmReturnFocus = null;
  const resolve = confirmResolve;
  confirmResolve = null;
  resolve?.(result);

  /* 结果已即时回调，视图延迟隐藏走退场动画；减少动态偏好时直接隐藏 */
  if (prefersReducedMotion()) {
    elements.confirmView.hidden = true;
    return;
  }
  elements.confirmView.classList.add("is-closing");
  confirmCloseTimer = window.setTimeout(() => {
    elements.confirmView.classList.remove("is-closing");
    elements.confirmView.hidden = true;
  }, getCssDurationMs("--motion-fast", 401) + 60);
}

function restoreFocus(element) {
  if (element && typeof element.focus === "function" && document.contains(element)) {
    element.focus();
  }
}

function checkOperatorNamePrompt() {
  if (!isCloudLedgerActive()) return;
  const savedName = localStorage.getItem("travel-ledger-operator-name");
  if (!savedName) {
    showOperatorModal();
  }
}

function showOperatorModal() {
  if (!elements.operatorModalView) return;
  elements.operatorModalView.hidden = false;
  document.body.classList.add("confirm-open");
  elements.operatorModalInput.value = "";
  elements.operatorModalInput.focus();
}

function closeOperatorModal() {
  const view = elements.operatorModalView;
  if (!view || view.hidden || view.classList.contains("is-closing")) return;
  document.body.classList.remove("confirm-open");
  if (prefersReducedMotion()) {
    view.hidden = true;
    return;
  }
  view.classList.add("is-closing");
  window.setTimeout(() => {
    view.classList.remove("is-closing");
    view.hidden = true;
  }, getCssDurationMs("--motion-fast", 401) + 60);
}

function handleOperatorModalSubmit(event) {
  event.preventDefault();
  const name = elements.operatorModalInput.value.trim();
  if (!name) return;

  localStorage.setItem("travel-ledger-operator-name", name);
  if (elements.settingsOperatorInput) {
    elements.settingsOperatorInput.value = name;
  }
  closeOperatorModal();
  showToast({ message: `欢迎你，${name}！已设置您的操作者身份` });
}

function handleSettingsOperatorSubmit(event) {
  event.preventDefault();
  const name = elements.settingsOperatorInput.value.trim();
  if (!name) {
    showToast({ message: "请输入有效的姓名" });
    return;
  }

  localStorage.setItem("travel-ledger-operator-name", name);
  showToast({ message: `保存成功，您的名字已设置为“${name}”` });
}

function getFocusableElements(container) {
  if (!container || container.hidden) return [];
  const selector = [
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "a[href]",
    "[tabindex]:not([tabindex='-1'])",
  ].join(",");
  return [...container.querySelectorAll(selector)].filter((element) => element.offsetParent !== null || element === document.activeElement);
}

function trapFocus(event, container) {
  const focusable = getFocusableElements(container);
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
    return;
  }
  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function handleFamilySelection(event) {
  const button = event.target.closest("[data-payer-id]");
  if (!button) return;

  elements.payerError.textContent = "";
  const nextPayerId = normalizePayerId(button.dataset.payerId);
  const previousPayerId = normalizePayerId(elements.familyRoster?.querySelector(".family-tag.is-selected")?.dataset.payerId) || state.selectedPayerId;
  const payerSwitched = Boolean(nextPayerId && nextPayerId !== previousPayerId);
  if (payerSwitched) {
    markPayerDeactivating(previousPayerId);
    markPayerActivating(nextPayerId);
  }
  state.selectedPayerId = nextPayerId;
  elements.payerError.textContent = "";
  applySelectedFamilyTheme();
  renderFamilyRoster();
  applyChoiceStateClass("[data-payer-id]", "data-payer-id", payerSwitched ? nextPayerId : "", "is-activating");
  applyChoiceStateClass("[data-payer-id]", "data-payer-id", payerSwitched ? previousPayerId : "", "is-deactivating");
  applySubmitButtonTheme();
  renderMobileSubmitBar();
  updateAmountMotionState();
  saveState();
}

function markPayerActivating(payerId) {
  if (prefersReducedMotion()) return;
  activatingPayerId = payerId;
  window.setTimeout(() => {
    if (activatingPayerId === payerId) activatingPayerId = "";
    removeChoiceStateClass("[data-payer-id]", "data-payer-id", payerId, "is-activating");
  }, MOTION_DELAYS.payerActivate);
}

function markPayerDeactivating(payerId) {
  if (prefersReducedMotion() || !payerId) return;
  deactivatingPayerId = payerId;
  window.setTimeout(() => {
    if (deactivatingPayerId === payerId) deactivatingPayerId = "";
    removeChoiceStateClass("[data-payer-id]", "data-payer-id", payerId, "is-deactivating");
  }, MOTION_DELAYS.choiceRelease);
}

function markCategoryActivating(category) {
  if (prefersReducedMotion()) return;
  activatingCategory = category;
  window.setTimeout(() => {
    if (activatingCategory === category) activatingCategory = "";
    removeChoiceStateClass("[data-category]", "data-category", category, "is-activating");
  }, MOTION_DELAYS.categoryActivate);
}

function markCategoryDeactivating(category) {
  if (prefersReducedMotion() || !category) return;
  deactivatingCategory = category;
  window.setTimeout(() => {
    if (deactivatingCategory === category) deactivatingCategory = "";
    removeChoiceStateClass("[data-category]", "data-category", category, "is-deactivating");
  }, MOTION_DELAYS.choiceRelease);
}

function removeChoiceStateClass(selector, attribute, value, className) {
  document.querySelectorAll(selector).forEach((element) => {
    if (element.getAttribute(attribute) === value) element.classList.remove(className);
  });
}

function applyChoiceStateClass(selector, attribute, value, className) {
  if (prefersReducedMotion() || !value) return;
  document.querySelectorAll(selector).forEach((element) => {
    if (element.getAttribute(attribute) === value) element.classList.add(className);
  });
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

  const stops = [`${colorWithAlpha(getFamilyVisual(segments[0].family.id).gradient, 0.46)} 0%`];

  for (let index = 0; index < segments.length - 1; index += 1) {
    const current = segments[index];
    const next = segments[index + 1];
    const currentColor = getFamilyVisual(current.family.id).gradient;
    const nextColor = getFamilyVisual(next.family.id).gradient;
    const boundary = current.end;
    const softWidth = Math.min(24, Math.max(12, Math.min(current.end - current.start, next.end - next.start) * 0.46));
    const left = Math.max(current.start, boundary - softWidth);
    const right = Math.min(next.end, boundary + softWidth);
    const mixed = mixHexColors(currentColor, nextColor, 0.5);

    stops.push(
      `${colorWithAlpha(currentColor, 0.44)} ${formatPercent(left)}`,
      `${colorWithAlpha(mixed, 0.50)} ${formatPercent(boundary)}`,
      `${colorWithAlpha(nextColor, 0.44)} ${formatPercent(right)}`,
    );
  }

  const finalColor = getFamilyVisual(segments[segments.length - 1].family.id).gradient;
  stops.push(`${colorWithAlpha(finalColor, 0.40)} 100%`);
  return stops;
}

function buildGradientAura(segments) {
  return segments
    .map((segment, index) => {
      const center = segment.start + (segment.end - segment.start) / 2;
      const y = index % 2 === 0 ? 16 : 52;
      const color = colorWithAlpha(getFamilyVisual(segment.family.id).gradient, 0.24);
      return `radial-gradient(ellipse at ${formatPercent(center)} ${y}%, ${color}, transparent 58%)`;
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
  const themedElements = [elements.amountLabel, elements.expenseForm].filter(Boolean);

  if (!state.selectedPayerId) {
    elements.amountLabel.classList.remove("amount-themed");
    themedElements.forEach((element) => {
      element.style.removeProperty("--selected-family-color");
      element.style.removeProperty("--selected-family-text");
      element.style.removeProperty("--selected-family-soft");
      element.style.removeProperty("--selected-family-wash");
      element.style.removeProperty("--selected-family-glow");
    });
    return;
  }

  const style = getFamilyVisual(state.selectedPayerId);
  elements.amountLabel.classList.add("amount-themed");
  themedElements.forEach((element) => {
    element.style.setProperty("--selected-family-color", style.color);
    element.style.setProperty("--selected-family-text", style.text);
    element.style.setProperty("--selected-family-soft", style.soft);
    element.style.setProperty("--selected-family-wash", colorWithAlpha(style.color, 0.24));
    element.style.setProperty("--selected-family-glow", colorWithAlpha(style.color, 0.72));
  });
}

function applySubmitButtonTheme() {
  const style = state.selectedPayerId ? getFamilyVisual(state.selectedPayerId) : null;
  /* 未选家庭时回落到当前全局主题色（读计算值，跟随设置里的主题切换与暗色模式） */
  const accent = getComputedStyle(document.documentElement).getPropertyValue("--green").trim() || "#9d5745";
  const color = style?.color || accent;
  const text = style?.text || accent;
  const wash = style?.wash || colorWithAlpha(accent, 0.14);
  const glow = colorWithAlpha(color, state.selectedPayerId ? 0.58 : 0.42);
  [elements.expenseForm, elements.mobileSubmitBar, elements.mobilePanelSwitch].forEach((element) => {
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

function smoothContainerResize(element, update, afterMeasure = () => {}, options = {}) {
  if (!element || prefersReducedMotion()) {
    update();
    afterMeasure();
    return;
  }

  const clipDuringResize = options.clipDuringResize !== false;
  element._resizeAnimation?.cancel();
  window.clearTimeout(element._resizeTimer);
  const startHeight = element.getBoundingClientRect().height;
  element.classList.add("is-resizing");
  element.style.height = `${startHeight}px`;
  if (clipDuringResize) {
    element.style.overflow = "hidden";
  } else {
    element.style.removeProperty("overflow");
  }

  update();

  element.style.height = "auto";
  const endHeight = element.getBoundingClientRect().height;
  afterMeasure();

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
    animation.cancel();
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
  const isActive = document.activeElement === elements.amountInput;
  elements.amountLabel.classList.toggle("amount-active", isActive);
  if (isActive) lockAmountLabelScroll();
}

function lockAmountLabelScroll() {
  window.cancelAnimationFrame(amountLabelScrollFrameId);
  elements.amountLabel.scrollTop = 0;
  amountLabelScrollFrameId = window.requestAnimationFrame(() => {
    elements.amountLabel.scrollTop = 0;
    amountLabelScrollFrameId = window.requestAnimationFrame(() => {
      elements.amountLabel.scrollTop = 0;
      amountLabelScrollFrameId = 0;
    });
  });
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
    setMobilePanel("entry", { behavior: "auto" });
    elements.expenseForm.scrollIntoView({ block: "start", behavior: "auto" });
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
  setMobilePanel("entry", { behavior: "auto" });
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
  elements.expenseForm.scrollIntoView({ block: "start", behavior: "auto" });
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

/* 退场：先播 toast-exit 再移除节点；减少动态偏好或节点已在离场时直接清空 */
function dismissToast() {
  const toast = elements.toastHost.querySelector(".toast");
  if (!toast || prefersReducedMotion()) {
    elements.toastHost.innerHTML = "";
    return;
  }
  if (toast.classList.contains("is-leaving")) return;
  toast.classList.add("is-leaving");
  window.setTimeout(() => {
    if (toast.isConnected) toast.remove();
  }, 340);
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
      dismissToast();
      onAction?.();
    },
    { once: true },
  );

  toastTimer = window.setTimeout(() => {
    dismissToast();
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

// 提交瞬间的即时拍：按钮按付款家庭色定格发光/扫光。
function triggerSubmitCelebrate(payerId) {
  const visual = getFamilyVisual(payerId);
  const themedGlow = colorWithAlpha(visual.color, 0.66);
  
  elements.expenseForm.classList.remove("form-celebrate");
  elements.mobileSubmitBar.classList.remove("form-celebrate");
  
  elements.expenseForm.style.setProperty("--submit-color", visual.color);
  elements.expenseForm.style.setProperty("--submit-glow", themedGlow);
  elements.mobileSubmitBar.style.setProperty("--submit-color", visual.color);
  elements.mobileSubmitBar.style.setProperty("--submit-glow", themedGlow);
  
  void elements.expenseForm.offsetWidth;
  void elements.mobileSubmitBar.offsetWidth;
  
  elements.expenseForm.classList.add("form-celebrate");
  elements.mobileSubmitBar.classList.add("form-celebrate");
  
  // 触发精致星尘粒子爆裂动效（自动选择屏幕上当前可见的按钮）
  const visibleButton = [elements.submitButton, elements.mobileSubmitButton].find((btn) => {
    if (!btn) return false;
    const rect = btn.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
  if (visibleButton) {
    spawnButtonParticles(visibleButton, visual, themedGlow);
  }
  
  window.setTimeout(() => {
    elements.expenseForm.classList.remove("form-celebrate");
    elements.mobileSubmitBar.classList.remove("form-celebrate");
  }, MOTION_DELAYS.addCelebrate);
}

// 落账拍：令牌从金额框飞入新生成的账单卡片，落定时卡片接住脉冲 + 总额绽放 + 移动端震动。
function landAddCeremony(payerId, amount, expenseId, startRect) {
  const visual = getFamilyVisual(payerId);
  const card = elements.ledgerList?.querySelector(`[data-expense-id="${cssEscapeId(expenseId)}"]`);
  const cardRect = card?.getBoundingClientRect();

  if (prefersReducedMotion() || !startRect || !cardRect || cardRect.width === 0) {
    // 降级（减少动态效果 / 卡片被筛选隐藏）：直接落定总额绽放。
    triggerTotalBloomEffect(visual);
    return;
  }

  flyLedgerTokenToCard(visual, amount, startRect, cardRect, () => {
    pulseLedgerCatch(card);
    triggerTotalBloomEffect(visual);
    triggerHapticFeedback();
  });
}

function flyLedgerTokenToCard(visual, amount, startRect, cardRect, onLand) {
  const startX = startRect.left + startRect.width * 0.5;
  const startY = startRect.top + startRect.height * 0.38;
  const endX = cardRect.left + cardRect.width * 0.5;
  const endY = cardRect.top + cardRect.height * 0.5;
  const dx = endX - startX;
  const dy = endY - startY;
  // 抛物线拱起高度：随水平跨度略增，制造弧线而非直线。
  const lift = Math.min(52, Math.max(20, Math.abs(dx) * 0.18 + 22));

  const token = document.createElement("div");
  token.className = "ledger-token is-flying";
  token.textContent = formatMoney(Math.round(Number(amount) * 100));
  token.style.setProperty("--token-color", visual.color);
  token.style.setProperty("--token-text", visual.text);
  token.style.setProperty("--token-glow", colorWithAlpha(visual.color, 0.34));
  token.style.setProperty("--start-x", `${startX}px`);
  token.style.setProperty("--start-y", `${startY}px`);
  document.body.append(token);

  const easing = getComputedStyle(document.documentElement).getPropertyValue("--snap").trim() || "cubic-bezier(0.18, 0.84, 0.2, 1)";
  const animation = token.animate(
    [
      { transform: "translate(-50%, -50%) scale(1)", opacity: 0, filter: "blur(3px)", offset: 0 },
      { opacity: 0.95, filter: "blur(0px)", offset: 0.16 },
      { transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5 - lift}px)) scale(1.02)`, opacity: 0.9, offset: 0.5 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.7)`, opacity: 0, filter: "blur(1px)", offset: 1 },
    ],
    { duration: MOTION_DELAYS.tokenFlight, easing, fill: "both" },
  );

  let landed = false;
  const finish = () => {
    if (landed) return;
    landed = true;
    token.remove();
    onLand?.();
  };
  animation.addEventListener("finish", finish, { once: true });
  // 兜底：若 finish 事件因页面切后台等未触发，仍确保落定与清理。
  window.setTimeout(finish, MOTION_DELAYS.tokenFlight + 140);
}

function pulseLedgerCatch(card) {
  if (!card || prefersReducedMotion()) return;
  card.classList.remove("is-catching");
  void card.offsetWidth;
  card.classList.add("is-catching");
  window.setTimeout(() => card.classList.remove("is-catching"), MOTION_DELAYS.catchPulse);
}

function triggerTotalBloomEffect(visual) {
  if (prefersReducedMotion()) return;
  elements.totalMetric.classList.remove("is-blooming");
  elements.totalMetric.style.setProperty("--absorb-color", colorWithAlpha(visual.color, 0.18));
  elements.totalMetric.style.setProperty("--absorb-glow", colorWithAlpha(visual.gradient, 0.30));
  void elements.totalMetric.offsetWidth;
  elements.totalMetric.classList.add("is-blooming");
  window.setTimeout(() => {
    elements.totalMetric.classList.remove("is-blooming");
  }, MOTION_DELAYS.totalAbsorb);
}

function triggerHapticFeedback() {
  if (prefersReducedMotion()) return;
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  // 轻双击手感，呼应“接住/落定”，不做长震。
  navigator.vibrate([14, 30, 14]);
}

function cssEscapeId(value) {
  if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(value);
  return String(value).replace(/["\\\]]/g, "\\$&");
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
elements.categoryChips.addEventListener("scroll", scheduleCategoryEdgeFades, { passive: true });
setupCategoryOverscroll(elements.categoryChips);
window.addEventListener("resize", scheduleCategoryEdgeFades);
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
elements.settingsOperatorForm.addEventListener("submit", handleSettingsOperatorSubmit);
elements.operatorModalForm.addEventListener("submit", handleOperatorModalSubmit);
elements.settingsFamilyList.addEventListener("click", handleFamilyMemberStep);
elements.settingsThemeList?.addEventListener("click", handleSettingsThemeClick);
elements.settingsPaletteList.addEventListener("click", handleSettingsPaletteClick);
elements.settingsFamilyColorList.addEventListener("click", handleSettingsFamilyColorClick);
elements.familyRoster.addEventListener("click", handleFamilySelection);
elements.ledgerList.addEventListener("click", handleLedgerClick);
elements.ledgerList.addEventListener("keydown", handleLedgerKeydown);
elements.settingsClearLedgerButton.addEventListener("click", handleClearLedger);
elements.exportCsvButton.addEventListener("click", exportCsvBackup);
elements.exportJsonButton.addEventListener("click", exportJsonBackup);
elements.createCloudLedgerButton.addEventListener("click", createCloudLedger);
elements.copyShareLinkButton.addEventListener("click", copyShareLink);
elements.syncStatus.addEventListener("click", handleManualCloudSync);
elements.openSettingsButton.addEventListener("click", openSettings);
elements.closeSettingsButton.addEventListener("click", closeSettings);
elements.settingsBackdrop.addEventListener("click", closeSettings);
elements.confirmBackdrop.addEventListener("click", () => closeConfirmDialog(false));
elements.confirmCancelButton.addEventListener("click", () => closeConfirmDialog(false));
elements.confirmOkButton.addEventListener("click", () => closeConfirmDialog(true));
elements.cancelEditButton.addEventListener("click", cancelEdit);
elements.mobilePanelSwitch.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-mobile-panel-target]");
  if (!tab) return;
  setMobilePanel(tab.dataset.mobilePanelTarget, { animate: true });
});
elements.mobilePanelSwitch.addEventListener("keydown", handleMobilePanelSwitchKeydown);
elements.mobileSubmitButton.addEventListener("click", () => {
  if (activeMobilePanel === "data") {
    setMobilePanel("entry", { animate: true, scroll: true });
    return;
  }
  const missing = getExpenseMissingState();
  if (missing.target) {
    elements.formError.textContent = "";
    elements.payerError.textContent = "";
    setMobilePanel("entry", { behavior: "auto", scroll: false });
    window.requestAnimationFrame(() => focusExpenseMissingTarget(missing.target));
    renderMobileSubmitBar();
    return;
  }
  setMobilePanel("entry", { behavior: "auto", scroll: false });
  elements.expenseForm.requestSubmit();
});
elements.amountInput.addEventListener("focus", updateAmountMotionState);
elements.amountInput.addEventListener("blur", formatAmountFieldOnBlur);
elements.amountInput.addEventListener("input", () => {
  elements.formError.textContent = "";
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
/* iOS Safari 从 bfcache（往返缓存）恢复页面时不触发 visibilitychange，补一条 */
window.addEventListener("pageshow", (event) => {
  if (event.persisted) refreshCloudLedgerFromLifecycle();
});
/* 系统深浅模式切换时，重算 theme-color meta（下一帧再读，等样式重算完成） */
window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
  requestAnimationFrame(syncThemeColorMeta);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Tab") {
    if (!elements.confirmView.hidden) {
      trapFocus(event, elements.confirmView);
      return;
    }
    if (!elements.ledgerManagementView.hidden) {
      trapFocus(event, elements.ledgerManagementView);
      return;
    }
    if (!elements.settingsView.hidden) {
      trapFocus(event, elements.settingsView);
    }
    return;
  }

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

function setupSubmitButtonSpotlight() {
  const buttons = [elements.submitButton, elements.mobileSubmitButton].filter(Boolean);
  buttons.forEach((btn) => {
    btn.addEventListener("mousemove", (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      btn.style.setProperty("--mouse-x", `${x}px`);
      btn.style.setProperty("--mouse-y", `${y}px`);
    });
  });
}

function spawnButtonParticles(btn, visual, themedGlow) {
  if (prefersReducedMotion()) return;
  const rect = btn.getBoundingClientRect();
  const startX = rect.left + rect.width / 2 + window.scrollX;
  const startY = rect.top + rect.height / 2 + window.scrollY;
  
  const particleCount = 16;
  const container = document.body;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement("div");
    particle.className = "button-particle";
    
    const isStar = i % 2 === 0;
    if (isStar) {
      particle.classList.add("star-shape");
    }
    
    const size = Math.floor(Math.random() * 5) + 5; // 5px - 9px
    particle.style.setProperty("--size", `${size}px`);
    particle.style.setProperty("--radius", isStar ? "0" : "50%");
    
    // 颜色配比：1/3 为金色星芒，其余使用家庭颜色或白色
    let particleColor = visual.color;
    if (i % 3 === 1) {
      particleColor = "#ffd700"; // 金沙
    } else if (i % 3 === 2) {
      particleColor = "#ffffff"; // 亮白微粒
    }
    
    particle.style.backgroundColor = particleColor;
    particle.style.boxShadow = `0 0 6px ${colorWithAlpha(particleColor, 0.65)}`;
    
    // 居中起始点
    particle.style.left = `${startX - size / 2}px`;
    particle.style.top = `${startY - size / 2}px`;
    
    container.appendChild(particle);
    
    const angle = (i * (360 / particleCount) + Math.random() * 20 - 10) * (Math.PI / 180);
    const velocity = Math.random() * 60 + 35; // 扩散半径
    const destX = Math.cos(angle) * velocity;
    // 整体向上轻微漂浮（模拟烟花星尘微光升空）
    const destY = Math.sin(angle) * velocity - (Math.random() * 30 + 20);
    
    const rotation = Math.random() * 360;
    const destRotation = rotation + (Math.random() * 360 + 180) * (Math.random() > 0.5 ? 1 : -1);
    
    const animation = particle.animate(
      [
        {
          transform: `translate(0, 0) scale(0.2) rotate(${rotation}deg)`,
          opacity: 0,
        },
        {
          transform: `translate(${destX * 0.18}px, ${destY * 0.18}px) scale(1) rotate(${rotation + (destRotation - rotation) * 0.18}deg)`,
          opacity: 0.95,
          offset: 0.18
        },
        {
          transform: `translate(${destX}px, ${destY}px) scale(0.6) rotate(${destRotation}deg)`,
          opacity: 0.45,
          offset: 0.8
        },
        {
          transform: `translate(${destX * 1.08}px, ${destY - 18}px) scale(0) rotate(${destRotation + 15}deg)`,
          opacity: 0,
        }
      ],
      {
        duration: Math.random() * 350 + 750, // 750ms - 1100ms
        easing: "cubic-bezier(0.1, 0.8, 0.2, 1)",
        fill: "forwards"
      }
    );
    
    animation.onfinish = () => {
      particle.remove();
    };
  }
}

/* 滚动折叠通用逻辑：RAF 节流 + 滞回阈值，避免临界点抖动闪烁。
   scrollTarget 提供 scrollTop 的来源；window 场景传 window 本身（读 window.scrollY）。 */
function attachCollapseOnScroll(scrollTarget, collapseEl, { onThreshold, offThreshold }) {
  if (!scrollTarget || !collapseEl) return;
  let collapsed = false;
  let scrollFrame = 0;
  const readScrollTop = () =>
    scrollTarget === window ? window.scrollY : scrollTarget.scrollTop;
  const sync = () => {
    scrollFrame = 0;
    const shouldCollapse = collapsed ? readScrollTop() > offThreshold : readScrollTop() > onThreshold;
    if (shouldCollapse === collapsed) return;
    collapsed = shouldCollapse;
    collapseEl.classList.toggle("is-collapsed", collapsed);
  };
  const schedule = () => {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(sync);
  };
  scrollTarget.addEventListener("scroll", schedule, { passive: true });
  sync();
}

function setupScrollCollapse() {
  // 主页面头部滚动监听
  attachCollapseOnScroll(window, document.querySelector(".app-header"), {
    onThreshold: 56,
    offThreshold: 24
  });

  // 设置侧边栏滚动监听
  const settingsDrawer = document.querySelector(".settings-drawer");
  attachCollapseOnScroll(settingsDrawer, settingsDrawer?.querySelector(".settings-hero"), {
    onThreshold: 30,
    offThreshold: 30
  });

  // 账本管理侧边栏滚动监听
  const ledgerDrawer = document.querySelector(".ledger-management-drawer");
  attachCollapseOnScroll(ledgerDrawer, ledgerDrawer?.querySelector(".ledger-management-hero"), {
    onThreshold: 30,
    offThreshold: 30
  });
}

function setupStandaloneMode() {
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
  if (isStandalone) document.documentElement.classList.add("pwa-standalone");

  /* iOS Safari 且未安装到主屏幕：在设置里给一条可关闭的安装提示 */
  const hint = document.getElementById("addToHomeHint");
  if (!hint) return;
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  let dismissed = false;
  try {
    dismissed = localStorage.getItem("travel-ledger-a2hs-hint-dismissed") === "1";
  } catch (error) {}
  if (!isIOS || isStandalone || dismissed) return;
  hint.hidden = false;
  document.getElementById("dismissAddToHomeHint")?.addEventListener("click", () => {
    hint.hidden = true;
    try {
      localStorage.setItem("travel-ledger-a2hs-hint-dismissed", "1");
    } catch (error) {}
  });
}

function setupSafeAreaMode() {
  const root = document.documentElement;
  const displayQueries = ["standalone", "fullscreen", "minimal-ui"].map((mode) =>
    window.matchMedia?.(`(display-mode: ${mode})`)
  );
  const mobileQuery = window.matchMedia?.("(max-width: 820px), (pointer: coarse)");

  const readSafeAreaInsets = () => {
    const probe = document.createElement("div");
    probe.style.cssText = [
      "position: fixed",
      "visibility: hidden",
      "pointer-events: none",
      "padding: env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px)",
    ].join(";");
    document.body.appendChild(probe);
    const style = window.getComputedStyle(probe);
    const insets = ["Top", "Right", "Bottom", "Left"].map((side) => Number.parseFloat(style[`padding${side}`]) || 0);
    probe.remove();
    return insets;
  };

  const sync = () => {
    const isStandalone =
      window.navigator.standalone === true || displayQueries[0]?.matches || displayQueries[2]?.matches;
    const isFullscreen = Boolean(document.fullscreenElement) || displayQueries[1]?.matches || isStandalone;
    const isMobile = mobileQuery?.matches ?? window.innerWidth <= 820;
    const hasSafeArea = readSafeAreaInsets().some((inset) => inset > 0);
    const viewport = window.visualViewport;
    const viewportBottom = viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;

    root.classList.toggle("mobile-viewport", isMobile);
    root.classList.toggle("mobile-fullscreen", isMobile && isFullscreen);
    root.classList.toggle("safe-area-detected", hasSafeArea);
    root.classList.toggle("viewport-bottom-occluded", viewportBottom > 1);
    root.dataset.displayMode = isStandalone ? "standalone" : isFullscreen ? "fullscreen" : "browser";
    root.style.setProperty("--visual-viewport-bottom", `${Math.round(viewportBottom)}px`);
  };

  sync();
  displayQueries.forEach((query) => query?.addEventListener?.("change", sync));
  mobileQuery?.addEventListener?.("change", sync);
  window.visualViewport?.addEventListener("resize", sync);
  window.visualViewport?.addEventListener("scroll", sync);
  window.addEventListener("resize", sync);
  window.addEventListener("orientationchange", sync);
  document.addEventListener("fullscreenchange", sync);
}

async function bootstrap() {
  setupStandaloneMode();
  setupSafeAreaMode();
  syncThemeColorMeta();
  /* 请求持久化存储：降低 Safari ITP 主动清空 localStorage/IndexedDB 的概率 */
  navigator.storage?.persist?.().catch(() => {});
  setupSubmitButtonSpotlight();
  setupScrollCollapse();
  render();
  const restoredFromBackup = await restoreLedgerFromCloudBackup();
  if (!restoredFromBackup && isCloudLedgerActive()) {
    await pullCloudLedger({ announce: Boolean(cloudState.shareToken) });
  }
  checkOperatorNamePrompt();
  revealInitialTotalAmount();
}

bootstrap();

// 屏幕键盘弹出标记：body 加 keyboard-open 后 CSS 隐藏移动端固定提交栏，
// 避免悬在键盘上方挡住表单。优先用 visualViewport 的实际高度收缩判断
// （外接键盘、桌面端聚焦不会误判），不支持时退回焦点推断。
// focusout 延迟一拍再判断，防止焦点在输入间切换时提交栏闪烁。
(() => {
  const KEYBOARD_MIN_OVERLAP = 140;
  const viewport = window.visualViewport;
  const isTextEntry = (el) =>
    el && (el.tagName === "SELECT" || (el.tagName === "INPUT" && !["button", "checkbox", "radio", "range", "submit"].includes(el.type)));
  const isKeyboardOpen = () => {
    if (!isTextEntry(document.activeElement)) return false;
    if (!viewport) return true;
    return window.innerHeight - viewport.height > KEYBOARD_MIN_OVERLAP;
  };
  const syncKeyboardFlag = () => {
    document.body.classList.toggle("keyboard-open", isKeyboardOpen());
  };
  viewport?.addEventListener("resize", syncKeyboardFlag);
  document.addEventListener("focusin", syncKeyboardFlag);
  document.addEventListener("focusout", () => setTimeout(syncKeyboardFlag, 0));
})();
