const STORAGE_KEY = "travel-ledger-v3";
const LEGACY_STORAGE_KEYS = ["travel-ledger-v2", "travel-ledger-v1"];
const CLOUD_STATE_KEY = "travel-ledger-cloud";
const OPERATOR_FAMILY_STORAGE_KEY = "travel-ledger-operator-family-id";
const APP_VERSION = "journa-safari-ledger-material-layer-v1-20260823";
const SUPABASE_URL = "https://qvphpeetzyvnwaehrifa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2cGhwZWV0enl2bndhZWhyaWZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NzIxMTAsImV4cCI6MjA5ODE0ODExMH0.k3FL_Ywt377guTfjzTu1bgucShpRfmnQCdxn4SqikuA";
document.documentElement.dataset.appVersion = APP_VERSION;

const {
  formatMoney,
  expenseToCents,
  amountToCents,
  normalizeAmountDecimalSeparators,
  parseAmountInput,
  centsToAmount,
  formatAmountInput,
} = window.JournaCore.money;

const loadSupabaseSdk = window.JournaCloud.loadSupabaseSdk;
const {
  MOTION_DELAYS,
  resolveMotionDuration,
  SPRING_BAR_COLLAPSE,
  SPRING_BAR_EXPAND,
  SPRING_CATEGORY_ADD_OPEN,
  SPRING_CATEGORY_ADD_CLOSE,
  springSamples,
  barMotionSamples,
  easeOutCubic,
} = window.JournaCore.motion;

/* Journa 文案基线：功能名保留，说明和反馈尽量短、直接、可执行。 */
const COPY = {
  appTitle: "Journa · 共享旅行账本",
  localLedger: "本地账本",
  cloudLedger: "云账本",
  settlementTitle: "平账建议",
  settlementHint: "查看谁该转给谁",
  settlementDone: "已两清",
  actions: {
    addExpense: "记下这笔",
    saveExpense: "保存修改",
    choose: "选择",
    confirmChoice: "确认选择",
  },
  identity: {
    prompt: "选择你的家庭",
    missing: "请选择你的家庭",
    remembered: (family) => `已记住，你来自「${family}」`,
    saved: (family) => `已保存，接下来以「${family}」记录`,
  },
  sync: {
    savedLocally: "暂时无法同步，账单已保存在本机，联网后会重试",
    pending: "还有内容未同步，已保留本地账本",
  },
  welcome: {
    title: "三个家庭，一本账",
    intro: "默认按人数分，也可逐笔调整。",
    cloudTitle: "邀请家人一起记",
    cloudCopy: "创建云账本后，三家实时同步。",
    identityTitle: "你属于哪个家庭？",
    identityCopy: "记账会显示家庭署名。",
  },
};

/* 渐进增强：能力探测通过后给 <html> 打 data-blur="soft"，把整块玻璃模糊拨到 iOS26-soft 档。
   命中「降低透明度」偏好或不支持 backdrop-filter 时不开启（CSS 另有 reduced-transparency / @supports 兜底）。 */
(function setupGlassEnhancement() {
  try {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-transparency: reduce)").matches) return;
    if (!window.CSS || !CSS.supports || !CSS.supports("backdrop-filter", "blur(1px)")) return;
    var ua = navigator.userAgent;
    var iOS = /iP(ad|hone|od)/.test(ua);
    var iOSVer = 0;
    if (iOS) {
      var m = ua.match(/OS (\d+)_/);
      if (m) iOSVer = parseInt(m[1], 10);
    }
    /* 桌面端直接上 soft；iOS 先从 balanced 材质起步，避免把实时模糊成本压到首个交互上。 */
    if (iOS) {
      document.documentElement.dataset.materialTier = "balanced";
    } else {
      document.documentElement.setAttribute("data-blur", "soft");
      document.documentElement.dataset.materialTier = "full";
    }
  } catch (e) { /* 静默降级为基线玻璃 */ }
})();

/* Safari 动效质量调度：保持几何、节奏和颜色不变，只在空闲阶段切换材质成本。
   不依赖 deviceMemory 等 Safari 不稳定暴露的硬件信息，而是测量 Journa 自身的
   交互帧间隔。balanced 是移动 WebKit 的安全起点；连续稳定后才升级 full，出现
   长帧则回退。状态只存在当前会话，不写入账本或用户设置。 */
(function setupMotionQuality() {
  const root = document.documentElement;
  const ua = navigator.userAgent || "";
  const isIOS = /iP(ad|hone|od)/.test(ua) || /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  const isSafariSurface = isIOS || (isSafari && /Macintosh/.test(ua));
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const reducedTransparency = window.matchMedia?.("(prefers-reduced-transparency: reduce)").matches;
  if (isSafariSurface) root.dataset.safariMotion = "true";
  if (!isSafariSurface) {
    root.dataset.motionTier = reducedMotion ? "calm" : "full";
    return;
  }

  root.dataset.motionTier = reducedMotion ? "calm" : "full";
  let materialTier = reducedTransparency
    ? "solid"
    : (root.dataset.materialTier || (isIOS ? "balanced" : "full"));
  let goodSamples = 0;
  let badSamples = 0;
  let sampleRunning = false;
  let sampleTimer = 0;

  const applyMaterialTier = (nextTier) => {
    materialTier = nextTier;
    root.dataset.materialTier = nextTier;
    if (nextTier === "full") root.dataset.blur = "soft";
    else root.removeAttribute("data-blur");
  };

  const sampleFrames = () => {
    if (sampleRunning || document.visibilityState !== "visible" || reducedMotion) return;
    sampleRunning = true;
    const intervals = [];
    const startedAt = performance.now();
    let previous = startedAt;
    const deadline = startedAt + 900;
    const finish = () => {
      sampleRunning = false;
      const sorted = intervals.slice().sort((a, b) => a - b);
      const p95 = sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] : 99;
      const slowRatio = intervals.length ? intervals.filter((interval) => interval > 25).length / intervals.length : 1;
      const smooth = p95 <= 18 && slowRatio <= 0.05;

      if (smooth) {
        goodSamples += 1;
        badSamples = 0;
        if (materialTier === "balanced" && goodSamples >= 3) applyMaterialTier("full");
      } else {
        badSamples += 1;
        goodSamples = 0;
        if (materialTier === "full") applyMaterialTier("balanced");
        else if (badSamples >= 2 && materialTier === "balanced") applyMaterialTier("solid");
      }
    };
    const tick = (now) => {
      const interval = now - previous;
      if (interval > 0) intervals.push(interval);
      previous = now;
      if (now < deadline) requestAnimationFrame(tick);
      else finish();
    };
    requestAnimationFrame(tick);
  };

  const scheduleSample = () => {
    window.clearTimeout(sampleTimer);
    sampleTimer = window.setTimeout(sampleFrames, 140);
  };
  document.addEventListener("pointerup", scheduleSample, { passive: true, capture: true });
  document.addEventListener("touchend", scheduleSample, { passive: true, capture: true });
  window.addEventListener("scroll", scheduleSample, { passive: true });
  window.visualViewport?.addEventListener("scroll", scheduleSample, { passive: true });
  window.addEventListener("resize", scheduleSample, { passive: true });
})();
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
/* 全局主题预设：色值真身在 CSS（variables.css/dark.css 的 [data-theme] 块），
   这里提供设置页文案与无障碍名称。偏好设备级存 localStorage。 */
const THEME_STORAGE_KEY = "travel-ledger-theme";
const MONEY_DECIMALS_STORAGE_KEY = "travel-ledger-show-money-decimals";
const ENTRY_MODE_STORAGE_KEY = "travel-ledger-entry-mode";
const NATURAL_ENTRY_MARKS_HIDDEN_STORAGE_KEY = "travel-ledger-natural-entry-marks-hidden";
const SETTLEMENT_METHOD_STORAGE_KEY = "travel-ledger-settlement-method";
const DEFAULT_SETTLEMENT_METHOD = "simple";
const SETTLEMENT_METHOD_OPTIONS = [
  { id: "simple", label: "最简方案", description: "合并收支，三家最多两笔" },
  { id: "pairwise", label: "当前方案", description: "按家庭之间逐笔对冲" },
];
const THEME_PRESETS = [
  { id: "clay", name: "暖陶", description: "温暖、柔和", color: "#a45e48" },
  { id: "pine", name: "松林", description: "沉静、自然", color: "#2f7b6c" },
  { id: "harbor", name: "海雾", description: "清爽、克制", color: "#5a789f" },
];
const familyColorChoices = [
  { color: "#7eab98", label: "松柏绿" },
  { color: "#849fcd", label: "雾蓝" },
  { color: "#c88f8d", label: "珊瑚粉" },
  { color: "#b9a064", label: "麦金" },
  { color: "#9b8aba", label: "藕紫" },
];
const defaultCategories = ["交通", "住宿", "餐饮", "门票", "购物", "其他"];
// 空状态插画：复用 favicon 的三个交叠圆母题（三家庭色，低饱和）
const emptyStateArt = `<svg class="empty-state-art" viewBox="0 0 96 64" aria-hidden="true" focusable="false"><circle cx="38" cy="26" r="17" fill="#bddbc8" opacity="0.6"/><circle cx="58" cy="25" r="17" fill="#cbd9ef" opacity="0.6"/><circle cx="48" cy="39" r="17" fill="#f2cfce" opacity="0.55"/></svg>`;
const splitModeOptions = [
  { id: "equal", label: "各家均分", description: "每个家庭承担相同金额" },
  { id: "all", label: "按家庭人数", description: "人数多的家庭承担更多" },
  { id: "families", label: "指定家庭 · 按家庭人数", description: "旧账单：指定家庭按人数" },
  { id: "families_equal", label: "指定家庭 · 各家均分", description: "旧账单：指定家庭平均承担" },
  { id: "custom", label: "自定金额", description: "分别填写每家金额" },
];
const splitCore = window.JournaCore.createSplitCore({ splitModeOptions, defaultFamilies });
const {
  normalizePayerId,
  normalizeSplitMode,
  getSplitScopeFromMode,
  getSplitRuleFromMode,
  getSplitModeForState,
  normalizeSplitFamilyIds,
  normalizeSplitAmounts,
} = splitCore;
const categoryVisuals = {
  "交通": { bg: "#d9e8e2", text: "#486d62", border: "rgba(88, 126, 113, 0.28)", gradient: "#b9d8cc" },
  "住宿": { bg: "#dfe5f2", text: "#536782", border: "rgba(92, 112, 145, 0.26)", gradient: "#c1cde2" },
  "餐饮": { bg: "#f1dfce", text: "#7a5b3f", border: "rgba(143, 102, 62, 0.24)", gradient: "#e6c7aa" },
  "门票": { bg: "#eadff0", text: "#69587b", border: "rgba(106, 83, 127, 0.24)", gradient: "#d8c3e3" },
  "购物": { bg: "#eddcdf", text: "#7b565c", border: "rgba(133, 83, 92, 0.24)", gradient: "#e4bdc5" },
  "其他": { bg: "#e5e2d8", text: "#696252", border: "rgba(104, 94, 72, 0.24)", gradient: "#d5cfbd" },
};
const categorySymbolRules = [
  { keywords: ["机票", "飞机", "航空"], symbol: "airplane" },
  { keywords: ["车", "交通", "高铁", "火车", "打车", "出租", "地铁", "公交", "油", "过路"], symbol: "tram.fill" },
  { keywords: ["住", "宿", "酒店", "民宿", "房", "宾馆"], symbol: "bed.double.fill" },
  { keywords: ["餐", "饭", "吃", "早饭", "午饭", "晚饭", "饮", "咖啡", "奶茶", "小吃", "烧烤"], symbol: "fork.knife" },
  { keywords: ["门票", "票", "景区", "乐园", "展", "馆", "演出"], symbol: "ticket.fill" },
  { keywords: ["购物", "买", "超市", "礼物", "纪念品", "商场"], symbol: "cart.fill" },
  { keywords: ["娃", "孩子", "儿童", "宝宝"], symbol: "figure.child" },
  { keywords: ["药", "医疗", "医院"], symbol: "cross.case.fill" },
];
const categorySymbolMarkup = {
  "airplane": `<path d="M3.5 13.2 20.2 5.6c.8-.4 1.5.4 1 1.2l-4.8 5.7 2.4 4.4-1.7.8-3.3-3.3-3.5 3.9.2 2.2-1.5.7-1.5-4.1-3.1-1.7c-1.3-.7-1.6-1.7-.5-2.2Z"/>`,
  "tram.fill": `<path d="M8 3.8h8a3 3 0 0 1 3 3v7.7a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V6.8a3 3 0 0 1 3-3Z"/><path d="M5.8 10.7h12.4M9 18l-1.8 2.2M15 18l1.8 2.2"/><circle cx="8.4" cy="14.1" r=".9" fill="currentColor" stroke="none"/><circle cx="15.6" cy="14.1" r=".9" fill="currentColor" stroke="none"/>`,
  "bed.double.fill": `<path d="M4 18.5V9.2M20 18.5v-6.2a2.3 2.3 0 0 0-2.3-2.3H9.4A2.4 2.4 0 0 0 7 12.4v2.1"/><path d="M4 14.5h16M4 18.5h16"/><path d="M7 10V7.8c0-.7.6-1.3 1.3-1.3h4.4c.7 0 1.3.6 1.3 1.3V10"/>`,
  "fork.knife": `<path d="M7 3.8v6.4M4.8 3.8v3.8A2.2 2.2 0 0 0 7 9.8a2.2 2.2 0 0 0 2.2-2.2V3.8M7 10v10.2M15 3.8v16.4M15 11c2.8 0 4.2-1.4 4.2-3.6S17.8 3.8 15 3.8V11Z"/>`,
  "ticket.fill": `<path d="M4.2 6.5h15.6v3.1a2.7 2.7 0 0 0 0 5.4v2.5H4.2V15a2.7 2.7 0 0 0 0-5.4V6.5Z"/><path d="M12 7.3v2M12 11.1v2M12 14.9v1.8"/>`,
  "cart.fill": `<path d="M3.5 5.2h2.1l2.1 9.1h9.5l2.1-6.5H6.2"/><circle cx="9" cy="18.4" r="1.2" fill="currentColor" stroke="none"/><circle cx="16.3" cy="18.4" r="1.2" fill="currentColor" stroke="none"/>`,
  "figure.child": `<circle cx="12" cy="5.4" r="2.1"/><path d="M8.2 11.2c.9-1.7 2.1-2.6 3.8-2.6s2.9.9 3.8 2.6M12 8.8v6.1M8.8 19.8l3.2-4.9 3.2 4.9M8 13.2l4-1.4 4 1.4"/>`,
  "cross.case.fill": `<rect x="4.2" y="7" width="15.6" height="12.2" rx="2.5"/><path d="M9 7V5.6c0-.9.7-1.6 1.6-1.6h2.8c.9 0 1.6.7 1.6 1.6V7M12 10.2V16M9.1 13.1h5.8"/>`,
  "tag.fill": `<path d="M4.5 5.4v6.1l7.7 7.7a2 2 0 0 0 2.8 0l4.2-4.2a2 2 0 0 0 0-2.8l-7.7-7.7H5.4a.9.9 0 0 0-.9.9Z"/><circle cx="8.3" cy="8.3" r="1.2"/>`,
};
const categoryFallbackMarkup = {
  "airplane": `<path d="M2 16 22 7l-7 15-4-7-9 1ZM11 15l4-4"/>`,
  "tram.fill": `<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M8 18l-2 3M16 18l2 3M8 14h.01M16 14h.01"/>`,
  "bed.double.fill": `<path d="M3 19V9M21 19v-7a2 2 0 0 0-2-2H8a3 3 0 0 0-3 3v2M3 15h18M5 19v-4M19 19v-4M8 10V7h6a3 3 0 0 1 3 3"/>`,
  "fork.knife": `<path d="M7 3v18M4 3v5a3 3 0 0 0 6 0V3M17 3v18M17 3c3 0 4 2 4 5s-1 5-4 5"/>`,
  "ticket.fill": `<path d="M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4V6ZM13 8v2M13 14v2"/>`,
  "cart.fill": `<path d="M2 3h3l2.4 11h10.8L21 7H6M8 18h.01M18 18h.01"/>`,
  "figure.child": `<circle cx="12" cy="5" r="2.5"/><path d="M8 11c1-2 2.2-3 4-3s3 1 4 3M12 8v7M8 20l4-5 4 5M8 13l4-2 4 2"/>`,
  "cross.case.fill": `<rect x="3" y="7" width="18" height="14" rx="3"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M12 11v6M9 14h6"/>`,
  "tag.fill": `<path d="M4 4h7l9 9-7 7-9-9V4Z"/><circle cx="8" cy="8" r="1"/>`,
};
const uiIconPaths = {
  settings: {
    sf: `<path d="M9.6 2.7h4.8l.6 2.2c.5.2 1 .5 1.5.9l2.2-.6 2.4 4.1-1.6 1.6c.1.7.1 1.3 0 2l1.6 1.6-2.4 4.1-2.2-.6c-.5.4-1 .7-1.5.9l-.6 2.2H9.6L9 18c-.6-.2-1.1-.5-1.5-.9l-2.2.6-2.4-4.1L4.5 12a7 7 0 0 1 0-2L2.9 8.4l2.4-4.1 2.2.6c.4-.4.9-.7 1.5-.9l.6-2.3Zm2.4 5.1a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Z"/>`,
    fallback: `<path d="M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.5.3a2 2 0 0 1-2 0l-.1-.1a2 2 0 0 0-2.7.7l-.3.4a2 2 0 0 0 .8 2.7l.1.1a2 2 0 0 1 1 1.7v.5a2 2 0 0 1-1 1.8l-.1.1a2 2 0 0 0-.8 2.7l.3.4a2 2 0 0 0 2.7.7l.1-.1a2 2 0 0 1 2 0l.5.3a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.5-.3a2 2 0 0 1 2 0l.1.1a2 2 0 0 0 2.7-.7l.3-.4a2 2 0 0 0-.8-2.7l-.1-.1a2 2 0 0 1-1-1.8v-.5a2 2 0 0 1 1-1.7l.1-.1a2 2 0 0 0 .8-2.7l-.3-.4a2 2 0 0 0-2.7-.7l-.1.1a2 2 0 0 1-2 0l-.5-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2Z"/><circle cx="12" cy="12" r="3"/>`,
  },
  close: { sf: `<path d="M6.3 4.9 12 10.6l5.7-5.7 1.4 1.4-5.7 5.7 5.7 5.7-1.4 1.4-5.7-5.7-5.7 5.7-1.4-1.4 5.7-5.7-5.7-5.7 1.4-1.4Z"/>`, fallback: `<path d="M18 6 6 18M6 6l12 12"/>` },
  check: { sf: `<path d="m9.8 17.5-5.1-5.1 1.8-1.8 3.3 3.3 7.7-7.7 1.8 1.8-9.5 9.5Z"/>`, fallback: `<path d="m20 6-11 11-5-5"/>` },
  "chevron-right": { sf: `<path d="m9.1 4.7 7.3 7.3-7.3 7.3-1.5-1.6 5.7-5.7-5.7-5.7 1.5-1.6Z"/>`, fallback: `<path d="m9 18 6-6-6-6"/>` },
  "chevron-up": { sf: `<path d="m4.7 14.9 7.3-7.3 7.3 7.3-1.6 1.5-5.7-5.7-5.7 5.7-1.6-1.5Z"/>`, fallback: `<path d="m18 15-6-6-6 6"/>` },
  "chevron-down": { sf: `<path d="m4.7 9.1 7.3 7.3 7.3-7.3-1.6-1.5-5.7 5.7-5.7-5.7-1.6 1.5Z"/>`, fallback: `<path d="m6 9 6 6 6-6"/>` },
  plus: { sf: `<path d="M10.8 4h2.4v6.8H20v2.4h-6.8V20h-2.4v-6.8H4v-2.4h6.8V4Z"/>`, fallback: `<path d="M12 5v14M5 12h14"/>` },
  minus: { sf: `<path d="M4 10.8h16v2.4H4z"/>`, fallback: `<path d="M5 12h14"/>` },
  edit: { sf: `<path d="m15.7 3.7 4.6 4.6-9.8 9.8-5.7 1.1 1.1-5.7 9.8-9.8Zm-8 10.8-.4 2.2 2.2-.4 7.9-8-1.7-1.7-8 7.9Z"/>`, fallback: `<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>` },
  trash: { sf: `<path d="M8.2 3.5h7.6l.8 2H21v2H3v-2h4.4l.8-2ZM5.4 9h13.2l-.8 11.5H6.2L5.4 9Z"/>`, fallback: `<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4h8v2M10 11v6M14 11v6"/>` },
  filter: { sf: `<path d="M3.5 5h17l-6.4 7.2v5.4l-4.2 2.1v-7.5L3.5 5Z"/>`, fallback: `<path d="M4 5h16l-6 7v5l-4 2v-7Z"/>` },
  book: { sf: `<path d="M4 3.5h12.5A3.5 3.5 0 0 1 20 7v13.5H7.2A3.2 3.2 0 0 1 4 17.3V3.5Zm3.2 12.7a1.3 1.3 0 0 0 0 2.6H18v-2.6H7.2Z"/>`, fallback: `<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>` },
  cloud: { sf: `<path d="M8.8 19.5a6.3 6.3 0 1 1 5.9-8.5h2a4.3 4.3 0 1 1 0 8.5H8.8Z"/>`, fallback: `<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9Z"/>` },
  link: { sf: `<path d="M8.3 14.1 6.4 16A2.4 2.4 0 0 1 3 12.6l3.6-3.7A2.4 2.4 0 0 1 10 9l1.7-1.7a4.8 4.8 0 0 0-6.8-.1l-3.6 3.7a4.8 4.8 0 1 0 6.8 6.8l1.9-1.9-1.7-1.7Zm7.4-4.2L17.6 8a2.4 2.4 0 0 1 3.4 3.4l-3.6 3.7A2.4 2.4 0 0 1 14 15l-1.7 1.7a4.8 4.8 0 0 0 6.8.1l3.6-3.7a4.8 4.8 0 1 0-6.8-6.8L14 8.2l1.7 1.7ZM7.9 13.3l5.4-5.4 2.8 2.8-5.4 5.4-2.8-2.8Z"/>`, fallback: `<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7.1-7.1l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7.1 7.1l1.7-1.7"/>` },
  download: { sf: `<path d="M10.7 3h2.6v9.4l3-3 1.8 1.8-6.1 6.1-6.1-6.1 1.8-1.8 3 3V3ZM3 18h18v3H3z"/>`, fallback: `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>` },
  upload: { sf: `<path d="M10.7 21h2.6v-9.4l3 3 1.8-1.8-6.1-6.1-6.1 6.1 1.8 1.8 3-3V21ZM3 3h18v3H3z"/>`, fallback: `<path d="M17 8l-5-5-5 5M12 3v12M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>` },
  database: { sf: `<path d="M3 5c0-2 4-3.5 9-3.5S21 3 21 5v4c0 2-4 3.5-9 3.5S3 11 3 9V5Zm0 7c1.8 1.5 5.2 2.2 9 2.2s7.2-.7 9-2.2v3.5c0 2-4 3.5-9 3.5s-9-1.5-9-3.5V12Z"/>`, fallback: `<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>` },
  help: { sf: `<path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm0 14.6a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6Zm0-10.9c-2.2 0-3.8 1.2-4.1 3.2h2.5c.2-.8.8-1.2 1.6-1.2 1 0 1.7.6 1.7 1.5 0 .8-.4 1.2-1.5 1.9-1.2.8-1.7 1.7-1.6 3.2h2.3c0-.9.3-1.3 1.4-2 1.3-.8 2-1.9 2-3.3 0-2-1.8-3.3-4.3-3.3Z"/>`, fallback: `<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 1 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>` },
};

function uiIconSvgHtml(name) {
  const icon = uiIconPaths[name] || uiIconPaths.help;
  return `<svg class="ui-icon ui-icon-sf" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icon.sf}</svg><svg class="ui-icon ui-icon-fallback" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icon.fallback}</svg>`;
}

function uiIconHtml(name, className = "") {
  return `<span class="ui-icon-pair${className ? ` ${className}` : ""}" aria-hidden="true">${uiIconSvgHtml(name)}</span>`;
}

function hydrateUiIcons(root = document) {
  root.querySelectorAll("[data-ui-icon]").forEach((host) => {
    host.innerHTML = uiIconSvgHtml(host.dataset.uiIcon);
  });
}
const customCategoryVisuals = [
  { bg: "#dde8df", text: "#506b56", border: "rgba(82, 112, 90, 0.24)", gradient: "#c2d9c7" },
  { bg: "#e0e6ee", text: "#536578", border: "rgba(83, 102, 128, 0.24)", gradient: "#c5d2df" },
  { bg: "#eee0d1", text: "#735d46", border: "rgba(126, 95, 61, 0.24)", gradient: "#dfc7ad" },
  { bg: "#e8dfed", text: "#65566f", border: "rgba(100, 80, 116, 0.24)", gradient: "#d3c2dc" },
  { bg: "#dce8e6", text: "#4f6c68", border: "rgba(78, 111, 104, 0.24)", gradient: "#bdd8d4" },
];
const todayIso = () => {
  const today = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
};

const elements = {
  ledgerView: document.querySelector("#ledgerView"),
  settingsView: document.querySelector("#settingsView"),
  settingsDrawer: document.querySelector("#settingsView .settings-drawer"),
  settingsEyebrow: document.querySelector("#settingsEyebrow"),
  settingsTitle: document.querySelector("#settingsTitle"),
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
  importLedgerButton: document.querySelector("#importLedgerButton"),
  importLedgerInput: document.querySelector("#importLedgerInput"),
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
  mobileExpenseCount: document.querySelector("#mobileExpenseCount"),
  journeyStateLabel: document.querySelector("#journeyStateLabel"),
  journeyLedgerName: document.querySelector("#journeyLedgerName"),
  journeyDateRange: document.querySelector("#journeyDateRange"),
  journeyDayGrid: document.querySelector("#journeyDayGrid"),
  journeyPeak: document.querySelector("#journeyPeak"),
  journeyFamilyTrack: document.querySelector("#journeyFamilyTrack"),
  expenseForm: document.querySelector("#expenseForm"),
  naturalEntryFlow: document.querySelector("#naturalEntryFlow"),
  naturalEntryHint: document.querySelector("#naturalEntryHint"),
  naturalDateToken: document.querySelector("#naturalDateToken"),
  naturalPayerToken: document.querySelector("#naturalPayerToken"),
  naturalAmountToken: document.querySelector("#naturalAmountToken"),
  naturalCategoryToken: document.querySelector("#naturalCategoryToken"),
  naturalNoteToken: document.querySelector("#naturalNoteToken"),
  naturalSplitToken: document.querySelector("#naturalSplitToken"),
  naturalEntryFocusBackdrop: document.querySelector("#naturalEntryFocusBackdrop"),
  naturalEntryStage: document.querySelector("#naturalEntryStage"),
  naturalEntryStageToken: document.querySelector("#naturalEntryStageToken"),
  naturalEntryStageContent: document.querySelector("#naturalEntryStageContent"),
  amountInput: document.querySelector("#amountInput"),
  amountAutoBadge: document.querySelector("#amountAutoBadge"),
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
  categoryAddFab: document.querySelector("#categoryAddFab"),
  categoryAddConfirm: document.querySelector("#categoryAddConfirm"),
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
  splitParticipantToggle: document.querySelector("#splitParticipantToggle"),
  splitParticipantSummary: document.querySelector("#splitParticipantSummary"),
  splitFamilyChoices: document.querySelector("#splitFamilyChoices"),
  splitCustomAmounts: document.querySelector("#splitCustomAmounts"),
  settingsCategoryChips: document.querySelector("#settingsCategoryChips"),
  settingsFamilyList: document.querySelector("#settingsFamilyList"),
  settingsThemeList: document.querySelector("#settingsThemeList"),
  settingsFamilyColorList: document.querySelector("#settingsFamilyColorList"),
  ledgerNameForm: document.querySelector("#ledgerNameForm"),
  currentLedgerNameInput: document.querySelector("#currentLedgerNameInput"),
  saveLedgerNameButton: document.querySelector("#saveLedgerNameButton"),
  settingsOperatorForm: document.querySelector("#settingsOperatorForm"),
  settingsOperatorFamilyList: document.querySelector("#settingsOperatorFamilyList"),
  settingsMoneyDecimalsInput: document.querySelector("#settingsMoneyDecimalsInput"),
  settingsNaturalEntryMarksHiddenInput: document.querySelector("#settingsNaturalEntryMarksHiddenInput"),
  settingsEntryModeList: document.querySelector("#settingsEntryModeList"),
  settingsSettlementMethodList: document.querySelector("#settingsSettlementMethodList"),
  operatorModalView: document.querySelector("#operatorModalView"),
  operatorModalForm: document.querySelector("#operatorModalForm"),
  operatorModalFamilyList: document.querySelector("#operatorModalFamilyList"),
  operatorModalBackdrop: document.querySelector("#operatorModalView .operator-modal-backdrop"),
  welcomeView: document.querySelector("#welcomeView"),
  welcomeTrack: document.querySelector("#welcomeTrack"),
  welcomeDots: document.querySelector("#welcomeDots"),
  welcomeSkipButton: document.querySelector("#welcomeSkipButton"),
  welcomeNextButton: document.querySelector("#welcomeNextButton"),
  welcomeNextLabel: document.querySelector("#welcomeNextLabel"),
  welcomeHeroEyebrow: document.querySelector("#welcomeHeroEyebrow"),
  welcomeTitle: document.querySelector("#welcomeTitle"),
  welcomeHeroCopy: document.querySelector("#welcomeHeroCopy"),
  welcomeCloudTitle: document.querySelector("#welcomeCloudTitle"),
  welcomeCloudCopy: document.querySelector("#welcomeCloudCopy"),
  welcomeIdentityFamilyList: document.querySelector("#welcomeIdentityFamilyList"),
  welcomeIdentityHint: document.querySelector("#welcomeIdentityHint"),
  welcomeSourceBadge: document.querySelector("#welcomeSourceBadge"),
  welcomeSourceBadgeText: document.querySelector("#welcomeSourceBadgeText"),
  openWelcomeButton: document.querySelector("#openWelcomeButton"),
  currentLedgerSummary: document.querySelector("#currentLedgerSummary"),
  ledgerManagerList: document.querySelector("#ledgerManagerList"),
  settingsDataSummary: document.querySelector("#settingsDataSummary"),
  paidByFamily: document.querySelector("#paidByFamily"),
  categorySummaryBlock: document.querySelector("#categorySummaryBlock"),
  categorySummary: document.querySelector("#categorySummary"),
  settlementList: document.querySelector("#settlementList"),
  settlementEntryButton: document.querySelector("#settlementEntryButton"),
  settlementEntrySub: document.querySelector("#settlementEntrySub"),
  settlementEntryCount: document.querySelector("#settlementEntryCount"),
  mobileSettlementEntryButton: document.querySelector("#mobileSettlementEntryButton"),
  mobileSettlementEntrySub: document.querySelector("#mobileSettlementEntrySub"),
  mobileSettlementEntryCount: document.querySelector("#mobileSettlementEntryCount"),
  settlementCountBadge: document.querySelector("#settlementCountBadge"),
  settlementSettingsPanel: document.querySelector("#settlementSettingsPanel"),
  ledgerFamilyFilter: document.querySelector("#ledgerFamilyFilter"),
  ledgerCategoryFilter: document.querySelector("#ledgerCategoryFilter"),
  ledgerFilterSummary: document.querySelector("#ledgerFilterSummary"),
  ledgerFilterToggle: document.querySelector("#ledgerFilterToggle"),
  ledgerFilterPanel: document.querySelector("#ledgerFilterPanel"),
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
// 每次重新打开应用都从今天开始填写新账单；进入编辑已有账单时，
// startEditExpense() 会用账单原日期覆盖这个默认值。
state.activeDate = todayIso();
let activeSplitMode = "equal";
let activeSplitFamilyIds = state.families.map((family) => family.id);
let activeSplitAmounts = {};
const naturalEntryHelpers = window.JournaModules.createNaturalEntryHelpers({
  entryModeStorageKey: ENTRY_MODE_STORAGE_KEY,
  marksHiddenStorageKey: NATURAL_ENTRY_MARKS_HIDDEN_STORAGE_KEY,
  todayIso,
  getElements: () => elements,
  getState: () => state,
  getActiveSplitMode: () => activeSplitMode,
  getActiveSplitFamilyIds: () => activeSplitFamilyIds,
  getFamilyName: (familyId) => getFamilyName(familyId),
  getSplitRuleFromMode: (mode) => getSplitRuleFromMode(mode),
  getSplitScopeFromMode: (mode) => getSplitScopeFromMode(mode),
});
const {
  getEntryMode,
  applyNaturalEntryMarksPreference,
  formatNaturalEntryDate,
  formatNaturalEntrySplit,
  formatNaturalEntryAmount,
  setNaturalAmountTokenDisplay,
} = naturalEntryHelpers;
const ledgerViewHelpers = window.JournaModules.createLedgerViewHelpers({
  getState: () => state,
  isCloudLedgerActive: () => isCloudLedgerActive(),
  normalizeExpenseSyncState: (syncState) => normalizeExpenseSyncState(syncState),
  expenseToCents,
  escapeHtml: (value) => escapeHtml(value),
});
const {
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
} = ledgerViewHelpers;
const ledgerInteractionHelpers = window.JournaModules.createLedgerInteractionHelpers({
  getElements: () => elements,
  getActiveMobilePanel: () => activeMobilePanel,
  getMobileSubmitBarLedgerHidden: () => mobileSubmitBarLedgerHidden,
  setMobileSubmitBarLedgerHidden: (value) => { mobileSubmitBarLedgerHidden = value; },
  prefersReducedMotion: () => prefersReducedMotion(),
  uiIconHtml: (name) => uiIconHtml(name),
  syncLedgerItemNoteState: (item) => syncLedgerItemNoteState(item),
});
const {
  canAnimateLedgerMorph,
  syncLedgerMobileSubmitBar,
  cancelLedgerItemAnimations,
  syncLedgerItemExpandedState,
  finalizeLedgerItemState,
} = ledgerInteractionHelpers;
const settingsPreferences = window.JournaModules.createSettingsPreferences({
  themePresets: THEME_PRESETS,
  legacyThemeIdMap: { lotus: "harbor", malt: "clay" },
  themeStorageKey: THEME_STORAGE_KEY,
  getElements: () => elements,
  escapeHtml: (value) => escapeHtml(value),
});
const {
  normalizeThemeId,
  getActiveThemeId,
  migrateThemePreference,
  syncThemeColorMeta,
  renderThemePresetList,
} = settingsPreferences;
const welcomeContent = window.JournaModules.createWelcomeContent({
  copy: COPY.welcome,
  getElements: () => elements,
});
const { applyShareSourceHero } = welcomeContent;
const mobileViewportCoordinator = window.JournaModules.createMobileViewportCoordinator({
  getNaturalEntryStageOpen: () => naturalEntryStageOpen,
  getActiveEntryEditor: () => activeEntryEditor,
  scrollNaturalEntrySplitInputIntoView: (input) => scrollNaturalEntrySplitInputIntoView(input),
});
// 自定金额允许“先填总额”或“先填各家金额”。null 表示总额尚未被用户明确指定，
// 此时各家金额合计就是当前总额；保留为 UI 草稿，不改变持久化结构。
let customSplitTargetCents = null;
let customSplitSuspendedAmounts = {};
let customSplitAmountDrafts = {};
let splitScopeOpen = false;
let splitFamilyChoicesOpen = true;
let activeFamilyColorFamilyId = state.families[0]?.id || defaultFamilies[0].id;
let activeEntryEditor = "amount";
let naturalEntryStageOpen = false;
let naturalEntryStageEditor = null;
let naturalEntryStageAnchor = null;
let naturalEntryStagePositionFrame = 0;
let naturalEntryStageRunId = 0;
let naturalEntryMotionAnims = [];
let naturalEntryFrozenAnchor = null;
let naturalEntryStageHeightTransitionHandler = null;
let naturalEntryStageHeightResetTimer = 0;
const naturalEntryNoteFinishedAnimations = new WeakSet();
const naturalEntryEditorHomes = new Map();
let splitScopeCloseTimer = 0;
let naturalEntryStageCloseTimer = 0;
let naturalEntryStageHandoffTimer = 0;
let naturalEntryStageCleanupTimer = 0;
let naturalEntryStageOpenHandoffTimer = 0;
let naturalEntryStageOpenFinishTimer = 0;
let naturalEntryMaterialSettleFrame = 0;
let naturalEntryMaterialSettleFrame2 = 0;
let naturalEntryMaterialSettleTimer = 0;
let ledgerNoteMeasureFrame = 0;
let naturalEntryAmountHandoffRunning = false;
let naturalEntryLensEntryTimer = 0;
let naturalEntryLensHasRevealed = false;
let naturalEntryFamilyTintInitialized = false;
let naturalEntryDisplayedPayerId = "";
let pendingNaturalEntryFamilyTintId = null;
const naturalEntryLensSettleTimers = new Map();

function clearNaturalEntryMaterialSettle() {
  window.cancelAnimationFrame(naturalEntryMaterialSettleFrame);
  window.cancelAnimationFrame(naturalEntryMaterialSettleFrame2);
  window.clearTimeout(naturalEntryMaterialSettleTimer);
  naturalEntryMaterialSettleFrame = 0;
  naturalEntryMaterialSettleFrame2 = 0;
  naturalEntryMaterialSettleTimer = 0;
  document.body.classList.remove("natural-entry-focus-settled");
}

function scheduleNaturalEntryMaterialSettle() {
  clearNaturalEntryMaterialSettle();
  if (prefersReducedMotion()) {
    document.body.classList.add("natural-entry-focus-settled");
    return;
  }
  naturalEntryMaterialSettleFrame = window.requestAnimationFrame(() => {
    naturalEntryMaterialSettleFrame = 0;
    naturalEntryMaterialSettleFrame2 = window.requestAnimationFrame(() => {
      naturalEntryMaterialSettleFrame2 = 0;
      naturalEntryMaterialSettleTimer = window.setTimeout(() => {
        naturalEntryMaterialSettleTimer = 0;
        if (naturalEntryStageOpen) document.body.classList.add("natural-entry-focus-settled");
      }, 120);
    });
  });
}
let splitScopeSwitching = false;
let splitScopeSwitchTimer = 0;
let mobileSubmitFeedbackTimer = 0;
let activatingSplitMode = "";
let deactivatingSplitMode = "";
let splitModeStructureTimer = 0;
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
/* 指示灯停靠坐标在“展开/收起”切换、旋屏、账本改名时失效，先标脏，
   下次滚动进 zone 时一次性重算（避免每帧强制重排）。 */
let dockCoordsDirty = true;
let toastTimer = 0;
let settingsCloseTimer = 0;
let ledgerManagementCloseTimer = 0;
let ledgerSwitchTimer = 0;
let mobilePanelSwitchTimer = 0;
let mobilePanelIndicatorTimer = 0;
let barMorphTimer = 0;
let ledgerMorphRunId = 0;
let barFlipAnimations = [];
let barFlipRunId = 0;
let categoryAddMorphAnimations = [];
let categoryAddMorphRunId = 0;
let categoryAddViewportTimer = 0;
let categoryAddViewportCleanup = null;
let editReturnState = null;
let editFormSnapshot = null;
let totalAmountText = "";
let totalAmountSwapTimer = 0;
let hasPlayedInitialTotalReveal = false;
let totalRevealFrameId = 0;
let totalRevealTargetText = "";
let hasPlayedInitialExpenseCountReveal = false;
let expenseCountRevealFrameId = 0;
let expenseCountRevealTargetText = "";
let amountLabelScrollFrameId = 0;
const amountTrackAnimations = new WeakMap();
const naturalEntryTokenAnimations = new WeakMap();
const splitTextMorphAnimations = new WeakMap();
let amountMeasureContext = null;
let desktopPointerSinkFrame = 0;
let desktopPointerSinkTarget = null;
let desktopPointerSinkFocusTarget = null;
let desktopPointerSinkPoint = null;
let desktopPointerSinkRect = null;
let desktopPointerSinkLastValues = null;
let desktopInsightsTouched = false;
const desktopPointerQuery = window.matchMedia("(min-width: 1180px) and (hover: hover) and (pointer: fine)");
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
/* 云端请求可能嵌套或并行（例如拉取过程中补传待同步账单），用计数保持
   指示灯直到最后一个请求结束，避免某个子请求提前把“同步中”状态清掉。 */
let cloudBusyDepth = 0;

function enterCloudBusy() {
  cloudBusyDepth += 1;
  if (cloudBusyDepth === 1) {
    cloudBusy = true;
    updateCloudControls();
  }
}

function leaveCloudBusy() {
  cloudBusyDepth = Math.max(0, cloudBusyDepth - 1);
  if (cloudBusyDepth === 0 && cloudBusy) {
    cloudBusy = false;
    updateCloudControls();
  }
}

/* ── 实时协同：Supabase Realtime Broadcast ──
   每个云账本占用一个频道 ledger:<share_token>。写入方保存成功后广播 changed，
   其他同账本客户端收到后立即 pullCloudLedger()。生命周期拉取仍作兜底。
   SDK 按需加载；若网络或脚本失败则全部静默降级，不阻塞本地账本。 */
let realtimeClient = null;
let realtimeClientPromise = null;
let realtimeChannel = null;
let realtimePullTimer = null;
let realtimeBroadcastTimer = null;
let realtimeBroadcastPending = false;

async function getRealtimeClient() {
  if (realtimeClient) return realtimeClient;
  if (!isCloudConfigured()) return null;
  /* 离线时不为实时通道加载第三方 SDK；online 事件会触发生命周期同步并重建订阅。 */
  if (navigator.onLine === false) return null;
  if (realtimeClientPromise) return realtimeClientPromise;

  realtimeClientPromise = loadSupabaseSdk("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2").then((sdk) => {
    try {
      realtimeClient = sdk.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        realtime: { params: { eventsPerSecond: 5 } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
    } catch (error) {
      realtimeClient = null;
    }
    return realtimeClient;
  }).catch(() => null).finally(() => {
    realtimeClientPromise = null;
  });

  return realtimeClientPromise;
}

async function subscribeLedgerRealtime(shareToken) {
  const client = await getRealtimeClient();
  if (!client || !shareToken) return;
  unsubscribeLedgerRealtime();
  const channel = client.channel(`ledger:${shareToken}`, {
    config: { broadcast: { self: false } },
  });
  channel.on("broadcast", { event: "changed" }, () => {
    scheduleRealtimePull();
  });
  channel.subscribe();
  realtimeChannel = channel;
}

function unsubscribeLedgerRealtime() {
  if (realtimeChannel) {
    try {
      realtimeChannel.unsubscribe();
    } catch (error) { /* 忽略 */ }
    realtimeChannel = null;
  }
}

function syncRealtimeSubscription() {
  if (isCloudLedgerActive() && cloudState.shareToken) {
    subscribeLedgerRealtime(cloudState.shareToken).catch(() => {});
  } else {
    unsubscribeLedgerRealtime();
  }
}

function broadcastLedgerChanged() {
  if (!realtimeChannel) return;
  try {
    realtimeChannel.send({ type: "broadcast", event: "changed", payload: {} });
  } catch (error) { /* 忽略 */ }
}

/* 合并短时间内的多次写入为一次广播，避免批量保存时刷屏 */
function notifyLedgerChanged() {
  if (cloudBusy) return; // 拉取/手动同步过程中的重试不二次广播，避免风暴
  realtimeBroadcastPending = true;
  if (realtimeBroadcastTimer) return;
  realtimeBroadcastTimer = window.setTimeout(() => {
    realtimeBroadcastTimer = null;
    if (realtimeBroadcastPending) {
      realtimeBroadcastPending = false;
      broadcastLedgerChanged();
    }
  }, 400);
}

/* 收到他人广播后节流拉取一次，避免多人同时改动时雪崩 */
function scheduleRealtimePull() {
  if (realtimePullTimer) return;
  realtimePullTimer = window.setTimeout(() => {
    realtimePullTimer = null;
    if (cloudBusy) return; // 正忙则交给下一次生命周期拉取兜底
    if (isCloudLedgerActive()) pullCloudLedger().catch(() => {});
  }, 600);
}

let syncStatusWasSyncing = false;
let syncLampTimer = 0;
let syncLampDockFlashTimer = 0;
/* 同步中至少展示时长：快速同步不足此时长时挂起收尾渲染，避免状态“闪一下” */
const SYNC_MIN_VISIBLE_MS = 800;
let syncShownAt = 0;
let syncHoldTimer = 0;
let cloudReady = false;
/* 上一次云端拉取/保存的持久化错误标签：同步中会被 syncing 态覆盖，非同步中时沿用，
   直到下一次成功同步清除。用于把“账本不存在/网络异常”等具体失败原因透出到同步指示灯。 */
let cloudErrorLabel = "";
let pendingSettingsSync = 0;
let confirmResolve = null;
let confirmCloseTimer = 0;
let settlementRevealTimer = 0;
let settlementAmountRevealTimer = 0;
let settlementAmountRevealFrameId = 0;
let settlementEntryReminderTimer = 0;
let settlementEntryReminderCleanupTimer = 0;
let settlementEntryReminderResumeTimer = 0;
let settlementEntryReminderHasPending = false;
let settlementEntryReminderInView = false;
const settlementEntryVisibility = new Map();
const SETTLEMENT_ENTRY_REMINDER_INITIAL_MS = 8000;
const SETTLEMENT_ENTRY_REMINDER_REPEAT_MS = 14000;
const SETTLEMENT_ENTRY_REMINDER_DURATION_MS = 980;
let settingsReturnFocus = null;
let ledgerManagementReturnFocus = null;
let ledgerManagementReturnToSettings = false;
let settingsReturnScrollTop = 0;
let confirmReturnFocus = null;
let activeMobilePanel = "data";
let settingsMode = "settings";
let mobileSubmitBarLedgerHidden = null;
let ledgerFiltersExpanded = false;

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
    /* lastSyncedAt：上次成功与云端对齐设置的时间戳。LWW 据此判断「本地是否有未同步的设置改动」，
       避免首次 join 云账本时本地空账本的 updatedAt=now 误判为「比远端新」从而覆盖远端真实设置。 */
    lastSyncedAt: normalizeTimestamp(raw.lastSyncedAt),
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
    lastSyncedAt: "",
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
    defaultFamilies.map((family) => {
      const visual = source[family.id] || familyVisualsFromRows[family.id] || defaultFamilyVisuals[family.id];
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
    const familyId = normalizePayerId(val.familyId);
    const name = String(val.name || "").trim();
    if (familyId) return { familyId };
    return name ? { name } : null;
  }
  const name = String(val).trim();
  return name ? { name } : null;
}

/* 兼容旧版本把自定分摊金额按“分”写进了“元”字段的历史账单。
   仅在分摊合计恰好是账单总额的 100 倍时修复，避免改变任何正常的自定金额。 */
function normalizePersistedSplitAmounts(amount, splitMode, rawAmounts) {
  const normalized = normalizeSplitAmounts(rawAmounts);
  if (normalizeSplitMode(splitMode) !== "custom") return normalized;

  const totalCents = amountToCents(amount);
  const storedTotalCents = defaultFamilies.reduce(
    (sum, family) => sum + amountToCents(normalized[family.id]),
    0,
  );
  if (!totalCents || storedTotalCents !== totalCents * 100) return normalized;

  const repaired = Object.fromEntries(
    defaultFamilies.map((family) => [
      family.id,
      centsToAmount(amountToCents(normalized[family.id]) / 100),
    ]),
  );
  const repairedTotalCents = defaultFamilies.reduce(
    (sum, family) => sum + amountToCents(repaired[family.id]),
    0,
  );
  return repairedTotalCents === totalCents ? repaired : normalized;
}

function normalizeExpense(expense) {
  const splitMode = normalizeSplitMode(expense.splitMode);
  const splitScope = getSplitScopeFromMode(splitMode);
  const splitRule = getSplitRuleFromMode(splitMode);
  const updatedAt = expense.updatedAt || new Date().toISOString();
  return {
    id: expense.id,
    amount: centsToAmount(amountToCents(expense.amount)),
    payerId: normalizePayerId(expense.payerId),
    category: normalizeCategory(expense.category),
    note: String(expense.note || "").trim(),
    date: normalizeDate(expense.date),
    splitMode,
    splitScope,
    splitRule,
    splitFamilyIds: normalizeSplitFamilyIds(expense.splitFamilyIds, splitScope === "selected" ? defaultFamilies.map((family) => family.id) : []),
    splitAmounts: normalizePersistedSplitAmounts(expense.amount, splitMode, expense.splitAmounts),
    createdBy: normalizeOperator(expense.createdBy),
    updatedBy: normalizeOperator(expense.updatedBy),
    syncState: normalizeExpenseSyncState(expense.syncState),
    isDeleted: Boolean(expense.isDeleted),
    // 旧账单没有 createdAt 时，用现有更新时间兼容回填；后续编辑不会改变时间线位置。
    createdAt: expense.createdAt || updatedAt,
    updatedAt,
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

/* 墓碑垃圾回收：删除只置 isDeleted=true 从不移除，长期使用会撑爆 localStorage。
   仅在账单「已同步到云端(synced)」且撤销 toast 窗口已过时真正移除，
   这样本地撤销仍可用、离线未同步的删除也不丢。 */
function gcDeletedExpenses() {
  if (!state.expenses.length) return;
  const before = state.expenses.length;
  state.expenses = state.expenses.filter(
    (expense) => !(expense.isDeleted && normalizeExpenseSyncState(expense.syncState) === "synced"),
  );
  if (state.expenses.length !== before) saveState();
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  } catch (error) {
    /* Safari 私密模式 / 配额超限 / ITP 清空后写回失败：吞掉异常并提示，
       避免一次配额错误让整条事件处理链崩溃且用户无感知。 */
    showToast({ message: "本地存储已满或不可用，建议导出备份后清理" });
  }
}

/* render() 每次都触发 saveState；账目多后 JSON.stringify(整个 appState)
   是主线程长任务（多账本、几百条记录时可达十几 ms）。改为 400ms 防抖合写，
   离散事件（提交/删除/同步回调）仍可直调 saveState() 立即落盘。
   页面转入后台/关闭时 flush，保证防抖窗口内的状态不丢。 */
const SAVE_STATE_DEBOUNCE_MS = 400;
let saveStateTimer = 0;

function scheduleSaveState() {
  window.clearTimeout(saveStateTimer);
  saveStateTimer = window.setTimeout(() => {
    saveStateTimer = 0;
    saveState();
  }, SAVE_STATE_DEBOUNCE_MS);
}

function flushPendingSave() {
  if (!saveStateTimer) return;
  window.clearTimeout(saveStateTimer);
  saveStateTimer = 0;
  saveState();
}

window.addEventListener("pagehide", flushPendingSave);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flushPendingSave();
});

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
    return { state: "local", label: COPY.localLedger, detail: "尚未开启同步", pending: 0, failed: 0 };
  }
  if (!isCloudLedgerActive()) {
    return { state: "local-ready", label: COPY.localLedger, detail: "可以创建云账本", pending: 0, failed: 0 };
  }
  const pending = state.expenses.filter((expense) => normalizeExpenseSyncState(expense.syncState) === "pending").length;
  const failed = state.expenses.filter((expense) => normalizeExpenseSyncState(expense.syncState) === "failed").length;
  if (cloudBusy) return { state: "syncing", label: "同步中", detail: "正在保存最新账单", pending, failed };
  if (failed) return { state: "failed", label: "等待重试", detail: `${failed} 笔账单会在联网后重试`, pending, failed };
  if (pending) return { state: "pending", label: "等待同步", detail: `${pending} 笔账单会在联网后同步`, pending, failed };
  const pulledAt = cloudState.lastPulledAt ? `上次同步 ${formatUpdatedAt(cloudState.lastPulledAt)}` : "云账本已开启";
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
    const err = new Error(message || `Supabase 请求失败：${response.status}`);
    err.status = response.status;
    throw err;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/**
 * 判断 Supabase 后端是否“整体不可达”（区别于某个账本不存在）。
 * 覆盖三类情形：
 *   1. 网络层失败：断网 / DNS 解析失败（如项目被 pause 后域名 NXDOMAIN）→ fetch 抛 TypeError
 *   2. 源站 5xx：Cloudflare 521 / 502 / 503 / 504（项目刚恢复、仍在热身，或已被删除）
 *   3. 消息中带 Cloudflare / 连接失败特征
 * 注意：数据库显式抛 'Ledger not found' (P0002) 是 400/404，且消息不含上述特征，不会被误判。
 */
function isSupabaseBackendUnavailable(error) {
  if (!error) return false;
  if (error instanceof TypeError) return true; // 浏览器对网络/DNS 失败统一抛 TypeError
  if (typeof error.status === "number" && error.status >= 500) return true;
  const message = String(error?.message || "");
  return /Failed to fetch|NetworkError|Network request failed|The network connection was lost|Web server is down|cloudflare|ERR_|\b5\d\d\b/i.test(message);
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
        amount: centsToAmount(amountToCents(expense.amount)),
        payerId: normalizePayerId(expense.payer_id),
        category: normalizeCategory(expense.category),
        note: String(expense.note || "").trim(),
        date: normalizeDate(expense.expense_date),
        splitMode: normalizeSplitMode(expense.split_mode),
        splitScope: getSplitScopeFromMode(expense.split_mode),
        splitRule: getSplitRuleFromMode(expense.split_mode),
        splitFamilyIds: normalizeSplitFamilyIds(expense.split_family_ids),
        splitAmounts: normalizePersistedSplitAmounts(expense.amount, expense.split_mode, expense.split_amounts),
        createdBy: normalizeOperator(expense.created_by),
        updatedBy: normalizeOperator(expense.updated_by),
        syncState: "synced",
        isDeleted: Boolean(expense.is_deleted),
        createdAt: expense.created_at || expense.updated_at || new Date().toISOString(),
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

  enterCloudBusy();
  try {
    const payload = await supabaseRpc("get_travel_ledger", { p_share_token: cloudState.shareToken });
    cloudErrorLabel = "";
    const remote = normalizeRemotePayload(payload);

    // LWW Merge for settings：仅当本地有「未同步的设置改动」(updatedAt > lastSyncedAt) 才保留本地设置。
    //   首次 join 云账本时 lastSyncedAt 为空 → 不触发 → 用远端真实设置，避免本地空账本覆盖远端。
    if (state.updatedAt && state.lastSyncedAt && state.updatedAt > state.lastSyncedAt && remote.updatedAt < state.updatedAt) {
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
    state.lastSyncedAt = cloudState.lastPulledAt;
    saveCloudState();
    render({ skipCloudSave: true, animateFinancialChanges: announce && hasPlayedInitialTotalReveal });
    /* 远端墓碑已合并并对齐，清理本地已同步的墓碑释放存储（撤销窗口已过的删除条目）。 */
    gcDeletedExpenses();
    if (announce) showToast({ message: "云账本已同步" });
    const unsyncedExpenses = state.expenses.filter((expense) => ["pending", "failed"].includes(normalizeExpenseSyncState(expense.syncState)));
    if (unsyncedExpenses.length) syncPendingCloudExpenses({ silent: true }).catch(() => {});
    return true;
  } catch (error) {
    cloudReady = false;
    /* 三种失败原因，按优先级区分：
       1. 后端整体不可达：断网 / DNS 解析失败（项目被 pause 时域名 NXDOMAIN） / 源站 5xx（刚恢复热身、或被删）
          → fetch 抛 TypeError 或返回 5xx，应提示“云端服务可能不可用”。
       2. 账本不存在：get_travel_ledger 在 token 无对应行时由数据库抛 'Ledger not found' (errcode P0002)。
       3. 其他（认证、字段、4xx 等）。
       优先级：先判后端不可达（覆盖最广），再判账本不存在，最后兜底为通用同步失败。 */
    const backendDown = isSupabaseBackendUnavailable(error);
    const ledgerMissing = !backendDown && /Ledger not found|P0002/i.test(String(error?.message || ""));
    let label, toast;
    if (backendDown) {
      label = "云端不可用";
      toast = "云端服务暂时不可用，账单已保存在本机，联网后会重试";
    } else if (ledgerMissing) {
      label = "链接已失效";
      toast = "邀请链接已失效：对应的云账本不存在或已被删除，请让创建者重新分享链接";
    } else {
      label = "同步失败";
      toast = COPY.sync.savedLocally;
    }
    cloudErrorLabel = label;
    showToast({ message: toast });
    return false;
  } finally {
    leaveCloudBusy();
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
    showToast({ message: COPY.sync.pending });
    return;
  }
  await pullCloudLedger();
  syncRealtimeSubscription();
}

async function handleManualCloudSync() {
  if (!isCloudConfigured()) {
    showToast({ message: "还需要填写 Supabase anon public key" });
    return;
  }
  if (!isCloudLedgerActive()) {
    showToast({ message: "请在设置里创建或加入云账本" });
    return;
  }
  if (cloudBusy) return;
  if (navigator.onLine === false) {
    showToast({ message: "当前离线，联网后会自动同步" });
    return;
  }

  lastLifecycleRefreshAt = Date.now();
  window.clearTimeout(pendingSettingsSync);
  pendingSettingsSync = 0;
  enterCloudBusy();

  let settingsSynced = true;
  try {
    await syncCloudSettingsNow();
  } catch (error) {
    settingsSynced = false;
  }

  const expensesSynced = await syncPendingCloudExpenses({ silent: false });
  leaveCloudBusy();

  if (!settingsSynced || !expensesSynced) {
    showToast({ message: COPY.sync.pending });
    return;
  }

  await pullCloudLedger({ announce: true });
}

async function createCloudLedger() {
  if (!isCloudConfigured()) {
    showToast({ message: "还需要填写 Supabase anon public key" });
    return;
  }

  enterCloudBusy();
  try {
    const payload = await supabaseRpc("create_travel_ledger");
    cloudState.shareToken = payload?.ledger?.share_token || "";
    if (!cloudState.shareToken) throw new Error("Missing share token");
    saveCloudState();
    updateLedgerUrl();
    await syncAllLocalDataToCloud();
    await pullCloudLedger({ announce: true });
    syncRealtimeSubscription();
    checkOperatorFamilyPrompt();
  } catch (error) {
    showToast({ message: "云账本创建失败，请确认数据库设置后重试" });
  } finally {
    leaveCloudBusy();
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
  try {
    await navigator.clipboard.writeText(url.toString());
  } catch {
    showToast({ message: "复制失败，请手动复制地址栏链接" });
    return;
  }
  const isLocalUrl = ["localhost", "127.0.0.1", ""].includes(url.hostname);
  showToast({ message: isLocalUrl ? "已复制本机测试链接，请不要直接发给家人" : "邀请链接已复制，可发给家人一起记账" });
}

function getShareUrl() {
  // 邀请链接必须指向当前实际部署的地址，否则家人点开后会落到别处（甚至另一份旧代码）。
  // 不再硬编码发布域名；本地 file: 协议无法分享，返回 null 让调用方提示先发布。
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
      showToast({ message: "设置暂时无法同步，已保存在本机，联网后会重试" });
    });
  }, 350);
}

async function syncCloudSettingsNow() {
  if (!isCloudLedgerActive()) return;
  enterCloudBusy();
  try {
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
    state.lastSyncedAt = new Date().toISOString();
    notifyLedgerChanged();
  } finally {
    leaveCloudBusy();
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
  const splitMode = normalizeSplitMode(expense.splitMode);

  try {
    const remoteExpense = await supabaseRpc("save_travel_expense", splitPayload);
    if ((splitMode === "equal" || splitMode === "families_equal") && remoteExpense?.split_mode !== splitMode) {
      throw new Error("云端数据库尚未支持均分规则，请更新数据库设置后重试");
    }
  } catch (error) {
    if (!isSplitRpcCompatibilityError(error)) throw error;
    if (splitMode === "equal" || splitMode === "families_equal") {
      throw new Error("云端数据库尚未支持均分规则，请更新数据库设置后重试");
    }
    await supabaseRpc("save_travel_expense", basePayload);
  }
  notifyLedgerChanged();
}

async function syncCloudExpenseWithState(expenseId, { silent = false } = {}) {
  if (!isCloudLedgerActive()) return true;
  const expense = state.expenses.find((item) => item.id === expenseId);
  if (!expense) return true;

  enterCloudBusy();
  try {
    markExpenseSyncState(expenseId, "pending");
    await syncCloudExpense({ ...expense, syncState: "synced" });
    markExpenseSyncState(expenseId, "synced");
    return true;
  } catch (error) {
    markExpenseSyncState(expenseId, "failed");
    if (!silent) showToast({ message: COPY.sync.savedLocally });
    return false;
  } finally {
    leaveCloudBusy();
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
  return message.includes("p_split_")
    || message.includes("schema cache")
    || message.includes("PGRST202")
    || message.includes("travel_expenses_split_mode_check");
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
  const active = isCloudLedgerActive();
  /* 非同步中且存在持久化云端错误时，沿用错误态（覆盖正常摘要标签与配色） */
  const effectiveForced = (!cloudBusy && cloudErrorLabel) ? cloudErrorLabel : forcedStatus;
  const syncing = active && cloudBusy && !effectiveForced;
  const syncSummary = getSyncSummary();
  elements.syncStatus.classList.toggle("is-cloud", active && !effectiveForced);
  elements.syncStatus.classList.toggle("is-error", Boolean(effectiveForced));
  elements.syncStatus.classList.toggle("is-pending", !effectiveForced && syncSummary.state === "pending");
  elements.syncStatus.classList.toggle("is-failed", !effectiveForced && syncSummary.state === "failed");
  elements.syncStatus.classList.toggle("is-syncing", syncing);
  elements.syncStatus.setAttribute("aria-disabled", String(!active || cloudBusy));
  elements.syncStatus.setAttribute("aria-busy", String(syncing));
  elements.syncStatus.setAttribute("title", effectiveForced || syncSummary.detail);
  elements.syncStatus.setAttribute("aria-label", active ? `同步云账本，${effectiveForced || syncSummary.detail}` : (effectiveForced || syncSummary.detail));
  if (syncStatusWasSyncing && !syncing && active && !effectiveForced) playSyncLampIgnite();
  syncStatusWasSyncing = syncing;
  const nextLabel = effectiveForced || syncSummary.label;
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

function getFamilyName(familyId) {
  return state.families.find((family) => family.id === familyId)?.name || "未知家庭";
}

function getFamilyVisual(familyId) {
  return state?.familyVisuals?.[familyId] || state?.families?.find((family) => family.id === familyId)?.visual || defaultFamilyVisuals[familyId] || defaultFamilyVisuals[defaultFamilies[0].id];
}

function getCategoryVisual(category) {
  return categoryVisuals[category] || customCategoryVisuals[stringHash(category) % customCategoryVisuals.length];
}

function formatCategoryLabel(category) {
  return String(category || "");
}

function categoryLabelHtml(category) {
  return `${categorySymbolHtml(category)}<span class="category-label-text">${escapeHtml(category)}</span>`;
}

function getCategorySymbol(category) {
  const normalized = String(category || "").trim();
  return categorySymbolRules.find((rule) => rule.keywords.some((keyword) => normalized.includes(keyword)))?.symbol || "tag.fill";
}

function categorySymbolHtml(category) {
  const symbol = getCategorySymbol(category);
  return `<span class="category-symbol-pair" data-symbol="${symbol}" aria-hidden="true"><svg class="category-symbol category-symbol-sf" viewBox="0 0 24 24" focusable="false">${categorySymbolMarkup[symbol]}</svg><svg class="category-symbol category-symbol-fallback" viewBox="0 0 24 24" focusable="false">${categoryFallbackMarkup[symbol]}</svg></span>`;
}

function categoryStyle(category) {
  const visual = getCategoryVisual(category);
  return `--category-bg: ${visual.bg}; --category-text: ${visual.text}; --category-border: ${visual.border}; --category-gradient: ${visual.gradient};`;
}

function stringHash(value) {
  return [...String(value)].reduce((hash, char) => (hash * 31 + char.codePointAt(0)) >>> 0, 7);
}

const ledgerCalculator = window.JournaCore.createLedgerCalculator({
  getState: () => state,
  getActiveExpenses,
  expenseToCents,
  amountToCents,
  normalizeSplitMode,
  getSplitScopeFromMode,
  getSplitRuleFromMode,
  normalizeSplitFamilyIds,
  normalizeSplitAmounts,
  getSettlementMethod: () => getSettlementMethod(),
});
const {
  calculateSummary,
} = ledgerCalculator;

function render(options = {}) {
  const { animateFinancialChanges = false } = options;

  const performUpdate = () => {
    const summary = calculateSummary();
    resetDesktopPointerSink({ preserveFocus: true });
    renderCurrentLedgerLabel();
    updateClearLedgerButton();
    updateCloudControls();
    renderFormOptions();
    renderFamilyRoster();
    renderCategories();
    renderSplitScope();
    renderNaturalEntry();
    renderLedgerFilters();
    renderSummary({ animateFinancialChanges, summary });
    renderLedger({ animateFinancialChanges });
    /* 设置抽屉打开时需要跟随账本状态更新；隐藏时由 openSettings() 的
       renderPanel 负责首次/重新打开前的渲染，避免每次普通点击都重建整套设置 DOM。 */
    if (!elements.settingsView?.hidden) renderSettings({ summary });
    renderEditState();
    renderMobilePanelState();
    renderMobileSubmitBar();
    renderRecentPeek();
    applySelectedFamilyTheme();
    applySubmitButtonTheme();
    updateAmountMotionState();
    syncAllAmountValueTracks();
    scheduleSaveState();
  };

  const mobilePanelFlow = window.matchMedia("(max-width: 820px)").matches;
  if (document.startViewTransition && animateFinancialChanges && !mobilePanelFlow && !prefersReducedMotion()) {
    document.startViewTransition(performUpdate);
  } else {
    performUpdate();
  }
}

function getBarMorphDuration(nextPanel) {
  return barMotionSamples(nextPanel === "data" ? SPRING_BAR_COLLAPSE : SPRING_BAR_EXPAND).duration;
}

function cancelBarFlip() {
  barFlipRunId += 1;
  barFlipAnimations.forEach((animation) => animation.cancel());
  barFlipAnimations = [];
  document.querySelectorAll(".bar-morph-glow").forEach((node) => node.remove());
  document.querySelectorAll(".bar-family-tint-membrane").forEach((node) => node.remove());
}

function clearBarMorphState() {
  elements.mobileSubmitBar.classList.remove("is-flip-morphing", "is-bar-morphing-to-data", "is-bar-morphing-to-entry");
  elements.mobileSubmitBar.style.removeProperty("--bar-motion-duration");
}

function spawnSummaryGhost(rect, duration) {
  if (!rect.width) return;

  document.querySelectorAll(".bar-summary-ghost").forEach((ghost) => ghost.remove());
  const ghost = document.createElement("span");
  ghost.className = "bar-summary-ghost";
  ghost.textContent = elements.mobileSubmitSummary.textContent;
  ghost.style.left = `${rect.left}px`;
  ghost.style.top = `${rect.top}px`;
  ghost.style.maxWidth = `${rect.width}px`;
  document.body.appendChild(ghost);
  ghost.style.animation = "none";
  const animation = ghost.animate(
    [
      { offset: 0, opacity: 1, transform: "translateX(0)" },
      { offset: 0.28, opacity: 0, transform: "translateX(-16px)" },
      { offset: 1, opacity: 0, transform: "translateX(-16px)" },
    ],
    { duration, easing: "linear", fill: "both" },
  );
  const cleanup = () => ghost.remove();
  animation.onfinish = cleanup;
  animation.oncancel = cleanup;
  window.setTimeout(() => {
    if (ghost.isConnected) ghost.remove();
  }, duration + 80);
  return animation;
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
      { offset: 0, opacity: 0.20, transform: "scale(0.94)" },
      { offset: 0.20, opacity: 0.16, transform: "scale(0.98)" },
      { offset: 0.76, opacity: 0.04, transform: "scale(1.04)" },
      { offset: 0.82, opacity: 0, transform: "scale(1.07)" },
      { offset: 1, opacity: 0, transform: "scale(1.07)" },
    ];
  } else {
    total = duration;
    frames = [
      { offset: 0, opacity: 1, transform: "scale(1)" },
      { offset: 0.20, opacity: 0.78, transform: "scale(1.02)" },
      { offset: 0.78, opacity: 0.08, transform: "scale(1.08)" },
      { offset: 0.86, opacity: 0, transform: "scale(1.10)" },
      { offset: 1, opacity: 0, transform: "scale(1.10)" },
    ];
  }

  const animation = glow.animate(frames, {
    duration: total,
    easing: "linear",
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

function spawnBarFamilyTintMembrane(bar, background, duration) {
  if (!background) return null;

  bar.querySelectorAll(".bar-family-tint-membrane").forEach((node) => node.remove());
  const membrane = document.createElement("span");
  membrane.className = "bar-family-tint-membrane";
  membrane.style.background = background;
  bar.prepend(membrane);

  const animation = membrane.animate(
    [
      { offset: 0, opacity: 1 },
      { offset: 0.20, opacity: 0.86 },
      { offset: 0.76, opacity: 0.24 },
      { offset: 0.82, opacity: 0 },
      { offset: 1, opacity: 0 },
    ],
    {
      duration,
      easing: "linear",
      fill: "forwards",
    },
  );
  const cleanup = () => membrane.remove();
  animation.onfinish = cleanup;
  animation.oncancel = cleanup;
  window.setTimeout(() => {
    if (membrane.isConnected) membrane.remove();
  }, duration + 150);
  return animation;
}

function animateBarFlip(nextPanel) {
  const bar = elements.mobileSubmitBar;
  const button = elements.mobileSubmitButton;
  const summary = elements.mobileSubmitSummary;
  const toData = nextPanel === "data";
  const flipRunId = barFlipRunId + 1;
  const motion = barMotionSamples(toData ? SPRING_BAR_COLLAPSE : SPRING_BAR_EXPAND);
  const firstBar = bar.getBoundingClientRect();
  const firstButton = button.getBoundingClientRect();
  const firstSummary = summary.getBoundingClientRect();
  const firstBarBackground = getComputedStyle(bar).background;

  cancelBarFlip();
  barFlipRunId = flipRunId;
  bar.style.setProperty("--bar-motion-duration", `${motion.duration}ms`);
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

  const { values, lifts, duration } = motion;
  const relX = lastButton.left - lastBar.left;
  const relY = lastButton.top - lastBar.top;
  const barFrames = [];
  const buttonFrames = [];
  values.forEach((progress, index) => {
    const offset = index / (values.length - 1);
    const lift = lifts[index];
    const width = firstBar.width + (lastBar.width - firstBar.width) * progress;
    const height = firstBar.height + (lastBar.height - firstBar.height) * progress;
    const right = firstBar.right;
    const bottom = firstBar.bottom + (lastBar.bottom - firstBar.bottom) * progress + lift;
    const x = right - width;
    const y = bottom - height;
    const scaleX = width / lastBar.width;
    const scaleY = height / lastBar.height;
    const translateX = x - lastBar.left;
    const translateY = y - lastBar.top;
    barFrames.push({ offset, transform: `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})` });

    const buttonWidth = firstButton.width + (lastButton.width - firstButton.width) * progress;
    const buttonHeight = firstButton.height + (lastButton.height - firstButton.height) * progress;
    const buttonRight = firstButton.right + (lastButton.right - firstButton.right) * progress;
    const buttonBottom = firstButton.bottom + (lastButton.bottom - firstButton.bottom) * progress + lift;
    const buttonX = buttonRight - buttonWidth;
    const buttonY = buttonBottom - buttonHeight;
    const childScaleX = buttonWidth / (scaleX * lastButton.width);
    const childScaleY = buttonHeight / (scaleY * lastButton.height);
    const childTranslateX = (buttonX - lastBar.left - translateX) / scaleX - relX;
    const childTranslateY = (buttonY - lastBar.top - translateY) / scaleY - relY;
    buttonFrames.push({ offset, transform: `translate(${childTranslateX}px, ${childTranslateY}px) scale(${childScaleX}, ${childScaleY})` });
  });

  const options = { duration, easing: "linear", fill: "forwards", composite: "replace" };
  const barAnimation = bar.animate(barFrames, options);
  const buttonAnimation = button.animate(buttonFrames, options);
  barFlipAnimations = [barAnimation, buttonAnimation];

  if (toData) {
    const tintAnimation = spawnBarFamilyTintMembrane(bar, firstBarBackground, duration);
    if (tintAnimation) barFlipAnimations.push(tintAnimation);
  }

  /* The collapse halo is useful as the circle forms. During expand the resting
     pill aura and the old fixed circle halo overlap, producing a brief flash
     and leaving a shadow-looking ring behind the settled bar. Let the shell's
     own settling material handle the expand side instead. */
  const glowAnimation = toData ? spawnBarMorphGlow(lastBar, true, duration) : null;
  if (glowAnimation) barFlipAnimations.push(glowAnimation);

  if (toData) {
    const ghostAnimation = spawnSummaryGhost(firstSummary, duration);
    if (ghostAnimation) barFlipAnimations.push(ghostAnimation);
  }

  let cleanupQueued = false;
  const cleanupFlip = () => {
    if (barFlipRunId !== flipRunId || !barFlipAnimations.includes(barAnimation)) return;
    if (cleanupQueued) return;
    cleanupQueued = true;
    window.requestAnimationFrame(() => {
      if (barFlipRunId !== flipRunId || !barFlipAnimations.includes(barAnimation)) return;
      clearBarMorphState();
      barFlipAnimations = [];
    });
  };
  barAnimation.onfinish = cleanupFlip;
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
  const barMotionDuration = shouldAnimateChrome ? getBarMorphDuration(nextPanel) : 0;
  const panelMotionDuration = shouldAnimatePanel ? MOTION_DELAYS.mobilePanelIn : 0;

  if (shouldAnimateChrome) {
    /* 页面卡片、总支出/平账与底部悬浮栏共用本次悬浮栏的实际弹簧时长，
       避免固定 300ms 的面板淡入提前结束。 */
    const motionValue = `${panelMotionDuration || barMotionDuration}ms`;
    document.documentElement.style.setProperty("--mobile-panel-in-motion", motionValue);
    elements.ledgerView.style.setProperty("--mobile-panel-in-motion", motionValue);
  }

  window.clearTimeout(mobilePanelSwitchTimer);
  window.clearTimeout(mobilePanelIndicatorTimer);
  window.clearTimeout(barMorphTimer);
  elements.ledgerView.classList.remove("is-mobile-panel-switching-out", "is-mobile-panel-switching-in");
  elements.ledgerView.dataset.switchDirection = nextPanel === "entry" ? "forward" : "backward";

  /* liquid-glass indicator slide — cleared after keyframes complete */
  elements.mobilePanelSwitch?.classList.remove("is-indicator-forward", "is-indicator-backward");

  /*
   * Slide the pill immediately on tap so it stays glued to the finger, rather
   * than waiting out the 150ms panel-fade before moving (that delay read as lag).
   */
  if (shouldAnimateChrome && elements.mobilePanelSwitch) {
    // force reflow so re-adding the class retriggers the keyframes
    void elements.mobilePanelSwitch.offsetWidth;
    elements.mobilePanelSwitch.classList.add(nextPanel === "entry" ? "is-indicator-forward" : "is-indicator-backward");
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
    /* 动画切换时入场面板此刻还在 opacity 0，瞬时归位不可见；
       若用平滑滚动会和入场动画叠成两种运动，也躲不开面板换 display 后的高度跳变 */
    const behavior = shouldAnimatePanel ? "instant" : options.behavior || "smooth";
    if (options.scroll) {
      const target = nextPanel === "data" ? elements.ledgerSection : elements.entryPanel;
      window.requestAnimationFrame(() => {
        target?.scrollIntoView({ block: "start", behavior });
      });
    } else if (shouldAnimatePanel && window.scrollY > 0) {
      /* 同步执行：display 换面板后同一任务内归零，中间不会渲染出被钳位的一帧 */
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  };

  const commitPanel = () => {
    activeMobilePanel = nextPanel;
    renderMobilePanelState();
    scrollToPanel();

    if (nextPanel === "entry") {
      window.requestAnimationFrame(() => triggerNaturalEntryLensEntry());
    }

    if (!shouldAnimatePanel) return;

    /* bar morph already started on tap (see setMobilePanel top) */

    elements.ledgerView.classList.remove("is-mobile-panel-switching-out");
    elements.ledgerView.classList.add("is-mobile-panel-switching-in");
    mobilePanelSwitchTimer = window.setTimeout(() => {
      elements.ledgerView.classList.remove("is-mobile-panel-switching-in");
      mobilePanelSwitchTimer = 0;
    }, panelMotionDuration || MOTION_DELAYS.mobilePanelIn);
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
  elements.mobilePanelSwitch?.setAttribute("data-active", activeMobilePanel);
  document.body.classList.toggle("mobile-panel-entry", activeMobilePanel === "entry");
  document.body.classList.toggle("mobile-panel-data", activeMobilePanel === "data");
  syncLedgerMobileSubmitBar(
    activeMobilePanel === "data"
      && document.documentElement.dataset.ledgerExpanded === "true",
  );
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
  const nextPanel = event.key === "ArrowLeft" || event.key === "Home" ? "data" : "entry";
  setMobilePanel(nextPanel, { animate: true });
  const nextTab = nextPanel === "entry" ? elements.mobileEntryTab : elements.mobileDataTab;
  nextTab.focus();
}

function renderCurrentLedgerLabel() {
  elements.currentLedgerTitle.textContent = state.name;
  /* 收起态切换账本后，灯要跟着新标题的右缘走；标题宽度变了，
     展开态也要强制重算停靠终值（标脏，下次滚动进 zone 时落地）。 */
  dockCoordsDirty = true;
  updateSyncLampDock(true);
}

function renderFormOptions() {
  elements.dateInput.value = state.activeDate;
  state.activeCategory = normalizeCategorySelection(state.activeCategory, state.categories);
  elements.categoryInput.value = state.activeCategory;
}

const naturalEntryEditors = new Set(["date", "payer", "amount", "category", "note", "split"]);

function isNaturalEntryLayout() {
  return getEntryMode() === "natural"
    && window.matchMedia("(max-width: 820px)").matches;
}

function getNaturalEntryToken(editor) {
  return elements.naturalEntryFlow?.querySelector(`[data-entry-target="${editor}"]`) || null;
}

function getNaturalEntryEditor(editor) {
  if (naturalEntryStageEditor?.dataset.entryEditor === editor) return naturalEntryStageEditor;
  return elements.expenseForm.querySelector(`[data-entry-editor="${editor}"]`);
}

function rememberNaturalEntryEditorHome(editor) {
  if (!editor || naturalEntryEditorHomes.has(editor)) return;
  const marker = document.createComment(`natural-entry-${editor.dataset.entryEditor || "editor"}-home`);
  editor.before(marker);
  naturalEntryEditorHomes.set(editor, marker);
}

function restoreNaturalEntryEditorHome(editor) {
  if (!editor) return;
  const marker = naturalEntryEditorHomes.get(editor);
  if (marker?.parentNode) marker.parentNode.insertBefore(editor, marker.nextSibling);
}

function getNaturalEntryStageWidth(editor, anchorWidth) {
  const viewportWidth = window.visualViewport?.width || window.innerWidth;
  /* 付款家庭与类别的展开内容是横向选择带，因此吃满移动端可用宽度；
     其他编辑器保留各自的内容宽度。positionNaturalEntryStage() 会统一
     把这些宽度放到视觉视口中央，入口词只负责内部裁剪原点。 */
  const preferred = editor === "payer" || editor === "category"
    ? viewportWidth - 16
    : editor === "split" ? 370 : 344;
  return Math.max(anchorWidth, Math.min(preferred, viewportWidth - 16));
}

function resetNaturalEntryStageScroll() {
  const stage = elements.naturalEntryStage;
  if (!stage || (activeEntryEditor !== "amount" && activeEntryEditor !== "note")) return;
  // Amount and note are fixed-height handoff stages. WebKit can retain a
  // fractional scroll position when their editor is moved into the stage;
  // clear it before the first painted frame so the mirror cannot jump.
  stage.scrollTop = 0;
  stage.scrollLeft = 0;
}

function syncNaturalEntryStageAnchorGeometry(
  stage,
  anchor,
  { anchorRect = null, stageLeft = null, stageWidth = null } = {},
) {
  if (!stage || !anchor) return null;
  const nextAnchorRect = anchorRect || anchor.getBoundingClientRect();
  const currentStageRect = stage.getBoundingClientRect();
  const left = Number.isFinite(stageLeft) ? stageLeft : currentStageRect.left;
  const width = Number.isFinite(stageWidth) ? stageWidth : currentStageRect.width;
  const anchorX = Math.max(0, nextAnchorRect.left - left);

  stage.style.setProperty("--natural-stage-anchor-x", `${anchorX}px`);
  stage.style.setProperty("--natural-stage-anchor-width", `${nextAnchorRect.width}px`);
  stage.style.setProperty("--natural-stage-anchor-height", `${nextAnchorRect.height}px`);
  stage.style.setProperty("--natural-stage-origin-x", `${anchorX + (nextAnchorRect.width / 2)}px`);
  stage.style.setProperty(
    "--natural-stage-token-anchor-offset",
    `${anchorX - (width / 2)}px`,
  );

  return { anchorRect: nextAnchorRect, anchorX, stageLeft: left, stageWidth: width };
}

function positionNaturalEntryStage() {
  naturalEntryStagePositionFrame = 0;
  if (!naturalEntryStageOpen || !naturalEntryStageAnchor || elements.naturalEntryStage.hidden) return;
  if (!isNaturalEntryLayout()) {
    closeNaturalEntryStage({ immediate: true });
    return;
  }

  const stage = elements.naturalEntryStage;
  const anchorRect = naturalEntryStageAnchor.getBoundingClientRect();
  const viewport = window.visualViewport;
  const viewportLeft = viewport?.offsetLeft || 0;
  const viewportTop = viewport?.offsetTop || 0;
  const viewportWidth = viewport?.width || window.innerWidth;
  const viewportHeight = viewport?.height || window.innerHeight;
  const edge = 8;
  const width = getNaturalEntryStageWidth(activeEntryEditor, anchorRect.width);
  // 展开外框始终相对当前视觉视口居中。anchorX 仍从入口词的真实位置
  // 推导，因此 clip-path 可以从居中的卡片内部准确展开并收回到原词。
  const left = viewportLeft + ((viewportWidth - width) / 2);
  const top = Math.max(anchorRect.top, viewportTop + edge);
  const safeAreaBottom = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--safe-area-bottom"),
  ) || 0;
  const bottomClearance = Math.max(12, safeAreaBottom + 12);
  const maxHeight = Math.max(132, viewportTop + viewportHeight - top - edge - bottomClearance);

  elements.naturalEntryStage.style.setProperty("--natural-stage-left", `${left}px`);
  elements.naturalEntryStage.style.setProperty("--natural-stage-top", `${top}px`);
  elements.naturalEntryStage.style.setProperty("--natural-stage-width", `${width}px`);
  elements.naturalEntryStage.style.setProperty("--natural-stage-max-height", `${maxHeight}px`);
  syncNaturalEntryStageAnchorGeometry(stage, naturalEntryStageAnchor, {
    anchorRect,
    stageLeft: left,
    stageWidth: width,
  });
  resetNaturalEntryStageScroll();
  const stageToken = elements.naturalEntryStageToken;
  const stageRect = stage.getBoundingClientRect();
  const tokenStyle = getComputedStyle(stageToken);
  const tokenWidth = stageToken.offsetWidth || stageToken.getBoundingClientRect().width;
  const tokenHeight = stageToken.offsetHeight || stageToken.getBoundingClientRect().height;
  // The relay starts with `left: 50%` and a pure pixel translation (there is
  // no -50% centering until the handoff finishes), so the untransformed
  // origin is the stage midpoint rather than the token's centered left edge.
  const tokenBaseLeft = stageRect.left + (stageRect.width / 2);
  const tokenBaseTop = stageRect.top + (Number.parseFloat(tokenStyle.top) || 0);
  stage.style.removeProperty("--natural-stage-amount-token-y");
  stage.style.removeProperty("--natural-stage-amount-token-scale");
  if (activeEntryEditor === "note" && elements.noteInput) {
    const noteText = elements.noteInput.value || elements.noteInput.placeholder || "";
    const noteTextMetrics = getNaturalEntryInputTextMetrics(elements.noteInput, noteText);
    const sourceLabel = naturalEntryStageAnchor?.querySelector(".natural-entry-token-label")
      || naturalEntryStageAnchor;
    const sourceMetrics = getNaturalEntryTextMetrics(sourceLabel);
    const stageLabel = stageToken.querySelector(".natural-entry-token-label") || stageToken;
    const stageLabelStyle = getComputedStyle(stageLabel);
    const stageFontSize = Number.parseFloat(stageLabelStyle.fontSize) || tokenHeight;
    const stageLineHeight = Number.parseFloat(stageLabelStyle.lineHeight) || stageFontSize;
    const stageTextBaseline = tokenBaseTop
      + Math.max(0, (tokenHeight - stageLineHeight) / 2)
      + Math.max(0, (stageLineHeight - stageFontSize) / 2)
      + (stageFontSize * 0.8);
    const tokenCenterX = tokenBaseLeft + (tokenWidth / 2);
    const sourceCenterX = sourceMetrics
      ? sourceMetrics.centerX
      : anchorRect.left + (anchorRect.width / 2);
    const sourceBaseline = sourceMetrics
      ? sourceMetrics.baseline
      : anchorRect.top + (anchorRect.height / 2);
    const targetCenterX = noteTextMetrics
      ? noteTextMetrics.centerX
      : anchorRect.left + (anchorRect.width / 2);
    const targetBaseline = noteTextMetrics
      ? noteTextMetrics.baseline
      : anchorRect.top + (anchorRect.height / 2);
    const sourceFontSize = Number.parseFloat(sourceLabel ? getComputedStyle(sourceLabel).fontSize : "") || 1;
    const tokenFontSize = Number.parseFloat(tokenStyle.fontSize) || 1;
    const measuredSourceScale = sourceFontSize / tokenFontSize;
    const sourceScale = Math.max(1, Math.min(1.6, measuredSourceScale));
    const sourceBaselineY = sourceBaseline - stageTextBaseline;
    const targetBaselineY = targetBaseline - stageTextBaseline;
    stage.style.setProperty(
      "--natural-stage-note-token-x",
      `${targetCenterX - tokenCenterX}px`,
    );
    stage.style.setProperty(
      "--natural-stage-note-token-y",
      `${targetBaselineY}px`,
    );
    stage.style.setProperty(
      "--natural-stage-note-token-source-x",
      `${sourceCenterX - tokenCenterX}px`,
    );
    stage.style.setProperty(
      "--natural-stage-note-token-source-y",
      `${sourceBaselineY}px`,
    );
    stage.style.setProperty(
      "--natural-stage-note-token-source-scale",
      String(sourceScale),
    );
  } else {
    stage.style.removeProperty("--natural-stage-note-token-x");
    stage.style.removeProperty("--natural-stage-note-token-y");
    stage.style.removeProperty("--natural-stage-note-token-source-x");
    stage.style.removeProperty("--natural-stage-note-token-source-y");
    stage.style.removeProperty("--natural-stage-note-token-source-scale");
  }
}

function scheduleNaturalEntryStagePosition({ reason = "layout" } = {}) {
  if (naturalEntryStagePositionFrame || !naturalEntryStageOpen) return;
  if (naturalEntryAmountHandoffRunning) return;
  /* 舞台是 fixed，打开后的页面滚动不会改变它的最终几何；更重要的是，
     页面滚动期间不应每帧重新读取 anchor/stage/token 的布局。打开、编辑器
     切换、resize/键盘变化仍会走默认 layout 路径重新测量。 */
  if (reason === "scroll") return;
  // The split editor can change the summary token's wrapping while its panel
  // is open. Re-anchoring the fixed stage to that moving token makes the card
  // drift downward during option changes; keep the stage in place until the
  // selection handoff closes it and measures the final anchor once.
  if (activeEntryEditor === "split") return;
  naturalEntryStagePositionFrame = window.requestAnimationFrame(positionNaturalEntryStage);
}

function freezeNaturalEntryAnchor(anchor) {
  if (!anchor || naturalEntryFrozenAnchor === anchor) return;
  unfreezeNaturalEntryAnchor();
  const rect = anchor.getBoundingClientRect();
  anchor.style.inlineSize = `${rect.width}px`;
  anchor.style.flex = `0 0 ${rect.width}px`;
  naturalEntryFrozenAnchor = anchor;
}

function unfreezeNaturalEntryAnchor() {
  if (!naturalEntryFrozenAnchor) return;
  naturalEntryFrozenAnchor.style.inlineSize = "";
  naturalEntryFrozenAnchor.style.flex = "";
  naturalEntryFrozenAnchor = null;
}

function syncNaturalEntryStageToken({ animate = false, text = null } = {}) {
  if (!naturalEntryStageOpen || !naturalEntryStageAnchor) return;
  if (activeEntryEditor === "amount") return;
  const anchorLabel = naturalEntryStageAnchor.querySelector(".natural-entry-token-label") || naturalEntryStageAnchor;
  const nextText = text == null ? anchorLabel.textContent : String(text);
  const stageToken = elements.naturalEntryStageToken;
  const stageLabel = stageToken.querySelector(".natural-entry-token-label") || stageToken;
  const mark = naturalEntryStageAnchor.dataset.mark || "";
  if (mark) stageToken.dataset.mark = mark;
  else delete stageToken.dataset.mark;
  stageToken.dataset.valueState = naturalEntryStageAnchor.dataset.valueState || "value";
  elements.naturalEntryStage.dataset.valueState = stageToken.dataset.valueState;
  const relayIsRunning = elements.naturalEntryStage.classList.contains("is-opening")
    || elements.naturalEntryStage.classList.contains("is-closing");
  if (animate && activeEntryEditor !== "note" && !prefersReducedMotion() && !relayIsRunning) {
    const duration = activeEntryEditor === "date" ? 240 : activeEntryEditor === "split" ? 300 : 280;
    if (activeEntryEditor === "split") {
      animateSplitSummaryText(stageToken, nextText, { textElement: stageLabel });
    } else {
      animateNaturalEntryToken(stageToken, nextText, { duration });
    }
  } else {
    if (activeEntryEditor === "split") cancelSplitSummaryText(stageToken, nextText);
    const previous = naturalEntryTokenAnimations.get(stageToken);
    previous?.cancel();
    naturalEntryTokenAnimations.delete(stageToken);
    stageLabel.textContent = nextText;
  }
  elements.naturalEntryStageToken.classList.toggle("is-amount", activeEntryEditor === "amount");
}

function clearNaturalEntryStageHeightTransition({ resetHeight = false } = {}) {
  const stage = elements.naturalEntryStage;
  if (stage && naturalEntryStageHeightTransitionHandler) {
    stage.removeEventListener("transitionend", naturalEntryStageHeightTransitionHandler);
  }
  naturalEntryStageHeightTransitionHandler = null;
  if (naturalEntryStageHeightResetTimer) {
    window.clearTimeout(naturalEntryStageHeightResetTimer);
    naturalEntryStageHeightResetTimer = 0;
  }
  if (resetHeight && stage) stage.style.removeProperty("height");
}

function armNaturalEntryStageHeightTransition(stage) {
  clearNaturalEntryStageHeightTransition();
  if (!stage) return;
  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    if (naturalEntryStageHeightTransitionHandler === onTransitionEnd) {
      stage.removeEventListener("transitionend", onTransitionEnd);
      naturalEntryStageHeightTransitionHandler = null;
      naturalEntryStageHeightResetTimer = 0;
    }
    stage.style.removeProperty("height");
  };
  const onTransitionEnd = (event) => {
    if (event.target !== stage || event.propertyName !== "height") return;
    finish();
  };
  naturalEntryStageHeightTransitionHandler = onTransitionEnd;
  stage.addEventListener("transitionend", onTransitionEnd);
  naturalEntryStageHeightResetTimer = window.setTimeout(finish, Math.max(560, MOTION_DELAYS.naturalEntryStageMorph + 240));
}

function clearNaturalEntryStageRelayTimers() {
  [
    ["naturalEntryStageCloseTimer", naturalEntryStageCloseTimer],
    ["naturalEntryStageHandoffTimer", naturalEntryStageHandoffTimer],
    ["naturalEntryStageCleanupTimer", naturalEntryStageCleanupTimer],
    ["naturalEntryStageOpenHandoffTimer", naturalEntryStageOpenHandoffTimer],
    ["naturalEntryStageOpenFinishTimer", naturalEntryStageOpenFinishTimer],
  ].forEach(([name, timer]) => {
    if (timer) window.clearTimeout(timer);
    if (name === "naturalEntryStageCloseTimer") naturalEntryStageCloseTimer = 0;
    if (name === "naturalEntryStageHandoffTimer") naturalEntryStageHandoffTimer = 0;
    if (name === "naturalEntryStageCleanupTimer") naturalEntryStageCleanupTimer = 0;
    if (name === "naturalEntryStageOpenHandoffTimer") naturalEntryStageOpenHandoffTimer = 0;
    if (name === "naturalEntryStageOpenFinishTimer") naturalEntryStageOpenFinishTimer = 0;
  });
}

function commitPendingNaturalEntryFamilyTint() {
  if (pendingNaturalEntryFamilyTintId === null) return;
  applyNaturalEntryFamilyTint(pendingNaturalEntryFamilyTintId, { animate: false });
}

function captureNaturalEntryStageFamilyTint(stage) {
  if (!stage) return;
  const currentColor = [stage, elements.expenseForm, elements.naturalEntryFlow]
    .map((element) => getComputedStyle(element).getPropertyValue("--natural-entry-mark-color").trim())
    .find(Boolean);
  if (currentColor) stage.style.setProperty("--natural-entry-mark-color", currentColor);
}

function finishNaturalEntryStageClose({ restoreFocus = false } = {}) {
  clearNaturalEntryMaterialSettle();
  clearNaturalEntryStageRelayTimers();
  clearNaturalEntryStageHeightTransition({ resetHeight: true });
  cancelNaturalEntryMotion();
  naturalEntryAmountHandoffRunning = false;
  commitPendingNaturalEntryFamilyTint();
  const editor = naturalEntryStageEditor;
  const anchor = naturalEntryStageAnchor;
  const stage = elements.naturalEntryStage;
  restoreNaturalEntryEditorHome(editor);
  if (editor === elements.splitScope) {
    splitScopeOpen = false;
    renderSplitScope();
  }
  unfreezeNaturalEntryAnchor();
  anchor?.classList.remove(
    "is-stage-anchor",
    "is-stage-opening",
    "is-stage-handoff",
    "is-stage-mark-handoff",
    "is-lens-returning",
    "is-value-settling",
  );
  anchor?.style.removeProperty("--natural-entry-text-alpha");
  stage.classList.remove("is-preparing", "is-opening", "is-open", "is-closing", "is-liquid-returning", "is-text-handed-off", "is-relay-settled");
  stage.style.removeProperty("--natural-entry-mark-color");
  stage.style.removeProperty("--natural-stage-note-token-x");
  stage.style.removeProperty("--natural-stage-note-token-y");
  stage.style.removeProperty("--natural-stage-note-token-source-x");
  stage.style.removeProperty("--natural-stage-note-token-source-y");
  stage.style.removeProperty("--natural-stage-note-token-source-scale");
  stage.style.removeProperty("--natural-stage-value-state");
  stage.removeAttribute("data-note-source-state");
  clearNaturalEntryNoteTrackStyles();
  stage.scrollTop = 0;
  stage.scrollLeft = 0;
  stage.hidden = true;
  elements.naturalEntryFocusBackdrop.hidden = true;
  stage.dataset.editor = "";
  stage.dataset.valueState = "";
  naturalEntryStageEditor = null;
  naturalEntryStageAnchor = null;
  document.body.classList.remove("natural-entry-focus-open");
  renderNaturalEntry();
  if (restoreFocus && anchor?.isConnected) anchor.focus({ preventScroll: true });
}

function cancelNaturalEntryMotion() {
  for (const anim of naturalEntryMotionAnims) {
    try { anim.cancel(); } catch (_) {}
  }
  naturalEntryMotionAnims = [];
  naturalEntryAmountHandoffRunning = false;
  // A note track can outlive the stage-close timer in WebKit when the user
  // reopens quickly. Cancel any animation still owned by the actual track or
  // relay token before clearing styles, otherwise the next open starts scaled.
  [
    elements.noteInput?.closest(".note-value-track"),
    elements.naturalEntryStageToken,
  ].forEach((target) => {
    target?.getAnimations?.().forEach((animation) => {
      try { animation.cancel(); } catch (_) {}
    });
  });
  clearNaturalEntryNoteTrackStyles();
  [
    elements.naturalSplitToken,
    elements.naturalEntryStageToken,
  ].forEach((target) => cancelSplitSummaryText(target));
  const amountTrack = elements.amountInput?.closest(".amount-value-track");
  amountTrack?.getAnimations?.().forEach((animation) => {
    if (animation.animationName === "") {
      try { animation.cancel(); } catch (_) {}
    }
  });
  if (amountTrack) {
    amountTrack.style.transform = "";
    amountTrack.style.transformOrigin = "";
    amountTrack.style.willChange = "";
    amountTrack.style.removeProperty("opacity");
  }
  // The GitHub text handoff uses a body-level flight token; remove it on
  // interruption so a rapid reopen cannot leave a stale glyph behind.
  document.querySelectorAll(".natural-entry-flight-token").forEach((node) => node.remove());
  clearNaturalEntryTextHandoffStyles();
}

function clearNaturalEntryTextHandoffStyles() {
  document.querySelectorAll(".natural-entry-token-label").forEach((label) => {
    label.style.removeProperty("opacity");
  });
  document.querySelectorAll(".natural-entry-token").forEach((token) => {
    token.style.removeProperty("--natural-entry-text-alpha");
  });
  elements.noteInput?.style.removeProperty("opacity");
}

function setNaturalEntryAnchorTextVisible(anchor, visible) {
  if (!anchor) return;
  const label = anchor.querySelector(".natural-entry-token-label") || anchor;
  label.style.opacity = visible ? "1" : "0";
  anchor.style.setProperty("--natural-entry-text-alpha", visible ? "1" : "0");
}

function clearNaturalEntryCloseState(anchor = naturalEntryStageAnchor) {
  anchor?.classList.remove("is-stage-handoff", "is-stage-mark-handoff", "is-lens-returning");
  anchor?.style.removeProperty("--natural-entry-text-alpha");
}

function makeNaturalEntryFlightToken(sourceRect, text, isAmount, sourceScale = 1) {
  const ghost = document.createElement("span");
  ghost.className = "natural-entry-flight-token";
  ghost.classList.toggle("is-amount", isAmount);
  ghost.textContent = text;
  const baseWidth = sourceRect.width / sourceScale;
  const baseHeight = sourceRect.height / sourceScale;
  const baseLeft = sourceRect.left + (sourceRect.width - baseWidth) / 2;
  const baseTop = sourceRect.top + (sourceRect.height - baseHeight) / 2;
  ghost.style.left = `${baseLeft}px`;
  ghost.style.top = `${baseTop}px`;
  ghost.style.width = `${Math.max(1, baseWidth)}px`;
  ghost.style.height = `${baseHeight}px`;
  ghost.style.transformOrigin = "center center";
  document.body.append(ghost);
  return { ghost, baseLeft, baseTop };
}

function getNaturalEntryFlightSourceRect(stage) {
  const tokenRect = elements.naturalEntryStageToken.getBoundingClientRect();
  if (tokenRect.width > 0 && tokenRect.height > 0) return tokenRect;
  return stage.getBoundingClientRect();
}

function getNaturalEntrySourceColor(element, fallback = "") {
  if (!element) return fallback;
  const style = getComputedStyle(element);
  const fill = style.getPropertyValue("-webkit-text-fill-color").trim();
  if (fill && fill !== "transparent" && fill !== "rgba(0, 0, 0, 0)") return fill;
  return style.color || fallback;
}

function getNaturalEntryInputTextRect(input, text = "") {
  if (!input) return null;
  const inputRect = input.getBoundingClientRect();
  if (!inputRect.width || !inputRect.height) return null;
  const style = getComputedStyle(input);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const font = style.font || `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  if (context) context.font = font;
  const measuredWidth = context
    ? context.measureText(String(text || input.placeholder || "")).width
    : inputRect.width;
  const width = Math.min(inputRect.width, Math.max(1, measuredWidth));
  const lineHeight = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) || inputRect.height;
  const top = inputRect.top + Math.max(0, (inputRect.height - lineHeight) / 2);
  const textAlign = style.textAlign === "left" ? "left" : style.textAlign === "right" ? "right" : "center";
  const left = textAlign === "left"
    ? inputRect.left + (Number.parseFloat(style.paddingLeft) || 0)
    : textAlign === "right"
      ? inputRect.right - (Number.parseFloat(style.paddingRight) || 0) - width
      : inputRect.left + (inputRect.width - width) / 2;
  return new DOMRect(left, top, width, lineHeight);
}

function getNaturalEntryInputTextMetrics(input, text = "") {
  const rect = getNaturalEntryInputTextRect(input, text);
  if (!rect || !input) return null;
  const style = getComputedStyle(input);
  const fontSize = Number.parseFloat(style.fontSize) || rect.height;
  const lineHeight = Number.parseFloat(style.lineHeight) || rect.height;
  const lineOffset = Math.max(0, (lineHeight - fontSize) / 2);
  return {
    rect,
    centerX: rect.left + (rect.width / 2),
    baseline: rect.top + lineOffset + (fontSize * 0.8),
    fontSize,
  };
}

function getNaturalEntryAmountVisibleMetrics() {
  const input = elements.amountInput;
  const track = input?.closest(".amount-value-track");
  if (!input || !track) return null;
  const currency = track.querySelector(".currency-mark");
  const inputMetrics = getNaturalEntryInputTextMetrics(input, input.value || input.placeholder || "0.00");
  const currencyRect = currency?.getBoundingClientRect();
  if (!inputMetrics?.rect || !currencyRect?.width) return null;
  /* 轨道右侧仍保留光标安全余量，但动画只认这组真实可见字形的边界。
     不要用 track.getBoundingClientRect() 的中心，它包含了那段不可见空白。 */
  const left = Math.min(currencyRect.left, inputMetrics.rect.left);
  const right = Math.max(currencyRect.right, inputMetrics.rect.right);
  const top = Math.min(currencyRect.top, inputMetrics.rect.top);
  const bottom = Math.max(currencyRect.bottom, inputMetrics.rect.bottom);
  const visibleRect = new DOMRect(left, top, right - left, bottom - top);
  return {
    track,
    rect: visibleRect,
    visibleRect,
    caretReserve: AMOUNT_INPUT_CARET_RESERVE,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
    baseline: inputMetrics.baseline,
    fontSize: Number.parseFloat(getComputedStyle(input).fontSize) || inputMetrics.fontSize,
  };
}

function getNaturalEntryAmountTransform(source, target) {
  if (!source?.track || !target) return null;
  const trackRect = source.track.getBoundingClientRect();
  const scale = target.fontSize && source.fontSize
    ? target.fontSize / source.fontSize
    : target.rect.height / Math.max(1, source.rect.height);
  if (!Number.isFinite(scale) || !Number.isFinite(source.centerX) || !Number.isFinite(target.centerX)) return null;
  const originX = source.centerX - trackRect.left;
  const originY = source.baseline - trackRect.top;
  const translateX = target.centerX - source.centerX;
  const translateY = target.baseline - source.baseline;
  return {
    origin: `${originX}px ${originY}px`,
    translateX,
    translateY,
    scale,
    transform: `translate3d(${translateX.toFixed(3)}px, ${translateY.toFixed(3)}px, 0) scale(${scale.toFixed(5)})`,
  };
}

function getNaturalEntryStageCurve(fallback) {
  return getComputedStyle(elements.naturalEntryStage || document.documentElement)
    .getPropertyValue("--natural-stage-curve")
    .trim() || fallback;
}

function animateNaturalAmountTrackFrom(target) {
  const source = getNaturalEntryAmountVisibleMetrics();
  const track = source?.track;
  const mapping = getNaturalEntryAmountTransform(source, target);
  if (!source || !track || !mapping || prefersReducedMotion() || typeof track.animate !== "function") {
    if (track) {
      track.style.transform = "";
      track.style.transformOrigin = "";
      track.style.willChange = "";
    }
    return;
  }
  track.style.transformOrigin = mapping.origin;
  track.style.willChange = "transform";
  const transformAt = (progress) => {
    const x = mapping.translateX * (1 - progress);
    const y = mapping.translateY * (1 - progress);
    const scale = mapping.scale + ((1 - mapping.scale) * progress);
    return `translate3d(${x.toFixed(3)}px, ${y.toFixed(3)}px, 0) scale(${scale.toFixed(5)})`;
  };
  const animation = track.animate(
    [
      /* 先让外壳完成一小段展开，再让金额从原位进入中心，避免首帧
         直接把数字放大成一块浮在句子上的面板。 */
      { transform: mapping.transform, offset: 0 },
      { transform: mapping.transform, offset: 0.14 },
      { transform: transformAt(0.42), offset: 0.58 },
      { transform: "translate3d(0, 0, 0) scale(1)", offset: 1 },
    ],
    { duration: MOTION_DELAYS.naturalEntryStageOpen, easing: getNaturalEntryStageCurve("cubic-bezier(0.20, 0, 0, 1)"), fill: "both" },
  );
  naturalEntryAmountHandoffRunning = true;
  naturalEntryMotionAnims.push(animation);
  const cleanup = () => {
    if (!naturalEntryMotionAnims.includes(animation)) return;
    naturalEntryMotionAnims = naturalEntryMotionAnims.filter((item) => item !== animation);
    track.style.transform = "";
    track.style.transformOrigin = "";
    track.style.willChange = "";
  };
  animation.addEventListener("finish", cleanup, { once: true });
  animation.addEventListener("cancel", cleanup, { once: true });
}

function animateNaturalAmountTrackToAnchor(anchor, onReached = null) {
  const source = getNaturalEntryAmountVisibleMetrics();
  const target = getNaturalEntryTextMetrics(anchor);
  const track = source?.track;
  const mapping = getNaturalEntryAmountTransform(source, target);
  if (!source || !target || !track || !mapping || prefersReducedMotion() || typeof track.animate !== "function") {
    if (track) track.style.opacity = "0";
    onReached?.();
    return;
  }
  track.style.transformOrigin = mapping.origin;
  track.style.willChange = "transform";
  const animation = track.animate(
    [
      { transform: "translate3d(0, 0, 0) scale(1)", opacity: 1 },
      { transform: mapping.transform, opacity: 1 },
    ],
    { duration: MOTION_DELAYS.naturalEntryStageClose, easing: getNaturalEntryStageCurve("cubic-bezier(0.20, 0, 0, 1)"), fill: "both" },
  );
  naturalEntryMotionAnims.push(animation);
  animation.finished.then(() => {
    /* The summary token lands on the same baseline as the native amount track.
       Hide the moved input before revealing the summary copy so the lens relay
       never paints two amount layers on the same frame. The finished WAAPI
       effect is cancelled first because its `fill: both` opacity would
       otherwise override the inline handoff state. Cleanup still removes this
       inline opacity when the stage is finally returned home or reopened. */
    naturalEntryMotionAnims = naturalEntryMotionAnims.filter((item) => item !== animation);
    animation.cancel();
    track.style.opacity = "0";
    onReached?.();
  }, () => {});
}

function getNaturalEntryFlightSourceMetrics(stage, editor) {
  const stageToken = elements.naturalEntryStageToken;
  const tokenStyle = getComputedStyle(stageToken);
  const tokenFontSize = Number.parseFloat(tokenStyle.fontSize) || 1;
  const focusTarget = getNaturalEntryFocusTarget(editor);
  let rect = getNaturalEntryTextRect(stageToken) || getNaturalEntryFlightSourceRect(stage);
  let styleTarget = focusTarget || stageToken;
  let sourceFontSize = Number.parseFloat(getComputedStyle(styleTarget).fontSize) || tokenFontSize;

  if (editor === "amount" && elements.amountInput) {
    /* 金额的可见字形由货币符号和 input 两部分组成；源盒必须取整条轨道，
       否则只按 input 文字测量会把飞行字的水平中心推向右侧。 */
    const amountTrack = elements.amountInput.closest(".amount-value-track") || elements.amountInput;
    rect = amountTrack.getBoundingClientRect();
    sourceFontSize = Number.parseFloat(getComputedStyle(elements.amountInput).fontSize) || tokenFontSize;
    styleTarget = elements.amountInput;
  } else if (editor === "note" && elements.noteInput) {
    const noteText = elements.noteInput.value || elements.noteInput.placeholder || "";
    rect = getNaturalEntryInputTextRect(elements.noteInput, noteText) || rect;
    sourceFontSize = Number.parseFloat(getComputedStyle(elements.noteInput).fontSize) || tokenFontSize;
    styleTarget = elements.noteInput;
  }

  return {
    rect,
    sourceColor: getNaturalEntrySourceColor(styleTarget, getComputedStyle(stageToken).color),
    sourceScale: Math.max(0.72, Math.min(2.1, sourceFontSize / tokenFontSize)),
  };
}

function getNaturalEntryTextRect(element) {
  if (!element) return null;
  const textElement = element.querySelector?.(".natural-entry-token-label") || element;
  const range = document.createRange();
  range.selectNodeContents(textElement);
  const rect = range.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 ? rect : null;
}

function getNaturalEntryTextMetrics(element) {
  const rect = getNaturalEntryTextRect(element);
  if (!rect) return null;
  const textElement = element.querySelector?.(".natural-entry-token-label") || element;
  const style = getComputedStyle(textElement);
  const fontSize = Number.parseFloat(style.fontSize) || rect.height;
  const lineHeight = Number.parseFloat(style.lineHeight) || rect.height;
  const lineOffset = Math.max(0, (lineHeight - fontSize) / 2);
  return {
    rect,
    centerX: rect.left + (rect.width / 2),
    baseline: rect.top + lineOffset + (fontSize * 0.8),
    fontSize,
  };
}

function getNaturalEntryNoteTrackMetrics() {
  const input = elements.noteInput;
  const track = input?.closest(".note-value-track") || input;
  if (!input || !track) return null;
  const text = input.value || input.placeholder || "";
  const inputMetrics = getNaturalEntryInputTextMetrics(input, text);
  const trackRect = track.getBoundingClientRect();
  if (!inputMetrics?.rect || !trackRect.width) return null;
  return {
    track,
    rect: inputMetrics.rect,
    centerX: inputMetrics.centerX,
    baseline: inputMetrics.baseline,
    fontSize: inputMetrics.fontSize,
  };
}

function getNaturalEntryTrackTransform(source, target) {
  if (!source?.track || !target) return null;
  const trackRect = source.track.getBoundingClientRect();
  const scale = target.fontSize && source.fontSize
    ? target.fontSize / source.fontSize
    : target.rect.height / Math.max(1, source.rect.height);
  if (!Number.isFinite(scale) || !Number.isFinite(source.centerX) || !Number.isFinite(target.centerX)) return null;
  return {
    origin: `${(source.centerX - trackRect.left).toFixed(3)}px ${(source.baseline - trackRect.top).toFixed(3)}px`,
    transform: `translate3d(${(target.centerX - source.centerX).toFixed(3)}px, ${(target.baseline - source.baseline).toFixed(3)}px, 0) scale(${scale.toFixed(5)})`,
  };
}

function clearNaturalEntryNoteTrackStyles() {
  const track = elements.noteInput?.closest(".note-value-track");
  if (track) {
    track.style.removeProperty("transform");
    track.style.removeProperty("transform-origin");
    track.style.removeProperty("will-change");
    track.style.removeProperty("pointer-events");
    track.style.removeProperty("opacity");
  }
  const stageToken = elements.naturalEntryStageToken;
  if (stageToken) {
    stageToken.style.removeProperty("transform");
    stageToken.style.removeProperty("transform-origin");
    stageToken.style.removeProperty("will-change");
    stageToken.style.removeProperty("visibility");
  }
  elements.naturalEntryStage?.removeAttribute("data-note-source-state");
}

function hideNaturalEntryNoteSource(source) {
  const track = elements.noteInput?.closest(".note-value-track");
  const stageToken = elements.naturalEntryStageToken;
  if (source === track && track) {
    track.style.opacity = "0";
  } else if (source === stageToken && stageToken) {
    stageToken.style.visibility = "hidden";
  }
  elements.naturalEntryStage?.setAttribute("data-note-source-state", "hidden");
}

function finishNaturalEntryNoteHandoff(animation, source, onReached = null) {
  naturalEntryNoteFinishedAnimations.add(animation);
  if (naturalEntryMotionAnims.includes(animation)) {
    naturalEntryMotionAnims = naturalEntryMotionAnims.filter((item) => item !== animation);
    // A finished WAAPI animation with `fill: both` continues to paint its
    // final transform until it is cancelled. Cancel it before revealing the
    // summary copy so the moving source and anchor can never overlap.
    try { animation.cancel(); } catch (_) {}
  }
  clearNaturalEntryNoteTrackStyles();
  hideNaturalEntryNoteSource(source);
  onReached?.();
}

function animateNaturalEntryNoteTrackToAnchor(anchor, onReached = null) {
  const source = getNaturalEntryNoteTrackMetrics();
  const target = getNaturalEntryTextMetrics(anchor);
  const track = source?.track;
  const mapping = getNaturalEntryTrackTransform(source, target);
  if (!source || !target || !track || !mapping || prefersReducedMotion() || typeof track.animate !== "function") {
    clearNaturalEntryNoteTrackStyles();
    hideNaturalEntryNoteSource(track);
    onReached?.();
    return;
  }
  track.style.transformOrigin = mapping.origin;
  track.style.pointerEvents = "none";
  track.style.willChange = "transform";
  const animation = track.animate(
    [
      { transform: "translate3d(0, 0, 0) scale(1)" },
      { transform: mapping.transform },
    ],
    {
      duration: MOTION_DELAYS.naturalEntryStageClose,
      easing: getNaturalEntryStageCurve("cubic-bezier(0.20, 0, 0, 1)"),
      fill: "both",
    },
  );
  naturalEntryMotionAnims.push(animation);
  const cleanup = () => {
    if (naturalEntryNoteFinishedAnimations.has(animation)) return;
    if (naturalEntryMotionAnims.includes(animation)) {
      naturalEntryMotionAnims = naturalEntryMotionAnims.filter((item) => item !== animation);
    }
    clearNaturalEntryNoteTrackStyles();
  };
  animation.finished.then(() => {
    finishNaturalEntryNoteHandoff(animation, track, onReached);
  }, () => {});
  animation.addEventListener("cancel", cleanup, { once: true });
}

function animateNaturalEntryNoteTokenToAnchor(anchor, onReached = null) {
  const stageToken = elements.naturalEntryStageToken;
  const source = getNaturalEntryTextMetrics(stageToken);
  const target = getNaturalEntryTextMetrics(anchor);
  if (!source || !target || !stageToken || prefersReducedMotion() || typeof stageToken.animate !== "function") {
    clearNaturalEntryNoteTrackStyles();
    hideNaturalEntryNoteSource(stageToken);
    onReached?.();
    return;
  }
  const deltaX = target.centerX - source.centerX;
  const deltaY = target.baseline - source.baseline;
  const targetScale = target.fontSize && source.fontSize ? target.fontSize / source.fontSize : 1;
  const baseTransform = "translateX(-50%) scale(var(--natural-stage-token-scale, 1))";
  const targetTransform = `translateX(-50%) translate3d(${deltaX.toFixed(3)}px, ${deltaY.toFixed(3)}px, 0) scale(${targetScale.toFixed(5)})`;
  stageToken.style.transformOrigin = "center center";
  stageToken.style.willChange = "transform";
  const animation = stageToken.animate(
    [
      { transform: baseTransform },
      { transform: targetTransform },
    ],
    {
      duration: MOTION_DELAYS.naturalEntryStageClose,
      easing: getNaturalEntryStageCurve("cubic-bezier(0.20, 0, 0, 1)"),
      fill: "both",
    },
  );
  naturalEntryMotionAnims.push(animation);
  const cleanup = () => {
    if (naturalEntryNoteFinishedAnimations.has(animation)) return;
    if (naturalEntryMotionAnims.includes(animation)) {
      naturalEntryMotionAnims = naturalEntryMotionAnims.filter((item) => item !== animation);
    }
    clearNaturalEntryNoteTrackStyles();
  };
  animation.finished.then(() => {
    finishNaturalEntryNoteHandoff(animation, stageToken, onReached);
  }, () => {});
  animation.addEventListener("cancel", cleanup, { once: true });
}

function getNaturalEntryEditorDisplayText(editor) {
  const amount = parseAmountInput(elements.amountInput.value);
  const amountCents = Number.isFinite(amount) && amount > 0 ? amountToCents(amount) : 0;
  if (editor === "date") return formatNaturalEntryDate(normalizeDate(elements.dateInput.value, state.activeDate));
  if (editor === "payer") return state.selectedPayerId ? getFamilyName(state.selectedPayerId) : "付款家庭";
  if (editor === "amount") return amountCents ? formatNaturalEntryAmount(amountCents) : "¥ 0.00";
  if (editor === "category") return state.activeCategory ? formatCategoryLabel(state.activeCategory) : "类别";
  if (editor === "note") return elements.noteInput.value.trim() || "备注可选";
  return formatNaturalEntrySplit();
}

function settleNaturalEntryCloseText(anchor, stageToken, editor) {
  const finalText = getNaturalEntryEditorDisplayText(editor);
  if (anchor) {
    const pending = naturalEntryTokenAnimations.get(anchor);
    if (pending && !pending.cancelled) {
      pending.cancel();
      if (editor === "amount") setNaturalAmountTokenDisplay(anchor, finalText);
      else (anchor.querySelector(".natural-entry-token-label") || anchor).textContent = finalText;
      naturalEntryTokenAnimations.delete(anchor);
    } else {
      if (editor === "amount") setNaturalAmountTokenDisplay(anchor, finalText);
      else (anchor.querySelector(".natural-entry-token-label") || anchor).textContent = finalText;
    }
    anchor.dataset.valueState = editor === "note"
      ? (elements.noteInput.value.trim() ? "value" : "optional")
      : "value";
  }
  if (anchor && stageToken) {
    if (editor === "split") {
      cancelSplitSummaryText(anchor, finalText);
      cancelSplitSummaryText(stageToken, finalText);
    }
    naturalEntryTokenAnimations.get(stageToken)?.cancel();
    naturalEntryTokenAnimations.delete(stageToken);
    const anchorLabel = anchor.querySelector(".natural-entry-token-label") || anchor;
    const stageLabel = stageToken.querySelector(".natural-entry-token-label") || stageToken;
    stageLabel.textContent = anchorLabel.textContent;
    stageToken.dataset.valueState = anchor.dataset.valueState || "value";
  }
}

function closeNaturalEntryStage({ restoreFocus = false, immediate = false } = {}) {
  // Blur, backdrop, and choice handlers can converge on the same close. Once
  // the staged close has started, do not reset its relay; only an explicit
  // immediate close may interrupt it.
  if (!naturalEntryStageOpen) {
    if (!naturalEntryStageEditor) return;
    if (!immediate) return;
  }
  clearNaturalEntryStageRelayTimers();
  clearNaturalEntryMaterialSettle();
  naturalEntryStageOpen = false;
  const runId = ++naturalEntryStageRunId;
  window.cancelAnimationFrame(naturalEntryStagePositionFrame);
  naturalEntryStagePositionFrame = 0;

  const stage = elements.naturalEntryStage;
  const token = elements.naturalEntryStageToken;
  const anchor = naturalEntryStageAnchor;
  captureNaturalEntryStageFamilyTint(stage);
  stage?.removeAttribute("data-note-source-state");

  // Settle only the already-pending token text. Calling renderNaturalEntry()
  // here used to move the editor into a new display state, schedule another
  // stage-position frame, and force a second layout immediately before the
  // close animation. The close path now performs one read batch against the
  // already-rendered surface and leaves the final render to cleanup.
  unfreezeNaturalEntryAnchor();
  if (pendingNaturalEntryRenderFrame) {
    window.cancelAnimationFrame(pendingNaturalEntryRenderFrame);
    pendingNaturalEntryRenderFrame = 0;
    pendingNaturalEntryRender = false;
    pendingNaturalEntryNoteHeightSync = false;
    pendingNaturalEntryStagePosition = false;
  }
  cancelNaturalEntryMotion();
  if (activeEntryEditor === "amount") {
    normalizeAmountInputDisplayValue();
    syncAmountValueTrack(elements.amountInput);
  }
  settleNaturalEntryCloseText(anchor, token, activeEntryEditor);
  // The split summary is intentionally not re-anchored while its panel is
  // open. Once the final text has landed, commit the fresh anchor geometry
  // before the shell's close keyframes snapshot --natural-stage-collapsed-clip;
  // otherwise the returning lens can still target the width from stage open.
  const closeGeometry = stage && anchor
    ? syncNaturalEntryStageAnchorGeometry(stage, anchor)
    : null;

  if (immediate || prefersReducedMotion() || !stage || !anchor) {
    commitPendingNaturalEntryFamilyTint();
    elements.naturalEntryFocusBackdrop.classList.remove("is-open");
    clearNaturalEntryCloseState(anchor);
    finishNaturalEntryStageClose({ restoreFocus });
    return;
  }
  if (activeEntryEditor === "amount") {
    stage.classList.add("is-closing", "is-liquid-returning");
    stage.classList.remove("is-open", "is-opening", "is-text-handed-off", "is-relay-settled");
    anchor.classList.add("is-stage-handoff", "is-stage-mark-handoff", "is-lens-returning");
    setNaturalEntryAnchorTextVisible(anchor, false);
    elements.naturalEntryFocusBackdrop.classList.remove("is-open");
    animateNaturalAmountTrackToAnchor(anchor, () => {
      if (runId !== naturalEntryStageRunId || naturalEntryStageOpen) return;
      setNaturalEntryAnchorTextVisible(anchor, true);
    });
    naturalEntryStageCleanupTimer = window.setTimeout(() => {
      naturalEntryStageCleanupTimer = 0;
      if (runId !== naturalEntryStageRunId || naturalEntryStageOpen) return;
      finishNaturalEntryStageClose({ restoreFocus });
    }, MOTION_DELAYS.naturalEntryStageCloseCleanup);
    return;
  }
  const anchorRect = closeGeometry?.anchorRect || anchor.getBoundingClientRect();
  if (activeEntryEditor === "note") {
    const noteHasValue = Boolean(elements.noteInput?.value.trim());
    stage.classList.add("is-closing", "is-liquid-returning");
    stage.classList.remove("is-open", "is-opening", "is-text-handed-off", "is-relay-settled");
    anchor.classList.add("is-stage-handoff", "is-stage-mark-handoff", "is-lens-returning");
    stage.dataset.valueState = noteHasValue ? "value" : "optional";
    setNaturalEntryAnchorTextVisible(anchor, false);
    elements.naturalEntryFocusBackdrop.classList.remove("is-open");
    const onNoteReached = () => {
      if (runId !== naturalEntryStageRunId || naturalEntryStageOpen) return;
      setNaturalEntryAnchorTextVisible(anchor, true);
    };
    if (noteHasValue) {
      elements.noteInput?.style.removeProperty("opacity");
      animateNaturalEntryNoteTrackToAnchor(anchor, onNoteReached);
    } else {
      elements.noteInput?.style.setProperty("opacity", "0");
      animateNaturalEntryNoteTokenToAnchor(anchor, onNoteReached);
    }
    naturalEntryStageHandoffTimer = window.setTimeout(() => {
      naturalEntryStageHandoffTimer = 0;
      if (runId !== naturalEntryStageRunId || naturalEntryStageOpen) return;
      commitPendingNaturalEntryFamilyTint();
    }, MOTION_DELAYS.naturalEntryStageTextHandoff);
    naturalEntryStageCleanupTimer = window.setTimeout(() => {
      naturalEntryStageCleanupTimer = 0;
      if (runId !== naturalEntryStageRunId || naturalEntryStageOpen) return;
      finishNaturalEntryStageClose({ restoreFocus });
    }, MOTION_DELAYS.naturalEntryStageCloseCleanup);
    return;
  }
  const { rect: sourceRect, sourceColor, sourceScale } = getNaturalEntryFlightSourceMetrics(stage, activeEntryEditor);
  const destinationColor = getComputedStyle(anchor).color || sourceColor;
  const targetMetrics = getNaturalEntryTextMetrics(anchor);
  const { ghost, baseLeft, baseTop } = makeNaturalEntryFlightToken(
    sourceRect,
    getNaturalEntryEditorDisplayText(activeEntryEditor),
    activeEntryEditor === "amount",
    sourceScale,
  );
  ghost.style.color = sourceColor;
  const ghostMetrics = getNaturalEntryTextMetrics(ghost);
  const landingX = targetMetrics && ghostMetrics
    ? (targetMetrics.rect.left + (targetMetrics.rect.width / 2)) - (ghostMetrics.rect.left + (ghostMetrics.rect.width / 2))
    : anchorRect.left - baseLeft;
  const landingY = targetMetrics && ghostMetrics
    ? targetMetrics.baseline - ghostMetrics.baseline
    : anchorRect.top - baseTop;
  const closeDuration = MOTION_DELAYS.naturalEntryStageClose;
  const textHandoff = MOTION_DELAYS.naturalEntryStageTextHandoff;
  // 文字和 shell 从同一个 CSS 内部变量读取收回曲线，避免两条时间线
  // 轻微漂移；文字在 414ms 交接，与后段卡片减速共同收尾。
  const closeCurve = getComputedStyle(stage).getPropertyValue("--natural-stage-curve").trim()
    || "cubic-bezier(0.20, 0, 0, 1)";
  const flight = ghost.animate(
    [
      {
        transform: `scale(${sourceScale})`,
        opacity: 1,
        color: sourceColor,
      },
      {
        offset: textHandoff / closeDuration,
        transform: `translate(${landingX}px, ${landingY}px) scale(0.996)`,
        opacity: 1,
        color: destinationColor,
        easing: closeCurve,
      },
      {
        transform: `translate(${landingX}px, ${landingY}px) scale(1)`,
        opacity: 1,
        color: destinationColor,
      },
    ],
    { duration: closeDuration, easing: closeCurve, fill: "forwards" },
  );
  anchor.classList.add("is-stage-handoff", "is-stage-mark-handoff", "is-lens-returning");
  setNaturalEntryAnchorTextVisible(anchor, false);
  stage.classList.add("is-closing", "is-liquid-returning");
  stage.classList.remove("is-open", "is-opening", "is-text-handed-off", "is-relay-settled");
  elements.naturalEntryFocusBackdrop.classList.remove("is-open");
  naturalEntryMotionAnims.push(flight);

  naturalEntryStageHandoffTimer = window.setTimeout(() => {
    naturalEntryStageHandoffTimer = 0;
    if (runId !== naturalEntryStageRunId || naturalEntryStageOpen) return;
    commitPendingNaturalEntryFamilyTint();
  }, textHandoff);
  naturalEntryStageCleanupTimer = window.setTimeout(() => {
    naturalEntryStageCleanupTimer = 0;
    if (runId !== naturalEntryStageRunId || naturalEntryStageOpen) return;
    finishNaturalEntryStageClose({ restoreFocus });
  }, MOTION_DELAYS.naturalEntryStageCloseCleanup);
  flight.finished.catch(() => {}).then(() => {
    if (runId !== naturalEntryStageRunId || naturalEntryStageOpen) return;
    if (ghost.isConnected) ghost.remove();
    setNaturalEntryAnchorTextVisible(anchor, true);
  });
}

function getNaturalEntryChoiceCloseDelay() {
  if (prefersReducedMotion()) return 0;
  return getCssDurationMs("--selection-motion", 520) + 120;
}

function openNaturalEntryStage(editor) {
  clearNaturalEntryStageRelayTimers();
  clearNaturalEntryMaterialSettle();
  clearNaturalEntryLensSettles();
  cancelNaturalEntryMotion();
  const anchor = getNaturalEntryToken(editor);
  const panel = getNaturalEntryEditor(editor);
  if (!anchor || !panel) return false;
  const amountSourceMetrics = editor === "amount"
    ? getNaturalEntryTextMetrics(anchor)
    : null;

  ++naturalEntryStageRunId;
  if (!naturalEntryStageOpen && naturalEntryStageEditor) {
    commitPendingNaturalEntryFamilyTint();
    restoreNaturalEntryEditorHome(naturalEntryStageEditor);
    unfreezeNaturalEntryAnchor();
    clearNaturalEntryCloseState(naturalEntryStageAnchor);
    naturalEntryStageAnchor?.classList.remove("is-stage-anchor", "is-stage-opening");
    elements.naturalEntryStage.classList.remove("is-preparing", "is-opening", "is-open", "is-closing", "is-liquid-returning", "is-text-handed-off", "is-relay-settled");
    elements.naturalEntryStage.style.removeProperty("--natural-entry-mark-color");
    clearNaturalEntryStageHeightTransition({ resetHeight: true });
  }
  // Stage already open on this exact editor: keep it, no re-trigger.
  if (naturalEntryStageOpen && naturalEntryStageEditor === panel) {
    scheduleNaturalEntryStagePosition();
    return true;
  }

  // Stage open on a different editor: morph to the new token instead of a hard
  // cut. The stage slides to the new anchor while clip-path re-anchors and the
  // content cross-fades, so the editor reads as having moved between words.
  if (naturalEntryStageOpen && naturalEntryStageEditor && naturalEntryStageEditor !== panel) {
    const stage = elements.naturalEntryStage;
    clearNaturalEntryStageHeightTransition();
    const oldHeight = stage.getBoundingClientRect().height;
    const previousStageEditor = naturalEntryStageEditor;
    const previousStageAnchor = naturalEntryStageAnchor;
    restoreNaturalEntryEditorHome(previousStageEditor);
    if (previousStageEditor === elements.splitScope) {
      splitScopeOpen = false;
      renderSplitScope();
    }
    unfreezeNaturalEntryAnchor();
    clearNaturalEntryCloseState(naturalEntryStageAnchor);
    naturalEntryStageAnchor?.classList.remove("is-stage-anchor", "is-stage-opening");
    triggerNaturalEntryLensSettle(previousStageAnchor);
    naturalEntryStageEditor = panel;
    naturalEntryStageAnchor = anchor;
    rememberNaturalEntryEditorHome(panel);
    freezeNaturalEntryAnchor(anchor);
    anchor.classList.add("is-stage-anchor");
    captureNaturalEntryStageFamilyTint(elements.naturalEntryStage);
    elements.naturalEntryStage.dataset.editor = editor;
    elements.naturalEntryStageContent.append(panel);
    if (editor === "amount") syncAmountValueTrack(elements.amountInput);
    if (editor === "note") syncNoteInputHeight(elements.noteInput);
    syncNaturalEntryStageToken();
    resetNaturalEntryStageScroll();
    elements.naturalEntryStageContent.classList.add("is-swapping");
    void elements.naturalEntryStageContent.offsetWidth;
    elements.naturalEntryStageContent.classList.remove("is-swapping");
    positionNaturalEntryStage();
    if (editor === "amount") syncAmountValueTrack(elements.amountInput);
    if (editor === "split") syncSplitAmountValueTracks();
    const nextHeight = stage.scrollHeight;
    stage.style.height = `${oldHeight}px`;
    void stage.offsetHeight;
    if ((editor === "note" && !elements.noteInput.value.trim()) || Math.abs(nextHeight - oldHeight) < 1) {
      /* WebKit still dispatches unrelated transitionend events when the
         measured heights are equal. Do not leave that redundant inline lock
         on a stable note stage. */
      clearNaturalEntryStageHeightTransition({ resetHeight: true });
    } else {
      stage.style.height = `${nextHeight}px`;
      armNaturalEntryStageHeightTransition(stage);
    }
    window.requestAnimationFrame(scheduleNaturalEntryStagePosition);
    elements.naturalEntryStage.classList.remove("is-opening", "is-closing", "is-liquid-returning", "is-text-handed-off");
    elements.naturalEntryStage.classList.add("is-open", "is-relay-settled");
    scheduleNaturalEntryMaterialSettle();
    return true;
  }

  rememberNaturalEntryEditorHome(panel);
  naturalEntryStageOpen = true;
  naturalEntryStageEditor = panel;
  naturalEntryStageAnchor = anchor;
  elements.naturalEntryStage.classList.add("is-preparing", "is-opening");
  elements.naturalEntryStage.classList.remove("is-open", "is-closing", "is-liquid-returning", "is-text-handed-off", "is-relay-settled");
  clearNaturalEntryCloseState(anchor);
  freezeNaturalEntryAnchor(anchor);
  anchor.classList.add("is-stage-anchor");
  anchor.classList.add("is-stage-opening");
  elements.naturalEntryStage.dataset.editor = editor;
  elements.naturalEntryStageContent.append(panel);
  elements.naturalEntryStage.hidden = false;
  elements.naturalEntryFocusBackdrop.hidden = false;
  /* 编辑器从隐藏的原表单移动到舞台后，字号和可用宽度会改变；
     这里必须在可见布局中重新测量，避免沿用隐藏态的 16px 宽度。 */
  if (editor === "amount") syncAmountValueTrack(elements.amountInput);
  if (editor === "note") syncNoteInputHeight(elements.noteInput);
  document.body.classList.add("natural-entry-focus-open");
  captureNaturalEntryStageFamilyTint(elements.naturalEntryStage);
  syncNaturalEntryStageToken();
  resetNaturalEntryStageScroll();
  positionNaturalEntryStage();
  /* positionNaturalEntryStage() commits the visible stage width. Re-measure
     once after that width is final so a reused stage cannot leave the amount
     track based on its previous editor's box. */
  if (editor === "amount") syncAmountValueTrack(elements.amountInput);
  if (editor === "split") syncSplitAmountValueTracks();

  elements.naturalEntryFocusBackdrop.classList.remove("is-open");
  // The stage is reused between editors. Commit its new anchor geometry as a
  // transition-free frame first so WebKit cannot interpolate from the previous
  // editor or coalesce the source and destination into one flashing frame.
  void elements.naturalEntryStage.offsetWidth;
  elements.naturalEntryStage.classList.remove("is-preparing");
  void elements.naturalEntryStage.offsetWidth;
  if (prefersReducedMotion()) {
    if (editor === "amount") {
      naturalEntryAmountHandoffRunning = false;
      positionNaturalEntryStage();
      syncAmountValueTrack(elements.amountInput);
      elements.amountInput.closest(".amount-value-track")?.style.removeProperty("transform");
    }
    elements.naturalEntryStage.classList.add("is-open", "is-text-handed-off", "is-relay-settled");
    elements.naturalEntryStage.classList.remove("is-opening");
    anchor.classList.remove("is-stage-opening");
    elements.naturalEntryFocusBackdrop.classList.add("is-open");
    scheduleNaturalEntryMaterialSettle();
    return true;
  }
  window.requestAnimationFrame(() => {
    if (!naturalEntryStageOpen || naturalEntryStageEditor !== panel) return;
    /* 金额的最终舞台宽度和输入轨道要在放大动画开始前提交；否则首帧
       会沿用准备态的临时 left/top，随后再被 positionNaturalEntryStage()
       拉回中心，形成“放大中才到最终位置”的可见错位。 */
    if (editor === "amount") {
      syncAmountValueTrack(elements.amountInput);
      positionNaturalEntryStage();
    }
    if (editor === "amount") naturalEntryAmountHandoffRunning = true;
    elements.naturalEntryStage.classList.add("is-open");
    if (editor === "amount") animateNaturalAmountTrackFrom(amountSourceMetrics);
    elements.naturalEntryFocusBackdrop.classList.add("is-open");
    scheduleNaturalEntryStagePosition();
    const openTextHandoff = editor === "note"
      ? (elements.noteInput.value.trim()
        ? MOTION_DELAYS.naturalEntryStageNoteValueHandoff
        : MOTION_DELAYS.naturalEntryStageNoteOptionalHandoff)
      : MOTION_DELAYS.naturalEntryStageOpenTextHandoff;
    naturalEntryStageOpenHandoffTimer = window.setTimeout(() => {
      naturalEntryStageOpenHandoffTimer = 0;
      if (!naturalEntryStageOpen || naturalEntryStageEditor !== panel) return;
      anchor.classList.remove("is-stage-opening");
      elements.naturalEntryStage.classList.add("is-text-handed-off");
    }, openTextHandoff);
    naturalEntryStageOpenFinishTimer = window.setTimeout(() => {
      naturalEntryStageOpenFinishTimer = 0;
      if (!naturalEntryStageOpen || naturalEntryStageEditor !== panel) return;
      if (editor === "amount") {
        naturalEntryAmountHandoffRunning = false;
        positionNaturalEntryStage();
        syncAmountValueTrack(elements.amountInput);
        elements.amountInput.closest(".amount-value-track")?.style.removeProperty("transform");
      }
      elements.naturalEntryStage.classList.remove("is-opening", "is-text-handed-off");
      elements.naturalEntryStage.classList.add("is-relay-settled");
      scheduleNaturalEntryMaterialSettle();
    }, MOTION_DELAYS.naturalEntryStageOpen);
  });
  return true;
}

function getNaturalEntryTintTargets() {
  return [elements.expenseForm, elements.naturalEntryFlow].filter(Boolean);
}

function freezeNaturalEntryFamilyTint() {
  getNaturalEntryTintTargets().forEach((element) => {
    const currentColor = getComputedStyle(element).getPropertyValue("--natural-entry-mark-color").trim();
    if (currentColor) element.style.setProperty("--natural-entry-mark-color", currentColor);
  });
  if (naturalEntryStageOpen) captureNaturalEntryStageFamilyTint(elements.naturalEntryStage);
}

function applyNaturalEntryFamilyTint(payerId = state.selectedPayerId, { animate = false } = {}) {
  const normalizedPayerId = normalizePayerId(payerId);
  const targetColor = normalizedPayerId ? getFamilyVisual(normalizedPayerId).color : "";
  const targets = getNaturalEntryTintTargets();

  if (!naturalEntryFamilyTintInitialized || !animate || prefersReducedMotion()) {
    targets.forEach((element) => {
      element.style.setProperty("--natural-entry-family-tint-duration", "0ms");
      if (targetColor) element.style.setProperty("--natural-entry-mark-color", targetColor);
      else element.style.removeProperty("--natural-entry-mark-color");
    });
    window.requestAnimationFrame(() => {
      targets.forEach((element) => element.style.removeProperty("--natural-entry-family-tint-duration"));
    });
  } else {
    targets.forEach((element) => {
      element.style.setProperty("--natural-entry-family-tint-duration", `${MOTION_DELAYS.naturalEntryFamilyTint}ms`);
      if (targetColor) element.style.setProperty("--natural-entry-mark-color", targetColor);
      else element.style.removeProperty("--natural-entry-mark-color");
    });
  }

  naturalEntryFamilyTintInitialized = true;
  naturalEntryDisplayedPayerId = normalizedPayerId;
  pendingNaturalEntryFamilyTintId = null;
}

function syncNaturalEntryFamilyTint() {
  const selectedPayerId = normalizePayerId(state.selectedPayerId);
  if (!naturalEntryFamilyTintInitialized) {
    applyNaturalEntryFamilyTint(selectedPayerId);
    return;
  }
  if (!naturalEntryStageOpen && pendingNaturalEntryFamilyTintId === null && selectedPayerId !== naturalEntryDisplayedPayerId) {
    applyNaturalEntryFamilyTint(selectedPayerId);
  }
}

function clearNaturalEntryLensSettles() {
  naturalEntryLensSettleTimers.forEach((timer, token) => {
    window.clearTimeout(timer);
    token.classList.remove("is-lens-settling");
  });
  naturalEntryLensSettleTimers.clear();
}

function triggerNaturalEntryLensSettle(token, { delay = 0 } = {}) {
  if (!token) return;
  const previousTimer = naturalEntryLensSettleTimers.get(token);
  if (previousTimer) window.clearTimeout(previousTimer);
  token.classList.remove("is-lens-settling");
  if (prefersReducedMotion()) return;

  const timer = window.setTimeout(() => {
    token.classList.remove("is-lens-settling");
    void token.offsetWidth;
    token.classList.add("is-lens-settling");
    const cleanupTimer = window.setTimeout(() => {
      naturalEntryLensSettleTimers.delete(token);
      token.classList.remove("is-lens-settling");
    }, MOTION_DELAYS.naturalEntryLensSettle + 40);
    naturalEntryLensSettleTimers.set(token, cleanupTimer);
  }, delay);
  naturalEntryLensSettleTimers.set(token, timer);
}

function triggerNaturalEntryLensEntry({ force = false } = {}) {
  const flow = elements.naturalEntryFlow;
  if (!flow || prefersReducedMotion() || (naturalEntryLensHasRevealed && !force)) return;

  window.clearTimeout(naturalEntryLensEntryTimer);
  clearNaturalEntryLensSettles();
  const tokens = [...flow.querySelectorAll(".natural-entry-token")];
  tokens.forEach((token) => {
    token.style.setProperty("--natural-entry-lens-delay", "0ms");
  });
  flow.classList.remove("is-lens-entering");
  void flow.offsetWidth;
  flow.classList.add("is-lens-entering");
  naturalEntryLensHasRevealed = true;
  naturalEntryLensEntryTimer = window.setTimeout(() => {
    naturalEntryLensEntryTimer = 0;
    flow.classList.remove("is-lens-entering");
  }, MOTION_DELAYS.naturalEntryLensEntry + Math.max(0, (tokens.length - 1) * MOTION_DELAYS.naturalEntryLensStagger) + 80);
}

function renderNaturalEntry({ positionStage = true } = {}) {
  if (!elements.naturalEntryFlow) return;

  syncNaturalEntryFamilyTint();

  const amount = parseAmountInput(elements.amountInput.value);
  const amountCents = Number.isFinite(amount) && amount > 0 ? amountToCents(amount) : 0;
  const note = elements.noteInput.value.trim();
  const date = normalizeDate(elements.dateInput.value, state.activeDate);

  elements.expenseForm.dataset.activeEntryEditor = naturalEntryStageOpen ? activeEntryEditor : "";
  elements.expenseForm.dataset.familySelected = String(Boolean(state.selectedPayerId));
  elements.naturalEntryFlow.dataset.familySelected = String(Boolean(state.selectedPayerId));
  elements.naturalDateToken.dataset.valueState = date ? "value" : "placeholder";
  elements.naturalPayerToken.dataset.valueState = state.selectedPayerId ? "value" : "placeholder";
  elements.naturalAmountToken.dataset.valueState = amountCents ? "value" : "placeholder";
  elements.naturalCategoryToken.dataset.valueState = state.activeCategory ? "value" : "placeholder";
  elements.naturalNoteToken.dataset.valueState = note ? "value" : "optional";
  elements.naturalSplitToken.dataset.valueState = "value";
  animateNaturalEntryToken(elements.naturalDateToken, formatNaturalEntryDate(date), { duration: 240 });
  animateNaturalEntryToken(elements.naturalPayerToken, state.selectedPayerId ? getFamilyName(state.selectedPayerId) : "付款家庭", { duration: 280 });
  setNaturalAmountTokenDisplay(
    elements.naturalAmountToken,
    amountCents ? formatNaturalEntryAmount(amountCents) : "¥ 0.00",
  );
  animateNaturalEntryToken(elements.naturalCategoryToken, state.activeCategory ? formatCategoryLabel(state.activeCategory) : "类别", { duration: 260 });
  animateNaturalEntryToken(elements.naturalNoteToken, note || "备注可选", {
    duration: 280,
    animate: !(naturalEntryStageOpen && activeEntryEditor === "note"),
  });
  elements.naturalNoteToken.title = note || "备注可选";
  elements.naturalNoteToken.setAttribute("aria-label", note || "备注可选");
  animateSplitSummaryText(elements.naturalSplitToken, formatNaturalEntrySplit());

  elements.naturalEntryFlow.querySelectorAll("[data-entry-target]").forEach((button) => {
    const expanded = naturalEntryStageOpen && button.dataset.entryTarget === activeEntryEditor;
    button.classList.toggle("is-active", expanded);
    button.setAttribute("aria-expanded", String(expanded));
  });
  const stageText = activeEntryEditor === "date"
    ? formatNaturalEntryDate(date)
    : activeEntryEditor === "payer"
      ? (state.selectedPayerId ? getFamilyName(state.selectedPayerId) : "付款家庭")
      : activeEntryEditor === "amount"
        ? (amountCents ? formatNaturalEntryAmount(amountCents) : "¥ 0.00")
        : activeEntryEditor === "category"
          ? (state.activeCategory ? formatCategoryLabel(state.activeCategory) : "类别")
          : activeEntryEditor === "note"
            ? (note || "备注可选")
            : formatNaturalEntrySplit();
  syncNaturalEntryStageToken({
    text: stageText,
    animate: naturalEntryStageOpen
      && !elements.naturalEntryStage.classList.contains("is-preparing")
      && !elements.naturalEntryStage.classList.contains("is-closing"),
  });
  if (positionStage) scheduleNaturalEntryStagePosition();
}

/* 金额逐字输入时，预览与提交栏统一推迟到下一帧、且同帧只排一次，
   避免十余次 getBoundingClientRect 测量阻塞输入框自身的绘制（数字卡顿）。 */
let pendingNaturalEntryRender = false;
let pendingNaturalEntryRenderFrame = 0;
let pendingNaturalEntryNoteHeightSync = false;
let pendingNaturalEntryStagePosition = false;
function scheduleNaturalEntryRender({ syncNote = false, positionStage = true } = {}) {
  pendingNaturalEntryNoteHeightSync ||= syncNote;
  pendingNaturalEntryStagePosition ||= positionStage;
  if (pendingNaturalEntryRender) return;
  pendingNaturalEntryRender = true;
  pendingNaturalEntryRenderFrame = requestAnimationFrame(() => {
    pendingNaturalEntryRender = false;
    pendingNaturalEntryRenderFrame = 0;
    const shouldSyncNote = pendingNaturalEntryNoteHeightSync;
    const shouldPositionStage = pendingNaturalEntryStagePosition;
    pendingNaturalEntryNoteHeightSync = false;
    pendingNaturalEntryStagePosition = false;
    if (shouldSyncNote) syncNoteInputHeight(elements.noteInput);
    renderNaturalEntry({ positionStage: shouldPositionStage });
    renderMobileSubmitBar();
  });
}

function getNaturalEntryFocusTarget(editor) {
  if (editor === "date") return elements.dateInput;
  if (editor === "payer") {
    return elements.familyRoster.querySelector(".family-tag.is-selected")
      || elements.familyRoster.querySelector(".family-tag");
  }
  if (editor === "amount") return elements.amountInput.disabled ? null : elements.amountInput;
  if (editor === "category") {
    return elements.categoryChips.querySelector(".selectable-category-chip.is-selected")
      || elements.categoryChips.querySelector(".selectable-category-chip");
  }
  if (editor === "note") return elements.noteInput;
  if (editor === "split") {
    return elements.splitModeButtons.querySelector(".split-mode-button.is-selected")
      || elements.splitModeButtons.querySelector(".split-mode-button");
  }
  return null;
}

function setActiveEntryEditor(editor, { focus = false, scroll = false } = {}) {
  const requestedEditor = editor;
  if (!naturalEntryEditors.has(requestedEditor)) return;

  activeEntryEditor = requestedEditor;
  if (requestedEditor === "note") syncNoteInputHeight(elements.noteInput);
  if (requestedEditor === "split" && !splitScopeOpen) {
    splitScopeOpen = true;
    renderSplitScope();
  }
  const naturalEntryLayout = isNaturalEntryLayout();
  /* Commit the sentence/token state before moving the editor into the fixed
     stage. Moving the panel changes the natural-flow layout; if the token
     text/value state is rendered afterwards, WebKit can measure the old anchor
     for the first frame and then re-anchor the stage one frame later. That is
     the visible jump on the note relay path. */
  if (naturalEntryLayout && !naturalEntryStageOpen) {
    renderNaturalEntry({ positionStage: false });
  }
  if (naturalEntryLayout) openNaturalEntryStage(requestedEditor);
  renderNaturalEntry();
  if (!naturalEntryLayout || (!focus && !scroll)) return;

  window.requestAnimationFrame(() => {
    const panel = getNaturalEntryEditor(requestedEditor);
    if (scroll && !naturalEntryStageOpen) panel?.scrollIntoView({ block: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    if (focus) getNaturalEntryFocusTarget(requestedEditor)?.focus({ preventScroll: true });
  });
}

function handleNaturalEntryClick(event) {
  const button = event.target.closest("[data-entry-target]");
  if (!button) return;
  const editor = button.dataset.entryTarget;
  setActiveEntryEditor(editor, { focus: true, scroll: true });
  if (editor === "date" && isNaturalEntryLayout()) {
    const dateInput = elements.dateInput;
    dateInput.focus({ preventScroll: true });
    try {
      if (typeof dateInput.showPicker === "function") dateInput.showPicker();
      else dateInput.click();
    } catch (_) {
      /* 某些 WebKit 版本拒绝脚本唤起时，保留已聚焦的原生日期输入。 */
    }
  }
}

/* The modal backdrop sits above the sentence so the inactive page stays
   softly blurred. Resolve taps that land on another sentence token from its
   frozen screen rect, then reuse the normal token click path. This makes the
   existing stage-to-stage morph reachable without exposing unrelated controls
   behind the backdrop. */
function handleNaturalEntryBackdropClick(event) {
  const token = [...elements.naturalEntryFlow.querySelectorAll("[data-entry-target]")]
    .find((button) => {
      if (button === naturalEntryStageAnchor) return false;
      const rect = button.getBoundingClientRect();
      return event.clientX >= rect.left
        && event.clientX <= rect.right
        && event.clientY >= rect.top
        && event.clientY <= rect.bottom;
    });

  if (token) {
    token.click();
    return;
  }
  closeNaturalEntryStage({ restoreFocus: true });
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
  elements.ledgerSection?.classList.toggle("has-active-filters", active);
  elements.ledgerSection?.classList.toggle("is-filter-open", ledgerFiltersExpanded);
  elements.ledgerFilterToggle?.setAttribute("aria-expanded", ledgerFiltersExpanded ? "true" : "false");
  elements.ledgerFilterToggle?.setAttribute(
    "aria-label",
    active ? `${ledgerFiltersExpanded ? "收起" : "展开"}筛选，当前已有筛选条件` : `${ledgerFiltersExpanded ? "收起" : "展开"}筛选`,
  );
  if (!active) {
    elements.ledgerFilterSummary.textContent = "";
    return;
  }

  const summary = calculateVisibleExpensesSummary();
  elements.ledgerFilterSummary.textContent = `筛选合计 ${formatMoney(summary.totalCents)}（${summary.count} 笔）`;
}

function toggleLedgerFilters() {
  ledgerFiltersExpanded = !ledgerFiltersExpanded;
  if (ledgerFiltersExpanded && expandedExpenseId) {
    collapseLedgerItem(expandedExpenseId);
  }
  renderLedgerFilterSummary();
  if (ledgerFiltersExpanded) {
    window.requestAnimationFrame(() => elements.ledgerFamilyFilter?.focus({ preventScroll: true }));
  } else {
    elements.ledgerFilterToggle?.focus({ preventScroll: true });
  }
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

function getOperatorFamilyId() {
  return normalizePayerId(localStorage.getItem(OPERATOR_FAMILY_STORAGE_KEY));
}

function getSelectedOperatorFamilyId(container) {
  return normalizePayerId(container?.querySelector("[data-operator-family-id].is-selected")?.dataset.operatorFamilyId);
}

function renderOperatorFamilyChoices(container, selectedFamilyId = getOperatorFamilyId()) {
  if (!container) return;
  container.innerHTML = state.families
    .map((family) => renderFamilyChoiceButton(family, {
      dataName: "data-operator-family-id",
      extraClass: "operator-family-choice",
      singleSelect: true,
      selected: family.id === selectedFamilyId,
    }))
    .join("");
}

function selectOperatorFamilyChoice(container, familyId) {
  const normalizedFamilyId = normalizePayerId(familyId);
  if (!container || !normalizedFamilyId) return;
  container.querySelectorAll("[data-operator-family-id]").forEach((button) => {
    const selected = button.dataset.operatorFamilyId === normalizedFamilyId;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-checked", String(selected));
  });
}

function handleOperatorFamilyChoice(event) {
  const button = event.target.closest("[data-operator-family-id]");
  if (!button) return;
  selectOperatorFamilyChoice(event.currentTarget, button.dataset.operatorFamilyId);
  if (event.currentTarget === elements.welcomeIdentityFamilyList) {
    localStorage.setItem(OPERATOR_FAMILY_STORAGE_KEY, button.dataset.operatorFamilyId);
    renderOperatorFamilyChoices(elements.settingsOperatorFamilyList, button.dataset.operatorFamilyId);
    syncWelcomeControls();
  }
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
  const chipMarkup = state.categories
    .map((category) => {
      const isNew = category === lastAddedCategory;
      const selected = category === state.activeCategory;
      const recent = !selected && recentCategories.has(category);
      const activating = selected && category === activatingCategory;
      const deactivating = !selected && category === deactivatingCategory;
      return `
        <button class="${classNames("chip", "category-chip", "selectable-category-chip", selected && "is-selected", recent && "is-recent", isNew && "is-entering", activating && "is-activating", deactivating && "is-deactivating")}" type="button" data-category="${escapeHtml(category)}" style="${categoryStyle(category)}" role="radio" aria-checked="${selected}">
          <span>${categorySymbolHtml(category)}${escapeHtml(category)}</span>
        </button>
      `;
    })
    .join("");
  // 末尾不再塞「新增」胶囊：新增入口移到 chips 下方独立的圆形 + 按钮（category-add-fab）。
  elements.categoryChips.innerHTML = chipMarkup;
  scheduleCategoryEdgeFades();
}

function updateCategorySelectionUI(nextCategory) {
  const recentCategories = new Set(getRecentCategories(3));
  elements.categoryChips.querySelectorAll(".selectable-category-chip").forEach((chip) => {
    const category = chip.dataset.category;
    const selected = category === nextCategory;
    chip.classList.toggle("is-selected", selected);
    chip.classList.toggle("is-recent", !selected && recentCategories.has(category));
    chip.setAttribute("aria-checked", String(selected));
  });
  scheduleCategoryEdgeFades();
}

// 记账视图内的「最近记录」：提交后即时露出最近 1–2 笔，用户无需切到「数据」即可确认已保存。
function renderRecentPeek() {
  const host = document.getElementById("recentPeek");
  if (!host) return;
  if (editingExpenseId) {
    host.hidden = true;
    host.innerHTML = "";
    return;
  }
  const expenses = [...state.expenses]
    .filter((expense) => !expense.isDeleted)
    // “最近”指最近添加，而不是账单发生日期；编辑已有账单也不应改变它的位置。
    .sort((a, b) => (b.createdAt || b.updatedAt || "").localeCompare(a.createdAt || a.updatedAt || "") || b.id.localeCompare(a.id))
    .slice(0, 2);
  if (!expenses.length) {
    host.hidden = true;
    host.innerHTML = "";
    return;
  }
  host.hidden = false;
  host.innerHTML = `
    <div class="recent-peek-head">
      <span class="recent-peek-title">最近记录</span>
      <button class="recent-peek-all" type="button">查看全部</button>
    </div>
    <ul class="recent-peek-list">
      ${expenses
        .map((expense) => {
          const noteMarkup = expense.note
            ? `<span class="recent-peek-note" title="${escapeHtml(expense.note)}" aria-label="${escapeHtml(expense.note)}">${escapeHtml(expense.note)}</span>`
            : "";
          return `
        <li class="recent-peek-item">
          <span class="category-pill">${categoryLabelHtml(expense.category)}</span>
          ${noteMarkup}
          <span class="recent-peek-amount">${formatMoney(expenseToCents(expense))}</span>
        </li>`;
        })
        .join("")}
    </ul>`;
  host.querySelector(".recent-peek-all")?.addEventListener("click", openFullLedger, { once: false });
}

function updateCategoryAddConfirmState() {
  const hasValue = Boolean(elements.newCategoryInput?.value.trim());
  if (elements.categoryAddConfirm) {
    elements.categoryAddConfirm.disabled = !hasValue;
    elements.categoryAddConfirm.setAttribute("aria-disabled", String(!hasValue));
  }
}

function cancelCategoryAddViewportSettle() {
  window.clearTimeout(categoryAddViewportTimer);
  categoryAddViewportTimer = 0;
  categoryAddViewportCleanup?.();
  categoryAddViewportCleanup = null;
}

function scheduleCategoryInputViewportSettle(duration) {
  cancelCategoryAddViewportSettle();
  /* 桌面端输入框本就完整可见，额外 scrollIntoView 会触发页头滚动联动；
     只在可能出现软键盘的窄屏视口等待 visualViewport 稳定后校正。 */
  if (!window.matchMedia("(max-width: 820px)").matches) return;
  const picker = elements.categoryChips.closest(".category-picker");
  const input = elements.newCategoryInput;
  if (!picker || !input) return;
  const runId = categoryAddMorphRunId;

  const settle = () => {
    if (runId !== categoryAddMorphRunId || !picker.classList.contains("is-adding")) return;
    input.scrollIntoView({ block: "nearest", behavior: "auto" });
  };
  const scheduleAfterViewport = () => {
    window.clearTimeout(categoryAddViewportTimer);
    categoryAddViewportTimer = window.setTimeout(settle, 120);
  };

  const viewport = window.visualViewport;
  if (viewport) {
    viewport.addEventListener("resize", scheduleAfterViewport, { passive: true });
    categoryAddViewportCleanup = () => viewport.removeEventListener("resize", scheduleAfterViewport);
  }
  categoryAddViewportTimer = window.setTimeout(settle, duration + 80);
  window.setTimeout(() => {
    if (runId !== categoryAddMorphRunId || !picker.classList.contains("is-adding")) return;
    cancelCategoryAddViewportSettle();
  }, duration + 720);
}

function cancelCategoryAddMorphAnimations() {
  categoryAddMorphAnimations.forEach((animation) => animation.cancel());
  categoryAddMorphAnimations = [];
  elements.categoryForm?.style.removeProperty("will-change");
  elements.categoryAddFab?.style.removeProperty("will-change");
}

function setCategoryChipAccessibility(hidden) {
  const focusableChips = elements.categoryChips.querySelectorAll("button, [href], input, select, textarea, [tabindex]");
  if (hidden) {
    elements.categoryChips.setAttribute("aria-hidden", "true");
    focusableChips.forEach((element) => {
      if (!("categoryMorphTabIndex" in element.dataset)) {
        element.dataset.categoryMorphTabIndex = element.hasAttribute("tabindex")
          ? element.getAttribute("tabindex")
          : "none";
      }
      element.tabIndex = -1;
    });
  } else {
    elements.categoryChips.removeAttribute("aria-hidden");
    focusableChips.forEach((element) => {
      const previous = element.dataset.categoryMorphTabIndex;
      if (previous === undefined) return;
      if (previous === "none") element.removeAttribute("tabindex");
      else element.setAttribute("tabindex", previous);
      delete element.dataset.categoryMorphTabIndex;
    });
  }
}

function animateCategoryAddMorph(firstRect, opening, onSettled) {
  const picker = elements.categoryChips.closest(".category-picker");
  const form = elements.categoryForm;
  const button = elements.categoryAddFab;
  if (!picker || !form || !button) return;

  const finish = () => {
    picker.classList.remove("is-category-morphing");
    if (!opening) {
      picker.classList.remove("is-category-morph-closing");
      setCategoryChipAccessibility(false);
    }
    onSettled?.();
  };

  const lastRect = form.getBoundingClientRect();
  if (
    prefersReducedMotion()
    || typeof form.animate !== "function"
    || !firstRect.width
    || !lastRect.width
  ) {
    finish();
    return;
  }

  const runId = categoryAddMorphRunId;
  const { values, duration } = springSamples(opening ? SPRING_CATEGORY_ADD_OPEN : SPRING_CATEGORY_ADD_CLOSE);
  const startScaleX = firstRect.width / lastRect.width;
  const deltaX = firstRect.left - lastRect.left;
  const deltaY = firstRect.top - lastRect.top;
  const formFrames = [];
  const buttonFrames = [];

  values.forEach((progress, index) => {
    const offset = index / (values.length - 1);
    const scaleX = Math.max(0.04, startScaleX + (1 - startScaleX) * progress);
    formFrames.push({
      offset,
      transform: `translate3d(${deltaX * (1 - progress)}px, ${deltaY * (1 - progress)}px, 0) scaleX(${scaleX})`,
    });
    /* 外壳做横向 FLIP 时，反向缩放左端按钮，避免 + / × 被压扁或拉宽。 */
    buttonFrames.push({ offset, transform: `scaleX(${1 / scaleX})` });
  });

  form.style.willChange = "transform";
  button.style.willChange = "transform";
  const options = { duration, easing: "linear", fill: "forwards", composite: "replace" };
  const formAnimation = form.animate(formFrames, options);
  const buttonAnimation = button.animate(buttonFrames, options);
  categoryAddMorphAnimations = [formAnimation, buttonAnimation];

  let cleaned = false;
  const cleanup = () => {
    if (cleaned || runId !== categoryAddMorphRunId) return;
    cleaned = true;
    window.requestAnimationFrame(() => {
      if (runId !== categoryAddMorphRunId) return;
      cancelCategoryAddMorphAnimations();
      finish();
    });
  };
  formAnimation.onfinish = cleanup;
  window.setTimeout(cleanup, duration + 100);

  if (opening) scheduleCategoryInputViewportSettle(duration);
}

function setCategoryAddOpen(opening, { clearInput = false, restoreFocus = false, onSettled = null } = {}) {
  const picker = elements.categoryChips.closest(".category-picker");
  const form = elements.categoryForm;
  const input = elements.newCategoryInput;
  if (!picker || !form || !input) return;

  const firstRect = form.getBoundingClientRect();
  categoryAddMorphRunId += 1;
  cancelCategoryAddMorphAnimations();
  cancelCategoryAddViewportSettle();
  picker.classList.add("is-category-morphing");

  if (opening) {
    picker.classList.remove("is-category-morph-closing");
    picker.classList.add("is-adding");
    setCategoryChipAccessibility(true);
    input.tabIndex = 0;
    elements.categoryAddFab?.setAttribute("aria-expanded", "true");
    elements.categoryAddFab?.setAttribute("aria-label", "取消新增类别");
    updateCategoryAddConfirmState();
    /* iOS 只允许在原始点击事件中同步聚焦；延迟 focus 会让软键盘不弹。 */
    try {
      input.focus({ preventScroll: true });
    } catch (error) {
      input.focus();
    }
  } else {
    picker.classList.add("is-category-morph-closing");
    picker.classList.remove("is-adding");
    /* render() 可能刚替换过类别按钮；收起动画期间继续移出 Tab 顺序。 */
    setCategoryChipAccessibility(true);
    if (clearInput) input.value = "";
    input.tabIndex = -1;
    elements.categoryAddFab?.setAttribute("aria-expanded", "false");
    elements.categoryAddFab?.setAttribute("aria-label", "新增类别");
    updateCategoryAddConfirmState();
    if (restoreFocus) {
      try {
        elements.categoryAddFab?.focus({ preventScroll: true });
      } catch (error) {
        elements.categoryAddFab?.focus();
      }
    }
  }

  void form.offsetWidth;
  animateCategoryAddMorph(firstRect, opening, onSettled);
}

function toggleCategoryAdd() {
  const picker = elements.categoryChips.closest(".category-picker");
  if (!picker) return;
  const opening = !picker.classList.contains("is-adding");
  setCategoryAddOpen(opening, { clearInput: !opening, restoreFocus: !opening });
}

function openFullLedger() {
  const isMobile = window.matchMedia("(max-width: 820px)").matches;
  if (isMobile) {
    setMobilePanel("data", { animate: true });
  } else {
    elements.ledgerSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

let categoryFadeFrame = 0;

function scheduleCategoryEdgeFades() {
  if (categoryFadeFrame) return;
  categoryFadeFrame = window.requestAnimationFrame(() => {
    categoryFadeFrame = 0;
    updateCategoryEdgeFades();
  });
}

// 按横滚位置切换两侧渐隐：只在该侧仍有内容可滚时显示（iOS 边缘行为）。
// can-fade-* 同时打到 .category-chips-fade 和 .category-control-row；
// 左右遮罩都由 row 的 ::before / ::after 承担，避免 chips 的负 margin 干扰定位。
// 避免用 :has() 选择器——iOS Safari 每次 style recalc 会遍历子树匹配，
// 触发 header 区域滚动卡顿（见 responsive.css :has 注释）。
function updateCategoryEdgeFades() {
  const el = elements.categoryChips;
  if (!el) return;
  const wrap = el.closest(".category-chips-fade") || el;
  const maxScroll = el.scrollWidth - el.clientWidth;
  const threshold = 2;
  const canStart = el.scrollLeft > threshold;
  const canEnd = el.scrollLeft < maxScroll - threshold;
  wrap.classList.toggle("can-fade-start", canStart);
  wrap.classList.toggle("can-fade-end", canEnd);
  const row = wrap.closest && wrap.closest(".category-control-row");
  if (row) {
    row.classList.toggle("can-fade-start", canStart);
    row.classList.toggle("can-fade-end", canEnd);
  }
}

// 类别横滑到头的橡皮筋回弹：触摸拖到边后继续拖，用阻尼位移把整条类别带
// “拉出”一点，松手后平滑弹回。刻意收敛：位移小、阻力大、无过冲，只是“到头了”
// 的物理暗示，不做吸睛动效。仅触摸端手写；桌面（触控板/滚轮）交给浏览器
// overscroll-behavior-x: contain 的原生橡皮筋——避免 wheel listener passive:false
// 阻塞合成器滚动导致跟手性下降。
function setupCategoryOverscroll(el) {
  if (!el) return;
  /* iOS Safari 的原生横向滚动已经提供惯性与边缘回弹；手写 touchmove
     需要 passive:false，会让 WebKit 等待方向判断，反而阻塞页面纵向滚动。
     保留桌面触控板/其他浏览器的轻微拉伸反馈，移动 WebKit 交回原生滚动。 */
  const mobileWebKit = /iP(ad|hone|od)/.test(navigator.userAgent || "")
    || (/Macintosh/.test(navigator.userAgent || "") && navigator.maxTouchPoints > 1);
  if (mobileWebKit && window.matchMedia?.("(max-width: 820px)").matches) return;
  const LIMIT = 22; // 最大拉出距离（渐近上限）
  const RESIST = 190; // 阻尼系数：越大越“沉”
  const maxScroll = () => el.scrollWidth - el.clientWidth;
  const atStart = () => el.scrollLeft <= 0;
  const atEnd = () => el.scrollLeft >= maxScroll() - 0.5;
  // 累积越界量 raw → 渐近阻尼位移：拉得越多，增量越小，永不超过 LIMIT
  const damp = (r) => Math.sign(r) * LIMIT * (1 - 1 / (Math.abs(r) / RESIST + 1));

  let raw = 0; // 当前累积的越界拖动量（未阻尼，带正负）
  let settle = null; // 松手回弹动画

  // paint / springBack 的 transform 始终带 translateZ(0)，避免行内 transform
  // 覆盖 CSS 的合成层提升（translateZ(0)），导致越界拉伸和回弹动画期间元素
  // 掉出合成层、每帧主线程重绘。
  const paint = () => {
    el.style.transform = raw ? `translateZ(0) translateX(${damp(raw).toFixed(2)}px)` : "";
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
      [{ transform: `translateZ(0) translateX(${from.toFixed(2)}px)` }, { transform: "translateZ(0) translateX(0)" }],
      { duration: 260, easing: "cubic-bezier(0.25, 0.8, 0.3, 1)" }
    );
    settle.onfinish = settle.oncancel = () => {
      el.style.willChange = "";
      settle = null;
    };
  };

  // ── 触摸拖动 ──
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let gestureAxis = "";
  let dragging = false;
  el.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    cancelSettle();
    paint();
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    lastX = startX;
    gestureAxis = "";
    dragging = true;
  }, { passive: true });

  el.addEventListener("touchmove", (e) => {
    if (!dragging || e.touches.length !== 1 || prefersReducedMotion()) return;
    const touch = e.touches[0];
    const x = touch.clientX;
    const totalX = x - startX;
    const totalY = touch.clientY - startY;
    if (!gestureAxis) {
      if (Math.max(Math.abs(totalX), Math.abs(totalY)) < 7) return;
      gestureAxis = Math.abs(totalX) > Math.abs(totalY) * 1.15 ? "horizontal" : "vertical";
    }
    /* 纵向意图完全交还给页面。没有方向锁时，类别带到达横向边缘后会在
       touchmove 里 preventDefault，导致从胶囊上起手的页面滚动像被卡住。 */
    if (gestureAxis !== "horizontal") return;
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
    gestureAxis = "";
    springBack();
  };
  el.addEventListener("touchend", endDrag, { passive: true });
  el.addEventListener("touchcancel", endDrag, { passive: true });
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
  const splitSummary = formatActiveSplitSummary();
  animateSplitSummaryText(elements.splitScopeSummary, splitSummary, {
    ariaElement: elements.splitScopeToggle,
    ariaLabel: `分摊，${splitSummary}`,
    animate: activeSplitMode !== "custom",
  });
  elements.splitScopePanel.classList.toggle("is-switching", splitScopeSwitching);
  elements.splitScopePanel.dataset.activeSplitMode = activeSplitMode;
  elements.splitScopePanel.dataset.activeSplitRule = getSplitRuleFromMode(activeSplitMode);
  elements.splitScopePanel.dataset.activeSplitScope = getSplitScopeFromMode(activeSplitMode);
  updateSplitScopePanelState();

  syncSplitModeButtons();
  const isCustom = activeSplitMode === "custom";
  const isAllFamilies = getSplitScopeFromMode(activeSplitMode) === "all";
  elements.splitDetailArea.hidden = false;
  elements.splitParticipantToggle.hidden = isCustom || isAllFamilies;
  elements.splitParticipantToggle.setAttribute("aria-expanded", String(!isAllFamilies && splitFamilyChoicesOpen));
  elements.splitFamilyChoices.hidden = isCustom || (!isAllFamilies && !splitFamilyChoicesOpen);
  syncSplitParticipantSummary();
  syncSplitFamilyChoices();
  elements.splitCustomAmounts.hidden = !isCustom;
  syncSplitCustomAmounts();
  updateAmountFieldForSplitMode();
}

// 面板内的按钮结构固定，切换时只改类名/aria，不重建 DOM：
// 避免高度动画期间的布局抖动，也保住键盘用户的焦点。
function syncSplitModeButtons() {
  const container = elements.splitModeButtons;
  if (!container) return;
  const wasReady = container.dataset.splitModeReady === "true";
  const selectedScope = getSplitScopeFromMode(activeSplitMode);
  const singleFamily = selectedScope === "selected" && activeSplitFamilyIds.length === 1;
  const previousSingleFamily = container.dataset.singleFamily === "true";
  if (!container.dataset.splitModeReady) {
    container.innerHTML = `
      <div class="split-mode-single-summary" role="status" hidden>
        <span>该家庭承担全部</span>
      </div>
      <button class="split-mode-button" type="button" data-split-rule="equal" role="radio" aria-checked="false">
        <span>各家均分</span>
      </button>
      <button class="split-mode-button" type="button" data-split-rule="per-person" role="radio" aria-checked="false">
        <span>按家庭人数</span>
        <small>人数多，承担多</small>
      </button>
      <button class="split-mode-button" type="button" data-split-mode="custom" role="radio" aria-checked="false">
        <span>自定金额</span>
        <small>逐家填写</small>
      </button>
    `;
    container.dataset.splitModeReady = "true";
  }

  const equalButton = container.querySelector('[data-split-rule="equal"]');
  const perPersonButton = container.querySelector('[data-split-rule="per-person"]');
  const customButton = container.querySelector('[data-split-mode="custom"]');
  const singleSummary = container.querySelector(".split-mode-single-summary");
  const equalMode = selectedScope === "selected" ? "families_equal" : "equal";
  const perPersonMode = selectedScope === "selected" ? "families" : "all";

  equalButton.dataset.splitMode = equalMode;
  perPersonButton.dataset.splitMode = perPersonMode;
  container.classList.toggle("is-single-family", singleFamily);
  container.dataset.singleFamily = String(singleFamily);
  container.setAttribute("role", "radiogroup");
  container.setAttribute("aria-label", singleFamily ? "选择特殊分摊方式" : "选择分摊方式");
  singleSummary.hidden = !singleFamily;
  equalButton.hidden = singleFamily;
  perPersonButton.hidden = singleFamily;
  customButton.hidden = false;

  if (wasReady && singleFamily !== previousSingleFamily && !prefersReducedMotion()) {
    container.classList.remove("is-structure-switching");
    window.clearTimeout(splitModeStructureTimer);
    window.requestAnimationFrame(() => {
      container.classList.add("is-structure-switching");
      splitModeStructureTimer = window.setTimeout(() => {
        container.classList.remove("is-structure-switching");
      }, MOTION_DELAYS.splitSwitch);
    });
  }

  [equalButton, perPersonButton, customButton].forEach((button) => {
    const id = button.dataset.splitMode;
    const selected = activeSplitMode === id;
    button.classList.toggle("is-selected", selected);
    button.classList.toggle("is-activating", selected && id === activatingSplitMode);
    button.classList.toggle("is-deactivating", !selected && id === deactivatingSplitMode);
    button.setAttribute("aria-checked", String(selected));
  });
}

function syncSplitParticipantSummary() {
  if (!elements.splitParticipantSummary) return;
  const selectedScope = getSplitScopeFromMode(activeSplitMode);
  if (selectedScope === "all") {
    setSplitParticipantSummaryText("全部家庭");
    return;
  }
  if (!activeSplitFamilyIds.length) {
    setSplitParticipantSummaryText("选择参与分摊的家庭");
    return;
  }
  if (activeSplitFamilyIds.length === state.families.length) {
    setSplitParticipantSummaryText("全部家庭");
    return;
  }
  setSplitParticipantSummaryText(`${activeSplitFamilyIds.length}家`);
}

function setSplitParticipantSummaryText(nextText) {
  const text = String(nextText ?? "");
  animateSplitSummaryText(elements.splitParticipantSummary, text, {
    ariaElement: elements.splitParticipantToggle,
    ariaLabel: `参与家庭，${text}`,
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
          <div class="split-amount-row" style="${familyStyle(family.id)}" data-split-family-row="${escapeHtml(family.id)}">
            <button class="split-amount-family-toggle" type="button" data-split-family="${escapeHtml(family.id)}" aria-pressed="true" aria-label="${escapeHtml(family.name)}参与分摊">
              <span class="split-amount-family-dot" aria-hidden="true"></span>
              <span>${escapeHtml(family.name)}</span>
            </button>
            <span class="split-amount-input-shell">
              <span class="currency-mark" aria-hidden="true">¥</span>
              <span class="amount-value-track is-compact">
                <input type="text" inputmode="decimal" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" enterkeyhint="next" data-split-amount="${escapeHtml(family.id)}" aria-label="${escapeHtml(family.name)}金额" placeholder="0.00" />
              </span>
            </span>
          </div>
        `,
        )
        .join("")}
      <p class="split-total-line" role="status" aria-live="polite"></p>
    `;
    inputs = [...container.querySelectorAll("[data-split-amount]")];
  }
  inputs.forEach((input) => {
    if (document.activeElement === input) return; // 正在输入时不回写，避免打断
    const familyId = input.dataset.splitAmount;
    const selected = activeSplitFamilyIds.includes(familyId);
    const amount = selected ? Number(activeSplitAmounts[familyId]) || 0 : 0;
    const hasDraft = Object.prototype.hasOwnProperty.call(customSplitAmountDrafts, familyId);
    input.value = selected && hasDraft
      ? customSplitAmountDrafts[familyId]
      : amount > 0 ? String(amount) : "";
    input.disabled = !selected;
    syncAmountValueTrack(input);
  });
  container.querySelectorAll("[data-split-family]").forEach((button) => {
    const familyId = button.dataset.splitFamily;
    const selected = activeSplitFamilyIds.includes(familyId);
    button.setAttribute("aria-pressed", String(selected));
    button.classList.toggle("is-selected", selected);
    button.closest(".split-amount-row")?.classList.toggle("is-excluded", !selected);
  });
  const totalLine = container.querySelector(".split-total-line");
  syncCustomSplitTotalLine(totalLine);
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
  const fallbackIds = getSplitScopeFromMode(activeSplitMode) === "selected" ? [] : state.families.map((family) => family.id);
  activeSplitFamilyIds = normalizeSplitFamilyIds(activeSplitFamilyIds, fallbackIds);
  if (getSplitScopeFromMode(activeSplitMode) === "all" && activeSplitMode !== "custom") activeSplitFamilyIds = state.families.map((family) => family.id);
  activeSplitAmounts = normalizeSplitAmounts(activeSplitAmounts);
}

function formatActiveSplitSummary() {
  if (activeSplitMode === "custom") {
    const totalCents = getActiveCustomSplitTotalCents();
    return totalCents ? `自定金额 · ${formatMoney(totalCents)}` : "自定金额";
  }

  const ruleLabel = getSplitRuleFromMode(activeSplitMode) === "equal" ? "各家均分" : "按家庭人数";
  if (getSplitScopeFromMode(activeSplitMode) === "selected") {
    if (!activeSplitFamilyIds.length) return `指定家庭 · ${ruleLabel}`;
    if (activeSplitFamilyIds.length === 1) return "1家承担全部";
    return `${activeSplitFamilyIds.length}家${ruleLabel}`;
  }

  return `${state.families.length}家${ruleLabel}`;
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

  const ruleLabel = getSplitRuleFromMode(splitMode) === "equal" ? "各家均分" : "按家庭人数";
  if (getSplitScopeFromMode(splitMode) === "selected") {
    const ids = normalizeSplitFamilyIds(expense.splitFamilyIds, state.families.map((family) => family.id));
    if (ids.length === 1) return `${ids.map(getFamilyName).join("、")} · 全额`;
    return `${ids.map(getFamilyName).join("、")} · ${ruleLabel === "各家均分" ? "均分" : "按人数"}`;
  }

  return `${state.families.length} 家 · ${ruleLabel === "各家均分" ? "均分" : "按人数"}`;
}

function formatCustomSplitTotalLine() {
  const totalCents = getActiveCustomSplitTotalCents();
  const targetCents = customSplitTargetCents;
  if (targetCents === null) return formatMoney(totalCents);
  if (totalCents === targetCents) return `${formatMoney(totalCents)} ✓`;
  return `${formatMoney(totalCents)} ≠ ${formatMoney(targetCents)}`;
}

function getActiveCustomSplitTotalCents() {
  return state.families.reduce(
    (sum, family) => sum + (activeSplitFamilyIds.includes(family.id) ? amountToCents(activeSplitAmounts[family.id]) : 0),
    0,
  );
}

function getActiveCustomSplitAmounts() {
  return Object.fromEntries(
    state.families.map((family) => [
      family.id,
      activeSplitFamilyIds.includes(family.id)
        ? centsToAmount(amountToCents(activeSplitAmounts[family.id]))
        : 0,
    ]),
  );
}

function getCustomSplitDifferenceCents() {
  if (customSplitTargetCents === null) return 0;
  return getActiveCustomSplitTotalCents() - customSplitTargetCents;
}

function getCustomSplitDifferenceState() {
  if (customSplitTargetCents === null) return "derived";
  const difference = getCustomSplitDifferenceCents();
  return difference === 0 ? "matched" : difference > 0 ? "over" : "under";
}

function syncCustomSplitTotalLine(totalLine = elements.splitCustomAmounts.querySelector(".split-total-line")) {
  if (!totalLine) return;
  const totalCents = getActiveCustomSplitTotalCents();
  totalLine.textContent = formatCustomSplitTotalLine();
  totalLine.dataset.state = getCustomSplitDifferenceState();
  totalLine.setAttribute(
    "aria-label",
    customSplitTargetCents === null
      ? `分摊合计 ${formatMoney(totalCents)}`
      : `当前分摊合计 ${formatMoney(totalCents)}，账单总额 ${formatMoney(customSplitTargetCents)}`,
  );
}

function syncCustomSplitTotalField() {
  if (activeSplitMode !== "custom") return;
  const totalCents = customSplitTargetCents === null ? getActiveCustomSplitTotalCents() : customSplitTargetCents;
  if (document.activeElement !== elements.amountInput) {
    elements.amountInput.value = formatAmountInput(totalCents);
    syncAmountValueTrack(elements.amountInput);
  }
  elements.amountInput.dataset.customTotalState = getCustomSplitDifferenceState();
  elements.amountInput.setAttribute("aria-label", customSplitTargetCents === null ? "分摊合计" : "账单总额");
  if (elements.amountAutoBadge) elements.amountAutoBadge.textContent = customSplitTargetCents === null ? "合计" : "总额";
}

function updateAmountFieldForSplitMode() {
  const isCustom = activeSplitMode === "custom";
  elements.amountInput.disabled = false;
  elements.amountLabel.classList.toggle("amount-auto-total", isCustom);
  elements.amountInput.placeholder = "0.00";
  if (!isCustom) {
    elements.amountInput.removeAttribute("data-custom-total-state");
    elements.amountInput.setAttribute("aria-label", "金额");
    if (elements.amountAutoBadge) elements.amountAutoBadge.textContent = "自动汇总分摊金额";
    return;
  }
  syncCustomSplitTotalField();
}

function renderSettings({ summary = calculateSummary() } = {}) {
  const usedCategories = new Set(state.expenses.map((expense) => expense.category));
  const syncSummary = getSyncSummary();
  elements.currentLedgerNameInput.value = state.name;
  renderOperatorFamilyChoices(elements.settingsOperatorFamilyList);
  elements.settingsMoneyDecimalsInput.checked = localStorage.getItem(MONEY_DECIMALS_STORAGE_KEY) === "true";
  applyNaturalEntryMarksPreference();
  renderEntryModeSettings();
  renderSettlementMethodSettings();
  elements.currentLedgerSummary.innerHTML = renderCurrentLedgerSummary(summary);
  renderLedgerManager();

  // 平账模式使用统一的「旅程收尾揭幕」时间轴，避免旧的子项入场与抽屉动画叠播。
  elements.settlementList.innerHTML = buildSettlementHtml(summary);
  elements.settlementCountBadge.textContent = summary.settlements.length ? `${summary.settlements.length} 笔转账` : "已两清";
  elements.settlementCountBadge.classList.toggle("is-settled", summary.settlements.length === 0);

  elements.settingsFamilyList.innerHTML = state.families
    .map(
      (family) => `
        <div class="settings-family" style="${familyStyle(family.id)}">
          <span>${escapeHtml(family.name)}<small>已付 ${formatMoney(summary.paidByFamily[family.id] || 0)} · 应承担 ${formatMoney(summary.shareByFamily[family.id] || 0)}</small></span>
          <div class="member-stepper" aria-label="${escapeHtml(family.name)}人数">
            <button type="button" data-member-step="${escapeHtml(family.id)}" data-step="-1" aria-label="减少${escapeHtml(family.name)}人数">${uiIconHtml("minus")}</button>
            <strong>${state.familyMembers[family.id] || 1} 人</strong>
            <button type="button" data-member-step="${escapeHtml(family.id)}" data-step="1" aria-label="增加${escapeHtml(family.name)}人数">${uiIconHtml("plus")}</button>
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
        : `<button class="chip-icon-button chip-remove-button" type="button" data-remove-category="${escapeHtml(category)}" aria-label="删除 ${escapeHtml(category)}">${uiIconHtml("close")}</button>`;
      const moveControls = `
        <button class="chip-icon-button" type="button" data-move-category="${escapeHtml(category)}" data-direction="-1" aria-label="上移 ${escapeHtml(category)}" ${index === 0 ? "disabled" : ""}>${uiIconHtml("chevron-up")}</button>
        <button class="chip-icon-button" type="button" data-move-category="${escapeHtml(category)}" data-direction="1" aria-label="下移 ${escapeHtml(category)}" ${index === state.categories.length - 1 ? "disabled" : ""}>${uiIconHtml("chevron-down")}</button>
      `;

      return `
        <span class="chip category-chip settings-category-chip${category === lastAddedCategory ? " is-entering" : ""}" style="${categoryStyle(category)}">
          <span>${categoryLabelHtml(category)}</span>
          <small>${status}</small>
          ${moveControls}
          ${removeButton}
        </span>
      `;
    })
    .join("");

  elements.settingsDataSummary.innerHTML = `
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

function renderEntryModeSettings() {
  const activeMode = getEntryMode();
  document.documentElement.dataset.entryMode = activeMode;
  elements.settingsEntryModeList?.querySelectorAll("[data-entry-mode-choice]").forEach((button) => {
    const isSelected = button.dataset.entryModeChoice === activeMode;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-checked", String(isSelected));
  });
}

function normalizeSettlementMethod(value) {
  return SETTLEMENT_METHOD_OPTIONS.some((option) => option.id === value) ? value : DEFAULT_SETTLEMENT_METHOD;
}

function getSettlementMethod() {
  return normalizeSettlementMethod(localStorage.getItem(SETTLEMENT_METHOD_STORAGE_KEY));
}

function renderSettlementMethodSettings() {
  const activeMethod = getSettlementMethod();
  elements.settingsSettlementMethodList?.querySelectorAll("[data-settlement-method-choice]").forEach((button) => {
    const isSelected = button.dataset.settlementMethodChoice === activeMethod;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-checked", String(isSelected));
  });
}

function renderPersonalizationSettings() {
  renderThemePresetList();
  if (!elements.settingsFamilyColorList) return;
  const detailsOpen = elements.settingsFamilyColorList.querySelector(".family-color-details")?.dataset.open === "true";
  syncFamilyVisualRows();
  const presetColors = getFamilyColorChoices();
  const currentFamily = state.families.find((family) => family.id === activeFamilyColorFamilyId) || state.families[0];
  if (!currentFamily) return;
  activeFamilyColorFamilyId = currentFamily.id;
  const currentVisual = getFamilyVisual(currentFamily.id);
  const isCurrentCurated = presetColors.some((visual) => visual.color === currentVisual.color);
  const customCount = state.families.filter((family) => !presetColors.some((visual) => visual.color === getFamilyVisual(family.id).color)).length;
  const customStatus = customCount ? `${customCount} 个自定义` : "默认组合";
  const familyTargets = state.families
    .map((family) => {
      const isSelected = family.id === currentFamily.id;
      return `
        <button class="family-color-target${isSelected ? " is-selected" : ""}" type="button" role="radio" data-family-color-target="${escapeHtml(family.id)}" aria-checked="${isSelected}" style="${familyStyle(family.id)}">
          <span class="family-color-current" style="${familyVisualSwatchStyle(getFamilyVisual(family.id))}" aria-hidden="true"></span>
          <span>${escapeHtml(family.name)}</span>
        </button>
      `;
    })
    .join("");
  const colorChoices = presetColors
    .map((visual, index) => {
      const isSelected = currentVisual.color === visual.color;
      return `
        <button class="family-color-choice${isSelected ? " is-selected" : ""}" type="button" role="radio" data-family-color="${escapeHtml(currentFamily.id)}" data-color-index="${index}" style="${familyVisualSwatchStyle(visual)}" aria-label="${escapeHtml(currentFamily.name)}：${escapeHtml(visual.label)}" aria-checked="${isSelected}">
          <span class="family-color-choice-mark" aria-hidden="true">✓</span>
        </button>
      `;
    })
    .join("");

  elements.settingsFamilyColorList.innerHTML = `
    <div class="family-color-details${detailsOpen ? " is-open" : ""}" data-open="${detailsOpen}">
      <button class="family-color-summary" type="button" aria-expanded="${detailsOpen}">
        <span>高级：家庭身份色</span>
        <small>${customStatus}</small>
      </button>
      <div class="family-color-detail-body" aria-hidden="${!detailsOpen}"${detailsOpen ? "" : " inert"}>
        <div class="family-color-detail-inner">
          <div class="family-color-targets" role="radiogroup" aria-label="选择要调整的家庭">
            ${familyTargets}
          </div>
          <div class="family-color-editor" style="${familyStyle(currentFamily.id)}">
            <div class="family-color-editor-heading">
              <strong>调整${escapeHtml(currentFamily.name)}</strong>
              <small>${isCurrentCurated ? "选择一套身份色" : "当前自定义"}</small>
            </div>
            <div class="family-color-options" role="radiogroup" aria-label="${escapeHtml(currentFamily.name)}身份色">
              ${colorChoices}
            </div>
            ${isCurrentCurated ? "" : `<span class="family-color-custom-note">保留当前自定义色</span>`}
          </div>
        </div>
      </div>
    </div>
  `;
  bindFamilyColorDisclosure(elements.settingsFamilyColorList);
}

function bindFamilyColorDisclosure(root = document) {
  const details = root.querySelector(".family-color-details");
  const summary = details?.querySelector(".family-color-summary");
  const body = details?.querySelector(".family-color-detail-body");
  if (!details || !summary || !body || summary.dataset.familyColorDisclosureBound) return;
  summary.dataset.familyColorDisclosureBound = "1";
  summary.addEventListener("click", () => {
    const opening = !details.classList.contains("is-open");
    details.classList.toggle("is-open", opening);
    details.dataset.open = String(opening);
    summary.setAttribute("aria-expanded", String(opening));
    body.setAttribute("aria-hidden", String(!opening));
    body.toggleAttribute("inert", !opening);
  });
}

/* 让原生 <details> 的「收起」也平滑过渡。
   原生 details 在移除 open 时瞬间抽走内容，grid 的 1fr→0fr 过渡播不出来；
   这里拦截 summary 点击、自管 open 属性：收起时先保留 open、强制 0fr
   播完过渡再真正移除 open；展开则直接加 open 走 CSS 0fr→1fr。*/
function bindAnimatedDetails(root = document) {
  root
    .querySelectorAll(".settings-mobile-group > summary, .insight-details > summary")
    .forEach((summary) => {
      if (summary.dataset.animatedDetailsBound) return;
      summary.dataset.animatedDetailsBound = "1";
      summary.addEventListener("click", (event) => {
        const details = summary.parentElement;
        if (!details || !details.matches("details")) return;
        event.preventDefault();
        if (details.dataset.animating === "1") return;
        const grid = details.querySelector(".details-body, .family-color-detail-body");

        const expandable = details.classList.contains("settings-mobile-group")
          ? details.querySelector(".settings-mobile-group-body")
          : details.classList.contains("insight-details")
            ? details.querySelector(".stack-list")
            : null;
        if (expandable) {
          const opening = !details.hasAttribute("open");
          if (prefersReducedMotion()) {
            details.toggleAttribute("open", opening);
            return;
          }
          details.dataset.animating = "1";
          details.classList.toggle("is-closing", !opening);
          if (opening) {
            details.setAttribute("open", "");
            expandable.style.maxHeight = "0px";
            expandable.style.opacity = "0";
            void expandable.offsetHeight;
            requestAnimationFrame(() => {
              expandable.style.maxHeight = `${expandable.scrollHeight}px`;
              expandable.style.opacity = "1";
            });
          } else {
            expandable.style.maxHeight = `${expandable.scrollHeight}px`;
            expandable.style.opacity = "1";
            void expandable.offsetHeight;
            requestAnimationFrame(() => {
              expandable.style.maxHeight = "0px";
              expandable.style.opacity = "0";
            });
          }
          let expandableTimer = 0;
          const finishExpandable = () => {
            if (!opening) details.removeAttribute("open");
            details.classList.remove("is-closing");
            details.dataset.animating = "0";
            expandable.style.removeProperty("max-height");
            expandable.style.removeProperty("opacity");
            expandable.removeEventListener("transitionend", onExpandableEnd);
            window.clearTimeout(expandableTimer);
          };
          const onExpandableEnd = (ev) => {
            if (ev && ev.propertyName && ev.propertyName !== "max-height") return;
            finishExpandable();
          };
          expandable.addEventListener("transitionend", onExpandableEnd);
          expandableTimer = window.setTimeout(finishExpandable, prefersReducedMotion() ? 0 : 620);
          return;
        }

        if (!details.hasAttribute("open")) {
          details.setAttribute("open", "");
          return;
        }
        details.dataset.animating = "1";
        details.classList.add("is-closing");
        const finish = () => {
          details.removeAttribute("open");
          details.classList.remove("is-closing");
          details.dataset.animating = "0";
          if (grid) grid.removeEventListener("transitionend", onEnd);
        };
        const onEnd = (ev) => {
          if (ev && ev.propertyName && ev.propertyName !== "grid-template-rows") return;
          finish();
        };
        if (grid) grid.addEventListener("transitionend", onEnd);
        /* 减动或过渡未触发 transitionend 时的兜底 */
        setTimeout(() => {
          if (details.dataset.animating === "1") onEnd();
        }, 620);
      });
    });
}

function getFamilyColorChoices() {
  const seen = new Set();
  return familyColorChoices.map((choice) => ({ ...normalizeFamilyVisual(choice), label: choice.label })).filter((visual) => {
    if (seen.has(visual.color)) return false;
    seen.add(visual.color);
    return true;
  });
}

function familyVisualSwatchStyle(visual) {
  const normalized = normalizeFamilyVisual(visual);
  return `--swatch-color: ${normalized.color}; --swatch-gradient: ${normalized.gradient}; --swatch-text: ${normalized.text};`;
}

function renderCurrentLedgerSummary(summary) {
  const syncSummary = getSyncSummary();
  const status = state.cloudShareToken ? syncSummary.label : COPY.localLedger;
  return `
    <div class="current-ledger-card">
      <span>${escapeHtml(status)}</span>
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
  const cloudLabel = ledger.cloudShareToken ? COPY.cloudLedger : COPY.localLedger;
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

  /* VT 已对整个 #totalAmount 做交叉淡变刷新（::view-transition-old/new 的
     text-slide-out/in），此处不再叠加 is-soft-refresh 的模糊位移，避免数字
     “先交叉淡变、再模糊滑入”的双段感。仅在不支持 View Transitions
     的浏览器走 is-soft-refresh 这层 CSS 兜底。 */
  if (document.startViewTransition && shouldAnimate && !prefersReducedMotion()) {
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
  }, getCssDurationMs("--mobile-panel-in-motion", getCssDurationMs("--number-swap-motion", 980)) + 60);
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

  const numericTarget = Number(String(targetText).replace(/[^\d.-]/g, ""));
  if (prefersReducedMotion() || numericTarget === 0) {
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

function cancelInitialTotalReveal() {
  if (totalRevealFrameId) {
    window.cancelAnimationFrame(totalRevealFrameId);
    totalRevealFrameId = 0;
  }
  elements.totalAmount.classList.remove("is-scrambling");
}

function renderExpenseCount(nextText, shouldAnimate, options = {}) {
  if (options.revealOnEntry) {
    playInitialExpenseCountReveal(nextText);
    return;
  }

  const previousText = elements.expenseCount.textContent || nextText;
  expenseCountRevealTargetText = nextText;
  cancelExpenseCountReveal();

  if (!shouldAnimate || previousText === nextText || prefersReducedMotion()) {
    elements.expenseCount.textContent = nextText;
    return;
  }

  playExpenseCountScramble(nextText);
}

function revealInitialExpenseCount() {
  const visibleExpenseCount = state.expenses.filter((expense) => !expense.isDeleted).length;
  renderExpenseCount(String(visibleExpenseCount), false, { revealOnEntry: true });
}

function playInitialExpenseCountReveal(targetText) {
  if (hasPlayedInitialExpenseCountReveal) {
    elements.expenseCount.textContent = targetText;
    return;
  }

  hasPlayedInitialExpenseCountReveal = true;
  if (Number(targetText) === 0) {
    expenseCountRevealTargetText = targetText;
    cancelExpenseCountReveal();
    elements.expenseCount.textContent = targetText;
    return;
  }
  playExpenseCountScramble(targetText);
}

function playExpenseCountScramble(targetText) {
  expenseCountRevealTargetText = targetText;
  cancelExpenseCountReveal();

  if (prefersReducedMotion()) {
    elements.expenseCount.textContent = targetText;
    return;
  }

  const glyphs = "0123456789";
  const duration = 980;
  const startedAt = window.performance.now();
  const targetChars = [...targetText];
  elements.expenseCount.classList.add("is-scrambling");

  const renderFrame = (now) => {
    const elapsed = now - startedAt;
    const isFinalFrame = elapsed >= duration || expenseCountRevealTargetText !== targetText;
    const progress = Math.min(1, Math.max(0, elapsed / duration));
    const eased = easeOutCubic(progress);
    const nextText = targetChars
      .map((char, index) => {
        const charProgress = Math.min(1, Math.max(0, (eased * duration - index * 90) / Math.max(240, duration - index * 90)));
        if (charProgress >= 1) return char;
        return glyphs[Math.floor((elapsed / (28 + charProgress * 110) + index * 3) % glyphs.length)];
      })
      .join("");

    elements.expenseCount.textContent = isFinalFrame ? targetText : nextText;
    if (!isFinalFrame) {
      expenseCountRevealFrameId = window.requestAnimationFrame(renderFrame);
      return;
    }

    elements.expenseCount.classList.remove("is-scrambling");
    expenseCountRevealFrameId = 0;
  };

  expenseCountRevealFrameId = window.requestAnimationFrame(renderFrame);
}

function cancelExpenseCountReveal() {
  if (expenseCountRevealFrameId) {
    window.cancelAnimationFrame(expenseCountRevealFrameId);
    expenseCountRevealFrameId = 0;
  }
  elements.expenseCount.classList.remove("is-scrambling");
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
  }, getCssDurationMs("--motion-text", 240) + 80);
}

function renderSummary({ animateFinancialChanges = false, summary = calculateSummary() } = {}) {
  const visibleExpenseCount = state.expenses.filter((expense) => !expense.isDeleted).length;
  /* paidByFamily / categorySummary / settlementList 三个容器都带有独立的
     view-transition-name，VT 生效时整块交叉淡变已覆盖刷新；若子项再挂
     is-entering，落定后会“再滑一次”，形成双重动效。故 VT 生效时
     跳过子项 is-entering，仅在不支持 View Transitions 的浏览器用 CSS 兜底。 */
  const mobilePanelFlow = window.matchMedia("(max-width: 820px)").matches;
  /* 移动端数据页的两张首屏卡片走同一条卡片路径；避免总支出额外启动
     View Transition，和下方平账卡形成两套叠加轨迹。 */
  const vtActive = document.startViewTransition && animateFinancialChanges && !mobilePanelFlow && !prefersReducedMotion();
  const animateSummaryContents = animateFinancialChanges && !mobilePanelFlow;
  const enterClass = vtActive ? "" : " is-entering";
  renderTotalAmount(formatMoney(summary.totalCents), animateSummaryContents);
  renderSoftText(elements.shareAmount, formatMoney(summary.shareCents), animateSummaryContents);
  renderExpenseCount(String(visibleExpenseCount), animateSummaryContents);
  renderSoftText(elements.mobileExpenseCount, String(visibleExpenseCount), animateSummaryContents);
  renderTotalMetricGradient(summary);
  renderJourneyHero(summary);

  elements.paidByFamily.innerHTML = state.families
    .map(
      (family) => `
        <div class="row-item family-row${enterClass}" data-summary-family-id="${escapeHtml(family.id)}" style="${familyStyle(family.id)}">
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
            <div class="row-item category-row${enterClass}" data-summary-category="${escapeHtml(category)}" style="${categoryStyle(category)}">
              <span>${categoryLabelHtml(category)}</span>
              <strong>${formatMoney(summary.categoryTotals[category])}</strong>
            </div>
          `,
        )
        .join("")
    : `<div class="empty-state${enterClass}">${emptyStateArt}还没有类别支出<br><small>记下账单后会自动汇总。</small></div>`;

  renderSettlementEntry(summary, animateSummaryContents);
}

function renderJourneyHero(summary) {
  if (!elements.journeyLedgerName || !elements.journeyFamilyTrack) return;
  const expenses = getActiveExpenses()
    .slice()
    .sort((first, second) => first.date.localeCompare(second.date));
  const firstDate = expenses[0]?.date || "";
  const lastDate = expenses.at(-1)?.date || "";
  const dayCount = firstDate && lastDate
    ? Math.max(1, Math.round((Date.parse(`${lastDate}T00:00:00Z`) - Date.parse(`${firstDate}T00:00:00Z`)) / 86400000) + 1)
    : 0;

  elements.journeyLedgerName.textContent = state.name;
  elements.journeyStateLabel.textContent = expenses.length
    ? `共 ${dayCount} 天`
    : "还没有账单";
  elements.journeyDateRange.textContent = expenses.length
    ? formatJourneyDateRange(firstDate, lastDate)
    : "记下第一笔，支出会从这里开始";

  const dailyTotals = new Map();
  expenses.forEach((expense) => {
    dailyTotals.set(expense.date, (dailyTotals.get(expense.date) || 0) + expenseToCents(expense));
  });
  const maxDailyCents = Math.max(0, ...dailyTotals.values());
  const dayCells = [];
  if (firstDate && lastDate) {
    const cursor = new Date(`${firstDate}T00:00:00Z`);
    const end = new Date(`${lastDate}T00:00:00Z`);
    while (cursor <= end) {
      const date = cursor.toISOString().slice(0, 10);
      const cents = dailyTotals.get(date) || 0;
      const level = cents && maxDailyCents
        ? Math.min(5, Math.max(1, Math.ceil((cents / maxDailyCents) * 5)))
        : 0;
      const [, month, day] = date.split("-").map(Number);
      dayCells.push(`
        <div class="journey-day-cell level-${level}" aria-label="${month}月${day}日 ${formatMoney(cents)}" title="${month}月${day}日 · ${formatMoney(cents)}">
          <span>${day}</span>
        </div>
      `);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }
  if (elements.journeyDayGrid) {
    elements.journeyDayGrid.innerHTML = dayCells.length
      ? dayCells.join("")
      : `<span class="journey-day-empty">记下账单后显示每天的支出节奏</span>`;
  }
  if (elements.journeyPeak) {
    const peakEntry = [...dailyTotals.entries()].sort((first, second) => second[1] - first[1])[0];
    if (peakEntry?.[1]) {
      const [, month, day] = peakEntry[0].split("-").map(Number);
      elements.journeyPeak.textContent = `峰值 ${month}月${day}日 · ${formatMoney(peakEntry[1])}`;
    } else {
      elements.journeyPeak.textContent = "记下第一笔后显示支出峰值";
    }
  }

  const totalPaid = state.families.reduce((sum, family) => sum + (summary.paidByFamily[family.id] || 0), 0);
  elements.journeyFamilyTrack.innerHTML = state.families
    .map((family) => {
      const paid = summary.paidByFamily[family.id] || 0;
      const share = totalPaid > 0 ? paid / totalPaid : 1 / Math.max(1, state.families.length);
      const displayedPercent = totalPaid > 0 ? Math.round(share * 100) : 0;
      return `
        <div class="journey-family-segment" data-journey-family-id="${escapeHtml(family.id)}"
          style="${familyStyle(family.id)} --journey-share:${Math.max(0.08, share).toFixed(4)}">
          <span><i aria-hidden="true"></i>${escapeHtml(family.name)}</span>
          <strong>${displayedPercent}%</strong>
        </div>
      `;
    })
    .join("");
}

function formatJourneyDateRange(firstDate, lastDate) {
  const formatPart = (value, includeYear) => {
    const [year, month, day] = value.split("-").map(Number);
    return `${includeYear ? `${year}年` : ""}${month}月${day}日`;
  };
  if (!firstDate || !lastDate) return "";
  if (firstDate === lastDate) return `${formatPart(firstDate, true)} · 一天的旅程`;
  const firstYear = firstDate.slice(0, 4);
  const lastYear = lastDate.slice(0, 4);
  return firstYear === lastYear
    ? `${formatPart(firstDate, true)}—${formatPart(lastDate, false)}`
    : `${formatPart(firstDate, true)}—${formatPart(lastDate, true)}`;
}

/* 数据页只保留一个入口摘要，完整的平账建议（资金光流图 + 转账卡）在设置抽屉里 */
function renderSettlementEntry(summary, shouldAnimate = false) {
  if (!elements.settlementEntryButton) return;
  const count = summary.settlements.length;
  const hasExpenses = state.expenses.some((expense) => !expense.isDeleted);
  const leadingSettlement = summary.settlements[0];
  const settlementButtons = [elements.settlementEntryButton, elements.mobileSettlementEntryButton].filter(Boolean);
  settlementButtons.forEach((button) => {
    button.classList.toggle("has-settlement-flow", Boolean(leadingSettlement));
    button.classList.toggle("is-flow-arriving", Boolean(shouldAnimate && leadingSettlement && !prefersReducedMotion()));
    if (!leadingSettlement) {
      ["--settlement-from-color", "--settlement-to-color", "--settlement-flow-glow"].forEach((property) => button.style.removeProperty(property));
      return;
    }
    const fromVisual = getFamilyVisual(leadingSettlement.fromFamilyId);
    const toVisual = getFamilyVisual(leadingSettlement.toFamilyId);
    button.style.setProperty("--settlement-from-color", fromVisual.color);
    button.style.setProperty("--settlement-to-color", toVisual.color);
    button.style.setProperty("--settlement-flow-glow", colorWithAlpha(fromVisual.color, 0.34));
  });
  elements.settlementEntrySub.textContent = count ? COPY.settlementHint : COPY.settlementDone;
  elements.settlementEntryCount.textContent = count ? `${count} 笔待结算` : COPY.settlementDone;
  elements.settlementEntryButton.classList.toggle("is-settled", count === 0);

  if (shouldAnimate && leadingSettlement && !prefersReducedMotion()) {
    window.setTimeout(() => {
      settlementButtons.forEach((button) => button.classList.remove("is-flow-arriving"));
    }, 980);
  }

  if (!elements.mobileSettlementEntryButton) return;
  elements.mobileSettlementEntryButton.hidden = !hasExpenses || count === 0;
  elements.mobileSettlementEntrySub.textContent = COPY.settlementHint;
  renderSoftText(elements.mobileSettlementEntryCount, `${count} 笔`, shouldAnimate);
  if (shouldAnimate && !prefersReducedMotion()) {
    elements.mobileSettlementEntryButton.classList.remove("is-soft-refresh");
    void elements.mobileSettlementEntryButton.offsetWidth;
    elements.mobileSettlementEntryButton.classList.add("is-soft-refresh");
    window.setTimeout(() => elements.mobileSettlementEntryButton.classList.remove("is-soft-refresh"), getCssDurationMs("--number-swap-motion", 980) + 60);
  }
  elements.mobileSettlementEntryButton.setAttribute(
    "aria-label",
    `${COPY.settlementTitle}：${count} 笔转账。`,
  );
  syncSettlementEntryReminder(Boolean(leadingSettlement));
}

function clearSettlementEntryReminder({ removeEffect = true } = {}) {
  window.clearTimeout(settlementEntryReminderTimer);
  window.clearTimeout(settlementEntryReminderCleanupTimer);
  window.clearTimeout(settlementEntryReminderResumeTimer);
  settlementEntryReminderTimer = 0;
  settlementEntryReminderCleanupTimer = 0;
  settlementEntryReminderResumeTimer = 0;
  if (removeEffect) {
    [elements.settlementEntryButton, elements.mobileSettlementEntryButton]
      .filter(Boolean)
      .forEach((button) => button.classList.remove("is-flow-reminding"));
  }
}

function canRunSettlementEntryReminder() {
  return settlementEntryReminderHasPending
    && settlementEntryReminderInView
    && document.visibilityState === "visible"
    && elements.settingsView.hidden
    && !prefersReducedMotion();
}

function getVisibleSettlementEntryButton() {
  return [elements.settlementEntryButton, elements.mobileSettlementEntryButton]
    .filter(Boolean)
    .find((button) => {
      if (button.hidden || getComputedStyle(button).display === "none") return false;
      const rect = button.getBoundingClientRect();
      return rect.width > 0
        && rect.height > 0
        && rect.bottom > 0
        && rect.top < window.innerHeight
        && rect.right > 0
        && rect.left < window.innerWidth;
    }) || null;
}

function scheduleSettlementEntryReminder(delay = SETTLEMENT_ENTRY_REMINDER_INITIAL_MS) {
  window.clearTimeout(settlementEntryReminderTimer);
  settlementEntryReminderTimer = 0;
  if (!canRunSettlementEntryReminder()) return;
  settlementEntryReminderTimer = window.setTimeout(() => {
    settlementEntryReminderTimer = 0;
    if (!canRunSettlementEntryReminder()) return;
    const button = getVisibleSettlementEntryButton();
    if (!button || button.classList.contains("is-flow-arriving")) {
      scheduleSettlementEntryReminder(SETTLEMENT_ENTRY_REMINDER_REPEAT_MS);
      return;
    }
    button.classList.remove("is-flow-reminding");
    void button.offsetWidth;
    button.classList.add("is-flow-reminding");
    settlementEntryReminderCleanupTimer = window.setTimeout(() => {
      settlementEntryReminderCleanupTimer = 0;
      button.classList.remove("is-flow-reminding");
    }, SETTLEMENT_ENTRY_REMINDER_DURATION_MS);
    scheduleSettlementEntryReminder(SETTLEMENT_ENTRY_REMINDER_REPEAT_MS);
  }, delay);
}

function syncSettlementEntryReminder(hasPending) {
  const pendingChanged = settlementEntryReminderHasPending !== hasPending;
  settlementEntryReminderHasPending = hasPending;
  if (!hasPending) {
    clearSettlementEntryReminder();
    return;
  }
  if (pendingChanged || (!settlementEntryReminderTimer && !settlementEntryReminderCleanupTimer)) {
    clearSettlementEntryReminder();
    scheduleSettlementEntryReminder();
  }
}

function setupSettlementEntryReminderObserver() {
  const buttons = [elements.settlementEntryButton, elements.mobileSettlementEntryButton].filter(Boolean);
  if (!buttons.length) return;
  if (!("IntersectionObserver" in window)) {
    settlementEntryReminderInView = true;
    scheduleSettlementEntryReminder();
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => settlementEntryVisibility.set(entry.target, entry.isIntersecting && entry.intersectionRatio > 0));
    const isInView = buttons.some((button) => settlementEntryVisibility.get(button));
    if (settlementEntryReminderInView === isInView) return;
    settlementEntryReminderInView = isInView;
    if (isInView) scheduleSettlementEntryReminder();
    else clearSettlementEntryReminder();
  }, { threshold: 0.01 });
  buttons.forEach((button) => observer.observe(button));
}

/* 平账建议内容（资金光流图 + 转账卡），供设置抽屉渲染 */
function buildSettlementHtml(summary, enterClass = "") {
  if (!summary.settlements.length) {
    return `<div class="settlement-done${enterClass}">
        <span class="settlement-done-mark" aria-hidden="true">${uiIconHtml("check")}</span>
        <span class="settlement-done-kicker">${COPY.settlementTitle}</span>
        <strong>${COPY.settlementDone}</strong>
      </div>`;
  }

  return `
    ${renderSettlementFlowMap(summary.settlements, enterClass)}
    <div class="settlement-itinerary" aria-label="转账明细">
      ${summary.settlements
        .map((settlement, index) => renderSettlementItem(settlement, index, enterClass))
        .join("")}
    </div>
  `;
}

/* 资金流向图：付款方在左、收款方在右，飘带粗细按金额缩放，颜色从付款家庭渐变到收款家庭。
   只承担视觉直觉（谁流向谁、大致比例），具体金额一律看下方转账卡，图里不再标数字。 */
function renderSettlementFlowMap(settlements, enterClass) {
  const debtorIds = new Set(settlements.map((settlement) => settlement.fromFamilyId));
  const creditorIds = new Set(settlements.map((settlement) => settlement.toFamilyId));
  const debtors = state.families.filter((family) => debtorIds.has(family.id));
  const creditors = state.families.filter((family) => creditorIds.has(family.id));
  const rows = Math.max(debtors.length, creditors.length);
  const width = 420;
  const leftX = 124;
  const rightX = 296;
  const rowGap = 56;
  const topPad = 46;
  const bottomPad = 34;
  const height = topPad + bottomPad + (rows - 1) * rowGap;
  const contentHeight = (rows - 1) * rowGap;
  const columnY = (index, count) => topPad + (contentHeight - (count - 1) * rowGap) / 2 + index * rowGap;
  const debtorY = new Map(debtors.map((family, index) => [family.id, columnY(index, debtors.length)]));
  const creditorY = new Map(creditors.map((family, index) => [family.id, columnY(index, creditors.length)]));
  const maxCents = Math.max(...settlements.map((settlement) => settlement.cents));

  const gradientDefs = [];
  const links = settlements
    .map((settlement, index) => {
      const fromVisual = getFamilyVisual(settlement.fromFamilyId);
      const toVisual = getFamilyVisual(settlement.toFamilyId);
      const y1 = debtorY.get(settlement.fromFamilyId);
      const y2 = creditorY.get(settlement.toFamilyId);
      const x1 = leftX + 12;
      const x2 = rightX - 22;
      const controlX1 = x1 + (x2 - x1) * 0.42;
      const controlX2 = x1 + (x2 - x1) * 0.58;
      const strokeWidth = 2.6 + 3.8 * (settlement.cents / maxCents);
      const pathD = `M ${x1} ${y1} C ${controlX1} ${y1}, ${controlX2} ${y2}, ${x2} ${y2}`;
      const gradientId = `settlementFlowGradient${index}`;
      gradientDefs.push(
        `<linearGradient id="${gradientId}" gradientUnits="userSpaceOnUse" color-interpolation="linearRGB" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0%" stop-color="${fromVisual.color}" stop-opacity="0.86"/><stop offset="18%" stop-color="${fromVisual.color}" stop-opacity="0.78"/><stop offset="31%" stop-color="${toVisual.color}" stop-opacity="0.88"/><stop offset="100%" stop-color="${toVisual.color}" stop-opacity="0.94"/></linearGradient>`,
      );

      // 短尾迹承载家庭色方向，窄亮芯提供一次清晰的“资金抵达”瞬间；
      // 两层都只在揭幕时运动，稳定态不再持续重绘。
      return `
        <g class="flow-link" style="--flow-delay: ${index * 105}ms;">
          <path class="flow-halo" d="${pathD}" pathLength="1" stroke="url(#${gradientId})" stroke-width="${(strokeWidth + 3.2).toFixed(1)}" filter="url(#settlementGlow)"/>
          <path class="flow-ribbon" d="${pathD}" pathLength="1" stroke="url(#${gradientId})" stroke-width="${strokeWidth.toFixed(1)}"/>
          <path class="flow-sheen flow-sheen-tail" d="${pathD}" pathLength="1" stroke="url(#${gradientId})" stroke-width="${Math.max(2.4, strokeWidth * 1.18).toFixed(1)}"/>
          <path class="flow-sheen flow-sheen-core" d="${pathD}" pathLength="1" stroke="rgba(255, 255, 255, 0.98)" stroke-width="${Math.max(1.35, strokeWidth * 0.48).toFixed(1)}"/>
        </g>
      `;
    })
    .join("");

  const renderNode = (family, y, side) => `
    <g class="flow-node" style="${familyStyle(family.id)} --flow-delay: ${(side === "from" ? debtors : creditors).findIndex((item) => item.id === family.id) * 90}ms;">
      <circle class="flow-dot-halo" cx="${side === "from" ? leftX : rightX}" cy="${y}" r="9" filter="url(#settlementGlow)"/>
      <circle class="flow-dot" cx="${side === "from" ? leftX : rightX}" cy="${y}" r="5"/>
      <circle class="flow-dot-core" cx="${side === "from" ? leftX : rightX}" cy="${y}" r="2"/>
      <text class="flow-name" x="${side === "from" ? leftX - 17 : rightX + 17}" y="${y + 5}" text-anchor="${side === "from" ? "end" : "start"}">${escapeHtml(truncateFlowLabel(family.name))}</text>
    </g>
  `;

  const nodes = [
    ...debtors.map((family) => renderNode(family, debtorY.get(family.id), "from")),
    ...creditors.map((family) => renderNode(family, creditorY.get(family.id), "to")),
  ].join("");

  const ariaLabel = `资金流向：${settlements.map((settlement) => `${settlement.from} 转给 ${settlement.to} ${formatMoney(settlement.cents)}`).join("；")}`;

  return `
    <div class="settlement-flow-map is-live${enterClass}" role="img" aria-label="${escapeHtml(ariaLabel)}">
      <svg viewBox="0 0 ${width} ${height}" aria-hidden="true" focusable="false">
        <defs>
          <filter id="settlementGlow" x="-40%" y="-120%" width="180%" height="340%">
            <feGaussianBlur stdDeviation="2.2"/>
          </filter>
          ${gradientDefs.join("")}
        </defs>
        ${links}
        ${nodes}
      </svg>
    </div>
  `;
}

function truncateFlowLabel(value, max = 7) {
  const chars = [...String(value)];
  return chars.length > max ? `${chars.slice(0, max - 1).join("")}…` : String(value);
}

/* GitHub 节点卡的克制精修版：左侧明确付款与收款关系，右侧突出实际转账金额。 */
function renderSettlementItem(settlement, index, enterClass) {
  const formattedAmount = formatMoney(settlement.cents);
  const amountClass = formattedAmount.length >= 11 ? " is-long" : "";
  const amountDigits = formattedAmount.startsWith("¥") ? formattedAmount.slice(1) : formattedAmount;
  const amountMarkup = formattedAmount.startsWith("¥")
    ? `<span class="settlement-currency" aria-hidden="true">¥</span><span class="settlement-amount-digits" data-settlement-amount="${escapeHtml(amountDigits)}">${escapeHtml(amountDigits)}</span>`
    : `<span class="settlement-amount-digits" data-settlement-amount="${escapeHtml(amountDigits)}">${escapeHtml(amountDigits)}</span>`;
  return `
    <article class="settlement-item${enterClass}" aria-label="${escapeHtml(settlement.from)} 付款给 ${escapeHtml(settlement.to)} ${formattedAmount}" style="${familyStyle(settlement.fromFamilyId)} --settlement-target-color: ${getFamilyVisual(settlement.toFamilyId).color}; --settlement-target-text: ${getFamilyVisual(settlement.toFamilyId).text}; --settlement-delay: ${index * MOTION_DELAYS.settlementStagger}ms;">
      <div class="settlement-route-node">
        <div class="settlement-node-family settlement-node-from">
          <strong>${escapeHtml(settlement.from)}</strong>
        </div>
        <span class="settlement-route-watermark" aria-hidden="true">→</span>
        <div class="settlement-node-family settlement-node-to">
          <strong>${escapeHtml(settlement.to)}</strong>
        </div>
      </div>
      <div class="settlement-amount">
        <strong${amountClass ? ` class="${amountClass.trim()}"` : ""}>${amountMarkup}</strong>
      </div>
    </article>
  `;
}

function handleMoneyDecimalsChange() {
  localStorage.setItem(MONEY_DECIMALS_STORAGE_KEY, String(elements.settingsMoneyDecimalsInput.checked));
  render();
}

function handleNaturalEntryMarksHiddenChange() {
  localStorage.setItem(
    NATURAL_ENTRY_MARKS_HIDDEN_STORAGE_KEY,
    String(!elements.settingsNaturalEntryMarksHiddenInput.checked),
  );
  applyNaturalEntryMarksPreference();
}

function handleEntryModeSelection(event) {
  const button = event.target.closest("[data-entry-mode-choice]");
  if (!button) return;

  const nextMode = button.dataset.entryModeChoice === "standard" ? "standard" : "natural";
  if (nextMode === getEntryMode()) return;

  closeNaturalEntryStage({ immediate: true });
  localStorage.setItem(ENTRY_MODE_STORAGE_KEY, nextMode);
  document.documentElement.dataset.entryMode = nextMode;
  activeEntryEditor = "amount";
  renderEntryModeSettings();
  renderNaturalEntry();
  if (nextMode === "natural") {
    window.requestAnimationFrame(() => triggerNaturalEntryLensEntry({ force: true }));
  }
  showToast({ message: nextMode === "natural" ? "已切换为自然语言录入" : "已切换为标准录入" });
}

function handleSettlementMethodSelection(event) {
  const button = event.target.closest("[data-settlement-method-choice]");
  if (!button) return;

  const nextMethod = normalizeSettlementMethod(button.dataset.settlementMethodChoice);
  if (nextMethod === getSettlementMethod()) return;

  localStorage.setItem(SETTLEMENT_METHOD_STORAGE_KEY, nextMethod);
  render();
  const selectedOption = SETTLEMENT_METHOD_OPTIONS.find((option) => option.id === nextMethod);
  showToast({ message: `已切换为${selectedOption?.label || "最简方案"}` });
}

function renderLedger({ animateFinancialChanges = false } = {}) {
  const visibleExpenses = getVisibleExpenses();
  const enterClass = animateFinancialChanges ? " is-entering" : "";
  const activeExpenses = getActiveExpenses();

  if (!activeExpenses.length) {
    document.documentElement.dataset.ledgerExpanded = "false";
    syncLedgerMobileSubmitBar(false);
    elements.ledgerList.innerHTML = renderLedgerEmptyState(
      "还没有账单",
      `<br><button class="secondary-button compact-button empty-state-action" type="button" data-goto-entry>记第一笔</button>`,
      enterClass,
      { suffixIsHtml: true },
    );
    return;
  }

  if (!visibleExpenses.length) {
    document.documentElement.dataset.ledgerExpanded = "false";
    syncLedgerMobileSubmitBar(false);
    elements.ledgerList.innerHTML = renderLedgerEmptyState(
      "没有符合筛选的账单",
      `<button class="secondary-button compact-button empty-state-action" type="button" data-clear-filter-empty>清除筛选</button>`,
      enterClass,
      { includeArt: false, suffixIsHtml: true },
    );
    return;
  }

  elements.ledgerList.innerHTML = groupExpensesByDate(visibleExpenses).map((group) => renderLedgerDayGroup(group, enterClass)).join("");
  scheduleLedgerNoteMeasurement();
  const expandedItem = elements.ledgerList.querySelector(".ledger-item.is-expanded");
  document.documentElement.dataset.ledgerExpanded = expandedItem ? "true" : "false";
  syncLedgerMobileSubmitBar(Boolean(expandedItem));
}

function renderLedgerEmptyState(message, suffix = "", enterClass = "", { includeArt = true, suffixIsHtml = false } = {}) {
  const suffixContent = suffixIsHtml ? suffix : suffix ? `<br><small>${escapeHtml(suffix)}</small>` : "";
  return `<div class="empty-state${enterClass}">${includeArt ? emptyStateArt : ""}${escapeHtml(message)}${suffixContent}</div>`;
}

function renderLedgerDayGroup(group, enterClass = "") {
  return `
    <section class="ledger-day-group${enterClass}" data-ledger-date="${escapeHtml(group.date)}">
      <div class="ledger-day-heading">
        <time datetime="${escapeHtml(group.date)}">${escapeHtml(formatLedgerDate(group.date))}</time>
        <strong>${formatMoney(group.totalCents)}</strong>
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
  const createdFamilyId = normalizePayerId(expense.createdBy?.familyId);
  const updatedFamilyId = normalizePayerId(expense.updatedBy?.familyId);
  const createdFamilyName = createdFamilyId ? getFamilyName(createdFamilyId) : "";
  const updatedFamilyName = updatedFamilyId ? getFamilyName(updatedFamilyId) : "";
  const operatorLabel = updatedFamilyId && updatedFamilyId !== createdFamilyId
    ? `${createdFamilyName}创建 · ${updatedFamilyName}更新`
    : createdFamilyId
      ? `${createdFamilyName}创建`
      : "";
  const operatorHtml = operatorLabel
    ? `<small class="ledger-operator" title="${escapeHtml(operatorLabel)}">${escapeHtml(operatorLabel)}</small>`
    : "";
  const noteText = String(expense.note || "").trim();
  const actionTabIndex = isExpanded ? "0" : "-1";
  const familyName = getFamilyName(expense.payerId);
  const categoryName = formatCategoryLabel(expense.category);
  const amountLabel = formatMoney(expenseToCents(expense));
  const primaryText = noteText || `${familyName} · ${categoryName}`;
  const detailsId = `ledger-details-${String(expense.id).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const summaryLabel = [
    primaryText,
    familyName,
    categoryName,
    amountLabel,
    isExpanded ? "收起详情" : "展开详情",
  ].filter(Boolean).join("，");
  const summaryMetaHtml = noteText
    ? `<span class="ledger-summary-family ledger-family">${escapeHtml(familyName)}</span>
       <span class="category-pill" style="${categoryStyle(expense.category)}">${categoryLabelHtml(expense.category)}</span>
       ${syncBadge}`
    : syncBadge;
  const fullNoteHtml = noteText
    ? `<p class="ledger-detail-note" data-ledger-full-note hidden>${escapeHtml(noteText)}</p>`
    : "";

  const transitionStyle = expense.id === lastAddedExpenseId ? "view-transition-name: expense-new" : "";
  const combinedStyle = [familyStyle(expense.payerId), transitionStyle].filter(Boolean).join(";");

  return `
    <article class="${itemClass} pointer-sink-target" style="${combinedStyle}"
      data-expense-id="${escapeHtml(expense.id)}"
      data-pointer-family-id="${escapeHtml(expense.payerId)}"
      data-pointer-category="${escapeHtml(expense.category)}"
      data-pointer-date="${escapeHtml(expense.date)}">
      <span class="ledger-item-material" aria-hidden="true"></span>
      <span class="pointer-sink-sheen" aria-hidden="true"></span>
      <button class="ledger-summary-toggle" type="button" aria-expanded="${isExpanded}" aria-controls="${detailsId}" aria-label="${escapeHtml(summaryLabel)}">
        <span class="ledger-summary-primary">
          <span class="ledger-primary-text" data-ledger-note-primary>${escapeHtml(primaryText)}</span>
        </span>
        <span class="ledger-summary-meta">${summaryMetaHtml}</span>
        <strong class="ledger-amount">${amountLabel}</strong>
        <span class="ledger-expand-cue" aria-hidden="true">${uiIconHtml(isExpanded ? "chevron-up" : "chevron-down")}</span>
        <time class="ledger-date" datetime="${escapeHtml(expense.date)}">${formatLedgerCardDate(expense.date)}</time>
      </button>
      <div class="ledger-expanded-content" id="${detailsId}" aria-hidden="${String(!isExpanded)}" ${isExpanded ? "" : "inert hidden"}>
        <div class="ledger-expanded-details">
          <span class="ledger-expanded-rail" aria-hidden="true"></span>
          ${fullNoteHtml}
          ${operatorHtml}
          <small class="ledger-scope">${escapeHtml(formatExpenseSplitSummary(expense))}</small>
          ${syncLine}
        </div>
        <div class="ledger-item-actions">
          <button class="ledger-edit-button" type="button" tabindex="${actionTabIndex}" data-edit-id="${escapeHtml(expense.id)}" aria-label="编辑这笔账">${uiIconHtml("edit")}<span class="ledger-action-label">编辑</span></button>
          <button class="delete-button" type="button" tabindex="${actionTabIndex}" data-delete-id="${escapeHtml(expense.id)}" aria-label="删除这笔账">${uiIconHtml("trash")}<span class="ledger-action-label">删除</span></button>
        </div>
      </div>
    </article>
  `;
}

function syncLedgerItemNoteState(item) {
  const primary = item?.querySelector("[data-ledger-note-primary]");
  const fullNote = item?.querySelector("[data-ledger-full-note]");
  if (!primary || !fullNote) return;
  const isTruncated = primary.scrollWidth > primary.clientWidth + 1;
  item.classList.toggle("is-note-truncated", isTruncated);
  fullNote.hidden = !(isTruncated && item.classList.contains("is-expanded"));
}

function scheduleLedgerNoteMeasurement() {
  window.cancelAnimationFrame(ledgerNoteMeasureFrame);
  ledgerNoteMeasureFrame = window.requestAnimationFrame(() => {
    ledgerNoteMeasureFrame = 0;
    elements.ledgerList?.querySelectorAll(".ledger-item").forEach(syncLedgerItemNoteState);
  });
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
  const usesNaturalStage = isNaturalEntryLayout() && naturalEntryEditors.has(target);
  if (usesNaturalStage) {
    setActiveEntryEditor(target);
  }

  if (target === "payer") {
    if (!usesNaturalStage) elements.payerField.scrollIntoView(scrollOptions);
    elements.familyRoster.querySelector(".family-tag")?.focus();
    elements.payerError.textContent = "请选择付款家庭。";
    return;
  }

  if (target === "amount") {
    if (!usesNaturalStage) elements.amountLabel.scrollIntoView({ block: "center", behavior: "auto" });
    elements.amountInput.focus();
    elements.formError.textContent = "请输入金额。";
    return;
  }

  if (target === "split") {
    if (!splitScopeOpen) {
      splitScopeOpen = true;
      smoothSplitScopeResize(renderSplitScope);
    }
    if (!usesNaturalStage) elements.splitScope.scrollIntoView(scrollOptions);
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
    if (!usesNaturalStage) elements.categoryChips.scrollIntoView(scrollOptions);
    elements.categoryChips.querySelector(".selectable-category-chip")?.focus();
    elements.formError.textContent = "请选择类别。";
  }
}

function renderEditState() {
  const isEditing = Boolean(editingExpenseId);
  elements.editBanner.hidden = !isEditing;
  
  const label = elements.submitButtonLabel;
  const newText = isEditing ? COPY.actions.saveExpense : COPY.actions.addExpense;
  
  if (label.textContent !== newText) {
    label.classList.add("text-slide-out");
    const textDuration = getCssDurationMs("--motion-text", 240);
    const textExitDuration = Math.round(textDuration * 0.85);
    window.setTimeout(() => {
      label.textContent = newText;
      label.classList.remove("text-slide-out");
      label.classList.add("text-slide-in");
      window.setTimeout(() => {
        label.classList.remove("text-slide-in");
      }, textDuration + 24);
    }, textExitDuration);
  }
  
  elements.expenseForm.classList.toggle("is-editing", isEditing);
}

function getExpenseMissingState() {
  const amount = activeSplitMode === "custom"
    ? centsToAmount(customSplitTargetCents === null ? getActiveCustomSplitTotalCents() : customSplitTargetCents)
    : parseAmountInput(elements.amountInput.value);
  const hasPayer = state.families.some((family) => family.id === state.selectedPayerId);
  const hasCategory = Boolean(state.activeCategory || elements.categoryInput.value);

  if (!hasPayer) {
    return {
      target: "payer",
      summary: "选择付款家庭",
      action: "选择",
    };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      target: activeSplitMode === "custom" ? "split" : "amount",
      summary: activeSplitMode === "custom" ? "请填写分摊金额" : "请输入金额",
      action: "填写",
    };
  }
  if (!hasCategory) {
    return {
      target: "category",
      summary: "选择类别",
      action: "选择",
    };
  }
  return {
    target: "",
    summary: "",
    action: "",
  };
}

function renderMobileSubmitBar() {
  window.clearTimeout(mobileSubmitFeedbackTimer);
  const family = state.selectedPayerId ? getFamilyName(state.selectedPayerId) : "未选家庭";
  const category = state.activeCategory ? formatCategoryLabel(state.activeCategory) : "未选类别";
  const date = state.activeDate === todayIso() ? "今天" : state.activeDate.slice(5);
  const action = editingExpenseId ? "保存修改" : "记下这笔";
  const split = activeSplitMode === "equal" && getSplitScopeFromMode(activeSplitMode) === "all" ? "" : ` · ${formatActiveSplitSummary()}`;
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

function showMobileSubmitFeedback(kind, label, summary) {
  const bar = elements.mobileSubmitBar;
  const button = elements.mobileSubmitButton;
  const buttonLabel = button?.querySelector(".button-label");
  if (!bar || !button || !buttonLabel) return;

  window.clearTimeout(mobileSubmitFeedbackTimer);
  bar.dataset.state = kind;
  bar.dataset.missingTarget = "";
  bar.classList.toggle("submit-themed", kind === "success");
  elements.mobileSubmitSummary.textContent = summary;
  buttonLabel.textContent = label;
  button.classList.remove("is-blocked");
  button.setAttribute("aria-disabled", "false");
  button.setAttribute("aria-label", label);

  mobileSubmitFeedbackTimer = window.setTimeout(() => {
    renderMobileSubmitBar();
  }, kind === "error" ? 2200 : 1200);
}

function getSplitDetailsForSubmit() {
  ensureActiveSplitState();

  if (activeSplitMode === "custom") {
    const totalCents = getActiveCustomSplitTotalCents();
    const targetCents = customSplitTargetCents;
    const difference = targetCents === null ? 0 : totalCents - targetCents;
    return {
      amount: centsToAmount(totalCents),
      splitMode: "custom",
      splitFamilyIds: [],
      splitAmounts: getActiveCustomSplitAmounts(),
      error: !totalCents
        ? "请填写分摊金额。"
        : targetCents !== null && difference !== 0
          ? "金额未对齐。"
          : "",
    };
  }

  if (getSplitScopeFromMode(activeSplitMode) === "selected") {
    return {
      amount: parseAmountInput(elements.amountInput.value),
      splitMode: getSplitModeForState("selected", getSplitRuleFromMode(activeSplitMode)),
      splitFamilyIds: [...activeSplitFamilyIds],
      splitAmounts: normalizeSplitAmounts(),
      error: activeSplitFamilyIds.length ? "" : "请选择参与分摊的家庭。",
    };
  }

  return {
    amount: parseAmountInput(elements.amountInput.value),
    splitMode: getSplitModeForState("all", getSplitRuleFromMode(activeSplitMode)),
    splitFamilyIds: [],
    splitAmounts: normalizeSplitAmounts(),
    error: "",
  };
}

/* 移动端悬浮按钮不在 expenseForm 内，提交前先把自然录入阶段里最新的
   日期/类别值同步回表单状态，再走同一个原生 submit 入口。这样编辑态在
   面板切换或 WebKit 的异步重绘后，仍会保留 editingExpenseId 并更新原账单。 */
function syncExpenseFormState() {
  state.activeCategory = normalizeCategorySelection(
    elements.categoryInput.value || state.activeCategory,
    state.categories,
  );
  state.activeDate = normalizeDate(elements.dateInput.value, state.activeDate);
  elements.categoryInput.value = state.activeCategory;
  elements.dateInput.value = state.activeDate;
}

function requestExpenseSubmit() {
  syncExpenseFormState();
  elements.expenseForm.requestSubmit(elements.submitButton);
}

function handleExpenseSubmit(event) {
  event.preventDefault();
  elements.formError.textContent = "";
  elements.payerError.textContent = "";

  if (isCloudLedgerActive() && !getOperatorFamilyId()) {
    showOperatorModal();
    showToast({ message: "请选择你的家庭，再继续记账" });
    return;
  }

  const wasEditing = Boolean(editingExpenseId);
  const splitDetails = getSplitDetailsForSubmit();
  const amount = splitDetails.amount;
  const payerId = state.selectedPayerId;
  const category = normalizeCategorySelection(
    elements.categoryInput.value || state.activeCategory,
    state.categories,
  );
  const date = normalizeDate(elements.dateInput.value, state.activeDate);
  const note = elements.noteInput.value.trim();
  state.activeCategory = category;
  state.activeDate = date;
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
    elements.formError.textContent = "请输入有效金额（大于 0）。";
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

  closeNaturalEntryStage({ immediate: true });
  const expenseId = editingExpenseId || createId("expense");
  const operatorFamilyId = getOperatorFamilyId();
  const operator = operatorFamilyId ? { familyId: operatorFamilyId } : null;
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
    createdBy: wasEditing ? (originalExpense?.createdBy || operator) : operator,
    updatedBy: wasEditing ? operator : null,
    syncState: isCloudLedgerActive() ? "pending" : "synced",
    isDeleted: false,
    createdAt: wasEditing ? (originalExpense?.createdAt || originalExpense?.updatedAt || new Date().toISOString()) : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mobileDataFlow = window.matchMedia("(max-width: 820px)").matches;
  if (mobileDataFlow && !prefersReducedMotion()) {
    /* 先于 render() 写入，确保总支出 VT 与平账卡的数字刷新在创建动画
       的瞬间就拿到与底部悬浮栏相同的时长。 */
    const mobilePanelMotion = `${getBarMorphDuration("data")}ms`;
    document.documentElement.style.setProperty("--mobile-panel-in-motion", mobilePanelMotion);
    elements.ledgerView.style.setProperty("--mobile-panel-in-motion", mobilePanelMotion);
  } else if (!mobileDataFlow) {
    document.documentElement.style.removeProperty("--mobile-panel-in-motion");
    elements.ledgerView.style.removeProperty("--mobile-panel-in-motion");
  }

  if (wasEditing) {
    state.expenses = state.expenses.map((expense) => (expense.id === editingExpenseId ? savedExpense : expense));
    editingExpenseId = "";
    lastAddedExpenseId = expenseId;
    showToast({ message: "修改已保存" });
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
  if (!wasEditing && !mobileDataFlow) {
    landAddCeremony(payerId, savedExpense.amount, expenseId, addStartRect);
  }
  if (hasActiveLedgerFilters() && !isExpenseVisible(savedExpense)) {
    showToast({
      message: "已保存，但不在当前筛选内",
      actionLabel: "清除筛选",
      onAction: clearLedgerFilters,
    });
  } else if (!wasEditing && mobileDataFlow) {
    showToast({ message: "这笔账已记下" });
  }
  if (mobileDataFlow) {
    setMobilePanel("data", { animate: true, scroll: false });
    window.setTimeout(() => {
      const card = elements.ledgerList?.querySelector(`[data-expense-id="${cssEscapeId(expenseId)}"]`);
      if (card && isExpenseVisible(savedExpense)) pulseLedgerCatch(card);
      triggerTotalBloomEffect(getFamilyVisual(payerId));
    }, prefersReducedMotion() ? 0 : MOTION_DELAYS.mobilePanelOut + MOTION_DELAYS.mobilePanelIn);
  }
  syncCloudExpenseWithState(expenseId).catch(() => {
    showToast({ message: COPY.sync.savedLocally });
    showMobileSubmitFeedback("error", "稍后重试", "已保存在本机 · 联网后重试");
  });
  window.setTimeout(() => {
    showMobileSubmitFeedback(
      "success",
      wasEditing ? "已保存 ✓" : "已记下 ✓",
      wasEditing ? "这笔账已更新" : `${getFamilyName(payerId)} · ${formatCategoryLabel(category)}`,
    );
  }, 32);
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
  if (event.key === "Escape") {
    event.preventDefault();
    setCategoryAddOpen(false, { clearInput: true, restoreFocus: true });
    return;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    addCategoryFromInput(elements.newCategoryInput);
  }
}

function handleSettingsCategorySubmit(event) {
  event.preventDefault();
  addCategoryFromInput(elements.settingsNewCategoryInput);
}

function handleSettingsThemeClick(event) {
  const button = event.target.closest("[data-theme-id]");
  if (!button) return;

  const preset = THEME_PRESETS.find((item) => item.id === normalizeThemeId(button.dataset.themeId));
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

function handleSettingsFamilyColorClick(event) {
  const targetButton = event.target.closest("[data-family-color-target]");
  if (targetButton) {
    const familyId = normalizePayerId(targetButton.dataset.familyColorTarget);
    if (!familyId || !state.families.some((family) => family.id === familyId)) return;
    activeFamilyColorFamilyId = familyId;
    renderPersonalizationSettings();
    return;
  }

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
  activeFamilyColorFamilyId = familyId;
  queueCloudSettingsSync();
  showToast({ message: `已更新${getFamilyName(familyId)}身份色` });
}

function addCategoryFromInput(input) {
  const category = input.value.trim();
  if (!category) {
    updateCategoryAddConfirmState();
    return;
  }

  if (!state.categories.includes(category)) {
    state.categories.push(category);
    lastAddedCategory = category;
  }
  state.activeCategory = category;

  input.value = "";
  render();
  const revealCategory = () => {
    elements.categoryChips.querySelectorAll(".selectable-category-chip").forEach((chip) => {
      if (chip.dataset.category === category) {
        chip.scrollIntoView({ inline: "center", block: "nearest" });
      }
    });
  };
  if (input === elements.newCategoryInput) {
    updateCategoryAddConfirmState();
    setCategoryAddOpen(false, { clearInput: false, restoreFocus: false, onSettled: revealCategory });
  } else {
    revealCategory();
  }
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
  updateCategorySelectionUI(nextCategory);
  applyChoiceStateClass("[data-category]", "data-category", categorySwitched ? nextCategory : "", "is-activating");
  applyChoiceStateClass("[data-category]", "data-category", categorySwitched ? previousCategory : "", "is-deactivating");
  renderNaturalEntry();
  renderMobileSubmitBar();
  saveState();
  if (naturalEntryStageOpen && activeEntryEditor === "category") {
    window.setTimeout(() => closeNaturalEntryStage({ restoreFocus: true }), getNaturalEntryChoiceCloseDelay());
  }
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
      if (nextMode === "custom" && previousMode !== "custom") {
        const currentAmount = parseAmountInput(elements.amountInput.value);
        customSplitTargetCents = Number.isFinite(currentAmount) && currentAmount > 0 ? amountToCents(currentAmount) : null;
      }
      if (previousMode === "custom" && nextMode !== "custom") {
        customSplitTargetCents = null;
        customSplitSuspendedAmounts = {};
        customSplitAmountDrafts = {};
      }
      markSplitScopeSwitching();
      markSplitModeDeactivating(previousMode);
      markSplitModeActivating(nextMode);
      activeSplitMode = nextMode;
      if (getSplitScopeFromMode(activeSplitMode) === "all") activeSplitFamilyIds = state.families.map((family) => family.id);
      splitFamilyChoicesOpen = activeSplitMode !== "custom";
    }
    smoothSplitScopeResize(renderSplitScope);
    if (activeSplitMode === "custom" && !isNaturalEntryLayout()) {
      scheduleCustomSplitViewportSettle();
    }
    applyChoiceStateClass("[data-split-mode]", "data-split-mode", modeSwitched ? nextMode : "", "is-activating");
    applyChoiceStateClass("[data-split-mode]", "data-split-mode", modeSwitched ? previousMode : "", "is-deactivating");
    renderNaturalEntry();
    renderMobileSubmitBar();
    scheduleNaturalEntryStagePosition();
    if (naturalEntryStageOpen && activeEntryEditor === "split" && getSplitScopeFromMode(activeSplitMode) === "all" && activeSplitMode !== "custom") {
      window.setTimeout(() => closeNaturalEntryStage({ restoreFocus: true }), getNaturalEntryChoiceCloseDelay());
    }
    return;
  }

  const participantToggle = event.target.closest("#splitParticipantToggle");
  if (participantToggle) {
    splitFamilyChoicesOpen = !splitFamilyChoicesOpen;
    smoothSplitScopeResize(renderSplitScope);
    return;
  }

  const familyButton = event.target.closest("[data-split-family]");
  if (!familyButton) return;

  const familyId = normalizePayerId(familyButton.dataset.splitFamily);
  if (!familyId) return;
  const activeRule = getSplitRuleFromMode(activeSplitMode);
  const activeScope = getSplitScopeFromMode(activeSplitMode);
  if (activeSplitMode === "custom") {
    const selected = activeSplitFamilyIds.includes(familyId);
    if (selected) {
      markSplitFamilyDeactivating(familyId);
      activeSplitFamilyIds = activeSplitFamilyIds.filter((id) => id !== familyId);
      customSplitSuspendedAmounts[familyId] = activeSplitAmounts[familyId] || 0;
      activeSplitAmounts[familyId] = 0;
    } else {
      markSplitFamilyActivating(familyId);
      activeSplitFamilyIds = [...activeSplitFamilyIds, familyId];
      if (Object.prototype.hasOwnProperty.call(customSplitSuspendedAmounts, familyId)) {
        activeSplitAmounts[familyId] = customSplitSuspendedAmounts[familyId];
        delete customSplitSuspendedAmounts[familyId];
      }
    }
    if (!activeSplitFamilyIds.length) {
      const fallbackFamilyId = state.families[0]?.id;
      if (fallbackFamilyId) activeSplitFamilyIds = [fallbackFamilyId];
    }
    renderSplitScope();
    syncCustomSplitTotalField();
    renderNaturalEntry();
    renderMobileSubmitBar();
    scheduleNaturalEntryStagePosition();
    return;
  }
  if (activeSplitFamilyIds.includes(familyId)) {
    markSplitFamilyDeactivating(familyId);
    activeSplitFamilyIds = activeSplitFamilyIds.filter((id) => id !== familyId);
  } else {
    markSplitFamilyActivating(familyId);
    activeSplitFamilyIds = [...activeSplitFamilyIds, familyId];
  }
  if (activeScope === "all") activeSplitMode = getSplitModeForState("selected", activeRule);
  splitFamilyChoicesOpen = true;
  // 勾选家庭不改变面板高度，直接增量渲染，跳过测量流程（否则会闪一帧）
  renderSplitScope();
  applyChoiceStateClass("[data-split-family]", "data-split-family", familyId, activeSplitFamilyIds.includes(familyId) ? "is-activating" : "is-deactivating");
  renderNaturalEntry();
  renderMobileSubmitBar();
  scheduleNaturalEntryStagePosition();
  if (naturalEntryStageOpen && activeEntryEditor === "split" && isNaturalEntryLayout()) {
    window.clearTimeout(naturalEntryStageCloseTimer);
    const delay = getNaturalEntryChoiceCloseDelay();
    naturalEntryStageCloseTimer = window.setTimeout(() => {
      naturalEntryStageCloseTimer = 0;
      if (naturalEntryStageOpen && activeEntryEditor === "split") {
        closeNaturalEntryStage({ restoreFocus: true });
      }
    }, delay);
  }
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
  const duration = resolveMotionDuration({
    distancePx: Math.abs(from.height - to.height),
    role: "structure",
    direction: splitScopeOpen ? "enter" : "exit",
  });
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
  if (naturalEntryStageOpen && activeEntryEditor === "split") return () => {};
  const anchor = elements.splitScopeToggle;
  if (!anchor) return () => {};

  const startTop = anchor.getBoundingClientRect().top;
  return () => {
    const nextTop = anchor.getBoundingClientRect().top;
    const delta = nextTop - startTop;
    if (Math.abs(delta) > 0.5) window.scrollBy(0, delta);
  };
}

function scheduleCustomSplitViewportSettle() {
  if (!window.matchMedia("(max-width: 820px)").matches) return;
  const settle = () => {
    const customAmounts = elements.splitCustomAmounts;
    if (!customAmounts || customAmounts.hidden) return;
    if (naturalEntryStageOpen && activeEntryEditor === "split") {
      const focusedInput = customAmounts.querySelector("[data-split-amount]:focus")
        || customAmounts.querySelector("[data-split-amount]");
      if (focusedInput) scrollNaturalEntrySplitInputIntoView(focusedInput);
      return;
    }
    const rect = customAmounts.getBoundingClientRect();
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const targetTop = Math.max(92, viewportHeight * 0.22);
    const delta = rect.top - targetTop;
    if (delta > 2) window.scrollBy({ top: delta, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  window.requestAnimationFrame(() => {
    settle();
    window.setTimeout(settle, prefersReducedMotion() ? 0 : 180);
  });
}

function scrollNaturalEntrySplitInputIntoView(input) {
  const stage = elements.naturalEntryStage;
  if (!input || !stage || !naturalEntryStageOpen || activeEntryEditor !== "split") return;
  window.requestAnimationFrame(() => {
    if (!naturalEntryStageOpen || activeEntryEditor !== "split" || document.activeElement !== input) return;
    const stageRect = stage.getBoundingClientRect();
    const inputRect = input.getBoundingClientRect();
    const viewportTop = window.visualViewport?.offsetTop || 0;
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const targetCenter = viewportTop + Math.min(viewportHeight - 16, Math.max(16, viewportHeight * 0.5));
    const delta = (inputRect.top + inputRect.height / 2) - targetCenter;
    const maxScroll = Math.max(0, stage.scrollHeight - stage.clientHeight);
    stage.scrollTop = Math.max(0, Math.min(maxScroll, stage.scrollTop + delta));
    if (inputRect.left < stageRect.left || inputRect.right > stageRect.right) {
      stage.scrollLeft = Math.max(0, Math.min(stage.scrollWidth - stage.clientWidth, inputRect.left - stageRect.left));
    }
  });
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
  normalizeAmountInputDecimalPoint(input);
  syncAmountValueTrack(input);
  animateAmountValueTrack(input, { compact: true });
  revealAmountInputCaret(input);
  const familyId = normalizePayerId(input.dataset.splitAmount);
  if (!familyId) return;
  customSplitAmountDrafts[familyId] = input.value;
  const amount = parseAmountInput(input.value);
  activeSplitAmounts[familyId] = Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : 0;

  syncCustomSplitTotalField();
  if (customSplitTargetCents === null) animateAmountValueTrack(elements.amountInput, { soft: true });

  const splitSummary = formatActiveSplitSummary();
  animateSplitSummaryText(elements.splitScopeSummary, splitSummary, {
    ariaElement: elements.splitScopeToggle,
    ariaLabel: `分摊，${splitSummary}`,
    animate: false,
  });
  syncCustomSplitTotalLine();
  scheduleNaturalEntryRender({ positionStage: false });
  updateAmountMotionState();
}

function handleSplitAmountKeydown(event) {
  const input = event.target.closest("[data-split-amount]");
  if (!input || event.key !== "Enter" || event.isComposing) return;
  event.preventDefault();
  const inputs = [...elements.splitCustomAmounts.querySelectorAll("[data-split-amount]:not(:disabled)")];
  const next = inputs[inputs.indexOf(input) + 1];
  if (next) {
    next.focus();
    next.select();
  } else {
    input.blur();
  }
}

function resetSplitScope() {
  activeSplitMode = "equal";
  activeSplitFamilyIds = state.families.map((family) => family.id);
  activeSplitAmounts = {};
  customSplitTargetCents = null;
  customSplitSuspendedAmounts = {};
  customSplitAmountDrafts = {};
  splitScopeOpen = false;
  splitFamilyChoicesOpen = true;
  activeEntryEditor = "amount";
}

function setSplitScopeFromExpense(expense) {
  activeSplitMode = normalizeSplitMode(expense.splitMode);
  activeSplitFamilyIds = normalizeSplitFamilyIds(
    expense.splitFamilyIds,
    getSplitScopeFromMode(activeSplitMode) === "selected" ? [] : state.families.map((family) => family.id),
  );
  if (getSplitScopeFromMode(activeSplitMode) === "all") activeSplitFamilyIds = state.families.map((family) => family.id);
  activeSplitAmounts = normalizeSplitAmounts(expense.splitAmounts);
  customSplitTargetCents = activeSplitMode === "custom" ? amountToCents(expense.amount) : null;
  customSplitSuspendedAmounts = {};
  customSplitAmountDrafts = {};
  splitScopeOpen = activeSplitMode !== "equal";
  splitFamilyChoicesOpen = getSplitScopeFromMode(activeSplitMode) === "selected";
}

function handleSettingsCategoryClick(event) {
  const moveButton = event.target.closest("[data-move-category]");
  if (moveButton) {
    moveCategory(moveButton.dataset.moveCategory, Number(moveButton.dataset.direction));
    return;
  }

  const button = event.target.closest("[data-remove-category]");
  if (!button) return;

  removeCategory(button.dataset.removeCategory, button.closest(".settings-category-chip"));
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

function removeCategory(category, chipEl) {
  if (state.expenses.some((expense) => expense.category === category)) return;
  const categoryIndex = state.categories.indexOf(category);
  if (categoryIndex < 0) return;

  const commit = () => {
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
  };

  /* 有 chip 节点且未减动时，先播退场动画，结束后再真正移除并重渲染；
     使设置内分类删除不再硬消失（与记账表单 chips 的进出场对齐）。 */
  if (chipEl && !prefersReducedMotion()) {
    chipEl.classList.add("is-removing");
    window.setTimeout(commit, MOTION_DELAYS.categoryExit);
  } else {
    commit();
  }
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

  if (event.target.closest("[data-goto-entry]")) {
    setMobilePanel("entry", { animate: true, scroll: true });
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
  const targetStates = new Map(transitionItems.map((item) => [item, item.dataset.expenseId === expenseId]));
  const fromRects = captureLedgerTransitionRects(transitionItems);
  const shouldAnimate = canAnimateLedgerMorph();
  if (shouldAnimate) prepareLedgerMorph("expanding");

  expandedExpenseId = expenseId;
  transitionItems.forEach((item) => {
    const isExpanded = targetStates.get(item);
    syncLedgerItemExpandedState(item, isExpanded, { deferHide: shouldAnimate && !isExpanded });
  });
  document.documentElement.dataset.ledgerExpanded = "true";
  syncLedgerMobileSubmitBar(true);
  scheduleLedgerNoteMeasurement();

  if (shouldAnimate) playLedgerTransitionRects(fromRects, targetStates);
  else transitionItems.forEach((item) => finalizeLedgerItemState(item, targetStates.get(item)));
}

function collapseLedgerItem(expenseId) {
  if (!expenseId || expandedExpenseId !== expenseId) return;
  const items = [...elements.ledgerList.querySelectorAll(".ledger-item")];
  const transitionItems = getLedgerTransitionItems(items, "");
  const targetStates = new Map(transitionItems.map((item) => [item, false]));
  const fromRects = captureLedgerTransitionRects(transitionItems);
  const shouldAnimate = canAnimateLedgerMorph();
  if (shouldAnimate) prepareLedgerMorph("collapsing");

  expandedExpenseId = "";
  transitionItems.forEach((item) => {
    syncLedgerItemExpandedState(item, false, { deferHide: shouldAnimate });
  });
  document.documentElement.dataset.ledgerExpanded = "false";
  syncLedgerMobileSubmitBar(false);

  if (shouldAnimate) playLedgerTransitionRects(fromRects, targetStates);
  else transitionItems.forEach((item) => finalizeLedgerItemState(item, false));
}

function getLedgerTransitionItems(items, nextExpenseId) {
  const ids = new Set([expandedExpenseId, nextExpenseId].filter(Boolean));
  return items.filter((item) => ids.has(item.dataset.expenseId)
    || item.classList.contains("is-ledger-expanding")
    || item.classList.contains("is-ledger-collapsing")
    || item._heightAnimation);
}

function captureLedgerTransitionRects(items) {
  if (prefersReducedMotion()) return new Map();
  const rects = new Map();
  items.forEach((item) => {
    // 卡片自身也入表：高度变化由 play 阶段按实测值做动画
    const itemRect = item.getBoundingClientRect();
    rects.set(item, {
      left: itemRect.left,
      top: itemRect.top,
      width: itemRect.width,
      height: itemRect.height,
    });
  });
  return rects;
}

function prepareLedgerMorph(direction) {
  if (
    prefersReducedMotion()
    || typeof Element.prototype.animate !== "function"
    || !elements.ledgerList
  ) return;
  elements.ledgerList.classList.remove("is-ledger-expanding", "is-ledger-collapsing");
  elements.ledgerList.classList.add("is-morphing-ledger-items", `is-ledger-${direction}`);
}

function clearLedgerMorphClasses() {
  elements.ledgerList?.classList.remove(
    "is-morphing-ledger-items",
    "is-ledger-expanding",
    "is-ledger-collapsing",
  );
}

function playLedgerTransitionRects(rects, targetStates) {
  if (!rects.size || !canAnimateLedgerMorph()) {
    targetStates.forEach((isExpanded, item) => finalizeLedgerItemState(item, isExpanded));
    clearLedgerMorphClasses();
    return;
  }
  const direction = [...targetStates.values()].some(Boolean) ? "enter" : "exit";
  const rootStyle = getComputedStyle(document.documentElement);
  const cardEasing = rootStyle.getPropertyValue("--ease-card-settle").trim()
    || rootStyle.getPropertyValue("--ledger-morph-easing").trim()
    || "cubic-bezier(0.12, 0.68, 0.18, 1)";
  const animations = [];
  const records = [];
  const runId = ++ledgerMorphRunId;

  elements.ledgerList?.classList.add("is-morphing-ledger-items");

  rects.forEach((fromRect, item) => {
    const isExpanded = Boolean(targetStates.get(item));
    cancelLedgerItemAnimations(item);
    item.classList.add(isExpanded ? "is-ledger-expanding" : "is-ledger-collapsing");
    item.style.height = "";
    item.style.minHeight = "0";
    item.style.maxHeight = "none";
    syncLedgerItemNoteState(item);

    const summary = item.querySelector(".ledger-summary-toggle");
    const details = item.querySelector(".ledger-expanded-details");
    const actions = item.querySelector(".ledger-item-actions");
    const rail = item.querySelector(".ledger-expanded-rail");
    const targetHeight = isExpanded
      ? item.scrollHeight
      : summary?.getBoundingClientRect().height || fromRect.height;
    const distance = Math.abs(targetHeight - fromRect.height);
    const duration = resolveMotionDuration({ distancePx: distance, role: "card", direction });
    const cardAnimation = item.animate(
      [
        { height: `${fromRect.height}px` },
        { height: `${targetHeight}px` },
      ],
      { duration, easing: cardEasing, fill: "forwards" },
    );
    item._heightAnimation = cardAnimation;
    animations.push(cardAnimation);
    const childAnimations = [cardAnimation];

    const animateChild = (element, delay, childDuration, fromOpacity, toOpacity, { reveal = false } = {}) => {
      if (!element) return;
      const startClip = reveal && !fromOpacity ? "inset(0 0 100% 0)" : "inset(0 0 0 0)";
      const endClip = reveal && !toOpacity ? "inset(0 0 100% 0)" : "inset(0 0 0 0)";
      const animation = element.animate(
        [
          { opacity: fromOpacity, transform: `translateY(${fromOpacity ? 0 : 6}px)`, ...(reveal ? { clipPath: startClip } : {}) },
          { opacity: toOpacity, transform: `translateY(${toOpacity ? 0 : 6}px)`, ...(reveal ? { clipPath: endClip } : {}) },
        ],
        { delay, duration: childDuration, easing: "cubic-bezier(0.30, 0.72, 0.42, 1)", fill: "both" },
      );
      childAnimations.push(animation);
      animations.push(animation);
      return animation;
    };

    const childDuration = isExpanded ? 240 : 120;
    const detailsAnimation = animateChild(details, isExpanded ? 80 : 0, childDuration, isExpanded ? 0 : 1, isExpanded ? 1 : 0, { reveal: true });
    const actionsAnimation = animateChild(actions, isExpanded ? 140 : 0, childDuration, isExpanded ? 0 : 1, isExpanded ? 1 : 0);
    const railAnimation = rail?.animate(
      [
        { opacity: isExpanded ? 0 : 1, transform: isExpanded ? "scaleY(0)" : "scaleY(1)" },
        { opacity: isExpanded ? 1 : 0, transform: isExpanded ? "scaleY(1)" : "scaleY(0)" },
      ],
      { duration: isExpanded ? 260 : 120, easing: "cubic-bezier(0.20, 0.75, 0.25, 1)", fill: "both" },
    );
    if (railAnimation) {
      childAnimations.push(railAnimation);
      animations.push(railAnimation);
    }
    item._ledgerDetailsAnimation = detailsAnimation;
    item._ledgerActionsAnimation = actionsAnimation;
    item._ledgerRailAnimation = railAnimation;
    records.push({ item, isExpanded, targetHeight, animations: childAnimations });
  });

  if (!animations.length) {
    records.forEach(({ item, isExpanded }) => finalizeLedgerItemState(item, isExpanded));
    if (runId === ledgerMorphRunId) clearLedgerMorphClasses();
    return;
  }

  Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
    if (runId !== ledgerMorphRunId) return;
    records.forEach(({ item, isExpanded, targetHeight }) => {
      item.style.height = `${targetHeight}px`;
      cancelLedgerItemAnimations(item);
      finalizeLedgerItemState(item, isExpanded);
    });
    clearLedgerMorphClasses();
  });
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
        const restoredExpense = state.expenses.find((item) => item.id === expenseId);
        const restoredAt = new Date().toISOString();
        if (restoredExpense) {
          restoredExpense.isDeleted = false;
          restoredExpense.updatedAt = restoredAt;
        } else {
          state.expenses.push({ ...expense, isDeleted: false, updatedAt: restoredAt });
        }
        smoothContainerResize(elements.ledgerSection, () => {
          render({ animateFinancialChanges: true });
        });
        syncCloudExpenseWithState(expenseId, { silent: true }).catch(() => {});
      },
    });
    /* 撤销 toast 显示 toastWithAction(5.2s)，过期 + 缓冲后清理已同步的墓碑，释放存储。 */
    window.setTimeout(gcDeletedExpenses, MOTION_DELAYS.toastWithAction + 500);
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
      window.setTimeout(gcDeletedExpenses, MOTION_DELAYS.toastWithAction + 500);
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
  /* VT 已对整个视口（root + total/paid/category/settlement 命名组）做交叉淡变，
     此处不再叠加 is-switching-ledger 的 app-content-refresh（面板位移），否则命名组
     子项会“原位交叉淡变 + 随父面板位移”双段。仅在不支持 View Transitions
     的浏览器保留该 CSS 兜底（其内置减动守卫仍生效）。 */
  if (!document.startViewTransition) markLedgerSwitching();
  if (announce) showToast({ message: `已切换到"${state.name}"` });
  checkOperatorFamilyPrompt();
  syncRealtimeSubscription();
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
  try {
    await navigator.clipboard.writeText(url.toString());
  } catch {
    showToast({ message: "复制失败，请手动复制地址栏链接" });
    return;
  }
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

function parseImportedCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell); if (row.some((value) => value.trim())) rows.push(row);
      row = []; cell = "";
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); if (row.some((value) => value.trim())) rows.push(row); }
  return rows;
}

function findFamilyIdByName(name, families = state.families) {
  const normalized = String(name || "").trim();
  return families.find((family) => family.name === normalized)?.id || families[0]?.id || "";
}

function createImportedLedger(rawLedger, fallbackName) {
  const source = normalizeLedger(rawLedger, fallbackName);
  const ledger = {
    ...source,
    id: createId("ledger"),
    name: `${source.name}（导入）`.slice(0, 24),
    cloudShareToken: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSyncedAt: "",
    expenses: source.expenses.map((expense) => ({
      ...expense,
      id: createId("expense"),
      syncState: "synced",
    })),
  };
  return ledger;
}

function importJsonLedger(text) {
  const payload = JSON.parse(text);
  const sourceState = payload?.appState || payload;
  if (!sourceState || !Array.isArray(sourceState.ledgers)) throw new Error("不是 Journa JSON 备份");
  return sourceState.ledgers.map((ledger, index) => createImportedLedger(ledger, `导入账本 ${index + 1}`));
}

function importCsvLedger(text, fileName) {
  const rows = parseImportedCsv(text).map((row) => row.map((value) => value.trim()));
  if (rows.length < 2) throw new Error("CSV 中没有账单记录");
  const headers = rows[0];
  const indexOf = (label) => headers.indexOf(label);
  const dateIndex = indexOf("日期");
  const payerIndex = indexOf("付款家庭");
  const categoryIndex = indexOf("类别");
  const amountIndex = indexOf("金额");
  if ([dateIndex, payerIndex, categoryIndex, amountIndex].some((index) => index < 0)) throw new Error("CSV 缺少必要列");
  const expenses = rows.slice(1).map((row, index) => {
    const amount = Number(row[amountIndex]);
    const category = row[categoryIndex];
    const payerId = findFamilyIdByName(row[payerIndex]);
    if (!Number.isFinite(amount) || amount <= 0 || !category || !row[dateIndex]) return null;
    return normalizeExpense({
      id: `imported-expense-${index}`,
      amount, payerId, category, date: row[dateIndex],
      note: row[indexOf("备注")] || "",
      splitMode: "all",
    });
  }).filter(Boolean);
  if (!expenses.length) throw new Error("CSV 中没有可导入的有效账单");
  return createImportedLedger({
    name: fileName.replace(/\.[^.]+$/, "") || "CSV账本",
    families: state.families,
    familyVisuals: state.familyVisuals,
    familyMembers: state.familyMembers,
    categories: [...state.categories, ...expenses.map((expense) => expense.category)],
    expenses,
  }, "CSV账本");
}

async function importLedgerFile(file) {
  if (!file) return;
  try {
    const text = await file.text();
    const importedLedgers = file.name.toLowerCase().endsWith(".csv")
      ? [importCsvLedger(text, file.name)]
      : importJsonLedger(text);
    appState.ledgers.push(...importedLedgers);
    state = importedLedgers.at(-1);
    appState.activeLedgerId = state.id;
    saveState();
    render({ animateFinancialChanges: true });
    closeSettings();
    showToast({ message: `已导入 ${importedLedgers.length} 个账本，原有账本未改变` });
  } catch (error) {
    showToast({ message: `导入失败：${error.message || "文件格式不正确"}` });
  } finally {
    elements.importLedgerInput.value = "";
  }
}

function formatSplitModeForExport(expense) {
  const splitMode = normalizeSplitMode(expense.splitMode);
  if (splitMode === "custom") return "自定金额";
  return getSplitRuleFromMode(splitMode) === "equal" ? "均分" : "按人数";
}

function formatSplitFamilyIdsForExport(expense) {
  const splitMode = normalizeSplitMode(expense.splitMode);
  if (splitMode === "custom") {
    return state.families
      .filter((family) => amountToCents(expense.splitAmounts?.[family.id]) > 0)
      .map((family) => family.name)
      .join(" / ");
  }
  if (getSplitScopeFromMode(splitMode) === "all") return state.families.map((family) => family.name).join(" / ");
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

  const previousLedgerId = appState.activeLedgerId;
  const ledger = createEmptyLedger("云账本");
  ledger.cloudShareToken = shareToken;
  appState.ledgers.push(ledger);
  switchLedger(ledger.id, { announce: false });
  pullCloudLedger({ announce: true }).then((ok) => {
    if (!ok) {
      /* 拉取失败（链接失效/网络断）：回滚已 push 的空账本，切回之前的账本。
         否则账本管理里会残留名叫"云账本"的空条目，且失效 token 会被生命周期反复重试拉取。 */
      const idx = appState.ledgers.findIndex((item) => item.id === ledger.id);
      if (idx >= 0) appState.ledgers.splice(idx, 1);
      const prev = appState.ledgers.find((item) => item.id === previousLedgerId);
      if (prev) {
        state = prev;
        appState.activeLedgerId = prev.id;
        cloudState.shareToken = prev.cloudShareToken || "";
        updateLedgerUrl();
        render();
      }
      saveState();
      return;
    }
    checkOperatorFamilyPrompt();
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

function openDismissiblePanel({ view, bodyClass, closeButton, fallbackFocus, renderPanel, getCloseTimer, setCloseTimer, setReturnFocus, returnFocus = null }) {
  setReturnFocus(returnFocus || (document.activeElement instanceof HTMLElement ? document.activeElement : fallbackFocus));
  window.clearTimeout(getCloseTimer());
  view.hidden = false;
  view.classList.remove("is-closing");
  document.body.classList.add(bodyClass);
  renderPanel?.();
  closeButton.focus();
}

function hideDismissiblePanelImmediately({ view, bodyClass, getCloseTimer, setCloseTimer, setReturnFocus }) {
  window.clearTimeout(getCloseTimer());
  view.hidden = true;
  view.classList.remove("is-closing");
  document.body.classList.remove(bodyClass);
  setReturnFocus(null);
}

function closeDismissiblePanel({ view, bodyClass, fallbackFocus, getCloseTimer, setCloseTimer, getReturnFocus, setReturnFocus, restoreReturnFocus = true, afterClose = null }) {
  if (view.hidden || view.classList.contains("is-closing")) return;

  view.classList.add("is-closing");
  const delay = prefersReducedMotion() ? 0 : getCssDurationMs("--motion", 534) + 60;

  window.clearTimeout(getCloseTimer());
  setCloseTimer(window.setTimeout(() => {
    view.hidden = true;
    view.classList.remove("is-closing");
    document.body.classList.remove(bodyClass);
    if (restoreReturnFocus) restoreFocus(getReturnFocus() || fallbackFocus);
    setReturnFocus(null);
    afterClose?.();
  }, delay));
}

function applySettingsMode(mode = "settings") {
  settingsMode = mode === "settlement" ? "settlement" : "settings";
  elements.settingsView.dataset.mode = settingsMode;
  const settlementMode = settingsMode === "settlement";
  elements.settingsEyebrow.textContent = settlementMode ? "旅程收尾" : "偏好与数据";
  elements.settingsTitle.textContent = settlementMode ? "平账建议" : "设置";
  elements.closeSettingsButton.setAttribute("aria-label", settlementMode ? "关闭平账建议" : "关闭设置");
  elements.settingsBackdrop.setAttribute("aria-label", settlementMode ? "关闭平账建议" : "关闭设置");
}

function clearSettlementReveal({ settle = false } = {}) {
  window.clearTimeout(settlementRevealTimer);
  settlementRevealTimer = 0;
  cancelSettlementAmountReveal();
  elements.settingsView.classList.remove("is-settlement-revealing");
  elements.settingsView.classList.toggle("is-settlement-revealed", settle && settingsMode === "settlement");
}

function cancelSettlementAmountReveal() {
  window.clearTimeout(settlementAmountRevealTimer);
  settlementAmountRevealTimer = 0;
  if (settlementAmountRevealFrameId) {
    window.cancelAnimationFrame(settlementAmountRevealFrameId);
    settlementAmountRevealFrameId = 0;
  }
  elements.settingsView
    .querySelectorAll("[data-settlement-amount]")
    .forEach((node) => {
      node.textContent = node.dataset.settlementAmount || "";
    });
}

function startSettlementAmountReveal() {
  const amountNodes = [...elements.settingsView.querySelectorAll("[data-settlement-amount]")];
  if (!amountNodes.length) return;

  const glyphs = "0123456789#%*&@";
  const duration = 900;
  const sequenceStart = 1410;
  const characterStagger = 56;
  const growEvery = 72;

  amountNodes.forEach((node, index) => {
    node.textContent = glyphs[(index * 5 + 2) % glyphs.length];
  });

  settlementAmountRevealTimer = window.setTimeout(() => {
    settlementAmountRevealTimer = 0;
    const startedAt = window.performance.now();
    let scrambleFrameCount = 0;

    const renderFrame = (now) => {
      let allSettled = true;
      scrambleFrameCount += 1;

      amountNodes.forEach((node, itemIndex) => {
        const targetText = node.dataset.settlementAmount || "";
        const targetChars = [...targetText];
        const elapsed = now - startedAt - itemIndex * MOTION_DELAYS.settlementStagger;

        if (elapsed < 0) {
          allSettled = false;
          return;
        }
        if (elapsed >= duration) {
          node.textContent = targetText;
          return;
        }

        allSettled = false;
        if (scrambleFrameCount % 2 !== 0) return;

        const holdWindow = Math.max(240, duration - characterStagger * Math.max(targetChars.length - 1, 0));
        const visibleLength = Math.min(targetChars.length, Math.max(1, Math.floor(elapsed / growEvery) + 1));
        node.textContent = targetChars
          .slice(0, visibleLength)
          .map((char, charIndex) => {
            if (char === "," || char === ".") return char;
            const progress = Math.min(1, Math.max(0, (elapsed - charIndex * characterStagger) / holdWindow));
            if (progress >= 1) return char;
            /* 比总支出更早进入减速区，并把末段切换间隔拉长，收尾数字更从容。 */
            const slowdownProgress = Math.max(0, (progress - 0.38) / 0.62);
            const slowedProgress = easeOutCubic(slowdownProgress);
            const glyphInterval = 22 + slowedProgress * 210;
            const glyphIndex = Math.floor((elapsed / glyphInterval + charIndex * 5 + itemIndex * 3) % glyphs.length);
            return glyphs[glyphIndex];
          })
          .join("");
      });

      if (!allSettled) {
        settlementAmountRevealFrameId = window.requestAnimationFrame(renderFrame);
        return;
      }
      settlementAmountRevealFrameId = 0;
    };

    settlementAmountRevealFrameId = window.requestAnimationFrame(renderFrame);
  }, sequenceStart);
}

function startSettlementReveal() {
  clearSettlementReveal();
  if (settingsMode !== "settlement" || prefersReducedMotion()) {
    elements.settingsView.classList.toggle("is-settlement-revealed", settingsMode === "settlement");
    return;
  }

  // 强制从干净的初始帧重新开始，使每次展开都有完整且一致的揭幕节奏。
  void elements.settingsView.offsetWidth;
  elements.settingsView.classList.add("is-settlement-revealing");
  startSettlementAmountReveal();
  /* 同时等待最后一条渐变线绘制和最后一笔金额落定，避免收尾截帧。 */
  const flowLinks = elements.settingsView.querySelectorAll(".settlement-flow-map .flow-link");
  const lastFlowDelay = Math.max(0, (flowLinks.length - 1) * 105);
  const settlementItems = elements.settingsView.querySelectorAll(".settlement-item");
  const lastSettlementDelay = Math.max(0, (settlementItems.length - 1) * MOTION_DELAYS.settlementStagger);
  const flowSequenceEnd = flowLinks.length ? 470 + lastFlowDelay + 1680 : 0;
  const cardSequenceEnd = settlementItems.length ? 1410 + lastSettlementDelay + 900 : 1220;
  const revealDuration = Math.max(1600, flowSequenceEnd, cardSequenceEnd) + 60;
  settlementRevealTimer = window.setTimeout(() => {
    settlementRevealTimer = 0;
    elements.settingsView.classList.remove("is-settlement-revealing");
    elements.settingsView.classList.add("is-settlement-revealed");
  }, revealDuration);
}

function openSettings(options = {}) {
  if (!elements.ledgerManagementView.hidden) {
    hideDismissiblePanelImmediately({
      view: elements.ledgerManagementView,
      bodyClass: "ledger-management-open",
      getCloseTimer: () => ledgerManagementCloseTimer,
      setCloseTimer: (timer) => {
        ledgerManagementCloseTimer = timer;
      },
      setReturnFocus: (element) => {
        ledgerManagementReturnFocus = element;
      },
    });
  }
  applySettingsMode(options.mode);
  clearSettlementEntryReminder();
  clearSettlementReveal();
  if (settingsMode === "settings") {
    const collapseSecondaryGroups = window.matchMedia("(max-width: 820px)").matches;
    elements.settingsView.querySelectorAll(".settings-mobile-group").forEach((details) => {
      details.open = !collapseSecondaryGroups;
    });
  }
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
    returnFocus: options.returnFocus || null,
  });
  if (elements.settingsDrawer) elements.settingsDrawer.scrollTop = 0;
  startSettlementReveal();
}

/* 数据页的平账入口：复用设置抽屉的框架，但只展示平账任务内容。 */
function openSettlementInSettings() {
  openSettings({ mode: "settlement" });
}

function closeSettings({ restoreFocus = true } = {}) {
  clearSettlementReveal({ settle: true });
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
    restoreReturnFocus: restoreFocus,
  });
  settlementEntryReminderResumeTimer = window.setTimeout(() => {
    settlementEntryReminderResumeTimer = 0;
    scheduleSettlementEntryReminder();
  }, prefersReducedMotion() ? 0 : getCssDurationMs("--motion", 534) + 80);
}

function openLedgerManager() {
  const settingsWasVisible = !elements.settingsView.hidden && !elements.settingsView.classList.contains("is-closing");
  ledgerManagementReturnToSettings = settingsWasVisible;
  if (settingsWasVisible) {
    settingsReturnScrollTop = elements.settingsDrawer?.scrollTop || 0;
    clearSettlementReveal({ settle: true });
    hideDismissiblePanelImmediately({
      view: elements.settingsView,
      bodyClass: "settings-open",
      getCloseTimer: () => settingsCloseTimer,
      setCloseTimer: (timer) => {
        settingsCloseTimer = timer;
      },
      setReturnFocus: (element) => {
        settingsReturnFocus = element;
      },
    });
  }
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
  const returnToSettings = ledgerManagementReturnToSettings;
  ledgerManagementReturnToSettings = false;
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
    restoreReturnFocus: !returnToSettings,
    afterClose: returnToSettings
      ? () => {
        openSettings({
          mode: "settings",
          returnFocus: elements.openLedgerManagerButton,
        });
        window.requestAnimationFrame(() => {
          if (elements.settingsDrawer) elements.settingsDrawer.scrollTop = settingsReturnScrollTop;
        });
      }
      : null,
  });
}

function showConfirmDialog({ eyebrow = "确认操作", title, message, confirmLabel = "确认", danger = false }) {
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

function checkOperatorFamilyPrompt() {
  if (!isCloudLedgerActive()) return;
  if (!getOperatorFamilyId()) {
    /* 欢迎引导打开中：身份页负责完成选择，避免两层浮层叠加 */
    if (isWelcomeOpen()) {
      welcomePendingFamilyPrompt = true;
      return;
    }
    showOperatorModal();
  }
}

function showOperatorModal() {
  if (!elements.operatorModalView) return;
  operatorModalReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  elements.operatorModalView.hidden = false;
  document.body.classList.add("confirm-open");
  renderOperatorFamilyChoices(elements.operatorModalFamilyList);
  elements.operatorModalFamilyList.querySelector("button")?.focus();
}

function closeOperatorModal() {
  const view = elements.operatorModalView;
  if (!view || view.hidden || view.classList.contains("is-closing")) return;
  document.body.classList.remove("confirm-open");
  const restoreOperatorFocus = () => {
    restoreFocus(operatorModalReturnFocus);
    operatorModalReturnFocus = null;
  };
  if (prefersReducedMotion()) {
    view.hidden = true;
    restoreOperatorFocus();
    return;
  }
  view.classList.add("is-closing");
  window.setTimeout(() => {
    view.classList.remove("is-closing");
    view.hidden = true;
    restoreOperatorFocus();
  }, getCssDurationMs("--motion-fast", 401) + 60);
}

function handleOperatorModalSubmit(event) {
  event.preventDefault();
  const familyId = getSelectedOperatorFamilyId(elements.operatorModalFamilyList);
  if (!familyId) {
    showToast({ message: COPY.identity.missing });
    elements.operatorModalFamilyList.querySelector("button")?.focus();
    return;
  }

  localStorage.setItem(OPERATOR_FAMILY_STORAGE_KEY, familyId);
  renderOperatorFamilyChoices(elements.settingsOperatorFamilyList, familyId);
  renderOperatorFamilyChoices(elements.welcomeIdentityFamilyList, familyId);
  closeOperatorModal();
  showToast({ message: COPY.identity.remembered(getFamilyName(familyId)) });
}

function handleSettingsOperatorSubmit(event) {
  event.preventDefault();
  const familyId = getSelectedOperatorFamilyId(elements.settingsOperatorFamilyList);
  if (!familyId) {
    showToast({ message: COPY.identity.missing });
    return;
  }

  localStorage.setItem(OPERATOR_FAMILY_STORAGE_KEY, familyId);
  renderOperatorFamilyChoices(elements.welcomeIdentityFamilyList, familyId);
  showToast({ message: COPY.identity.saved(getFamilyName(familyId)) });
}

/* ── 欢迎引导浮层 ──
   首次打开自动弹出（localStorage 标记），设置里的「使用指南」可随时重看。
   通过邀请链接进来的人首屏改为“你已加入共享账本”，不重复推销云账本。 */
const WELCOME_SEEN_KEY = "travel-ledger-welcome-seen";
let welcomeSlideIndex = 0;
let welcomePendingFamilyPrompt = false;
let welcomeCloseTimer = 0;
let welcomeReturnFocus = null;
let operatorModalReturnFocus = null;
let welcomeScrollAnimation = 0;
let welcomeEnterTimer = null;
let welcomeEnterRevealed = false;

function isWelcomeOpen() {
  return Boolean(elements.welcomeView && !elements.welcomeView.hidden);
}

function welcomeRequiresFamily() {
  return isCloudLedgerActive() || Boolean(getLedgerTokenFromLocation());
}

function maybeShowWelcome() {
  let seen = false;
  try {
    seen = localStorage.getItem(WELCOME_SEEN_KEY) === "1";
  } catch (error) {}
  if (seen) return;
  openWelcome({ invitedArrival: Boolean(getLedgerTokenFromLocation()) });
}

function openWelcome({ invitedArrival = false } = {}) {
  const view = elements.welcomeView;
  if (!view) return;
  window.clearTimeout(welcomeCloseTimer);
  view.classList.remove("is-closing");
  welcomeReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  /* 末屏终端 CTA 的 2 秒淡入门控：每次打开欢迎页都重新计时 */
  window.clearTimeout(welcomeEnterTimer);
  welcomeEnterTimer = null;
  welcomeEnterRevealed = false;
  elements.welcomeNextButton.classList.remove("pending-reveal", "is-revealed");

  if (invitedArrival) {
    applyShareSourceHero();
  } else {
    elements.welcomeHeroEyebrow.textContent = "欢迎使用";
    elements.welcomeTitle.textContent = COPY.welcome.title;
    elements.welcomeHeroCopy.textContent = COPY.welcome.intro;
    if (elements.welcomeSourceBadge) elements.welcomeSourceBadge.hidden = true;
  }
  const cloudActive = invitedArrival || isCloudLedgerActive();
  elements.welcomeCloudTitle.textContent = cloudActive ? "三家实时同步" : COPY.welcome.cloudTitle;
  elements.welcomeCloudCopy.textContent = cloudActive
    ? "账单实时同步，编辑保留家庭记录。"
    : COPY.welcome.cloudCopy;
  renderOperatorFamilyChoices(elements.welcomeIdentityFamilyList);
  elements.welcomeIdentityHint.textContent = cloudActive
    ? COPY.welcome.identityCopy
    : "本地账本可稍后再选；云账本需要选择家庭。";

  view.hidden = false;
  document.body.classList.add("confirm-open");
  renderWelcomeDots();
  setWelcomeSlide(0, { instant: true });
  elements.welcomeNextButton.focus();
}

function closeWelcome({ goToEntry = false } = {}) {
  const view = elements.welcomeView;
  if (!view || view.hidden || view.classList.contains("is-closing")) return;
  window.clearTimeout(welcomeEnterTimer);
  welcomeEnterTimer = null;
  welcomeEnterRevealed = false;
  elements.welcomeNextButton.classList.remove("pending-reveal", "is-revealed");
  if (welcomeRequiresFamily() && !getOperatorFamilyId()) {
    setWelcomeSlide(getWelcomeSlides().length - 1);
    showToast({ message: "请选择你的家庭，就可以一起记账了" });
    return;
  }
  try {
    localStorage.setItem(WELCOME_SEEN_KEY, "1");
  } catch (error) {}
  document.body.classList.remove("confirm-open");

  const finish = () => {
    view.classList.remove("is-closing");
    view.hidden = true;
  };
  if (prefersReducedMotion()) {
    finish();
  } else {
    view.classList.add("is-closing");
    welcomeCloseTimer = window.setTimeout(finish, getCssDurationMs("--motion-fast", 401) + 60);
  }

  /* 身份已在引导末页完成；清掉启动阶段留下的补选标记。 */
  welcomePendingFamilyPrompt = false;
  restoreFocus(welcomeReturnFocus);
  welcomeReturnFocus = null;
  if (goToEntry) {
    setMobilePanel("entry", { animate: true, scroll: true });
  }
}

function getWelcomeSlides() {
  return [...elements.welcomeTrack.querySelectorAll(".welcome-slide")];
}

function setWelcomeSlide(index, { instant = false } = {}) {
  const slides = getWelcomeSlides();
  welcomeSlideIndex = Math.max(0, Math.min(slides.length - 1, index));
  const target = welcomeSlideIndex * elements.welcomeTrack.clientWidth;
  if (instant || prefersReducedMotion()) {
    cancelWelcomeScrollAnimation();
    elements.welcomeTrack.scrollLeft = target;
  } else {
    animateWelcomeScroll(target);
  }
  syncWelcomeControls();
}

/* 原生 smooth scrollTo 在浮层内会被浏览器中途取消（卡在两页之间），
   改用 rAF 自绘缓出动画；期间加 is-animating 关闭 scroll-snap 防逐帧吸附 */
function animateWelcomeScroll(targetLeft) {
  const track = elements.welcomeTrack;
  cancelWelcomeScrollAnimation();
  const startLeft = track.scrollLeft;
  const distance = targetLeft - startLeft;
  if (Math.abs(distance) < 1) {
    track.scrollLeft = targetLeft;
    return;
  }
  const duration = getCssDurationMs("--motion", 534);
  const startTime = performance.now();
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  track.classList.add("is-animating");
  const stepFrame = (now) => {
    const progress = Math.min(1, (now - startTime) / duration);
    track.scrollLeft = startLeft + distance * easeOut(progress);
    if (progress < 1) {
      welcomeScrollAnimation = window.requestAnimationFrame(stepFrame);
    } else {
      welcomeScrollAnimation = 0;
      track.classList.remove("is-animating");
    }
  };
  welcomeScrollAnimation = window.requestAnimationFrame(stepFrame);
}

function cancelWelcomeScrollAnimation() {
  window.cancelAnimationFrame(welcomeScrollAnimation);
  welcomeScrollAnimation = 0;
  elements.welcomeTrack.classList.remove("is-animating");
}

function syncWelcomeControls() {
  const isLast = welcomeSlideIndex === getWelcomeSlides().length - 1;
  const selectedFamilyId = getSelectedOperatorFamilyId(elements.welcomeIdentityFamilyList) || getOperatorFamilyId();
  const identityMissing = isLast && welcomeRequiresFamily() && !selectedFamilyId;
  const revealPending = isLast && !welcomeEnterRevealed;
  elements.welcomeNextLabel.textContent = isLast ? "立即查看" : "继续";
  elements.welcomeSkipButton.hidden = isLast;
  elements.welcomeNextButton.disabled = identityMissing;
  elements.welcomeNextButton.setAttribute("aria-disabled", String(identityMissing || revealPending));
  /* 末屏终端 CTA：进入末屏后 2 秒才淡入，期间不可点击，避免一进来就误点跳过认家。
     离开末屏则复位，下次回到末屏重新计时。 */
  if (isLast) {
    if (!welcomeEnterRevealed) {
      elements.welcomeNextButton.classList.add("pending-reveal");
      elements.welcomeNextButton.classList.remove("is-revealed");
      if (!welcomeEnterTimer) {
        welcomeEnterTimer = window.setTimeout(function () {
          welcomeEnterTimer = null;
          welcomeEnterRevealed = true;
          elements.welcomeNextButton.classList.remove("pending-reveal");
          elements.welcomeNextButton.classList.add("is-revealed");
          syncWelcomeControls();
        }, 2000);
      }
    }
  } else {
    if (welcomeEnterTimer) { window.clearTimeout(welcomeEnterTimer); welcomeEnterTimer = null; }
    welcomeEnterRevealed = false;
    elements.welcomeNextButton.classList.remove("pending-reveal", "is-revealed");
  }
  /* 只切 class 不重建节点：滚动中重写 innerHTML 会打断平滑滚动动画 */
  [...elements.welcomeDots.children].forEach((dot, index) => {
    dot.classList.toggle("is-active", index === welcomeSlideIndex);
    dot.setAttribute("aria-selected", String(index === welcomeSlideIndex));
  });
}

function renderWelcomeDots() {
  const total = getWelcomeSlides().length;
  elements.welcomeDots.innerHTML = Array.from(
    { length: total },
    (_, index) => `<button class="welcome-dot" type="button" role="tab" aria-selected="false" aria-label="第 ${index + 1} 步，共 ${total} 步" data-welcome-dot="${index}"></button>`,
  ).join("");
}

function handleWelcomeTrackScroll() {
  const width = elements.welcomeTrack.clientWidth;
  if (!width) return;
  const index = Math.round(elements.welcomeTrack.scrollLeft / width);
  if (index !== welcomeSlideIndex) {
    welcomeSlideIndex = Math.max(0, Math.min(getWelcomeSlides().length - 1, index));
    syncWelcomeControls();
  }
}

function handleWelcomeNext() {
  if (welcomeSlideIndex >= getWelcomeSlides().length - 1 && !welcomeEnterRevealed) return;
  if (welcomeSlideIndex >= getWelcomeSlides().length - 1) {
    const familyId = getSelectedOperatorFamilyId(elements.welcomeIdentityFamilyList);
    if (familyId) {
      localStorage.setItem(OPERATOR_FAMILY_STORAGE_KEY, familyId);
      renderOperatorFamilyChoices(elements.settingsOperatorFamilyList, familyId);
    }
    if (welcomeRequiresFamily() && !getOperatorFamilyId()) {
      showToast({ message: COPY.identity.missing });
      return;
    }
    closeWelcome({ goToEntry: true });
    return;
  }
  setWelcomeSlide(welcomeSlideIndex + 1);
}

function handleWelcomeSkip() {
  if (welcomeRequiresFamily() && !getOperatorFamilyId()) {
    setWelcomeSlide(getWelcomeSlides().length - 1);
    return;
  }
  closeWelcome();
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
  freezeNaturalEntryFamilyTint();
  state.selectedPayerId = nextPayerId;
  pendingNaturalEntryFamilyTintId = nextPayerId;
  elements.payerError.textContent = "";
  applySelectedFamilyTheme();
  renderFamilyRoster();
  applyChoiceStateClass("[data-payer-id]", "data-payer-id", payerSwitched ? nextPayerId : "", "is-activating");
  applyChoiceStateClass("[data-payer-id]", "data-payer-id", payerSwitched ? previousPayerId : "", "is-deactivating");
  applySubmitButtonTheme();
  renderNaturalEntry();
  renderMobileSubmitBar();
  updateAmountMotionState();
  saveState();
  if (naturalEntryStageOpen && activeEntryEditor === "payer") {
    window.setTimeout(() => closeNaturalEntryStage({ restoreFocus: true }), getNaturalEntryChoiceCloseDelay());
  } else {
    applyNaturalEntryFamilyTint(nextPayerId, { animate: isNaturalEntryLayout() });
  }
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
  [elements.expenseForm, elements.mobileSubmitBar].forEach((element) => {
    element.style.setProperty("--submit-color", color);
    element.style.setProperty("--submit-text", text);
    element.style.setProperty("--submit-wash", wash);
    element.style.setProperty("--submit-glow", glow);
  });
  elements.expenseForm.classList.toggle("submit-themed", Boolean(state.selectedPayerId));
  elements.mobileSubmitBar.classList.toggle("submit-themed", Boolean(state.selectedPayerId));
}

function getCssDurationMs(variableName, fallback, seen = new Set()) {
  if (seen.has(variableName)) return fallback;
  seen.add(variableName);
  const raw = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  const alias = raw.match(/^var\(\s*(--[\w-]+)(?:\s*,\s*[^)]+)?\s*\)$/);
  if (alias) return getCssDurationMs(alias[1], fallback, seen);
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
  const duration = resolveMotionDuration({
    distancePx: Math.abs(endHeight - startHeight),
    role: "structure",
    direction: endHeight >= startHeight ? "enter" : "exit",
  });
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

let amountInputWasActive = false;
function updateAmountMotionState() {
  const isActive = document.activeElement === elements.amountInput;
  elements.amountLabel.classList.toggle("amount-active", isActive);
  if (isActive) lockAmountLabelScroll();
  /* 回中光晕只在“获得焦点”那一刻触发一次，不要每敲一个字符都重启
     那个 16px 模糊层的 transform 动画——那是数字卡顿的主因。 */
  if (isActive && !amountInputWasActive) pulseAmountField();
  amountInputWasActive = isActive;
}

function getAmountMeasureContext() {
  if (amountMeasureContext) return amountMeasureContext;
  amountMeasureContext = document.createElement("canvas").getContext("2d");
  return amountMeasureContext;
}

const AMOUNT_INPUT_CARET_RESERVE = 26;

function measureAmountInputWidth(input) {
  const context = getAmountMeasureContext();
  const style = getComputedStyle(input);
  const value = input.value || input.placeholder || "0.00";
  const font = style.font && style.font !== "" ? style.font : `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  context.font = font;
  const letterSpacing = Number.parseFloat(style.letterSpacing) || 0;
  /* Safari 原生 input 的字形绘制比 canvas 测量略宽，窄屏下需要留出
     光标与最后一位小数的安全余量，避免视觉上被输入边缘吃掉。 */
  const measured = context.measureText(value).width + Math.max(0, value.length - 1) * letterSpacing + AMOUNT_INPUT_CARET_RESERVE;
  const shell = input.closest(".amount-field, .split-amount-input-shell");
  const track = input.closest(".amount-value-track");
  const currency = track?.querySelector(".currency-mark") || shell?.querySelector(".currency-mark");
  const trackStyle = getComputedStyle(track || input);
  const shellStyle = shell ? getComputedStyle(shell) : null;
  const currencyIsInsideTrack = currency?.parentElement === track;
  const gapStyle = currencyIsInsideTrack ? trackStyle : shellStyle || trackStyle;
  const gap = Number.parseFloat(gapStyle.columnGap || gapStyle.gap) || 0;
  const trackWidth = track?.clientWidth || shell?.clientWidth || input.parentElement?.clientWidth || measured;
  const reserved = (currency?.getBoundingClientRect().width || 0) + gap;
  /* Keep the native input inside the track. Long values then use the input's
     own horizontal scroll and the caret remains visible, instead of extending
     beyond the track and being clipped by a WebKit compositing layer. */
  const shellContentWidth = shell
    ? shell.clientWidth
      - (Number.parseFloat(shellStyle?.paddingLeft) || 0)
      - (Number.parseFloat(shellStyle?.paddingRight) || 0)
    : trackWidth;
  const available = currency
    ? Math.max(24, shellContentWidth - 24 - reserved)
    : Math.max(24, shellContentWidth);
  return Math.max(12, Math.min(Math.ceil(measured), available));
}

function revealAmountInputCaret(input) {
  if (!input || document.activeElement !== input) return;
  window.requestAnimationFrame(() => {
    if (document.activeElement !== input) return;
    const end = input.selectionEnd ?? input.value.length;
    if (end >= input.value.length) input.scrollLeft = input.scrollWidth;
  });
}

function syncAmountValueTrack(input) {
  const track = input?.closest(".amount-value-track");
  if (!track) return;
  amountTrackAnimations.get(track)?.cancel();
  amountTrackAnimations.delete(track);
  track.style.setProperty("--amount-input-caret-reserve", `${AMOUNT_INPUT_CARET_RESERVE}px`);
  input.style.width = `${measureAmountInputWidth(input)}px`;
  input.style.textOverflow = "clip";
  revealAmountInputCaret(input);
}

function animateAmountValueTrack(input, { compact = false, soft = false } = {}) {
  const track = input?.closest(".amount-value-track");
  if (!track) return;

  /* 一旦输入值“包含”小数点（含小数点本身及之后的每一位小数），输入框宽度
     会逐字扩张。WebKit 把“输入绘制区扩张”与“合成层平移”拆成两帧，整组回中
     FLIP 会让模糊外壳/旧图块在右侧先露出一条灰条再回弹——这正是“输入含
     小数点时右侧灰条 + 文字卡顿”的根因。因此小数场景直接提交最终几何、
     跳过整组回中动画；整数位仍保留轻盈的回中 FLIP。 */
  if (/[.,，]/.test(String(input.value || "").trim())) {
    amountTrackAnimations.get(track)?.cancel();
    track.style.willChange = "";
    syncAmountValueTrack(input);
    return;
  }

  const visibleRect = track.getBoundingClientRect();
  amountTrackAnimations.get(track)?.cancel();
  input.style.width = `${measureAmountInputWidth(input)}px`;
  const finalRect = track.getBoundingClientRect();
  const deltaX = visibleRect.left - finalRect.left;

  if (prefersReducedMotion() || Math.abs(deltaX) < 0.25 || typeof track.animate !== "function") return;

  /* 把轨道提升为独立合成层，平移期间整块一起移动，避免 WebKit 在右侧露出
     静止的背景/玻璃外壳旧图块（灰条）。动画结束或被新动画取消时即收回，
     不长期占用合成层。 */
  track.style.willChange = "transform";
  const duration = soft
    ? Math.min(230, resolveMotionDuration({ distancePx: Math.abs(deltaX), role: "text" }))
    : resolveMotionDuration({ distancePx: Math.abs(deltaX), role: compact ? "control" : "text" });
  const animation = track.animate(
    [
      { transform: `translate3d(${deltaX}px, 0, 0)` },
      { transform: "translate3d(0, 0, 0)" },
    ],
    {
      duration,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    },
  );
  amountTrackAnimations.set(track, animation);
  const clearTrackLayer = () => {
    if (amountTrackAnimations.get(track) === animation) {
      amountTrackAnimations.delete(track);
      track.style.willChange = "";
    }
  };
  animation.addEventListener("finish", clearTrackLayer, { once: true });
  animation.addEventListener("cancel", clearTrackLayer, { once: true });
}

function splitTextGraphemes(value) {
  const text = String(value ?? "");
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    try {
      const segmenter = new Intl.Segmenter("zh-Hans", { granularity: "grapheme" });
      return [...segmenter.segment(text)].map((part) => part.segment);
    } catch (_) {
      /* Older WebKit builds may expose Segmenter but reject the locale/options. */
    }
  }
  return Array.from(text);
}

function cancelSplitSummaryText(element, finalText = null) {
  if (!element) return;
  const state = splitTextMorphAnimations.get(element);
  const textElement = element.querySelector?.(".natural-entry-token-label") || element;
  if (state) {
    state.cancel(finalText == null ? state.target : String(finalText));
    return;
  }
  if (finalText != null) textElement.textContent = String(finalText);
}

function animateSplitSummaryText(
  element,
  nextText,
  {
    textElement = null,
    animate = true,
    ariaElement = null,
    ariaLabel = null,
  } = {},
) {
  if (!element) return;
  const targetElement = textElement || element.querySelector?.(".natural-entry-token-label") || element;
  const next = String(nextText ?? "");
  const previous = splitTextMorphAnimations.get(element);
  if (previous?.target === next) {
    if (ariaElement) ariaElement.setAttribute("aria-label", ariaLabel || next);
    else if (element.matches?.("button")) element.setAttribute("aria-label", next);
    return;
  }

  const previousTarget = previous?.target || null;
  previous?.cancel();
  const current = previousTarget == null ? targetElement.textContent : previousTarget;
  const setAccessibleName = () => {
    if (ariaElement) ariaElement.setAttribute("aria-label", ariaLabel || next);
    else if (element.matches?.("button")) element.setAttribute("aria-label", next);
  };

  if (current === next) {
    targetElement.textContent = next;
    setAccessibleName();
    return;
  }

  if (!animate || prefersReducedMotion() || typeof targetElement.animate !== "function") {
    targetElement.textContent = next;
    setAccessibleName();
    return;
  }

  const currentChars = splitTextGraphemes(current);
  const nextChars = splitTextGraphemes(next);
  let prefixLength = 0;
  while (
    prefixLength < currentChars.length
    && prefixLength < nextChars.length
    && currentChars[prefixLength] === nextChars[prefixLength]
  ) {
    prefixLength += 1;
  }

  let suffixLength = 0;
  while (
    suffixLength < currentChars.length - prefixLength
    && suffixLength < nextChars.length - prefixLength
    && currentChars[currentChars.length - 1 - suffixLength]
      === nextChars[nextChars.length - 1 - suffixLength]
  ) {
    suffixLength += 1;
  }

  const prefix = currentChars.slice(0, prefixLength).join("");
  const oldMiddle = currentChars.slice(prefixLength, currentChars.length - suffixLength).join("");
  const newMiddle = nextChars.slice(prefixLength, nextChars.length - suffixLength).join("");
  const suffix = currentChars.slice(currentChars.length - suffixLength).join("");

  const visual = document.createElement("span");
  visual.className = "split-text-morph";
  visual.setAttribute("aria-hidden", "true");

  const prefixNode = document.createElement("span");
  prefixNode.className = "split-text-morph-fixed";
  prefixNode.textContent = prefix;

  const slot = document.createElement("span");
  slot.className = "split-text-morph-slot";

  const oldLayer = document.createElement("span");
  oldLayer.className = "split-text-morph-layer split-text-morph-old";
  oldLayer.textContent = oldMiddle;

  const newLayer = document.createElement("span");
  newLayer.className = "split-text-morph-layer split-text-morph-new";
  newLayer.textContent = newMiddle;

  const suffixNode = document.createElement("span");
  suffixNode.className = "split-text-morph-fixed";
  suffixNode.textContent = suffix;

  slot.append(oldLayer, newLayer);
  visual.append(prefixNode, slot, suffixNode);
  targetElement.replaceChildren(visual);

  /* Absolute layers do not contribute to intrinsic width. Measure both glyph
     runs while they are in normal flow, then reserve the old slot width before
     the browser paints the first morph frame. */
  oldLayer.style.position = "static";
  newLayer.style.position = "static";
  const oldWidth = oldLayer.getBoundingClientRect().width;
  const newWidth = newLayer.getBoundingClientRect().width;
  oldLayer.style.position = "absolute";
  newLayer.style.position = "absolute";
  slot.style.width = `${Math.max(0, oldWidth)}px`;

  const duration = 220;
  const enterDelay = 40;
  const oldExitDuration = 90;
  const enterDuration = 180;
  const easing = "cubic-bezier(0.16, 1, 0.3, 1)";
  const widthAnimation = slot.animate(
    [
      { width: `${Math.max(0, oldWidth)}px` },
      { width: `${Math.max(0, newWidth)}px` },
    ],
    { duration, easing, fill: "forwards" },
  );
  const oldAnimation = oldLayer.animate(
    [
      { opacity: 1, transform: "translate3d(0, 0, 0)", filter: "blur(0px)" },
      { opacity: 0, transform: "translate3d(0, -3px, 0)", filter: "blur(1.2px)" },
    ],
    { duration: oldExitDuration, easing, fill: "both" },
  );
  const newAnimation = newLayer.animate(
    [
      { opacity: 0, transform: "translate3d(0, 4px, 0)", filter: "blur(1.2px)" },
      { opacity: 1, transform: "translate3d(0, 0, 0)", filter: "blur(0px)" },
    ],
    { duration: enterDuration, delay: enterDelay, easing, fill: "both" },
  );

  let cleanupTimer = 0;
  let settled = false;
  const state = {
    target: next,
    cancelled: false,
    cancel(finalText = next) {
      if (settled) return;
      this.cancelled = true;
      window.clearTimeout(cleanupTimer);
      widthAnimation.cancel();
      oldAnimation.cancel();
      newAnimation.cancel();
      finish(String(finalText));
    },
  };
  splitTextMorphAnimations.set(element, state);
  targetElement.dataset.splitTextMorphValue = next;
  targetElement.classList.add("is-split-text-morphing");
  setAccessibleName();

  function finish(finalText) {
    if (settled) return;
    settled = true;
    window.clearTimeout(cleanupTimer);
    targetElement.replaceChildren();
    targetElement.textContent = finalText;
    targetElement.classList.remove("is-split-text-morphing");
    delete targetElement.dataset.splitTextMorphValue;
    if (splitTextMorphAnimations.get(element) === state) splitTextMorphAnimations.delete(element);
  }

  cleanupTimer = window.setTimeout(() => finish(next), duration + enterDelay + 50);
}

function animateNaturalEntryToken(element, nextText, { duration = 260, animate = true } = {}) {
  if (!element) return;
  const textElement = element.querySelector(".natural-entry-token-label") || element;
  const readText = () => textElement.textContent;
  const writeText = (text) => {
    textElement.textContent = text;
  };
  const next = String(nextText ?? "");
  const previous = naturalEntryTokenAnimations.get(element);
  if (!animate) {
    previous?.cancel();
    naturalEntryTokenAnimations.delete(element);
    if (readText() !== next) writeText(next);
    element.setAttribute("aria-label", next);
    return;
  }
  if (previous?.target === next) return;
  if (previous && !previous.cancelled && next.startsWith(previous.target)) {
    // 备注连续输入时延长当前的“输入”目标，不重启动画时间线，避免每个
    // 按键都把文字拉回删除阶段。
    previous.target = next;
    return;
  }
  const current = previous?.displayText ?? readText();
  previous?.cancel();
  if (current === next) return;

  if (prefersReducedMotion()) {
    writeText(next);
    element.setAttribute("aria-label", next);
    naturalEntryTokenAnimations.delete(element);
    return;
  }

  // 金额输入会先测量整组文字的新位置，再用 FLIP 让完整的“¥ + 数字”
  // 轻快地回到自然位置。文字 token 也沿用这段位移动画，同时保留删空/输入
  // 的内容时间线；这样宽度变化时会有灵动感，等宽文字也不会被硬拽。
  const visibleRect = element.getBoundingClientRect();
  const previousElementText = readText();
  writeText(next);
  const finalRect = element.getBoundingClientRect();
  writeText(current);
  const deltaX = visibleRect.left - finalRect.left;
  const requestedDuration = Number(duration) || 260;
  const motionDuration = Math.min(
    resolveMotionDuration({ distancePx: Math.abs(deltaX), role: "text" }),
    Math.max(180, requestedDuration),
  );
  const canUseTransformAnimation = !element.classList.contains("natural-entry-stage-token");
  const motionAnimation = canUseTransformAnimation
    && Math.abs(deltaX) >= 0.25
    && typeof element.animate === "function"
    ? element.animate(
        [
          { transform: `translate3d(${deltaX}px, 0, 0)` },
          { transform: "translate3d(0, 0, 0)" },
        ],
        {
          duration: motionDuration,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        },
      )
    : null;
  const previousTranslate = element.style.translate;
  const fallbackMotion = !motionAnimation
    && Math.abs(deltaX) >= 0.25
    && typeof CSS !== "undefined"
    && CSS.supports?.("translate", "1px")
    && !previousTranslate;
  if (fallbackMotion) element.style.translate = `${deltaX}px 0`;
  if (previousElementText !== current) writeText(current);
  const exitDuration = Math.min(120, Math.max(96, Math.round(motionDuration * 0.38)));
  const enterDuration = Math.max(150, motionDuration - exitDuration);
  const previousWillChange = element.style.willChange;
  if (motionAnimation || fallbackMotion) element.style.willChange = "transform, translate";
  const state = {
    target: next,
    displayText: current,
    frameId: 0,
    startedAt: window.performance.now(),
    exitDuration,
    enterDuration,
    motionAnimation,
    fallbackMotion,
    deltaX,
    motionDuration,
    previousTranslate,
    previousWillChange,
    cancelled: false,
    cancel() {
      this.cancelled = true;
      if (this.frameId) window.cancelAnimationFrame(this.frameId);
      this.frameId = 0;
      this.motionAnimation?.cancel();
      if (this.fallbackMotion) element.style.translate = this.previousTranslate;
      if (this.motionAnimation || this.fallbackMotion) element.style.willChange = this.previousWillChange;
    },
  };
  naturalEntryTokenAnimations.set(element, state);
  element.setAttribute("aria-label", next);

  const renderFrame = (now) => {
    if (state.cancelled || naturalEntryTokenAnimations.get(element) !== state) return;
    const elapsed = now - state.startedAt;
    if (state.fallbackMotion) {
      const progress = Math.min(1, Math.max(0, elapsed / state.motionDuration));
      const remainingX = state.deltaX * (1 - easeOutCubic(progress));
      element.style.translate = `${remainingX}px 0`;
    }
    const oldChars = Array.from(current);
    const nextChars = Array.from(state.target);
    let nextDisplayText = state.displayText;

    if (elapsed < state.exitDuration) {
      const progress = easeOutCubic(Math.max(0, elapsed / state.exitDuration));
      const visibleLength = Math.max(0, Math.ceil(oldChars.length * (1 - progress)));
      nextDisplayText = oldChars.slice(0, visibleLength).join("");
    } else {
      const progress = Math.min(1, Math.max(0, (elapsed - state.exitDuration) / state.enterDuration));
      const visibleLength = Math.min(nextChars.length, Math.floor(easeOutCubic(progress) * nextChars.length));
      nextDisplayText = nextChars.slice(0, visibleLength).join("");
    }
    if (nextDisplayText !== state.displayText) {
      state.displayText = nextDisplayText;
      writeText(nextDisplayText);
    }

    if (elapsed < state.exitDuration + state.enterDuration) {
      state.frameId = window.requestAnimationFrame(renderFrame);
      return;
    }
    writeText(state.target);
    state.displayText = state.target;
    state.frameId = 0;
    state.motionAnimation?.cancel();
    if (state.fallbackMotion) element.style.translate = state.previousTranslate;
    if (state.motionAnimation || state.fallbackMotion) element.style.willChange = state.previousWillChange;
    if (naturalEntryTokenAnimations.get(element) === state) naturalEntryTokenAnimations.delete(element);
  };

  state.frameId = window.requestAnimationFrame(renderFrame);
}

function syncAllAmountValueTracks() {
  syncAmountValueTrack(elements.amountInput);
  syncSplitAmountValueTracks();
}

/* 字体、旋转或浏览器地址栏变化会改变金额输入的字号；输入框的 inline
   width 不能沿用上一个视口的测量值，否则宽屏字形会被旧窄宽度截掉。只
   重测当前实际有几何的输入，避免隐藏的标准/自定分摊控件被写成 12px。 */
function syncVisibleAmountValueTracks() {
  const inputs = [
    elements.amountInput,
    ...elements.splitCustomAmounts.querySelectorAll("[data-split-amount]"),
  ];
  inputs.forEach((input) => {
    if (!input || !input.getClientRects().length) return;
    const style = getComputedStyle(input);
    if (style.display === "none" || style.visibility === "hidden") return;
    syncAmountValueTrack(input);
  });
}

let amountValueResizeFrame = 0;
function scheduleAmountValueTrackResize() {
  if (amountValueResizeFrame) return;
  amountValueResizeFrame = window.requestAnimationFrame(() => {
    amountValueResizeFrame = 0;
    syncVisibleAmountValueTracks();
  });
}

function syncSplitAmountValueTracks() {
  elements.splitCustomAmounts.querySelectorAll("[data-split-amount]").forEach(syncAmountValueTrack);
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

function normalizeAmountInputDisplayValue(input = elements.amountInput) {
  if (!input) return "";
  const amount = parseAmountInput(input.value);
  if (!Number.isFinite(amount) || amount <= 0) return input.value;
  const nextValue = (Math.round(amount * 100) / 100).toFixed(2).replace(/\.00$/, "");
  if (input.value !== nextValue) input.value = nextValue;
  return nextValue;
}

function normalizeAmountInputDecimalPoint(input) {
  if (!input) return "";
  const normalized = normalizeAmountDecimalSeparators(input.value);
  if (normalized === input.value) return normalized;
  const selectionStart = input.selectionStart;
  const selectionEnd = input.selectionEnd;
  input.value = normalized;
  if (document.activeElement === input && selectionStart !== null && selectionEnd !== null) {
    input.setSelectionRange(selectionStart, selectionEnd);
  }
  return normalized;
}

const NOTE_MAX_LINES = 3;

function syncNoteInputHeight(input = elements.noteInput) {
  if (!input || input.tagName !== "TEXTAREA") return;
  const style = getComputedStyle(input);
  const lineHeight = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) || 20;
  const padding = (Number.parseFloat(style.paddingTop) || 0)
    + (Number.parseFloat(style.paddingBottom) || 0);
  const borders = (Number.parseFloat(style.borderTopWidth) || 0)
    + (Number.parseFloat(style.borderBottomWidth) || 0);
  const minHeight = Number.parseFloat(style.minHeight) || lineHeight + padding + borders;
  const maxHeight = Math.max(minHeight, Math.ceil((lineHeight * NOTE_MAX_LINES) + padding + borders));
  input.style.height = "auto";
  const nextHeight = Math.min(maxHeight, Math.max(minHeight, input.scrollHeight));
  input.style.height = `${Math.ceil(nextHeight)}px`;
  input.style.overflowY = input.scrollHeight > maxHeight + 1 ? "auto" : "hidden";
  const stage = elements.naturalEntryStage;
  if (stage && naturalEntryStageOpen && activeEntryEditor === "note" && stage.classList.contains("is-relay-settled")) {
    /* 备注从单行长到三行后，稳定态不再依赖切换时的固定高度；否则
       WebKit 可能把上一次 editor morph 留下的 inline height 当成裁剪边界。 */
    clearNaturalEntryStageHeightTransition({ resetHeight: true });
  }
}

function formatAmountFieldOnBlur() {
  updateAmountMotionState();
  if (activeSplitMode === "custom") {
    const amount = parseAmountInput(elements.amountInput.value);
    customSplitTargetCents = Number.isFinite(amount) && amount > 0 ? amountToCents(amount) : null;
    syncCustomSplitTotalField();
    renderNaturalEntry();
    return;
  }

  normalizeAmountInputDisplayValue();
  syncAmountValueTrack(elements.amountInput);
  renderNaturalEntry();
}

function pulseAmountField() {
  elements.amountLabel.classList.remove("amount-recenter-glow");
  void elements.amountLabel.offsetWidth;
  elements.amountLabel.classList.add("amount-recenter-glow");
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
  /* 展开卡片会通过 data-ledger-expanded 隐藏移动端提交栏；编辑是另一条
     工作面，进入编辑前先释放展开态，确保“保存修改”始终可见。 */
  expandedExpenseId = "";
  setMobilePanel("entry", { behavior: "auto" });
  state.selectedPayerId = expense.payerId;
  state.activeCategory = expense.category;
  state.activeDate = expense.date;
  setSplitScopeFromExpense(expense);
  activeEntryEditor = activeSplitMode === "custom" ? "split" : "amount";
  smoothContainerResize(elements.entryPanel, () => {
    render();
  });
  elements.amountInput.value = activeSplitMode === "custom" ? formatAmountInput(customSplitTargetCents ?? getActiveCustomSplitTotalCents()) : String(expense.amount);
  if (activeSplitMode === "custom") syncCustomSplitTotalField();
  elements.noteInput.value = expense.note;
  syncNoteInputHeight(elements.noteInput);
  renderNaturalEntry();
  renderMobileSubmitBar();
  editFormSnapshot = captureExpenseFormSnapshot();
  elements.expenseForm.scrollIntoView({ block: "start", behavior: "auto" });
  elements.amountInput.focus();
  showToast({ message: "已载入账单，可直接修改" });
}

function cancelEdit() {
  const cancelledExpenseId = editingExpenseId;
  closeNaturalEntryStage({ immediate: true });
  editingExpenseId = "";
  elements.expenseForm.reset();
  restoreEntryPreferenceState();
  activeEntryEditor = "amount";
  smoothContainerResize(elements.entryPanel, () => {
    render();
  });
  expandedExpenseId = cancelledExpenseId || expandedExpenseId;
  setMobilePanel("data", { behavior: "auto", scroll: false });
  window.requestAnimationFrame(() => {
    const card = cancelledExpenseId
      ? elements.ledgerList?.querySelector(`[data-expense-id="${cssEscapeId(cancelledExpenseId)}"]`)
      : null;
    if (!card) return;
    card.scrollIntoView({ block: "center", behavior: "auto" });
    card.focus({ preventScroll: true });
  });
}

function captureEntryPreferenceState() {
  return {
    activeDate: state.activeDate,
    activeCategory: state.activeCategory,
    selectedPayerId: state.selectedPayerId,
    splitMode: activeSplitMode,
    splitFamilyIds: [...activeSplitFamilyIds],
    splitAmounts: { ...activeSplitAmounts },
    customSplitTargetCents,
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
  activeSplitFamilyIds = normalizeSplitFamilyIds(
    editReturnState.splitFamilyIds,
    getSplitScopeFromMode(activeSplitMode) === "selected" ? [] : state.families.map((family) => family.id),
  );
  if (getSplitScopeFromMode(activeSplitMode) === "all") activeSplitFamilyIds = state.families.map((family) => family.id);
  activeSplitAmounts = normalizeSplitAmounts(editReturnState.splitAmounts);
  customSplitTargetCents = activeSplitMode === "custom" && Number.isFinite(editReturnState.customSplitTargetCents)
    ? Math.max(0, Math.round(editReturnState.customSplitTargetCents))
    : null;
  customSplitSuspendedAmounts = {};
  customSplitAmountDrafts = {};
  splitFamilyChoicesOpen = getSplitScopeFromMode(activeSplitMode) === "selected";
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
    customSplitTargetCents,
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

// 落账拍：令牌从金额框飞入新生成的账单卡片，落定时卡片接住脉冲 + 总额绽放。
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
  token.textContent = formatMoney(amountToCents(amount));
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

function cssEscapeId(value) {
  if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(value);
  return String(value).replace(/["\\\]]/g, "\\$&");
}

function updateClearLedgerButton() {
  const isEmpty = getActiveExpenses().length === 0;
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
elements.naturalEntryFlow?.addEventListener("click", handleNaturalEntryClick);
elements.naturalEntryFocusBackdrop?.addEventListener("click", handleNaturalEntryBackdropClick);
elements.categoryAddConfirm?.addEventListener("click", handleInlineCategoryAdd);
elements.newCategoryInput.addEventListener("input", updateCategoryAddConfirmState);
elements.newCategoryInput.addEventListener("keydown", handleNewCategoryKeydown);
elements.categoryChips.addEventListener("click", handleCategorySelection);
elements.categoryAddFab?.addEventListener("click", toggleCategoryAdd);
elements.categoryChips.addEventListener("scroll", scheduleCategoryEdgeFades, { passive: true });
setupCategoryOverscroll(elements.categoryChips);
window.addEventListener("resize", scheduleCategoryEdgeFades);
window.addEventListener("resize", scheduleNaturalEntryStagePosition);
window.addEventListener("resize", scheduleAmountValueTrackResize, { passive: true });
window.addEventListener("scroll", () => scheduleNaturalEntryStagePosition({ reason: "scroll" }), { passive: true });
window.visualViewport?.addEventListener("resize", scheduleNaturalEntryStagePosition);
window.visualViewport?.addEventListener("resize", scheduleAmountValueTrackResize, { passive: true });
window.visualViewport?.addEventListener("scroll", () => scheduleNaturalEntryStagePosition({ reason: "scroll" }), { passive: true });
elements.splitScopeToggle.addEventListener("click", handleSplitScopeToggle);
elements.splitScopePanel.addEventListener("click", handleSplitScopeClick);
elements.splitScopePanel.addEventListener("input", handleSplitAmountInput);
elements.splitCustomAmounts?.addEventListener("keydown", handleSplitAmountKeydown);
elements.splitCustomAmounts?.addEventListener("focusin", (event) => {
  const input = event.target.closest("[data-split-amount]");
  if (input) {
    syncAmountValueTrack(input);
    revealAmountInputCaret(input);
    scrollNaturalEntrySplitInputIntoView(input);
  }
});
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
elements.settingsOperatorFamilyList.addEventListener("click", handleOperatorFamilyChoice);
elements.settingsMoneyDecimalsInput.addEventListener("change", handleMoneyDecimalsChange);
elements.settingsNaturalEntryMarksHiddenInput?.addEventListener("change", handleNaturalEntryMarksHiddenChange);
elements.settingsEntryModeList?.addEventListener("click", handleEntryModeSelection);
elements.settingsSettlementMethodList?.addEventListener("click", handleSettlementMethodSelection);
elements.operatorModalForm.addEventListener("submit", handleOperatorModalSubmit);
elements.operatorModalFamilyList.addEventListener("click", handleOperatorFamilyChoice);
/* Operator modal 背景 点击可关闭：原实现无关闭路径，用户被强制选家庭才能退出。
   关闭后下次操作（如提交账单）会再次提示选择家庭，不影响云账本强制身份的产品约束。 */
elements.operatorModalBackdrop?.addEventListener("click", closeOperatorModal);
elements.welcomeIdentityFamilyList.addEventListener("click", handleOperatorFamilyChoice);
elements.welcomeSkipButton.addEventListener("click", handleWelcomeSkip);
elements.welcomeNextButton.addEventListener("click", handleWelcomeNext);
elements.welcomeTrack.addEventListener("scroll", handleWelcomeTrackScroll, { passive: true });
/* 用户上手滑动时让位：取消自绘滚动动画，交还给原生 scroll-snap */
["touchstart", "wheel", "pointerdown"].forEach((type) => {
  elements.welcomeTrack.addEventListener(type, cancelWelcomeScrollAnimation, { passive: true });
});
elements.welcomeDots.addEventListener("click", (event) => {
  const dot = event.target.closest("[data-welcome-dot]");
  if (dot) setWelcomeSlide(Number(dot.dataset.welcomeDot));
});
elements.openWelcomeButton.addEventListener("click", () => {
  closeSettings({ restoreFocus: false });
  openWelcome();
});
/* 横滑卡片按容器宽度定位，窗口尺寸变化时瞬时校正到当前页 */
window.addEventListener("resize", () => {
  if (isWelcomeOpen()) setWelcomeSlide(welcomeSlideIndex, { instant: true });
});
elements.settingsFamilyList.addEventListener("click", handleFamilyMemberStep);
elements.settingsThemeList?.addEventListener("click", handleSettingsThemeClick);
elements.settingsFamilyColorList.addEventListener("click", handleSettingsFamilyColorClick);
elements.familyRoster.addEventListener("click", handleFamilySelection);
elements.ledgerList.addEventListener("click", handleLedgerClick);
elements.ledgerList.addEventListener("keydown", handleLedgerKeydown);
elements.settingsClearLedgerButton.addEventListener("click", handleClearLedger);
elements.exportCsvButton.addEventListener("click", exportCsvBackup);
elements.exportJsonButton.addEventListener("click", exportJsonBackup);
elements.importLedgerButton.addEventListener("click", () => elements.importLedgerInput.click());
elements.importLedgerInput.addEventListener("change", (event) => importLedgerFile(event.target.files?.[0]));
elements.createCloudLedgerButton.addEventListener("click", createCloudLedger);
elements.copyShareLinkButton.addEventListener("click", copyShareLink);
elements.syncStatus.addEventListener("click", handleManualCloudSync);
elements.openSettingsButton.addEventListener("click", openSettings);
bindAnimatedDetails();
elements.settlementEntryButton?.addEventListener("click", openSettlementInSettings);
elements.mobileSettlementEntryButton?.addEventListener("click", openSettlementInSettings);
setupSettlementEntryReminderObserver();
elements.ledgerFilterToggle?.addEventListener("click", toggleLedgerFilters);
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
  syncExpenseFormState();
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
  requestExpenseSubmit();
});
elements.amountInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || event.isComposing) return;
  event.preventDefault();
  if (isNaturalEntryLayout()) {
    setActiveEntryEditor("note", { focus: true, scroll: true });
  } else {
    elements.noteInput.focus();
  }
});
elements.noteInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || event.isComposing || (!event.metaKey && !event.ctrlKey)) return;
  event.preventDefault();
  requestExpenseSubmit();
});
elements.amountInput.addEventListener("focus", updateAmountMotionState);
elements.amountInput.addEventListener("blur", formatAmountFieldOnBlur);
elements.amountInput.addEventListener("input", () => {
  elements.formError.textContent = "";
  normalizeAmountInputDecimalPoint(elements.amountInput);
  if (activeSplitMode === "custom") {
    const amount = parseAmountInput(elements.amountInput.value);
    customSplitTargetCents = Number.isFinite(amount) && amount > 0 ? amountToCents(amount) : null;
    elements.amountInput.dataset.customTotalState = getCustomSplitDifferenceState();
    if (elements.amountAutoBadge) elements.amountAutoBadge.textContent = customSplitTargetCents === null ? "合计" : "总额";
    syncCustomSplitTotalLine();
  }
  updateAmountMotionState();
  revealAmountInputCaret(elements.amountInput);
  animateAmountValueTrack(elements.amountInput);
  /* 预览渲染与提交栏不再同步跑在输入关键路径上：它们要做十余次
     getBoundingClientRect 测量，会阻塞输入框自身的绘制，让数字显得卡顿。
     推迟到下一帧，先让输入框把新字符画出来，预览晚一帧跟上即可。 */
  scheduleNaturalEntryRender();
});
elements.noteInput.addEventListener("input", () => {
  elements.formError.textContent = "";
  /* 高度同步、摘要更新和提交栏刷新合并到同一帧；备注输入期间舞台
     已经固定在当前 anchor，不再为每个字符重新测量 fixed 定位。 */
  scheduleNaturalEntryRender({ syncNote: true, positionStage: false });
});
elements.categoryInput.addEventListener("change", () => {
  state.activeCategory = elements.categoryInput.value || state.activeCategory;
  renderNaturalEntry();
  renderMobileSubmitBar();
  saveState();
});
elements.dateInput.addEventListener("change", () => {
  state.activeDate = normalizeDate(elements.dateInput.value, state.activeDate);
  elements.dateInput.value = state.activeDate;
  renderNaturalEntry();
  renderMobileSubmitBar();
  saveState();
  if (naturalEntryStageOpen && activeEntryEditor === "date") {
    window.setTimeout(() => closeNaturalEntryStage({ restoreFocus: true }), prefersReducedMotion() ? 0 : 120);
  }
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
  if (document.visibilityState === "visible") {
    refreshCloudLedgerFromLifecycle();
    scheduleSettlementEntryReminder();
  } else {
    clearSettlementEntryReminder();
  }
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
    if (naturalEntryStageOpen) {
      trapFocus(event, elements.naturalEntryStage);
      return;
    }
    if (!elements.operatorModalView.hidden) {
      trapFocus(event, elements.operatorModalView);
      return;
    }
    if (!elements.confirmView.hidden) {
      trapFocus(event, elements.confirmView);
      return;
    }
    if (!elements.welcomeView.hidden) {
      trapFocus(event, elements.welcomeView);
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
  if (naturalEntryStageOpen) {
    closeNaturalEntryStage({ restoreFocus: true });
    return;
  }
  if (!elements.operatorModalView.hidden) return;
  if (!elements.confirmView.hidden) {
    closeConfirmDialog(false);
    return;
  }
  if (!elements.welcomeView.hidden) {
    closeWelcome();
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
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const reset = () => {
    buttons.forEach((btn) => {
      btn.style.removeProperty("--mouse-x");
      btn.style.removeProperty("--mouse-y");
    });
  };
  buttons.forEach((btn) => {
    btn.addEventListener("mousemove", (e) => {
      if (!finePointer.matches) {
        reset();
        return;
      }
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      btn.style.setProperty("--mouse-x", `${x}px`);
      btn.style.setProperty("--mouse-y", `${y}px`);
    });
    btn.addEventListener("mouseleave", reset);
  });
  finePointer.addEventListener?.("change", reset);
}

function setupDesktopImmersiveDetails() {
  const details = [...document.querySelectorAll(".insights-panel .insight-details")];
  const sync = () => {
    details.forEach((item) => {
      if (!desktopInsightsTouched) {
        item.removeAttribute("open");
        delete item.dataset.desktopAutoOpened;
      }
    });
  };

  details.forEach((item) => {
    item.querySelector(":scope > summary")?.addEventListener("click", () => {
      if (!desktopPointerQuery.matches) return;
      desktopInsightsTouched = true;
      details.forEach((detail) => delete detail.dataset.desktopAutoOpened);
    }, { capture: true });
  });
  desktopPointerQuery.addEventListener?.("change", sync);
  sync();
}

function getDesktopPointerSinkTarget(node) {
  if (!(node instanceof Element) || !desktopPointerQuery.matches) return null;
  const target = node.closest(".pointer-sink-target");
  return target && elements.ledgerView.contains(target) ? target : null;
}

function clearPointerRelatedHighlights() {
  elements.ledgerView.querySelectorAll(".is-pointer-related").forEach((item) => {
    item.classList.remove("is-pointer-related");
  });
}

function syncPointerRelatedHighlights(source) {
  clearPointerRelatedHighlights();
  if (!source?.isConnected || !source.matches(".ledger-item")) return;
  const familyId = source.dataset.pointerFamilyId || "";
  const category = source.dataset.pointerCategory || "";
  const date = source.dataset.pointerDate || "";
  const selectors = [
    familyId && `[data-journey-family-id="${cssEscapeId(familyId)}"]`,
    familyId && `[data-summary-family-id="${cssEscapeId(familyId)}"]`,
    category && `[data-summary-category="${cssEscapeId(category)}"]`,
    date && `[data-ledger-date="${cssEscapeId(date)}"]`,
  ].filter(Boolean);
  selectors.forEach((selector) => {
    elements.ledgerView.querySelectorAll(selector).forEach((item) => item.classList.add("is-pointer-related"));
  });
}

function clearDesktopPointerTarget(target) {
  if (!target) return;
  target.classList.remove("is-pointer-sunk", "is-pointer-pressed");
  [
    "--pointer-sink-x",
    "--pointer-sink-y",
    "--pointer-rotate-x",
    "--pointer-rotate-y",
  ].forEach((property) => target.style.removeProperty(property));
  if (target === desktopPointerSinkTarget) {
    desktopPointerSinkRect = null;
    desktopPointerSinkLastValues = null;
  }
}

function deactivateDesktopPointerSink() {
  if (desktopPointerSinkFrame) {
    window.cancelAnimationFrame(desktopPointerSinkFrame);
    desktopPointerSinkFrame = 0;
  }
  clearDesktopPointerTarget(desktopPointerSinkTarget);
  desktopPointerSinkTarget = null;
  desktopPointerSinkPoint = null;
  desktopPointerSinkRect = null;
  desktopPointerSinkLastValues = null;
  syncPointerRelatedHighlights(desktopPointerSinkFocusTarget);
}

function resetDesktopPointerSink({ preserveFocus = false } = {}) {
  deactivateDesktopPointerSink();
  if (!preserveFocus) desktopPointerSinkFocusTarget = null;
  if (desktopPointerSinkFocusTarget && !desktopPointerSinkFocusTarget.isConnected) {
    desktopPointerSinkFocusTarget = null;
  }
  syncPointerRelatedHighlights(desktopPointerSinkFocusTarget);
}

function flushDesktopPointerSink() {
  desktopPointerSinkFrame = 0;
  const target = desktopPointerSinkTarget;
  const point = desktopPointerSinkPoint;
  if (!target?.isConnected || !point || !desktopPointerQuery.matches || prefersReducedMotion()) return;
  /* 卡片进入 hover 区域时测一次；pointermove 热路径只消费缓存的 rect，
     避免 Safari 每帧因为 getBoundingClientRect() 强制布局。滚动/resize 会
     使缓存失效，下一次真实 pointermove 再重新测量。 */
  const rect = desktopPointerSinkRect || (desktopPointerSinkRect = target.getBoundingClientRect());
  if (!rect.width || !rect.height) return;
  const x = Math.max(0, Math.min(rect.width, point.x - rect.left));
  const y = Math.max(0, Math.min(rect.height, point.y - rect.top));
  const normalizedX = (x / rect.width - 0.5) * 2;
  const normalizedY = (y / rect.height - 0.5) * 2;
  const nextValues = {
    x,
    y,
    rotateX: -normalizedY * 2.6,
    rotateY: normalizedX * 2.6,
  };
  const previous = desktopPointerSinkLastValues;
  if (previous
    && Math.abs(nextValues.x - previous.x) < 0.5
    && Math.abs(nextValues.y - previous.y) < 0.5
    && Math.abs(nextValues.rotateX - previous.rotateX) < 0.08
    && Math.abs(nextValues.rotateY - previous.rotateY) < 0.08) {
    return;
  }
  desktopPointerSinkLastValues = nextValues;
  target.style.setProperty("--pointer-sink-x", `${x.toFixed(1)}px`);
  target.style.setProperty("--pointer-sink-y", `${y.toFixed(1)}px`);
  target.style.setProperty("--pointer-rotate-x", `${nextValues.rotateX.toFixed(3)}deg`);
  target.style.setProperty("--pointer-rotate-y", `${nextValues.rotateY.toFixed(3)}deg`);
}

function scheduleDesktopPointerSink(point) {
  desktopPointerSinkPoint = point;
  if (desktopPointerSinkFrame) return;
  desktopPointerSinkFrame = window.requestAnimationFrame(flushDesktopPointerSink);
}

function setupDesktopPointerSink() {
  elements.ledgerView.addEventListener("pointermove", (event) => {
    if (event.pointerType && event.pointerType !== "mouse") {
      deactivateDesktopPointerSink();
      return;
    }
    const target = getDesktopPointerSinkTarget(event.target);
    if (target !== desktopPointerSinkTarget) {
      clearDesktopPointerTarget(desktopPointerSinkTarget);
      desktopPointerSinkTarget = target;
      desktopPointerSinkRect = target?.getBoundingClientRect?.() || null;
      desktopPointerSinkLastValues = null;
      if (target) target.classList.add("is-pointer-sunk");
      syncPointerRelatedHighlights(target || desktopPointerSinkFocusTarget);
    }
    if (target) scheduleDesktopPointerSink({ x: event.clientX, y: event.clientY });
    else deactivateDesktopPointerSink();
  }, { passive: true });

  elements.ledgerView.addEventListener("pointerdown", (event) => {
    if (event.pointerType && event.pointerType !== "mouse") return;
    getDesktopPointerSinkTarget(event.target)?.classList.add("is-pointer-pressed");
  });
  window.addEventListener("pointerup", () => desktopPointerSinkTarget?.classList.remove("is-pointer-pressed"), { passive: true });
  window.addEventListener("pointercancel", deactivateDesktopPointerSink, { passive: true });
  elements.ledgerView.addEventListener("pointerleave", deactivateDesktopPointerSink, { passive: true });
  window.addEventListener("blur", () => resetDesktopPointerSink());
  const invalidatePointerRect = () => {
    desktopPointerSinkRect = null;
    desktopPointerSinkLastValues = null;
  };
  window.addEventListener("scroll", invalidatePointerRect, { passive: true });
  window.addEventListener("resize", invalidatePointerRect, { passive: true });
  desktopPointerQuery.addEventListener?.("change", () => resetDesktopPointerSink());

  elements.ledgerView.addEventListener("focusin", (event) => {
    desktopPointerSinkFocusTarget = getDesktopPointerSinkTarget(event.target);
    syncPointerRelatedHighlights(desktopPointerSinkTarget || desktopPointerSinkFocusTarget);
  });
  elements.ledgerView.addEventListener("focusout", () => {
    window.requestAnimationFrame(() => {
      desktopPointerSinkFocusTarget = getDesktopPointerSinkTarget(document.activeElement);
      syncPointerRelatedHighlights(desktopPointerSinkTarget || desktopPointerSinkFocusTarget);
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
function attachCollapseOnScroll(
  scrollTarget,
  collapseEl,
  { onThreshold, offThreshold, shouldSkipChange, onBeforeChange, onChange }
) {
  if (!scrollTarget || !collapseEl) return;
  let collapsed = false;
  let scrollFrame = 0;
  const readScrollTop = () =>
    scrollTarget === window ? window.scrollY : scrollTarget.scrollTop;
  const sync = () => {
    scrollFrame = 0;
    const scrollTop = readScrollTop();
    const shouldCollapse = collapsed ? scrollTop > offThreshold : scrollTop > onThreshold;
    if (shouldCollapse === collapsed) return;
    if (shouldSkipChange?.({ collapsed, shouldCollapse, scrollTop })) return;
    onBeforeChange?.(shouldCollapse);
    collapsed = shouldCollapse;
    collapseEl.classList.toggle("is-collapsed", collapsed);
    onChange?.(collapsed);
  };
  const schedule = () => {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(sync);
  };
  scrollTarget.addEventListener("scroll", schedule, { passive: true });
  sync();
}

/* 指示灯停靠点：移动端 header 的真实几何始终保持收起态，胶囊、标题与 tab
   只由 --mobile-header-progress 在合成层移动。这里用 offset* 量未变换的起点，
   因而坐标不受当前滚动进度影响，也不需要等待 grid 重排。 */
function updateSyncLampDock(force = false) {
  const header = document.querySelector(".app-header");
  const capsule = elements.syncStatus;
  const title = elements.currentLedgerTitle;
  if (!header || !capsule || !title) return;
  if (!force && !header.classList.contains("is-collapsed")) return;
  if (window.getComputedStyle(header).display !== "grid") return; // 仅移动端 grid 布局参与熔化

  const headerRect = header.getBoundingClientRect();
  const range = document.createRange();
  range.selectNodeContents(title);
  const textRect = range.getBoundingClientRect(); // h1 是 block 占满列宽，量文字本身
  range.detach();

  const titleTransform = window.getComputedStyle(title).transform;
  const currentScale = titleTransform === "none" ? 1 : new DOMMatrixReadOnly(titleTransform).a || 1;
  const collapseScale =
    Number.parseFloat(window.getComputedStyle(header).getPropertyValue("--header-title-collapse-scale")) || 1;

  /* origin left bottom：左缘/底缘不动，宽高折算到收起终值 */
  const finalTextWidth = (textRect.width / currentScale) * collapseScale;
  const finalTextHeight = (textRect.height / currentScale) * collapseScale;
  const finalTextRight = textRect.left + finalTextWidth;
  const finalTextCenterY = textRect.bottom - finalTextHeight / 2;

  /* 目标 X：灯芯离文字 10px；长标题时 clamp 到设置齿轮左侧。
     目标 Y：与设置齿轮水平对齐（同一水平线），而非标题文字内容中心——
     齿轮在 row1 右、h1 在 row1 左，二者各自垂直居中，中心通常不等，
     故直接取齿轮中心 Y，让「●」和「⚙」落在同一条水平线。
     无齿轮时回退到标题文字中心。 */
  const lampHalf = 5;
  let targetX = finalTextRight + 10 + lampHalf;
  let targetY = finalTextCenterY;
  if (elements.openSettingsButton) {
    const btnRect = elements.openSettingsButton.getBoundingClientRect();
    /* 按钮内部图标自身的中心，比按钮盒中心更贴近视觉中心；
       SF Symbol 与 SVG 是互斥的，不能只取 DOM 中排在前面的隐藏 SF 节点，
       否则它的 0 高度会把目标 Y 算到按钮顶部。 */
    const iconCandidates = elements.openSettingsButton.querySelectorAll(".ui-icon");
    let iconRect = btnRect;
    for (const iconCandidate of iconCandidates) {
      const candidateRect = iconCandidate.getBoundingClientRect();
      if (candidateRect.width > 0 && candidateRect.height > 0) {
        iconRect = candidateRect;
        break;
      }
    }
    const btnTransform = window.getComputedStyle(elements.openSettingsButton).transform;
    const btnTranslateY =
      btnTransform === "none" ? 0 : new DOMMatrixReadOnly(btnTransform).f || 0;
    targetX = Math.min(targetX, btnRect.left - 10 - lampHalf);
    targetY = iconRect.top + iconRect.height / 2 - btnTranslateY;
  }

  const capsuleStyle = window.getComputedStyle(capsule);
  const paddingLeft = Number.parseFloat(capsuleStyle.paddingLeft) || 0;
  const dotLayoutX = headerRect.left + capsule.offsetLeft + paddingLeft + lampHalf;
  const dotLayoutY = headerRect.top + capsule.offsetTop + capsule.offsetHeight / 2;

  header.style.setProperty("--sync-dock-x", `${targetX - dotLayoutX}px`);
  header.style.setProperty("--sync-dock-y", `${targetY - dotLayoutY}px`);
}

function setupScrollCollapse() {
  const appHeader = document.querySelector(".app-header");
  const mobileQuery = window.matchMedia?.("(max-width: 820px)");
  const isMobile = () => mobileQuery?.matches ?? window.innerWidth <= 820;
  let headerFrame = 0;
  let lastProgress = -1;
  let wasCollapsed = false;
  let wasDocking = false;
  let collapseEnabled = true;
  let collapseDistance = 47;

  const syncHeaderCollapseConfig = () => {
    const headerStyle = window.getComputedStyle(appHeader);
    collapseEnabled = (Number.parseFloat(headerStyle.getPropertyValue("--mobile-header-collapse-enabled")) || 0) >= 0.5;
    collapseDistance = Number.parseFloat(headerStyle.getPropertyValue("--mobile-header-expand-offset")) || 47;
  };

  const playDockFlash = () => {
    if (!elements.syncStatus || elements.syncStatus.classList.contains("is-syncing") || prefersReducedMotion()) return;
    window.clearTimeout(syncLampDockFlashTimer);
    elements.syncStatus.classList.remove("is-dock-flash");
    void elements.syncStatus.offsetWidth;
    elements.syncStatus.classList.add("is-dock-flash");
    syncLampDockFlashTimer = window.setTimeout(() => {
      elements.syncStatus.classList.remove("is-dock-flash");
      syncLampDockFlashTimer = 0;
    }, 760);
  };

  /* 唯一的主页面滚动协调器：header 的文档流高度从不变化。展开所需的 58px
     由 .app-view 静态预留并随页面自然滚走；这里每帧只写合成层视觉进度。
     以 smootherstep 为主，轻混 18% 七阶 smootheststep：两端起步的加速度
     再柔和一点，但中段仍跟手、末端减速仍清楚；不引入独立补间或滚动回写。 */
  const easeHeaderProgress = (value) => {
    const smoother = value * value * value * (value * (value * 6 - 15) + 10);
    const smoothest =
      value * value * value * value * (35 + value * (-84 + value * (70 - 20 * value)));
    return smoother * 0.82 + smoothest * 0.18;
  };

  const applyHeaderProgress = () => {
    headerFrame = 0;
    const y = isMobile() ? (window.scrollY || window.pageYOffset || 0) : 0;
    if (!isMobile()) {
      lastProgress = 0;
      wasCollapsed = false;
      wasDocking = false;
      appHeader.style.setProperty("--mobile-header-progress", "0");
      appHeader.style.setProperty("--mobile-header-edge-opacity", "0");
      appHeader.classList.remove("is-docking", "is-collapsed");
      return;
    }
    if (dockCoordsDirty) {
      updateSyncLampDock(true);
      dockCoordsDirty = false;
    }
    if (!collapseEnabled) {
      lastProgress = 0;
      wasCollapsed = false;
      wasDocking = false;
      appHeader.style.setProperty("--mobile-header-progress", "0");
      appHeader.style.setProperty("--mobile-header-edge-opacity", "0");
      appHeader.classList.remove("is-docking", "is-collapsed");
      return;
    }
    const rawProgress = Math.min(1, Math.max(0, y / collapseDistance));
    const progress = Math.round(easeHeaderProgress(rawProgress) * 1000) / 1000;
    if (progress !== lastProgress) {
      lastProgress = progress;
      appHeader.style.setProperty("--mobile-header-progress", String(progress));
      appHeader.style.setProperty("--mobile-header-edge-opacity", String(progress));
    }
    const isDocking = progress > 0.001 && progress < 0.999;
    const isCollapsed = progress >= 0.999;
    if (isDocking !== wasDocking) {
      appHeader.classList.toggle("is-docking", isDocking);
      wasDocking = isDocking;
    }
    if (isCollapsed !== wasCollapsed) {
      appHeader.classList.toggle("is-collapsed", isCollapsed);
    }
    if (isCollapsed && !wasCollapsed) {
      playDockFlash();
    }
    wasCollapsed = isCollapsed;
  };

  window.addEventListener("scroll", () => {
    if (headerFrame) return;
    headerFrame = window.requestAnimationFrame(applyHeaderProgress);
  }, { passive: true });

  let headerResizeFrame = 0;
  window.addEventListener("resize", () => {
    if (headerResizeFrame) return;
    headerResizeFrame = window.requestAnimationFrame(() => {
      headerResizeFrame = 0;
      syncHeaderCollapseConfig();
      dockCoordsDirty = true;
      applyHeaderProgress();
    });
  });

  syncHeaderCollapseConfig();
  mobileQuery?.addEventListener?.("change", () => {
    syncHeaderCollapseConfig();
    dockCoordsDirty = true;
    applyHeaderProgress();
  });
  applyHeaderProgress();

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
  const mobileQuery = window.matchMedia?.("(max-width: 820px)");

  /* Safe-area insets are fixed by the device's physical safe area (notch /
     home indicator). They do NOT change when the iOS URL bar shows/hides, yet the
     old code measured them on every visualViewport event — creating a probe div
     and forcing a synchronous reflow (getComputedStyle) on every single frame of
     the address-bar animation. That forced reflow per frame was the main source
     of the "顿一下" jank on Safari mobile. Measure once, and again only when the
     orientation can actually change the insets. */
  let cachedInsets = [0, 0, 0, 0];
  const measureInsets = () => {
    const probe = document.createElement("div");
    probe.style.cssText = [
      "position: fixed",
      "visibility: hidden",
      "pointer-events: none",
      "padding: env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px)",
    ].join(";");
    document.body.appendChild(probe);
    const style = window.getComputedStyle(probe);
    cachedInsets = ["Top", "Right", "Bottom", "Left"].map((side) => Number.parseFloat(style[`padding${side}`]) || 0);
    probe.remove();
  };
  measureInsets();

  /* Mode-dependent classes / data attr: these only flip on rare, discrete events
     (rotation, entering/exiting fullscreen or standalone, breakpoint cross). They
     never change during the address-bar animation, so they stay out of the per-
     frame hot path. */
  const syncModes = () => {
    const isStandalone =
      window.navigator.standalone === true || displayQueries[0]?.matches || displayQueries[2]?.matches;
    const isFullscreen = Boolean(document.fullscreenElement) || displayQueries[1]?.matches || isStandalone;
    const isMobile = mobileQuery?.matches ?? window.innerWidth <= 820;
    const hasSafeArea = cachedInsets.some((inset) => inset > 0);
    root.classList.toggle("mobile-viewport", isMobile);
    root.classList.toggle("mobile-fullscreen", isMobile && isFullscreen);
    root.classList.toggle("safe-area-detected", hasSafeArea);
    root.dataset.displayMode = isStandalone ? "standalone" : isFullscreen ? "fullscreen" : "browser";
  };

  /* The bottom offset is the ONLY thing that changes while the address bar
     animates. We hold the fixed tab bar at the running MAX offset during the
     gesture (so it is always lifted clear of the possibly-expanding address bar)
     and only settle to the true resting value after the animation goes quiet. The
     bar is therefore re-laid-out at most twice per gesture instead of every frame
     — eliminating the tab stutter. Writes are skipped when the rounded value is
     unchanged, so identical frames cost nothing. */
  let lastVvb = -1;
  let heldMax = 0;
  let settleTimer = 0;

  const writeViewport = (bottom) => {
    const rounded = Math.round(bottom);
    if (rounded === lastVvb) return;
    lastVvb = rounded;
    root.style.setProperty("--visual-viewport-bottom", `${rounded}px`);
    root.classList.toggle("viewport-bottom-occluded", rounded > 1);
  };

  const readViewportBottom = () => {
    const viewport = window.visualViewport;
    return viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
  };

  const onViewportFrame = () => {
    const bottom = readViewportBottom();
    heldMax = Math.max(heldMax, bottom);
    writeViewport(heldMax);
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(() => {
      heldMax = 0;
      writeViewport(readViewportBottom()); // settle to the real resting offset
    }, 140);
  };

  /* Coalesce the burst of resize/scroll events that fire per frame during the
     address-bar animation into at most one run per animation frame. */
  let rafPending = false;
  const scheduleViewport = () => {
    if (rafPending) return;
    rafPending = true;
    window.requestAnimationFrame(() => {
      rafPending = false;
      onViewportFrame();
    });
  };

  const syncModesAndViewport = () => {
    syncModes();
    scheduleViewport();
  };

  syncModes();
  writeViewport(readViewportBottom());
  displayQueries.forEach((query) => query?.addEventListener?.("change", syncModesAndViewport));
  mobileQuery?.addEventListener?.("change", syncModesAndViewport);
  window.addEventListener("fullscreenchange", syncModesAndViewport);
  window.addEventListener("orientationchange", () => {
    measureInsets();
    syncModesAndViewport();
  });
  // All continuous events funnel through one rAF-throttled, max-held path.
  window.visualViewport?.addEventListener("resize", scheduleViewport);
  window.visualViewport?.addEventListener("scroll", scheduleViewport);
  window.addEventListener("resize", syncModesAndViewport);
}

async function bootstrap() {
  hydrateUiIcons();
  setupStandaloneMode();
  setupSafeAreaMode();
  migrateThemePreference();
  applyNaturalEntryMarksPreference();
  syncThemeColorMeta();
  /* 请求持久化存储：降低 Safari ITP 主动清空 localStorage/IndexedDB 的概率 */
  navigator.storage?.persist?.().catch(() => {});
  setupSubmitButtonSpotlight();
  setupDesktopImmersiveDetails();
  setupDesktopPointerSink();
  setupScrollCollapse();
  render();
  syncNoteInputHeight(elements.noteInput);
  document.fonts?.ready?.then(syncAllAmountValueTracks);
  maybeShowWelcome();
  const restoredFromBackup = await restoreLedgerFromCloudBackup();
  if (!restoredFromBackup && isCloudLedgerActive()) {
    await pullCloudLedger({ announce: Boolean(cloudState.shareToken) });
  }
  syncRealtimeSubscription();
  checkOperatorFamilyPrompt();
  revealInitialTotalAmount();
  revealInitialExpenseCount();
}

bootstrap();
mobileViewportCoordinator.setup();

// 滚动期间给 body 挂 is-scrolling：CSS 借此暂停装饰性无限动画（同步呼吸灯等），
// 降低 iOS 滚动时合成器每帧的重绘工作量；停止滚动 180ms 后恢复，视觉上无差异。
(() => {
  let scrollIdleTimer = 0;
  window.addEventListener("scroll", () => {
    if (!document.body.classList.contains("is-scrolling")) {
      document.body.classList.add("is-scrolling");
    }
    window.clearTimeout(scrollIdleTimer);
    scrollIdleTimer = window.setTimeout(() => {
      document.body.classList.remove("is-scrolling");
      scrollIdleTimer = 0;
    }, 180);
  }, { passive: true });
})();
