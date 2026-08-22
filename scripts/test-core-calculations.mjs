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

for (const relativePath of ["src/core/money.js", "src/core/split.js", "src/core/ledger-calculation.js", "src/modules/welcome-sources.js"]) {
  vm.runInThisContext(await readFile(path.join(root, relativePath), "utf8"), { filename: relativePath });
}

const money = globalThis.JournaCore.money;
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
