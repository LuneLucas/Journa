const STORAGE_KEY = "travel-ledger-v3";
const LEGACY_STORAGE_KEYS = ["travel-ledger-v2", "travel-ledger-v1"];
const CLOUD_STATE_KEY = "travel-ledger-cloud";
const OPERATOR_FAMILY_STORAGE_KEY = "travel-ledger-operator-family-id";
const APP_VERSION = "journa-settlement-flow-v12-20260726";
const SUPABASE_URL = "https://qvphpeetzyvnwaehrifa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2cGhwZWV0enl2bndhZWhyaWZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NzIxMTAsImV4cCI6MjA5ODE0ODExMH0.k3FL_Ywt377guTfjzTu1bgucShpRfmnQCdxn4SqikuA";
document.documentElement.dataset.appVersion = APP_VERSION;
const MOTION_DELAYS = {
  ledgerSettle: 1783,
  ledgerClearBase: 580,
  ledgerClearMax: 1159,
  ledgerClearStagger: 63,
  settlementStagger: 58,
  categoryEnter: 1560,
  categoryExit: 280,
  payerActivate: 760,
  categoryActivate: 760,
  choiceRelease: 460,
  splitSwitch: 260,
  mobilePanelOut: 120,
  mobilePanelIn: 340,
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
const SPRING_CATEGORY_ADD_OPEN = { stiffness: 280, damping: 24, mass: 1 };
const SPRING_CATEGORY_ADD_CLOSE = { stiffness: 320, damping: 28, mass: 1 };
const SPRING_LANDING_TAIL_MS = 64;
const BAR_ARC_LIFT_PX = 5;
const BAR_ARC_REBOUND_PX = 1.4;
const BAR_COLLAPSE_REBOUND_X_PX = 3.2;
const BAR_EXPAND_REBOUND_X_PX = -2.4;
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
const MONEY_DECIMALS_STORAGE_KEY = "travel-ledger-show-money-decimals";
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
const todayIso = () => new Date().toISOString().slice(0, 10);

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
  settingsOperatorFamilyList: document.querySelector("#settingsOperatorFamilyList"),
  settingsMoneyDecimalsInput: document.querySelector("#settingsMoneyDecimalsInput"),
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
  storageModeLabel: document.querySelector("#storageModeLabel"),
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
let activeSplitMode = "all";
let activeSplitFamilyIds = state.families.map((family) => family.id);
let activeSplitAmounts = {};
let splitScopeOpen = false;
let splitScopeCloseTimer = 0;
let splitScopeSwitching = false;
let splitScopeSwitchTimer = 0;
let mobileSubmitFeedbackTimer = 0;
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
   依赖全局 supabase（index.html 经 CDN 引入）；若未加载则全部静默降级，
   不阻塞原有手动/生命周期同步。 */
let realtimeClient = null;
let realtimeChannel = null;
let realtimePullTimer = null;
let realtimeBroadcastTimer = null;
let realtimeBroadcastPending = false;

function getRealtimeClient() {
  if (realtimeClient) return realtimeClient;
  if (typeof supabase === "undefined" || !isCloudConfigured()) return null;
  try {
    realtimeClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: { params: { eventsPerSecond: 5 } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch (error) {
    realtimeClient = null;
  }
  return realtimeClient;
}

function subscribeLedgerRealtime(shareToken) {
  const client = getRealtimeClient();
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
    subscribeLedgerRealtime(cloudState.shareToken);
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
let settingsReturnFocus = null;
let ledgerManagementReturnFocus = null;
let confirmReturnFocus = null;
let activeMobilePanel = "data";
let settingsMode = "settings";
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
    const familyId = normalizePayerId(val.familyId);
    const name = String(val.name || "").trim();
    if (familyId) return { familyId };
    return name ? { name } : null;
  }
  const name = String(val).trim();
  return name ? { name } : null;
}

function normalizeExpense(expense) {
  const splitMode = normalizeSplitMode(expense.splitMode);
  const updatedAt = expense.updatedAt || new Date().toISOString();
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
    if (announce) showToast({ message: "已同步云账本" });
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
      toast = "云端服务暂时不可用，可能是项目被暂停或网络异常，请稍后重试（本地数据已保留）";
    } else if (ledgerMissing) {
      label = "链接已失效";
      toast = "邀请链接已失效：对应的云账本不存在或已被删除，请让创建者重新分享链接";
    } else {
      label = "同步失败";
      toast = "云账本同步失败，请检查网络后重试（本地数据已保留）";
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
    showToast({ message: "创建云账本失败，请确认 SQL 已执行" });
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
      showToast({ message: "云端设置同步失败，本地已保留" });
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

  try {
    await supabaseRpc("save_travel_expense", splitPayload);
  } catch (error) {
    if (!isSplitRpcCompatibilityError(error)) throw error;
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
    if (!silent) showToast({ message: "云端保存失败，本地已保留，稍后会重试" });
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
  return message.includes("p_split_") || message.includes("schema cache") || message.includes("PGRST202");
}

async function deleteCloudExpense(expenseId) {
  if (!isCloudLedgerActive()) return;
  await supabaseRpc("delete_travel_expense", {
    p_share_token: cloudState.shareToken,
    p_id: expenseId,
  });
  notifyLedgerChanged();
}

async function clearCloudLedger() {
  if (!isCloudLedgerActive()) return;
  await supabaseRpc("clear_travel_ledger", { p_share_token: cloudState.shareToken });
  notifyLedgerChanged();
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
  const showDecimals = localStorage.getItem(MONEY_DECIMALS_STORAGE_KEY) !== "false";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(cents / 100);
}

function formatTotalMoney(cents) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatLedgerMoney(cents) {
  return formatMoney(cents);
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

function calculateSummary() {
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
    if (normalizeSplitMode(expense.splitMode) !== "all") scopedExpenseCount += 1;
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

function calculatePairwiseSettlements(owedByFamily) {
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
    renderRecentPeek();
    applySelectedFamilyTheme();
    applySubmitButtonTheme();
    updateAmountMotionState();
    scheduleSaveState();
  };

  const mobilePanelFlow = window.matchMedia("(max-width: 820px), (pointer: coarse)").matches;
  if (document.startViewTransition && animateFinancialChanges && !mobilePanelFlow) {
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
  const landingTail = Math.min(SPRING_LANDING_TAIL_MS, duration * 0.18);
  const landingStart = duration - landingTail;
  const count = Math.max(24, Math.min(96, Math.round(duration / 8)));
  const values = [];

  const springStateAt = (time) => {
    if (zeta < 1) {
      const wd = w0 * Math.sqrt(1 - zeta * zeta);
      const envelope = Math.exp(-zeta * w0 * time);
      const angle = wd * time;
      const position = 1 - envelope * (Math.cos(angle) + ((zeta * w0) / wd) * Math.sin(angle));
      const velocity = envelope * (w0 * w0 / wd) * Math.sin(angle);
      return { position, velocity };
    }

    const envelope = Math.exp(-w0 * time);
    return {
      position: 1 - envelope,
      velocity: w0 * envelope,
    };
  };

  const landingStateAt = (time, startState) => {
    const tailSeconds = landingTail / 1000;
    const u = Math.min(1, Math.max(0, (time - landingStart) / landingTail));
    if (u >= 1) return 1;

    // Cubic Hermite interpolation preserves the spring's position and velocity
    // at the handoff, then eases both displacement and velocity to zero at rest.
    const u2 = u * u;
    const u3 = u2 * u;
    const h00 = 2 * u3 - 3 * u2 + 1;
    const h10 = u3 - 2 * u2 + u;
    const h01 = -2 * u3 + 3 * u2;
    return h00 * startState.position
      + h10 * tailSeconds * startState.velocity
      + h01;
  };

  const landingStartState = springStateAt(landingStart / 1000);

  for (let i = 0; i <= count; i++) {
    const time = (duration * i) / count;
    values.push(time < landingStart
      ? springStateAt(time / 1000).position
      : landingStateAt(time, landingStartState));
  }

  return { values, duration };
}

function getBarMorphDuration(nextPanel) {
  return springSamples(nextPanel === "data" ? SPRING_BAR_COLLAPSE : SPRING_BAR_EXPAND).duration;
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

function smoothBump(value) {
  const u = Math.min(1, Math.max(0, value));
  return 64 * u ** 3 * (1 - u) ** 3;
}

function barArcLift(offset) {
  const arc = smoothBump(offset);
  const landing = smoothBump((offset - 0.68) / 0.32);
  return -BAR_ARC_LIFT_PX * arc + BAR_ARC_REBOUND_PX * landing;
}

function barHorizontalRebound(offset, toData) {
  const landing = smoothBump((offset - 0.68) / 0.32);
  return (toData ? BAR_COLLAPSE_REBOUND_X_PX : BAR_EXPAND_REBOUND_X_PX) * landing;
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
    const horizontalRebound = barHorizontalRebound(offset, toData);
    barFrames.push({ offset, transform: `translate(${translateX + horizontalRebound}px, ${translateY + arcLift}px) scale(${scaleX}, ${scaleY})` });

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

  const options = { duration, easing: "linear", fill: "forwards", composite: "replace" };
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
  const panelMotionDuration = shouldAnimateChrome ? getBarMorphDuration(nextPanel) : 0;

  if (shouldAnimateChrome) {
    /* 页面卡片、总支出/平账与底部悬浮栏共用本次悬浮栏的实际弹簧时长，
       避免固定 300ms 的面板淡入提前结束。 */
    const motionValue = `${panelMotionDuration}ms`;
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

// 记账视图内的「最近记录」：提交后即时露出最近 1–2 笔，用户无需切到「数据」即可确认已保存。
function renderRecentPeek() {
  const host = document.getElementById("recentPeek");
  if (!host) return;
  const expenses = [...state.expenses]
    .filter((expense) => !expense.isDeleted)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return (b.updatedAt || "").localeCompare(a.updatedAt || "");
    })
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
          const label = expense.note ? escapeHtml(expense.note) : formatCategoryLabel(expense.category);
          return `
        <li class="recent-peek-item">
          <span class="category-pill">${categoryLabelHtml(expense.category)}</span>
          <span class="recent-peek-note">${label}</span>
          <span class="recent-peek-amount">${formatMoney(Math.round(Number(expense.amount) * 100))}</span>
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
  const isMobile = window.matchMedia("(max-width: 820px), (pointer: coarse)").matches;
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
  renderOperatorFamilyChoices(elements.settingsOperatorFamilyList);
  elements.settingsMoneyDecimalsInput.checked = localStorage.getItem(MONEY_DECIMALS_STORAGE_KEY) !== "false";
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
        <div class="family-color-detail-inner">
          ${familyRows}
        </div>
      </div>
    </details>
  `;
  bindAnimatedDetails(elements.settingsFamilyColorList);
}

/* 让原生 <details> 的「收起」也平滑过渡。
   原生 details 在移除 open 时瞬间抽走内容，grid 的 1fr→0fr 过渡播不出来；
   这里拦截 summary 点击、自管 open 属性：收起时先保留 open、强制 0fr
   播完过渡再真正移除 open；展开则直接加 open 走 CSS 0fr→1fr。*/
function bindAnimatedDetails(root = document) {
  root
    .querySelectorAll(".settings-actions-details > summary, .family-color-details > summary, .settings-mobile-group > summary, .insight-details > summary")
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

  /* VT 已对整个 #totalAmount 做交叉淡变刷新（::view-transition-old/new 的
     text-slide-out/in），此处不再叠加 is-soft-refresh 的模糊位移，避免数字
     “先交叉淡变、再模糊滑入”的双段感。仅在不支持 View Transitions
     的浏览器走 is-soft-refresh 这层 CSS 兜底。 */
  if (document.startViewTransition && shouldAnimate) {
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
  renderTotalAmount(formatTotalMoney(calculateSummary().totalCents), false, { revealOnEntry: true });
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
  }, getCssDurationMs("--motion", 534) + 80);
}

function renderSummary({ animateFinancialChanges = false } = {}) {
  const summary = calculateSummary();
  const visibleExpenseCount = state.expenses.filter((expense) => !expense.isDeleted).length;
  /* paidByFamily / categorySummary / settlementList 三个容器都带有独立的
     view-transition-name，VT 生效时整块交叉淡变已覆盖刷新；若子项再挂
     is-entering，落定后会“再滑一次”，形成双重动效。故 VT 生效时
     跳过子项 is-entering，仅在不支持 View Transitions 的浏览器用 CSS 兜底。 */
  const mobilePanelFlow = window.matchMedia("(max-width: 820px), (pointer: coarse)").matches;
  /* 移动端数据页的两张首屏卡片走同一条卡片路径；避免总支出额外启动
     View Transition，和下方平账卡形成两套叠加轨迹。 */
  const vtActive = document.startViewTransition && animateFinancialChanges && !mobilePanelFlow;
  const animateSummaryContents = animateFinancialChanges && !mobilePanelFlow;
  const enterClass = vtActive ? "" : " is-entering";
  renderTotalAmount(formatTotalMoney(summary.totalCents), animateSummaryContents);
  renderSoftText(elements.shareAmount, formatMoney(summary.shareCents), animateSummaryContents);
  renderExpenseCount(String(visibleExpenseCount), animateSummaryContents);
  renderSoftText(elements.mobileExpenseCount, String(visibleExpenseCount), animateSummaryContents);
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

  renderSettlementEntry(summary, animateSummaryContents);
}

/* 数据页只保留一个入口摘要，完整的平账建议（资金光流图 + 转账卡）在设置抽屉里 */
function renderSettlementEntry(summary, shouldAnimate = false) {
  if (!elements.settlementEntryButton) return;
  const count = summary.settlements.length;
  const hasExpenses = state.expenses.some((expense) => !expense.isDeleted);
  const routeSummary = summary.settlements
    .slice(0, 2)
    .map((settlement) => `${settlement.from} → ${settlement.to}`)
    .join("、");
  elements.settlementEntrySub.textContent = count
    ? "旅程收尾时查看"
    : "所有家庭当前已两清";
  elements.settlementEntryCount.textContent = count ? `待结算 ${count} 笔` : "已两清";
  elements.settlementEntryButton.classList.toggle("is-settled", count === 0);

  if (!elements.mobileSettlementEntryButton) return;
  elements.mobileSettlementEntryButton.hidden = !hasExpenses || count === 0;
  elements.mobileSettlementEntrySub.textContent = routeSummary || "查看转账方案";
  renderSoftText(elements.mobileSettlementEntryCount, `${count} 笔`, shouldAnimate);
  if (shouldAnimate && !prefersReducedMotion()) {
    elements.mobileSettlementEntryButton.classList.remove("is-soft-refresh");
    void elements.mobileSettlementEntryButton.offsetWidth;
    elements.mobileSettlementEntryButton.classList.add("is-soft-refresh");
    window.setTimeout(() => elements.mobileSettlementEntryButton.classList.remove("is-soft-refresh"), getCssDurationMs("--number-swap-motion", 980) + 60);
  }
  elements.mobileSettlementEntryButton.setAttribute(
    "aria-label",
    `平账建议：${count} 笔转账。${routeSummary}`,
  );
}

/* 平账建议内容（资金光流图 + 转账卡），供设置抽屉渲染 */
function buildSettlementHtml(summary, enterClass = "") {
  if (!summary.settlements.length) {
    return `<div class="settlement-done${enterClass}">
        <span class="settlement-done-mark" aria-hidden="true">${uiIconHtml("check")}</span>
        <span class="settlement-done-kicker">平账建议</span>
        <strong>当前已经两清</strong>
        <small>各家已付金额已经覆盖应承担金额，这趟旅行无需再转账。</small>
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
        `<linearGradient id="${gradientId}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${fromVisual.color}"/><stop offset="1" stop-color="${toVisual.color}"/></linearGradient>`,
      );

      // 只用克制的家庭色渐变线表达流向，避免移动光点和多层高亮造成视觉噪音。
      return `
        <g class="flow-link" style="--flow-delay: ${index * 160}ms;">
          <path class="flow-halo" d="${pathD}" pathLength="1" stroke="url(#${gradientId})" stroke-width="${(strokeWidth + 3.2).toFixed(1)}" filter="url(#settlementGlow)"/>
          <path class="flow-ribbon" d="${pathD}" pathLength="1" stroke="url(#${gradientId})" stroke-width="${strokeWidth.toFixed(1)}"/>
          <path class="flow-sheen" d="${pathD}" pathLength="1" stroke="url(#${gradientId})" stroke-width="${Math.max(1.8, strokeWidth * 0.82).toFixed(1)}"/>
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
  const amountMarkup = formattedAmount.startsWith("¥")
    ? `<span class="settlement-currency" aria-hidden="true">¥</span>${escapeHtml(formattedAmount.slice(1))}`
    : escapeHtml(formattedAmount);
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

function renderLedger({ animateFinancialChanges = false } = {}) {
  const visibleExpenses = getVisibleExpenses();
  const enterClass = animateFinancialChanges ? " is-entering" : "";

  if (!state.expenses.length) {
    elements.ledgerList.innerHTML = renderLedgerEmptyState(
      "还没有账单",
      `<br><small>记下第一笔，开始这次旅行。</small><br><button class="secondary-button compact-button empty-state-action" type="button" data-goto-entry>去记一笔</button>`,
      enterClass,
      { suffixIsHtml: true },
    );
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
  const createdFamilyId = normalizePayerId(expense.createdBy?.familyId);
  const updatedFamilyId = normalizePayerId(expense.updatedBy?.familyId);
  const createdFamilyName = createdFamilyId ? getFamilyName(createdFamilyId) : "";
  const updatedFamilyName = updatedFamilyId ? getFamilyName(updatedFamilyId) : "";
  const operatorLabel = updatedFamilyId && updatedFamilyId !== createdFamilyId
    ? `最近由 ${updatedFamilyName} 编辑`
    : createdFamilyId
      ? `由 ${createdFamilyName} 记下`
      : "";
  const operatorHtml = operatorLabel
    ? `<small class="ledger-operator" title="${escapeHtml(operatorLabel)}">${escapeHtml(operatorLabel)}</small>`
    : "";

  let metaHtml = "";
  if (isExpanded) {
    let metaItems = "";
    if (createdFamilyId) {
      metaItems += `<span>${uiIconHtml("plus", "ledger-meta-icon")}创建：${escapeHtml(createdFamilyName)}</span>`;
    }
    if (updatedFamilyId && updatedFamilyId !== createdFamilyId) {
      metaItems += `<span>${uiIconHtml("edit", "ledger-meta-icon")}更新：${escapeHtml(updatedFamilyName)}</span>`;
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
        ${operatorHtml}
        <small class="ledger-scope">${escapeHtml(formatExpenseSplitSummary(expense))}</small>
        ${syncLine}
        ${metaHtml}
      </div>
      <time class="ledger-date" datetime="${escapeHtml(expense.date)}">${formatLedgerCardDate(expense.date)}</time>
      <strong class="ledger-amount">${formatLedgerMoney(expenseToCents(expense))}</strong>
      ${expandCue}
      <div class="ledger-item-actions">
        <button class="ledger-edit-button" type="button" data-edit-id="${escapeHtml(expense.id)}" aria-label="编辑这笔账">${uiIconHtml("edit")}</button>
        <button class="delete-button" type="button" data-delete-id="${escapeHtml(expense.id)}" aria-label="删除这笔账">${uiIconHtml("trash")}</button>
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
    .sort(compareExpensesNewestFirst);
}

function compareExpensesNewestFirst(a, b) {
  if (a.date !== b.date) return b.date.localeCompare(a.date);
  return (b.createdAt || b.updatedAt || "").localeCompare(a.createdAt || a.updatedAt || "")
    || (b.updatedAt || "").localeCompare(a.updatedAt || "")
    || b.id.localeCompare(a.id);
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
  const weekday = new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(parsed);
  return `${parsed.getMonth() + 1}/${parsed.getDate()} ${weekday}`;
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
  window.clearTimeout(mobileSubmitFeedbackTimer);
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

  if (isCloudLedgerActive() && !getOperatorFamilyId()) {
    showOperatorModal();
    showToast({ message: "请先选择你所属的家庭，再继续记账" });
    return;
  }

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

  const mobileDataFlow = window.matchMedia("(max-width: 820px), (pointer: coarse)").matches;
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
    showToast({ message: "已记下，账本状态已更新" });
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
    showToast({ message: "云端保存失败，本地已保留，稍后会重试" });
    showMobileSubmitFeedback("error", "稍后重试", "本地已保留 · 云端稍后重试");
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
  const flipRects = captureLedgerTransitionRects(transitionItems);
  expandedExpenseId = expenseId;
  transitionItems.forEach((item) => {
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
  transitionItems.forEach((item) => {
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
  const selectors = [".ledger-main", ".ledger-amount"];
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
  const duration = getCssDurationMs("--ledger-morph-motion", 280);
  const easing = getComputedStyle(document.documentElement).getPropertyValue("--ledger-morph-easing").trim() || "cubic-bezier(0.2, 0.72, 0.24, 1)";
  const animations = [];
  const runId = ++ledgerMorphRunId;

  elements.ledgerList?.classList.add("is-morphing-ledger-items");

  // 保留 capture 阶段量到的当前视觉高度，再释放上一轮动画以读取新状态的自然终点。
  rects.forEach((fromRect, element) => {
    if (element.classList?.contains("ledger-item")) {
      element._heightAnimation?.cancel();
      element._heightAnimation = null;
      element.style.height = "";
      element.style.minHeight = "";
      element.style.maxHeight = "";
    }
  });

  // 终点矩形先一次性读完再写起点样式：读写交错会让每个元素都触发一次强制回流。
  const toRects = new Map();
  rects.forEach((fromRect, element) => {
    if (!element.isConnected) return;
    toRects.set(element, element.getBoundingClientRect());
  });

  toRects.forEach((toRect, element) => {
    const fromRect = rects.get(element);

    // 卡片自身只动画 height；min/max 仅在动画期间解除，不参与逐帧插值。
    if (element.classList.contains("ledger-item")) {
      if (Math.abs(fromRect.height - toRect.height) < 1) return;
      element.style.height = `${fromRect.height}px`;
      element.style.minHeight = "0";
      element.style.maxHeight = "none";
      const animation = element.animate(
        [
          { height: `${fromRect.height}px` },
          { height: `${toRect.height}px` },
        ],
        { duration, easing, fill: "forwards" },
      );
      element._heightAnimation = animation;
      animations.push(animation);
      animation.finished.then(
        () => {
          if (element._heightAnimation !== animation) return;
          // 先让内联 height 落在终点，再原子化释放动画与尺寸约束。
          element.style.height = `${toRect.height}px`;
          animation.cancel();
          element.style.height = "";
          element.style.minHeight = "";
          element.style.maxHeight = "";
          element._heightAnimation = null;
        },
        () => {},
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
    animation.finished.then(() => animation.cancel(), () => {});
  });

  if (!animations.length) {
    if (runId === ledgerMorphRunId) elements.ledgerList?.classList.remove("is-morphing-ledger-items");
    return;
  }

  Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
    if (runId !== ledgerMorphRunId) return;
    elements.ledgerList?.classList.remove("is-morphing-ledger-items");
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
        expense.isDeleted = false;
        expense.updatedAt = new Date().toISOString();
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
  elements.settingsView.classList.remove("is-settlement-revealing");
  elements.settingsView.classList.toggle("is-settlement-revealed", settle && settingsMode === "settlement");
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
  /* 同时等待最后一条渐变线绘制和最后一笔金额落定，避免收尾截帧。 */
  const flowLinks = elements.settingsView.querySelectorAll(".settlement-flow-map .flow-link");
  const lastFlowDelay = Math.max(0, (flowLinks.length - 1) * 160);
  const settlementItems = elements.settingsView.querySelectorAll(".settlement-item");
  const lastSettlementDelay = Math.max(0, (settlementItems.length - 1) * MOTION_DELAYS.settlementStagger);
  const flowSequenceEnd = flowLinks.length ? 540 + lastFlowDelay + 1050 : 0;
  const cardSequenceEnd = settlementItems.length ? 1410 + lastSettlementDelay + 360 : 1220;
  const revealDuration = Math.max(1600, flowSequenceEnd, cardSequenceEnd) + 60;
  settlementRevealTimer = window.setTimeout(() => {
    settlementRevealTimer = 0;
    elements.settingsView.classList.remove("is-settlement-revealing");
    elements.settingsView.classList.add("is-settlement-revealed");
  }, revealDuration);
}

function openSettings(options = {}) {
  applySettingsMode(options.mode);
  clearSettlementReveal();
  if (settingsMode === "settings") {
    const collapseSecondaryGroups = window.matchMedia("(max-width: 820px), (pointer: coarse)").matches;
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
  });
  if (elements.settingsDrawer) elements.settingsDrawer.scrollTop = 0;
  startSettlementReveal();
}

/* 数据页的平账入口：复用设置抽屉的框架，但只展示平账任务内容。 */
function openSettlementInSettings() {
  openSettings({ mode: "settlement" });
}

function closeSettings() {
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
    showToast({ message: "还差一步：请选择一个家庭" });
    elements.operatorModalFamilyList.querySelector("button")?.focus();
    return;
  }

  localStorage.setItem(OPERATOR_FAMILY_STORAGE_KEY, familyId);
  renderOperatorFamilyChoices(elements.settingsOperatorFamilyList, familyId);
  renderOperatorFamilyChoices(elements.welcomeIdentityFamilyList, familyId);
  closeOperatorModal();
  showToast({ message: `已记住，你来自「${getFamilyName(familyId)}」` });
}

function handleSettingsOperatorSubmit(event) {
  event.preventDefault();
  const familyId = getSelectedOperatorFamilyId(elements.settingsOperatorFamilyList);
  if (!familyId) {
    showToast({ message: "还差一步：请选择一个家庭" });
    return;
  }

  localStorage.setItem(OPERATOR_FAMILY_STORAGE_KEY, familyId);
  renderOperatorFamilyChoices(elements.welcomeIdentityFamilyList, familyId);
  showToast({ message: `已保存，接下来将以「${getFamilyName(familyId)}」记录` });
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

/* 分享来源感知：来源文案 + 徽标。复制与预览原型 share-welcome.html 的 SOURCES 保持一致。 */
const SHARE_SOURCES = {
  default: {
    badge: "共享账本",
    icon: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/>',
    eyebrow: "欢迎加入",
    title: "三个家庭，一本账",
    copy: "这是你们三家的共享旅行账本。打开就能看到每个人记的每一笔，也能随手记一笔。"
  },
  qr: {
    badge: "扫码加入",
    icon: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8h3v3H8zM13 8h3v3h-3zM8 13h3v3H8zM14 14h2M16 16h.01"/>',
    eyebrow: "扫码加入",
    title: "账本，就在你手边",
    copy: "扫一下就进来了。这是家人共享的旅行账本，谁花了多少，打开全看得见。"
  },
  email: {
    badge: "邮件邀请",
    icon: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M4 7l8 6 8-6"/>',
    eyebrow: "来自一封邀请邮件",
    title: "家人喊你一起记账啦",
    copy: "点开链接就能加入。之后你记的每一笔，都会实时同步给其他两家。"
  },
  social: {
    badge: "社交分享",
    icon: '<path d="M4 12a8 8 0 0 1 8-8 8 8 0 0 1 0 16c-1.4 0-2.5-.4-3.6-1l-3 1 1-3c-.6-1-1-2.1-1-3.4z"/>',
    eyebrow: "来自社交分享",
    title: "朋友分享了一个共享账本",
    copy: "三家同行，账单一目了然。点进来认个家，旅程花销从此清清楚楚。"
  },
  message: {
    badge: "私信邀请",
    icon: '<path d="M21 11.5a8.4 8.4 0 0 1-12 7.5L3 21l2-6a8.4 8.4 0 1 1 16-3.5z"/>',
    eyebrow: "家人邀请你",
    title: "来一起算清这趟旅行",
    copy: "先选好你来自哪个家庭，之后每笔记账都带上你的名字。"
  }
};

function detectShareSource() {
  const params = new URLSearchParams(location.search);
  let from = params.get("from");
  if (!from) {
    const hashMatch = location.hash.match(/[?&]from=([^&]+)/);
    if (hashMatch) from = hashMatch[1];
  }
  const valid = ["qr", "email", "social", "message"];
  if (from && valid.includes(from)) {
    return { key: from, inviter: params.get("inviter") || "" };
  }
  const referrer = document.referrer || "";
  if (referrer) {
    if (/mail|email|outlook|gmail/i.test(referrer)) return { key: "email", inviter: "" };
    if (/weibo|twitter|facebook|instagram|t\.me|line\.me|reddit|douban/i.test(referrer)) return { key: "social", inviter: "" };
    if (/im\.qq|wx\.qq|message|wetransfer|dingtalk|feishu/i.test(referrer)) return { key: "message", inviter: "" };
  }
  return { key: "default", inviter: "" };
}

function applyShareSourceHero() {
  const src = detectShareSource();
  const s = SHARE_SOURCES[src.key] || SHARE_SOURCES.default;
  elements.welcomeHeroEyebrow.textContent = (src.inviter && (src.key === "message" || src.key === "email"))
    ? src.inviter + " 邀请你"
    : s.eyebrow;
  elements.welcomeTitle.textContent = s.title;
  elements.welcomeHeroCopy.textContent = s.copy;
  const badge = elements.welcomeSourceBadge;
  if (!badge) return;
  const badgeText = elements.welcomeSourceBadgeText;
  const badgeIcon = badge.querySelector("svg");
  badgeText.textContent = s.badge;
  if (badgeIcon) badgeIcon.innerHTML = s.icon;
  badge.hidden = false;
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
    elements.welcomeTitle.textContent = "三个家庭，一本账";
    elements.welcomeHeroCopy.textContent = "默认按各家人数分摊，也能为单笔账指定家庭或金额，最后自动算出平账建议。";
    if (elements.welcomeSourceBadge) elements.welcomeSourceBadge.hidden = true;
  }
  const cloudActive = invitedArrival || isCloudLedgerActive();
  elements.welcomeCloudTitle.textContent = cloudActive ? "三家实时同步" : "邀请家人一起记";
  elements.welcomeCloudCopy.textContent = cloudActive
    ? "云账本已开启，账单会自动同步；再选好家庭，每次编辑也都有迹可循。"
    : "在「设置 → 云同步与备份」创建云账本，把邀请链接发给家人，三家实时同步。";
  renderOperatorFamilyChoices(elements.welcomeIdentityFamilyList);
  elements.welcomeIdentityHint.textContent = cloudActive
    ? "选一下家庭，之后你记的每笔账都会带上你的名字。"
    : "本地账本可以稍后再选；开启云同步后，请先完成家庭选择。";

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
    showToast({ message: "还差一步：选好家庭，就可以一起记账了" });
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
  elements.welcomeNextLabel.textContent = isLast ? "立即查看" : "继续";
  elements.welcomeSkipButton.hidden = isLast;
  elements.welcomeNextButton.disabled = identityMissing;
  elements.welcomeNextButton.setAttribute("aria-disabled", String(identityMissing));
  /* 末屏终端 CTA：进入末屏后 2 秒才淡入，期间不可点击，避免一进来就误点跳过认家。
     离开末屏则复位，下次回到末屏重新计时。 */
  if (isLast) {
    if (!welcomeEnterRevealed) {
      elements.welcomeNextButton.classList.add("pending-reveal");
      elements.welcomeNextButton.classList.remove("is-revealed");
      if (!welcomeEnterTimer) {
        welcomeEnterTimer = window.setTimeout(function () {
          welcomeEnterRevealed = true;
          elements.welcomeNextButton.classList.remove("pending-reveal");
          elements.welcomeNextButton.classList.add("is-revealed");
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
  if (welcomeSlideIndex >= getWelcomeSlides().length - 1) {
    const familyId = getSelectedOperatorFamilyId(elements.welcomeIdentityFamilyList);
    if (familyId) {
      localStorage.setItem(OPERATOR_FAMILY_STORAGE_KEY, familyId);
      renderOperatorFamilyChoices(elements.settingsOperatorFamilyList, familyId);
    }
    if (welcomeRequiresFamily() && !getOperatorFamilyId()) {
      showToast({ message: "还差一步：请选择一个家庭" });
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
elements.categoryAddConfirm?.addEventListener("click", handleInlineCategoryAdd);
elements.newCategoryInput.addEventListener("input", updateCategoryAddConfirmState);
elements.newCategoryInput.addEventListener("keydown", handleNewCategoryKeydown);
elements.categoryChips.addEventListener("click", handleCategorySelection);
elements.categoryAddFab?.addEventListener("click", toggleCategoryAdd);
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
elements.settingsOperatorFamilyList.addEventListener("click", handleOperatorFamilyChoice);
elements.settingsMoneyDecimalsInput.addEventListener("change", handleMoneyDecimalsChange);
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
  closeSettings();
  openWelcome();
});
/* 横滑卡片按容器宽度定位，窗口尺寸变化时瞬时校正到当前页 */
window.addEventListener("resize", () => {
  if (isWelcomeOpen()) setWelcomeSlide(welcomeSlideIndex, { instant: true });
});
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
bindAnimatedDetails();
elements.settlementEntryButton?.addEventListener("click", openSettlementInSettings);
elements.mobileSettlementEntryButton?.addEventListener("click", openSettlementInSettings);
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
elements.amountInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || event.isComposing) return;
  event.preventDefault();
  elements.noteInput.focus();
});
elements.noteInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || event.isComposing) return;
  event.preventDefault();
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
  const isMobile = () => window.matchMedia?.("(max-width: 820px), (pointer: coarse)").matches ?? false;
  let headerFrame = 0;
  let lastProgress = -1;
  let wasCollapsed = false;

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

  /* 唯一的主页面滚动协调器：header 的文档流高度从不变化。展开所需的 47px
     由 .app-view 静态预留并随页面自然滚走；这里每帧只写合成层视觉进度。 */
  const applyHeaderProgress = () => {
    headerFrame = 0;
    const y = isMobile() ? (window.scrollY || window.pageYOffset || 0) : 0;
    if (!isMobile()) {
      lastProgress = 0;
      wasCollapsed = false;
      appHeader.style.setProperty("--mobile-header-progress", "0");
      appHeader.classList.remove("is-docking", "is-collapsed");
      return;
    }
    if (dockCoordsDirty) {
      updateSyncLampDock(true);
      dockCoordsDirty = false;
    }
    const headerStyle = window.getComputedStyle(appHeader);
    const collapseEnabled =
      (Number.parseFloat(headerStyle.getPropertyValue("--mobile-header-collapse-enabled")) || 0) >= 0.5;
    const collapseDistance =
      Number.parseFloat(headerStyle.getPropertyValue("--mobile-header-expand-offset")) || 47;
    if (!collapseEnabled) {
      lastProgress = 0;
      wasCollapsed = false;
      appHeader.style.setProperty("--mobile-header-progress", "0");
      appHeader.classList.remove("is-docking", "is-collapsed");
      return;
    }
    const rawProgress = Math.min(1, Math.max(0, y / collapseDistance));
    const progress = Math.round(rawProgress * 1000) / 1000;
    if (progress !== lastProgress) {
      lastProgress = progress;
      appHeader.style.setProperty("--mobile-header-progress", String(progress));
    }
    const isDocking = progress > 0.001 && progress < 0.999;
    const isCollapsed = progress >= 0.999;
    appHeader.classList.toggle("is-docking", isDocking);
    appHeader.classList.toggle("is-collapsed", isCollapsed);
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
      dockCoordsDirty = true;
      applyHeaderProgress();
    });
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
  const mobileQuery = window.matchMedia?.("(max-width: 820px), (pointer: coarse)");

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
  syncThemeColorMeta();
  /* 请求持久化存储：降低 Safari ITP 主动清空 localStorage/IndexedDB 的概率 */
  navigator.storage?.persist?.().catch(() => {});
  setupSubmitButtonSpotlight();
  setupScrollCollapse();
  render();
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

// P0-2: iOS/Safari 软键盘避让。interactive-widget=resizes-content 仅 Chromium 生效，
// Safari 是键盘悬浮覆盖、页面不 resize，直点输入框时不会自动滚入可视区，
// 偶发被固定头部/键盘遮挡。这里在窄屏聚焦文本输入后显式滚入视区中央，
// 复用 inputs/select 已有的 scroll-margin-block（12px 96px）避开头部与提交栏。
(() => {
  const mobileQuery = window.matchMedia("(max-width: 820px), (pointer: coarse)");
  const isTextEntry = (el) =>
    el && (el.tagName === "SELECT" || (el.tagName === "INPUT" && !["button", "checkbox", "radio", "range", "submit"].includes(el.type)));
  let focusedEl = null;

  const scrollFocusedIntoView = () => {
    if (!focusedEl || document.activeElement !== focusedEl) return;
    focusedEl.scrollIntoView({ block: "center", behavior: "auto" });
  };

  document.addEventListener("focusin", (e) => {
    if (!mobileQuery.matches) return;
    const t = e.target;
    if (isTextEntry(t)) {
      focusedEl = t;
      // 等键盘动画基本结束再滚（iOS 约 250-300ms），避免与 resize 抢滚动
      window.setTimeout(scrollFocusedIntoView, 300);
    }
  });
  document.addEventListener("focusout", (e) => {
    if (e.target === focusedEl) focusedEl = null;
  });
  // 键盘高度变化（含悬浮键盘完全弹起到位）后再校正一次
  window.visualViewport?.addEventListener("resize", () => {
    if (focusedEl && document.activeElement === focusedEl) {
      window.setTimeout(scrollFocusedIntoView, 50);
    }
  });
})();

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
