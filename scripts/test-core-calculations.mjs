import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
globalThis.window = globalThis;
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
};

for (const relativePath of ["src/core/money.js", "src/core/split.js", "src/core/ledger-calculation.js", "src/core/motion.js", "src/modules/welcome-sources.js"]) {
  vm.runInThisContext(await readFile(path.join(root, relativePath), "utf8"), { filename: relativePath });
}

const money = globalThis.JournaCore.money;
const motion = globalThis.JournaCore.motion;
assert.deepEqual(Object.keys(money).sort(), [
  "amountToCents",
  "centsToAmount",
  "expenseToCents",
  "formatAmountInput",
  "formatMoney",
  "normalizeAmountDecimalSeparators",
  "parseAmountInput",
]);
assert.equal(money.expenseToCents({ amount: 12.34 }), 1234);
assert.equal(money.amountToCents("8.88"), 888);
assert.equal(money.centsToAmount(1234), 12.34);
assert.match(money.formatMoney(1234), /12\.34/);
assert.equal(money.parseAmountInput("12。34"), 12.34);
assert.equal(money.parseAmountInput("12．34"), 12.34);

for (const profile of [motion.SPRING_BAR_COLLAPSE, motion.SPRING_BAR_EXPAND]) {
  const sample = motion.barMotionSamples(profile);
  const baselineTransfer = motion.barTransferSamples(profile);
  const reusedTransfer = motion.barTransferSamples({
    ...profile,
    positionValues: sample.values,
  });
  const deltas = sample.values.slice(1).map((value, index) => value - sample.values[index]);
  const earlyStart = Math.round((sample.values.length - 1) * 0.05);
  const earlyEnd = Math.round((sample.values.length - 1) * 0.15);
  const middleStart = Math.round((sample.values.length - 1) * 0.30);
  const middleEnd = Math.round((sample.values.length - 1) * 0.50);
  const tailStart = Math.round((sample.values.length - 1) * 0.65);
  const earlyDeltas = deltas.slice(earlyStart, earlyEnd);
  const middleDeltas = deltas.slice(middleStart, middleEnd);
  const tailDeltas = deltas.slice(tailStart);
  assert.equal(sample.values.at(-1), 1);
  assert.ok(sample.values.every((value) => value >= 0 && value <= 1));
  assert.ok(deltas.every((delta) => delta >= 0));
  assert.ok(Math.max(...middleDeltas) >= Math.max(...earlyDeltas) * 2.5, "中段速度变化应足够明显");
  assert.ok(1 - sample.values[tailStart] >= 0.155, "末段 35% 应保留至少 15.5% 的可见形变");
  assert.ok(tailDeltas.slice(1).every((delta, index) => delta <= tailDeltas[index] + 1e-9), "末段速度应持续下降");
  assert.ok(tailDeltas.at(-1) <= tailDeltas[0] * 0.06, "落点速度应接近 0");
  assert.deepEqual(reusedTransfer, baselineTransfer, "复用位移采样不得改变文字交接轨迹");
  assert.equal(reusedTransfer.position.length, sample.values.length);
  assert.equal(reusedTransfer.opacity.length, sample.values.length);
  assert.equal(reusedTransfer.scale.length, sample.values.length);
  if (profile.direction === "collapse") {
    assert.equal(reusedTransfer.position, sample.values, "收起轨迹应直接复用底栏位移数组");
  }
}
const mobilePanelTotal = motion.MOTION_DELAYS.mobilePanelOut + motion.MOTION_DELAYS.mobilePanelIn;
assert.equal(motion.SPRING_BAR_COLLAPSE.duration, mobilePanelTotal);
assert.equal(motion.SPRING_BAR_EXPAND.duration, mobilePanelTotal);
assert.equal(motion.MOTION_DELAYS.mobilePanelIndicator, mobilePanelTotal);

const families = [
  { id: "family-a", name: "甲家" },
  { id: "family-b", name: "乙家" },
  { id: "family-c", name: "丙家" },
];
const split = globalThis.JournaCore.createSplitCore({
  splitModeOptions: ["equal", "all", "families", "families_equal", "custom"].map((id) => ({ id })),
  defaultFamilies: families,
});
assert.equal(split.normalizeSplitMode("not-a-mode"), "all");
assert.deepEqual(split.normalizeSplitFamilyIds(["family-b", "unknown"], ["family-a"]), ["family-b"]);
assert.deepEqual(split.normalizeSplitAmounts({ "family-a": 1.235, "family-b": -2 }), {
  "family-a": 1.24,
  "family-b": 0,
  "family-c": 0,
});

const state = {
  families,
  familyMembers: { "family-a": 2, "family-b": 3, "family-c": 1 },
  categories: ["餐饮"],
};
const expenses = [
  { amount: 60, payerId: "family-a", category: "餐饮", splitMode: "all" },
  {
    amount: 30,
    payerId: "family-b",
    category: "餐饮",
    splitMode: "custom",
    splitAmounts: { "family-a": 10, "family-b": 20, "family-c": 0 },
  },
];
const calculator = globalThis.JournaCore.createLedgerCalculator({
  getState: () => state,
  getActiveExpenses: () => expenses,
  expenseToCents: money.expenseToCents,
  amountToCents: money.amountToCents,
  normalizeSplitMode: split.normalizeSplitMode,
  getSplitScopeFromMode: split.getSplitScopeFromMode,
  getSplitRuleFromMode: split.getSplitRuleFromMode,
  normalizeSplitFamilyIds: split.normalizeSplitFamilyIds,
  normalizeSplitAmounts: split.normalizeSplitAmounts,
  getSettlementMethod: () => "simple",
});
const summary = calculator.calculateSummary();
assert.equal(summary.totalCents, 9000);
assert.equal(summary.totalMembers, 6);
assert.equal(summary.shareCents, 1500);
assert.deepEqual(summary.shareByFamily, { "family-a": 3000, "family-b": 5000, "family-c": 1000 });
assert.deepEqual(summary.paidByFamily, { "family-a": 6000, "family-b": 3000, "family-c": 0 });
assert.equal(summary.scopedExpenseCount, 1);
assert.deepEqual(summary.settlements, [
  { from: "乙家", fromFamilyId: "family-b", to: "甲家", toFamilyId: "family-a", cents: 2000 },
  { from: "丙家", fromFamilyId: "family-c", to: "甲家", toFamilyId: "family-a", cents: 1000 },
]);

