#!/usr/bin/env node
/**
 * 对比度回归脚本（无依赖，node scripts/check-contrast.mjs 直接运行）
 * 硬编码本项目关键前景/背景组合，按 WCAG 2.x 相对亮度公式计算对比度。
 * 正文字号目标：≥ 4.5:1。任何一组 FAIL 即退出码 1。
 *
 * 色值来源：
 *  - styles.css :root 变量区
 *  - app.js familyVisuals / categoryVisuals
 * 若修改上述色值，请同步更新本清单。
 */

const TARGET = 4.5;

// ---------- 基础色 ----------
const PAGE_BG = "#f7f9f8";                    // --bg
const SURFACE = { rgb: "#ffffff", a: 0.88 };  // --surface
const INK = "#202427";                        // --ink
const MUTED = "#5b625f";                      // --muted

// familyVisuals（app.js）
const FAMILIES = {
  "乐家": { color: "#90ad9d", text: "#557965", washA: 0.16 },
  "祺家": { color: "#9dafc9", text: "#61769a", washA: 0.16 },
  "旦家": { color: "#d4abab", text: "#956868", washA: 0.15 },
};

// categoryVisuals（app.js）
const CATEGORIES = {
  "交通": { bg: "#d9e8e2", text: "#486d62" },
  "住宿": { bg: "#dfe5f2", text: "#536782" },
  "餐饮": { bg: "#f1dfce", text: "#7a5b3f" },
  "门票": { bg: "#eadff0", text: "#69587b" },
  "购物": { bg: "#eddcdf", text: "#7b565c" },
  "其他": { bg: "#e5e2d8", text: "#696252" },
};

// ---------- 颜色工具 ----------
const hex = (h) => {
  const s = h.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
};

// src(alpha) 叠在不透明 dst 上
const over = (srcRgb, a, dstRgb) =>
  srcRgb.map((c, i) => c * a + dstRgb[i] * (1 - a));

// color-mix(in srgb, A p%, B) 的近似（srgb 线性插值）
const mix = (aRgb, p, bRgb) =>
  aRgb.map((c, i) => c * p + bRgb[i] * (1 - p));

const luminance = ([r, g, b]) => {
  const f = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

const contrast = (fg, bg) => {
  const [l1, l2] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
};

// 卡片实际底色：--surface 叠在页面底色上（≈ 近白）
const CARD_BG = over(hex(SURFACE.rgb), SURFACE.a, hex(PAGE_BG));

// ---------- 组合清单 ----------
const checks = [];

// 1) 三家选中态：白字 on 深文字色填充（渐变浅端 = color-mix(text 92%, white)）
for (const [name, f] of Object.entries(FAMILIES)) {
  // 选中态 = 家庭色提白的浅色填充 + 深色家庭标签（深文字向黑 70%）
  const fillTop = mix(hex(f.color), 0.38, hex("#ffffff"));
  const fillBottom = mix(hex(f.color), 0.50, hex("#ffffff"));
  const label = mix(hex(f.text), 0.70, hex("#000000"));
  checks.push([`家庭选中深标签 · ${name}（浅填充顶）`, label, fillTop]);
  checks.push([`家庭选中深标签 · ${name}（浅填充底）`, label, fillBottom]);
}

// 2) 家庭深文字作为正文：渲染在账单项近白底上（family-color 约 7% 淡染，再压白渐变层）
for (const [name, f] of Object.entries(FAMILIES)) {
  const tintBase = over(mix(hex(f.color), 0.07, hex("#ffffff")), 0.68, CARD_BG);
  const itemBg = over(hex("#ffffff"), 0.75, tintBase);
  checks.push([`家庭深文字·正文 · ${name}`, hex(f.text), itemBg]);
}

// 3) 类别六色 文字/底色
for (const [name, c] of Object.entries(CATEGORIES)) {
  checks.push([`类别文字 · ${name}`, hex(c.text), hex(c.bg)]);
}

// 4) --muted 于卡片底
checks.push(["--muted on 卡片底", hex(MUTED), CARD_BG]);

// 5) 总支出标签 rgba(37,48,45,0.72) on 三色渐变（分别按三段底色合成）
const totalStops = [
  ["乐家段", "#a9ceb5", 0.56],
  ["祺家段", "#b9c9e6", 0.56],
  ["旦家段", "#efc2bf", 0.54],
];
for (const [seg, color, a] of totalStops) {
  const segBg = over(hex(color), a, CARD_BG);
  const label = over(hex("#25302d"), 0.72, segBg);
  checks.push([`总支出标签 · ${seg}`, label, segBg]);
}

// 6) 总支出数字（--total-text-color 不透明）on 三色渐变
for (const [seg, color, a] of totalStops) {
  const segBg = over(hex(color), a, CARD_BG);
  checks.push([`总支出数字 · ${seg}`, hex("#25302d"), segBg]);
}

// 7) 正文 --ink 于卡片底（基线守护）
checks.push(["--ink on 卡片底", hex(INK), CARD_BG]);

// ---------- 输出 ----------
let failed = 0;
const pad = (s, n) => s + " ".repeat(Math.max(0, n - [...s].reduce((w, ch) => w + (ch.charCodeAt(0) > 255 ? 2 : 1), 0)));
console.log(pad("组合", 40) + pad("对比度", 10) + "结果");
console.log("-".repeat(58));
for (const [name, fg, bg] of checks) {
  const ratio = contrast(fg, bg);
  const ok = ratio >= TARGET;
  if (!ok) failed++;
  console.log(pad(name, 40) + pad(ratio.toFixed(2) + ":1", 10) + (ok ? "PASS" : "FAIL"));
}
console.log("-".repeat(58));
console.log(failed === 0 ? `全部 ${checks.length} 组 PASS（目标 ≥ ${TARGET}:1）` : `${failed} 组 FAIL`);
process.exit(failed === 0 ? 0 : 1);