const cycleState = {
  ...state,
  familyMembers: { "family-a": 1, "family-b": 1, "family-c": 1 },
};
const cycleExpenses = [
  { amount: 40, payerId: "family-b", category: "餐饮", splitMode: "custom", splitAmounts: { "family-a": 40, "family-b": 0, "family-c": 0 } },
  { amount: 30, payerId: "family-c", category: "餐饮", splitMode: "custom", splitAmounts: { "family-a": 0, "family-b": 30, "family-c": 0 } },
  { amount: 20, payerId: "family-a", category: "餐饮", splitMode: "custom", splitAmounts: { "family-a": 0, "family-b": 0, "family-c": 20 } },
];
const createCycleCalculator = (settlementMethod) => globalThis.JournaCore.createLedgerCalculator({
  getState: () => cycleState,
  getActiveExpenses: () => cycleExpenses,
  expenseToCents: money.expenseToCents,
  amountToCents: money.amountToCents,
  normalizeSplitMode: split.normalizeSplitMode,
  getSplitScopeFromMode: split.getSplitScopeFromMode,
  getSplitRuleFromMode: split.getSplitRuleFromMode,
  normalizeSplitFamilyIds: split.normalizeSplitFamilyIds,
  normalizeSplitAmounts: split.normalizeSplitAmounts,
  getSettlementMethod: () => settlementMethod,
});
assert.deepEqual(createCycleCalculator("simple").calculateSummary().settlements, [
  { from: "甲家", fromFamilyId: "family-a", to: "乙家", toFamilyId: "family-b", cents: 1000 },
  { from: "甲家", fromFamilyId: "family-a", to: "丙家", toFamilyId: "family-c", cents: 1000 },
]);
assert.deepEqual(createCycleCalculator("pairwise").calculateSummary().settlements, [
  { from: "甲家", fromFamilyId: "family-a", to: "乙家", toFamilyId: "family-b", cents: 4000 },
  { from: "乙家", fromFamilyId: "family-b", to: "丙家", toFamilyId: "family-c", cents: 3000 },
  { from: "丙家", fromFamilyId: "family-c", to: "甲家", toFamilyId: "family-a", cents: 2000 },
]);

const dynamicFamilies = [...families, { id: "family-d", name: "丁家", active: true }];
split.setFamilyIds(dynamicFamilies);
assert.equal(split.normalizePayerId("family-d"), "family-d");
assert.deepEqual(split.normalizeSplitAmounts({ "family-d": 12.345 }), {
  "family-a": 0,
  "family-b": 0,
  "family-c": 0,
  "family-d": 12.35,
});
const dynamicState = {
  families: dynamicFamilies,
  familyMembers: { "family-a": 1, "family-b": 1, "family-c": 1, "family-d": 1 },
  categories: ["餐饮"],
};
const dynamicExpenses = [{
  amount: 90,
  payerId: "family-a",
  category: "餐饮",
  splitMode: "equal",
  // 旧账快照只包含当时的三家；新增家庭不能反向分摊这笔账。
  splitFamilyIds: ["family-a", "family-b", "family-c"],
}];
const dynamicCalculator = globalThis.JournaCore.createLedgerCalculator({
  getState: () => dynamicState,
  getActiveExpenses: () => dynamicExpenses,
  expenseToCents: money.expenseToCents,
  amountToCents: money.amountToCents,
  normalizeSplitMode: split.normalizeSplitMode,
  getSplitScopeFromMode: split.getSplitScopeFromMode,
  getSplitRuleFromMode: split.getSplitRuleFromMode,
  normalizeSplitFamilyIds: split.normalizeSplitFamilyIds,
  normalizeSplitAmounts: split.normalizeSplitAmounts,
  getSettlementMethod: () => "simple",
});
assert.deepEqual(dynamicCalculator.calculateSummary().shareByFamily, {
  "family-a": 3000,
  "family-b": 3000,
  "family-c": 3000,
  "family-d": 0,
});
split.setFamilyIds(families);

assert.deepEqual(globalThis.JournaWelcomeSources.detectShareSource({
  search: "?from=email&inviter=小明",
  hash: "",
  referrer: "",
}), { key: "email", inviter: "小明" });
assert.deepEqual(globalThis.JournaWelcomeSources.detectShareSource({
  search: "",
  hash: "#join?from=qr",
  referrer: "",
}), { key: "qr", inviter: "" });
assert.deepEqual(globalThis.JournaWelcomeSources.detectShareSource({
  search: "",
  hash: "",
  referrer: "https://mail.example.test/invite",
}), { key: "email", inviter: "" });

console.log("CORE_CALCULATIONS_OK");
