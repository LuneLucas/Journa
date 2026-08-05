# 自然语言透镜不等宽灰框与厚度线 QA（2026-08-04 · v41）

## Source and implementation

- 材质参考：`/var/folders/0d/0l704wf17hd7rdq1gtsk1k640000gp/T/codex-clipboard-5e06f46c-a3fd-4696-b052-addd2840db1b.png`（2054 × 468 px）。本轮聚焦参考图右端不等宽灰弧与上下浅灰厚度线。
- 修改前实现：`/private/tmp/journa-lens-final-390.png`（390 × 844 px，v40）。
- 修改后实现：`/private/tmp/journa-lens-rim-v41-390.png`（390 × 844 px）。
- 同一输入聚焦对照：`/private/tmp/journa-lens-rim-comparison-v41.jpg`；参考置顶，v40 与 v41 的自然语言 token 裁切并排。
- CSS 视口与实现截图均为 390 × 844，device scale factor 1；另在 320 × 568 验证窄屏。状态为移动端、浅色、自然语言记账、编辑舞台关闭。

## Findings and iteration history

- [P2] v40 只剩透明表面与软阴影，右侧没有足够明确的不等宽灰弧，透镜高度证据不足。
  - Evidence：v40 聚焦裁切里右圆头几乎与背景融为一体，各 token 更像浮起的文字而不是有曲率的透明物体。
  - Fix：加入右侧约 1.75px、带 2.5px 软化的不等宽内弧；左侧只保留低透明度弱收边。激活态右弧提高到约 2px。
  - Post-fix：v41 对照中右圆头可稳定读出，左右亮度不对称，中心仍透出页面底色。
- [P2] v40 上下边缘主要由模糊影形成，缺少参考图里的薄灰厚度线。
  - Fix：上下各加入 1px 中性浅灰内线；顶线更淡，底线略深，继续使用同一左上光照方向。
  - Post-fix：v41 的长短 token 均可读出上下厚度，未恢复内部灰雾或大面积实色填充。

## Required fidelity surfaces

- Fonts and typography：字体、字号、字重、字距、行高、基线与文字颜色未变。
- Spacing and layout rhythm：伪元素 `inset`、圆角、44px 点击区域和三行摘要几何未变；390px 流宽 330px，320px 文档宽与视口同为 320px。
- Colors and visual tokens：中心继续使用 v40 的近透明中性表面；新增结构线仅使用低透明度灰阶。暗色模式采用相同方向、反转明暗的边缘关系。
- Image quality and assets：没有新增或替换图像资产；现有笔迹位图未变。
- Copy and content：字段文案、账单内容、无障碍名称与编辑语义均未变。

## Interaction and validation

- 320 × 568 下六枚 token 全部位于视口内；`备注可选` 可正常打开 note 编辑舞台，`aria-expanded=true`。
- 浏览器控制台 0 条 error / warning。
- `git diff --check`、`app.js` / `sw.js` 语法检查通过；23/23 组对比度检查 PASS（目标 ≥ 4.5:1）。
- `index.html`、`app.js` 与 `sw.js` 已同步为 `journa-natural-lens-rim-v41-20260804`。

No actionable P0/P1/P2 findings remain for the requested rim-height and thickness-line refinement.

final result: passed

---

# Final QA status — settlement flow receiver-dominant color v4（2026-08-05）

- Selected visual direction: receiver-dominant curved routes. Payer family colors remain at the origin and short opening segment; the receiver family color owns the merge and terminal segment.
- Removed the neutral midpoint bridge that still read as a colored tube. The SVG gradient now switches to the receiver color by 31%, while the moving highlight remains a near-white narrow head with a short family-tinted tail.
- Browser verification passed over HTTP with two settlement routes: app version `journa-total-card-frame-v4-20260805`, two finite highlight iterations per route, 105ms route staggering, and zero console errors.
- Static validation passed: `git diff --check`, Node syntax checks for `app.js` and `sw.js`, and all 54 contrast combinations.
- Physical iPhone Safari/PWA compositing remains a release-device check, not a browser-emulation claim.

final result: passed

---

# Final QA status — settlement flow continuous sheen v5（2026-08-06）

- Stable settlement state now uses finite-safe continuous sheen loops only while the settlement drawer is visible and not closing; hidden or closing drawers compute `animation: none`, `opacity: 0`, and `will-change: auto`.
- The moving core is brighter and wider (`0.98` opacity, 48% of route width); the family-color tail is wider, brighter, and softly filtered (`0.56` active opacity).
- Browser verification passed over HTTP with two routes: stable state reports `infinite` at 1.32s/1.5s, while closed state stops all four sheen layers. Console errors: 0.
- Static validation passed: `git diff --check`, Node syntax checks for `app.js` and `sw.js`, and all 54 contrast combinations. Cache version is `journa-total-card-frame-v5-20260806`.

final result: passed

---

# Natural-entry optional-note opening stutter QA（2026-08-05）

- 空备注镜像文字此前在打开动画 44% 到 45% 之间把位移从源点离散切到 `translateX(-50%)`，造成中段横向跳帧。
- 现在“备注可选”全程保持源位置，只做淡出；真实输入在 `is-text-handed-off` 接力点才显示，开场不再同时绘制两层文字。
- 保留 550ms 打开主时间线、120ms 文字接力、金额灰线滚动容器修复和 reduced-motion 直接接管路径。

final result: pending browser frame verification

---

# Natural-entry highlight handoff QA（2026-08-05）

- shell 边缘高光首帧透明度降为 0，前 60–80ms 从低强度建立，不再在收回开始时突然闪亮。
- 中段顶部光逐渐转向左上侧边缘，末段透明度降至低强度，与 390–550ms 透镜高光接力连续衔接。
- 高光仍由边缘遮罩绘制，中央文字区域保持透明，不新增 DOM 或公开接口。

final result: pending browser frame verification

---

# Natural-entry card-to-lens continuity QA（2026-08-05）

- 收回外壳继续作为唯一几何载体；初始阶段保留卡片材质，不再首帧直接切换为透镜材质。
- 390ms 后目标 token 的透镜伪元素从 `scaleX(.86) scaleY(.90)`、轻微下沉和透明态进入，在 550ms 恢复完整水滴形态。
- 460–550ms 外壳溶解与透镜材质、高光和厚度线重叠接手，避免卡片消失后透镜突然出现。

final result: pending browser frame verification

---

# Natural-entry text/card close-rate sync QA（2026-08-05）

- 文字 handoff 从 460ms 延后至 500ms，最后 50ms 与 550ms 卡片收回尾段共同落定，修复文字先停住造成的拖沓感。
- 飞行文字现在读取舞台 `--natural-stage-curve`，与 shell、家庭色膜和透镜接力使用同一条收回曲线。
- 保留 390–550ms 透镜接力、590ms 安全清理、金额/备注几何修复与 reduced-motion 路径。

final result: pending browser frame verification

---

# Natural-entry close-tail deceleration QA（2026-08-05）

- 收回曲线统一为 `cubic-bezier(0.12, 0.68, 0.18, 1)`：前段更快完成主要位移，尾段保留明显减速，不再全程慢速匀收。
- 透镜接力从 390ms 开始、持续 160ms，位于 550ms 收回主时间线的最后阶段，确保卡片先减速再落入透镜。
- 外壳、飞行文字、家庭色膜和透镜使用同一收回曲线；打开曲线、备注中心接力、金额滚动容器与 reduced-motion 路径保持不变。

final result: pending browser frame verification

---

# Natural-entry close compositor simplification QA（2026-08-04 · v17）

- 关闭阶段的舞台根节点不再运行独立 `clip-path` 动画，也不再保留后置 `liquid-fold` 或 `clip-path` transition；shell 是唯一负责卡片到透镜形态收缩的元素。
- shell 明确使用 `will-change: clip-path, opacity`；家庭色薄膜只由 opacity 关键帧淡出，高光伪元素取消默认 transition，静态阴影、渐变和透镜材质保持不变。
- 关闭前只结算已有 token 动画并批量读取源/目标几何；移除关闭起始帧的 `renderNaturalEntry()`，避免重复舞台定位和布局测量。
- 版本戳已同步为 `journa-natural-entry-close-flow-v17-20260804`；保留 680ms 可见时间线、720ms 清理、80–520ms 飞行文字、380–680ms 透镜接力、金额/备注滚动容器修复与 run-id 清理。

## Verification

- Static validation: `node --check app.js`, `node --check sw.js`, `git diff --check`, cache-stamp agreement, and the existing 33 contrast combinations.
- Browser verification target: 319 × 907, 320 × 568, and 390 × 844; sample close frames at 0/40/80/120/180/260/380/460/520/600/680/720ms, including amount, note, category, split, rapid reopen, editor switch, immediate close, reduced motion, and overflow.
- Release note: local browser sampling validates layer ownership and handoff timing; physical iPhone Safari/PWA compositing remains a release-device check.

final result: passed static validation and v17 local load; mobile 319/320/390 frame sampling remains a release-device check because this browser session is fixed at 1280 × 720.

---

# Natural-entry text handoff stabilization QA（2026-08-04 · v18）

- 所有自然录入 token 统一使用内部文字层；透镜与笔迹仍由 token 容器伪元素独立绘制，关闭时不再通过整个 token 的颜色自定义属性隐藏文字。
- 飞行文字改为实际字形中心与基线对齐，使用金额/备注真实输入文字区域作为源位置；运动盒取消 `overflow: hidden`，长备注和金额不会在缩放途中裁切。
- 关闭文字从起始帧保持可见，0–120ms 与舞台内容交叉淡化，520–680ms 与句中文字层接手；stage token 关闭时不再运行隐藏的竞争性位移动画。
- 版本戳同步为 `journa-natural-entry-text-handoff-v18-20260804`。

## Verification

- Static validation: `node --check app.js`, `node --check sw.js`, `git diff --check`, cache-stamp agreement, and the existing contrast checks.
- Browser verification target: all six fields at 319 × 907, 320 × 568, and 390 × 844; sample close frames at 0/40/80/120/180/380/460/520/600/680/720ms, including long notes, rapid reopen, editor switching, immediate close, reduced motion, and overflow.
- Release note: local browser sampling validates text-layer ownership and geometry; physical iPhone Safari/PWA compositing remains a release-device check.

final result: pending fresh mobile frame sampling; static validation follows below.

---

# Natural-entry GitHub choreography · 550ms QA（2026-08-04 · v19）

- 参考 `origin/main` / `969a2a2` 的单一 flight token 收回方式：文字首帧可见，约 460ms 开始目标 token 接手，550ms 完成可见动画。
- 打开与关闭主动画统一为 550ms；舞台在约 590ms 做安全清理，不参与可见动画。
- 保留金额与备注滚动容器、备注中心测量、家庭色文字、透镜材质和 run-id 清理机制。
- 版本戳同步为 `journa-natural-entry-github-550ms-v22-20260805`。
- 家庭与类别选项在自然录入舞台内使用 550ms 退选反馈；普通表单仍保留原有短反馈时长，避免影响其他选择控件。
- 金额关闭源几何改为完整 `amount-value-track`（货币符号 + 输入文字）并修复金额 token label 覆盖，确保水平中心和垂直轨道中心一致。

## Verification

- Static validation: `node --check app.js`, `node --check sw.js`, `git diff --check`, cache-stamp agreement, and the existing contrast checks.
- Browser verification target: 319 × 907, 320 × 568, and 390 × 844; sample 0/80/160/280/380/460/500/550/590ms for all six fields, long notes, rapid reopen, editor switching, immediate close, reduced motion, and overflow.
- Release note: physical iPhone Safari/PWA compositing remains a release-device check.

final result: pending fresh mobile frame sampling; static validation follows below.

---

# Final QA status — natural-entry close flow v16（2026-08-04）

- Close timing is now one 680ms visible timeline with a 720ms cleanup guard. The shell contracts continuously, the family film fades from 80–520ms, and the neutral shell dissolves from 460–680ms while the summary lens returns from 380ms, so the two surfaces overlap instead of handing off after cleanup.
- The flight token is measured from the visible amount track, note input text box, or active editor control. It stays visible from 80ms, travels on `cubic-bezier(0.28, 0.08, 0.20, 1)`, and cross-fades into the sentence token from 520–680ms. The source token container remains opaque so its lens and mark keep independent timelines.
- Editable sentence values derive a family text variant (light 65% family + 35% black; dark 55% family + 45% white); connector words continue to use `var(--ink)`. The flight color interpolates from the actual editor text color to that destination color.
- Rapid reopen, editor switching, immediate close, and run-id guarded cleanup clear stale flight/lens/mark state. Amount and note keep the v15 non-scrolling stage guard.
- Fresh-cache browser sampling passed at 319 × 907, 320 × 568, and 390 × 844 in the local dark natural-entry surface. At 319px, `scrollTop` stayed 0; at 320/390px the stage cleaned at 720ms, the flight token was removed, and `documentElement.scrollWidth === innerWidth`. Empty and filled note routes landed within 1px of the sentence token center/baseline. The clean v16 tab reported no console warnings/errors.
- Static validation passed: `git diff --check`, Node syntax checks for `app.js` and `sw.js`, cache-stamp synchronization, and 33 contrast combinations (the existing 23 plus five family colors in light/dark token variants). Physical iPhone Safari/PWA compositing remains a release-device check.

final result: passed

---

# Natural-entry lens material and unified relay QA（2026-08-04）

## Evidence

- Source visual truth:
  - `/var/folders/0d/0l704wf17hd7rdq1gtsk1k640000gp/T/codex-clipboard-f10b9479-007a-4bbd-8646-fbd76e3642b2.png` — amount expansion defect, 500 × 148 px.
  - `/var/folders/0d/0l704wf17hd7rdq1gtsk1k640000gp/T/codex-clipboard-46141442-0516-4dcd-be29-f5b44505cc56.png` — misplaced optional-note handoff, 476 × 164 px.
  - `/var/folders/0d/0l704wf17hd7rdq1gtsk1k640000gp/T/codex-clipboard-0760371f-7f88-426d-ac5e-addca9245d1c.png` — upper-left 45-degree lighting and upper-right variable-width depth reference, 2054 × 468 px.
- Browser-rendered implementation: `/private/tmp/journa-lens-relay-final-390x844.png`, 390 × 844 px at a 390 × 844 CSS viewport and device scale factor 1.
- Focused implementation crop: `/private/tmp/journa-lens-relay-focus-390.png`, 118 × 60 px. Combined material comparison: `/private/tmp/journa-lens-comparison.png`.
- Interaction frames:
  - amount open handoff `/private/tmp/journa-amount-open-handoff.png`;
  - note open handoff `/private/tmp/journa-note-open-handoff.png`;
  - category opening morph `/private/tmp/journa-category-open-morph.png`;
  - amount close handoff `/private/tmp/journa-amount-close-handoff.png`.
- Additional viewport: 320 × 568 CSS px, device scale factor 1. Document width remained 320px; the natural-entry flow measured x=26, width=268, right=294, scrollWidth=268.
- State: mobile natural-language entry, dark system appearance for the browser capture. The supplied light reference is used as the material/lighting target; dark-mode colors intentionally adapt contrast while preserving light direction and edge hierarchy.

## Required fidelity surfaces

- Fonts and typography: summary text, amount numeral font, weights, baselines, and copy are unchanged. The amount mirror now fades before it can scale into the oversized intermediate numeral; the optional note hint fades at the source position instead of becoming a visible stage title.
- Spacing and layout rhythm: stage/source anchor geometry is unchanged. Category now uses the shared 28px morph radius from the first opening frame, so the capsule-to-rounded-rectangle transition begins with the card expansion instead of lagging behind it.
- Colors and visual tokens: the lens has a restrained 45-degree upper-left specular wash plus a concentrated radial/inset upper-right gray falloff at 100% x / 42% y. Light and dark variables use the same material logic; family tint stays on the shrinking stage and fades across the motion instead of disappearing before the summary lens returns.
- Image quality and asset fidelity: no reference imagery is embedded in the UI and no raster placeholder was introduced. The effect remains resolution-independent CSS material on the existing token surface; supplied screenshots are comparison evidence only.
- Copy and content: all Journa labels remain unchanged. “备注可选” is still the closed-state affordance and accessible button name, while the real note input placeholder appears only after the hint has faded.

## Findings and comparison history

- [P1 fixed] Amount opened through a 1.72× stage mirror before snapping to the real input. The mirror now exits by 22% without enlargement; `/private/tmp/journa-amount-open-handoff.png` shows a forming shell with no oversized duplicate, followed by the normal input.
- [P1 fixed] Empty-note copy remained visible through 84% and crossed the stage title position. It now fades at its source between 18% and 38%; `/private/tmp/journa-note-open-handoff.png` shows no readable misplaced title before the input enters.
- [P2 fixed] Category retained the pill radius too long. The sampled first frame reports `--natural-stage-morph-radius: 28px`, with both stage and shell clip paths already using `round 28px`; `/private/tmp/journa-category-open-morph.png` confirms the earlier rounded-rectangle shape.
- [P1 fixed] Close handoff forced the source lens to opacity 0 with `!important`, so it could not animate and appeared only after cleanup. CSS animation now owns lens opacity, overlaps the shrinking shell from 300–520ms, and the shell uses the same lens surface while family tint fades from 80–480ms.
- [P1 fixed] Amount close briefly showed the large input and small flight copy together. The flight copy now remains at opacity 0 through the 120ms content exit, then enters over 60ms; `/private/tmp/journa-amount-close-handoff.png` shows one amount layer in the first close frame.
- No actionable P0, P1, or P2 differences remain.

## Verification

- Primary interactions tested: open and close amount; open empty note through real input; open category and inspect the first morph frame; close via Escape/backdrop control; verify final source lens restoration.
- Browser console: no warnings or errors at 390 × 844 and 320 × 568.
- Static checks: `git diff --check`, Node syntax checks for `app.js` and `sw.js`, cache-stamp agreement, and all 23 contrast groups pass.
- Residual release check: desktop browser emulation does not certify physical iPhone Safari/PWA compositing; confirm once on-device before publishing.

final result: passed

---

# Natural-entry stage relay smoothness follow-up（2026-08-04）

- Feedback root cause: the stage title was still receiving the legacy arrival animation after the 560ms relay, and render refreshes could invoke the character-by-character token animation while the card was moving.
- Stage title now follows the current GitHub `main` text path: the arrive easing on open and the measured WAAPI flight handoff on close. The local relay keeps the max-content text box and disables only the legacy second arrival after settling.
- The opening family film now lets its 160ms opacity keyframe own the first paint; a static `opacity: 0 !important` was removed because it caused a color snap when the opening class was cleared.
- The expanding title now uses a compositor-only `transform` track from the measured anchor offset to center; `left` layout animation and text scaling are no longer part of the opening path.
- The note title now follows the GitHub handoff geometry: one visible stage glyph travels to the input baseline, then cross-fades into the real input without the relay's stepped opacity track.
- Date and amount now keep the stage glyph at the anchor baseline until the real control takes over; amount computes its measured input-center offset and font-size ratio so the same glyph continuously magnifies into the amount control instead of revealing a second-sized tile.
- Note now measures the actual input text origin after the stage is laid out, then uses one compositor-only `translate3d` path; the previous hard-coded `left/top` and font-size interpolation are removed so the field does not travel through a clipped intermediate rectangle.
- Note's optional summary glyph now fades out at 64–72% of the relay, slightly before the text-field content enters, so the input treatment does not inherit a lingering summary label.
- Amount's legacy card `::before/::after` family washes are disabled inside the stage; the neutral shell is now the only background layer, removing the transient right-edge gray strip.
- The opening card gives visible feedback at 80ms and finishes its 480ms expansion at the same 560ms endpoint; the text handoff moves to 120ms so a tap no longer appears idle.
- Note editor handoff no longer animates a second inset `clip-path`/`scaleY` on the input; the outer stage owns the rounded reveal, and the input content begins in the final 432–560ms window.
- Static validation passes; a fresh localhost mobile spot-check at 390 × 844 reports no horizontal overflow and no browser warnings/errors. The ambient `file://` tab itself remains unchanged because direct file navigation is blocked by the browser harness.

final result: static pass; 390 × 844 and 320 × 568 localhost spot-check passed

---

# 自然语言透镜通透度 QA（2026-08-04 · v40）

## Source and implementation

- 材质参考：`/var/folders/0d/0l704wf17hd7rdq1gtsk1k640000gp/T/codex-clipboard-68a2dff8-8c6b-431c-b01e-f8bacdff0874.png`（2054 × 468 px）。参考只定义透明材质与光照，不作为 Journa 页面布局基准。
- 修改前浏览器状态：`/private/tmp/journa-lens-before.png`（390 × 844 px）。
- 修改后浏览器状态：`/private/tmp/journa-lens-final-390.png`（390 × 844 px）。
- 同一输入聚焦对照：`/private/tmp/journa-lens-comparison.jpg`；参考材质置顶，修改前后自然语言 token 裁切并排。
- CSS 视口与实现截图均为 390 × 844，device scale factor 1；另在 320 × 568 验证窄屏。状态为移动端、浅色、自然语言记账、编辑舞台关闭。

## Findings and iteration history

- [P2] 修改前透镜内部带家庭色灰雾，叠加八层内外阴影，连续出现时像一组脏的实心软按钮。
  - Evidence：修改前表面由三层渐变组成，并将 `--natural-entry-mark-color` 混入中心填充；聚焦对照里每个 token 都有可见灰粉底和多重下沿。
  - Fix：中心改为单层近透明纵向高光，不再混入家庭色；阴影缩为上缘高光、下缘厚度、近距影和淡环境影四层。
  - Post-fix：390px 浏览器截图里背景继续穿过透镜，胶囊主要由上缘、下缘和轻微悬浮影被感知；没有独立灰色填充块。
- [P2] 暗色覆盖仍保留旧的家庭色填充与九层阴影。
  - Fix：暗色静止态与激活态同步改用中性透明表面和四层定向边缘影，保留必要的明暗反差。
  - Post-fix：暗色规则不再把家庭色写入透镜中心，且与浅色保持同一光照方向。

## Required fidelity surfaces

- Fonts and typography：字体、字号、字重、字距、行高、基线与文本抗锯齿均未修改；文字仍为 `var(--ink)`。
- Spacing and layout rhythm：token 的 `inset`、圆角、44px 点击区域、三行排版和间距未改。390px 流宽 330px；320px 文档宽与视口同为 320px，无横向溢出。
- Colors and visual tokens：去掉中心家庭色混合，只保留极浅中性高光；必填、已填和可选状态继续使用既有不透明度层级。
- Image quality and assets：没有新增或替换图像资产；现有手写笔迹位图保持独立层。
- Copy and content：账单文案、字段内容、无障碍名称与交互语义均未修改。

## Interaction and validation

- 320 × 568 下六枚 token 均保持约 44px 高且落在视口内；`备注可选` 可正常打开 note 编辑舞台，`aria-expanded=true`。
- 390 × 844 下六枚 token 全部可见，浏览器控制台 0 条 error / warning。
- `git diff --check`、`app.js` / `sw.js` 语法检查通过；23/23 组对比度检查 PASS（目标 ≥ 4.5:1）。
- `index.html`、`app.js` 与 `sw.js` 已同步为 `journa-natural-lens-clear-v40-20260804`。

No actionable P0/P1/P2 findings remain for the requested lens-transparency refinement.

final result: passed

---

# 自然语言小透镜软边框 QA（2026-08-03 · v29）

## Source and implementation

- 材质参考：`/var/folders/0d/0l704wf17hd7rdq1gtsk1k640000gp/T/codex-clipboard-c97a60af-28bd-46ff-975a-7db0907f5d2d.png`（2054 × 468 px）。
- 修改前浏览器状态：`/private/tmp/journa-lens-v26-annotated-current-319.png`（319 × 734 px）。
- 修改后浏览器状态：`/private/tmp/journa-lens-v29-soft-edge-319.png`（319 × 734 px）。
- 同一输入聚焦对照：`/private/tmp/journa-lens-edge-comparison-v29.png`；依次为参考材质、v26 硬边状态、v29 软边状态，裁切后统一到 100px 高度。
- CSS 视口与截图：319 × 734，device scale factor 1；状态为移动端自然语言记账、浅色、分摊 token 显示“三家均分”。

## Findings and iteration history

- [P2] v26 的四周等宽灰线仍像按钮描边。
  - Evidence：`三家均分` 的伪元素包含 `0 0 0 0.75px` 的均匀外圈，圆头、顶部和侧边使用同一强度。
  - Fix：移除等宽外圈，改成模糊内缘、顶部轻灰折射、底部接触影；左右边缘只由低透明度内光自然收束。
  - Post-fix：v29 聚焦对照中顶部仍能读出镜片厚度，左右不再出现硬描边，底缘阴影保持圆润但没有第二圈边框。
- [P3] 第一轮软化后边缘过弱。
  - Fix：补入 1.5px 模糊内缘和仅向上偏移的轻灰折射影，没有恢复等宽 stroke。

## Fidelity and validation

- 字体、字号、字重、44px 点击区域、token 几何与三行摘要排版未变。
- 中心透明表面、家庭色层与笔迹资产未变；只调整边缘光/影组合。
- 319px 视口下自然语言流宽 268px；未出现可见裁切。浏览器报告文档 319/320px 的 1px 亚像素余量，与本次阴影修改无关。
- `三家均分` 可正常展开分摊编辑器并关闭；浏览器控制台 0 条 error / warning。
- `index.html`、`app.js` 与 `sw.js` 同步为 `journa-natural-entry-soft-edge-v29-20260803`。

final result: passed

---

# Natural-entry close light-direction QA

- The former horizontal `translateX(-120% → 120%)` sweep was removed. The existing `.natural-entry-stage-shell::after` layer now turns one restrained edge reflection from `180deg` / `50% 0%` to `135deg` / `24% 8%` during the 380ms close.
- Browser sampling at 390 × 844 confirms the shared timeline: the highlight begins at `180deg`, reaches approximately `164deg` at 100ms and `145deg` at 200ms, then settles at `135deg`; its focal x position moves from `50%` through `40%` and `29%` to `24%`.
- The family tint begins with the close rather than the family click. A 乐家 → 祺家 sample remained at `rgb(126, 171, 152)` while the selector was open, then interpolated with the specular turn to `rgb(132, 159, 205)` over 360ms.
- Reference comparison is material-only because the supplied reference uses a different canvas and typography. The implemented highlight remains confined to the upper edge and upper-left arc, with no bright band crossing the text, duplicate edge, or stationary final shimmer.
- At 320 × 568, a mid-close sample reports `157deg`, focal x near `36%`, and no horizontal document overflow. The final stage hides cleanly and leaves one readable token layer.
- Light and dark modes use separate peak alphas (`0.56` and `0.34`). Reduced-motion rules collapse the shell and family-color transitions to `0.01ms`, landing directly on the static upper-left material.
- Rapid close/reopen retains the existing run-id cleanup guard; the old sweep delay and duration controls no longer exist, so no second timing source can finish late.
- Browser console has 0 warnings/errors; `app.js`, `sw.js`, `git diff --check`, cache-version synchronization, and all 23 contrast combinations pass.

final result: passed

---

# Natural-entry Liquid Glass return morph QA（2026-08-03）

- 收回时移除整层家庭色盖板，改为目标透镜方向的轻微液态挤压与一次 45° 窄幅扫光。
- 源文字继续沿用既有 `is-stage-handoff` 交接，文字位置、字号和颜色不参与 Morph；手写标记延后到透镜回收结束后恢复。
- 回收时序固定为：0–380ms 外壳缩成目标透镜，210–410ms 扫光，320–440ms 源透镜家庭色短暂增强，440–500ms 停留，500–620ms 回到现有中性透镜。
- 新增 `is-lens-returning` 独立状态，避免复用从透明开始的普通 lens settle；快速重开、字段切换和旧回调清理继续由现有 run-id 与计时器保护。
- 浅色与深色材质均使用独立的扫光强度；减少动态效果时不播放挤压、扫光或家庭色停留。

验证目标：390×844、320×568 的金额、付款家庭、类别、长备注、分摊字段；关键帧 0/210/320/380/440/500/620ms；文字范围基线误差 ≤1px；文档无横向溢出；控制台无 error/warning。

final result: passed

---

# 自然语言小透镜圆润材质 QA（2026-08-02 · v26）

## Source visual truth

- 圆润材质参考：`/var/folders/0d/0l704wf17hd7rdq1gtsk1k640000gp/T/codex-clipboard-c12003f3-a5d2-4e86-a02f-23522ba68292.png`（2054 × 468 px）。
- 修改前实际状态：`/var/folders/0d/0l704wf17hd7rdq1gtsk1k640000gp/T/codex-clipboard-117c2666-793e-47ee-8613-3d5b6a424c93.png`（288 × 120 px）。
- 参考图只定义透镜材质、厚度与圆润比例，不作为 Journa 页面布局或文案基准。

## Rendered implementation

- 390 × 844 静止态：`/private/tmp/journa-lens-v26-light-390.png`。
- 390 × 844 备注展开态：`/private/tmp/journa-lens-v25-note-open-390.png`。
- 320 × 568 静止态：`/private/tmp/journa-lens-v25-light-320.png`。
- 聚焦材质对照：`/private/tmp/journa-lens-material-comparison-v26.png`；依次为参考、修改前实际状态、修改后浏览器渲染，均按各自裁切区域归一到 100px 高度后置于同一图像。
- CSS 视口：390 × 844、320 × 568；device scale factor 1。实现截图像素尺寸与 CSS 视口一致。

## Findings and iteration history

- [P2] 修改前小透镜像实心白色按钮。
  - Evidence：修改前镜片约为字形高度的 2.2 倍，中心比页面背景亮约 10 个灰阶；大面积白填充、左右鼓包与双层底影共同造成实体按钮感。
  - Fix：把伪元素从接近 44px 压到 33px 高，水平外扩从 12px 收到 9px；中心改为近透明双层表面，只在顶缘、侧缘和底缘保留静态折射光与接触影。
  - Post-fix：聚焦对照中修改后镜片与参考图的镜片/字形比例接近，中心继续透出页面底色，底影不再扩散成第二层白卡。
- [P2] 小透镜变薄可能连带削弱展开编辑器。
  - Evidence：摘要 token 与 `.natural-entry-stage-shell` 原先消费同一组材质变量。
  - Fix：为展开编辑器恢复独立承载面与阴影；小透镜继续使用轻薄材质。
  - Post-fix：备注展开态保持 344 × 76px 的清晰输入面板，内容、边缘和背景分离正常。

## Required fidelity surfaces

- Fonts and typography：未修改字体、字号、字重、字距、基线或截断；`备注可选` 仍使用原 44px 可点击 token，只有视觉伪元素变薄。
- Spacing and layout rhythm：390px 与 320px 均保留三行摘要节奏；320px 下文档 `scrollWidth=clientWidth=320px`，自然语言流宽 268px，无横向溢出。
- Colors and visual tokens：中心白填充降为近透明；家庭色仍只染材质边缘与笔迹，正文保持 `var(--ink)`。
- Image quality and assets：未替换现有自然语言笔迹位图，也未新增图像或图标资产。
- Copy and content：所有账单文案、字段名称、无障碍名称与交互语义不变。

## Interaction and validation

- “记账”切换与“备注可选”入口均可点击；备注展开面板正常出现。
- 390 × 844 与 320 × 568 浏览器控制台均为 0 条 error / warning。
- `git diff --check`、`app.js` / `sw.js` 语法检查通过；23/23 组对比度检查 PASS（目标 ≥ 4.5:1）。
- `index.html`、`app.js` 与 `sw.js` 已同步到 `journa-natural-entry-rounded-lens-v26-20260802`。

## Result

No actionable P0/P1/P2 findings remain for the requested small-lens material refinement.

final result: passed

---

# 录入方式设置 QA

- 默认值：无本机偏好时使用“自然语言”；选择保存在 `travel-ledger-entry-mode`，刷新后继续生效。
- 设置入口：个人设置新增“自然语言 / 标准”双选卡；390px 和 320px 下均保持两列、44px 以上触控高度且无横向溢出。
- 自然语言：三行摘要可见，一次只展开一个原有控件；默认展开金额。
- 标准：隐藏自然语言摘要，付款家庭、金额、类别、分摊、日期和备注全部恢复为原完整表单。
- 桌面兼容：桌面端继续展示完整表单，录入偏好只改变移动端与粗指针布局。
- 浏览器检查：两种模式即时切换、选择状态、刷新持久化和控制台均通过，0 条 error / warning。
- 静态检查：`git diff --check`、`app.js`、`sw.js` 语法检查通过；23 组对比度检查全部 PASS。

## Result

final result: passed

---

# Natural-entry expanded lens material QA（2026-08-02 · shared surface pass）

## Source visual truth

- Reference image: `/var/folders/0d/0l704wf17hd7rdq1gtsk1k640000gp/T/codex-clipboard-d6f01a32-6b29-4753-9254-0d7fc9644c9a.png`（2048 × 447）；本轮只把它作为连续长透镜的材质参考，不匹配其页面布局。

## Rendered implementation

- 390px 静止态：`/private/tmp/journa-lens-material-390-rest.png`
- 390px 展开态：`/private/tmp/journa-lens-material-390-shared-open-v24.png`
- 390px 关闭中段：`/private/tmp/journa-lens-material-390-shared-close-mid-v24.png`
- 390px 关闭完成：`/private/tmp/journa-lens-material-390-closed.png`
- 320px 静止态：`/private/tmp/journa-lens-material-320-rest.png`
- CSS 视口：390 × 844、320 × 568；device scale factor 1。

## Comparison evidence

- 展开金额/备注阶段直接复用摘要 token 的 `--natural-entry-lens-surface` 与 `--natural-entry-lens-shadow`，扩张后成为同一块连续长透镜；不再叠加舞台专用顶光、厚边、折射影或额外 drop-shadow。
- 句子透镜与展开透镜的背景、内缘和阴影参数在浅色模式下逐项一致；stage 只负责几何展开与内容承载，文字基线不移动。
- 摘要小透镜仍保持次要层级；金额/备注使用胶囊半径，类别、家庭、日期和分摊阶段保留各自原有内容形状。
- 舞台外壳不使用 backdrop blur；既有聚焦背景的模糊层继续负责环境分离，避免玻璃壳空档或重复采样。
- 390px 展开中段和关闭中段均保持可见内容；关闭后恢复完整摘要，未出现空壳或重复金额。
- 320px 下自然语言流宽 268px，页面 `scrollWidth=clientWidth=320px`，无横向溢出。

## Validation

- `git diff --check` passed。
- `app.js` / `sw.js` syntax checks passed with bundled Node runtime。
- `scripts/check-contrast.mjs`：23/23 groups passed at ≥4.5:1。
- Browser console：0 error / warning。
- Reduced-motion selectors、暗色独立材质覆盖和当前资源版本同步已保留；暗色与 iPhone Safari/PWA 合成仍建议发布前实机复核。

## Findings

- No actionable P0/P1/P2 visual findings remain for the requested expanded-lens material pass。
- P3 follow-up：关闭后键盘焦点仍会保留在来源 token，属于既有焦点策略，本轮未改变交互语义。

final result: passed

---

# Natural-entry Liquid Glass lens entry QA

- Family-color lenses now enter as a single material surface: compressed and gently expanding into the settled rounded lens over 330ms per token, with no animated blur or bounce.
- The family tint arrives with the lens while the text remains high-contrast through the existing blend treatment; the editor stage itself is unchanged.
- Reduced-motion mode skips the entry animation and keeps the static lens visible.

final result: passed

---

# Natural-entry lens settle motion QA（2026-08-02）

- 首次进入记账卡时，六枚透镜按阅读顺序以 34ms 间隔出现；页面会话内切回入口不会重复播放。
- 字段编辑结束时，只对当前 token 播放 220ms 落定透镜；金额保持 `¥ + 数值` 为同一组。
- 更换付款家庭不再重播整组透镜，只保留家庭色过渡。
- 390×844 与 320×568：自然语言摘要无横向溢出，分别通过 `268px / 320px` 宽度检查；控制台 0 条 error / warning。
- `app.js` / `sw.js` 语法、`git diff --check` 和 23 组对比度检查通过。

final result: passed

---

# 自然语言记账透镜参考效果 QA（2026-08-02）

## Source visual truth

- Reference image: `/var/folders/0d/0l704wf17hd7rdq1gtsk1k640000gp/T/codex-clipboard-863477a9-9504-4a76-b018-874981833a03.png`
- Source pixels: 2048 × 447. The source is a focused material reference, not a full app viewport; comparison is limited to the lens treatment.

## Rendered implementation

- 390 px capture: `/private/tmp/journa-lens-390-final.png`
- 320 px capture: `/private/tmp/journa-lens-320-final.png`
- CSS viewport and screenshot dimensions: 390 × 844 and 320 × 568, device scale factor 1.
- State: mobile natural-entry card, light scheme, stage closed, family lens active on the selected payer value.

## Comparison evidence

- Full-view comparison: the app retains its existing Journa card, sentence hierarchy, mobile tabs, and submit dock; the reference is intentionally treated as a material-language sample rather than a page-layout target.
- Focused lens comparison: the reference uses a broad white rounded lens with a restrained top highlight and soft lower elevation. The implementation now uses the same cues on each editable token: 999px radius, horizontal breathing room, a two-stop surface, low-opacity inset rim, and a diffuse lower shadow. Once a payer is selected, the lens surface visibly carries that family color; the hand-drawn mark remains a separate layer.
- Text legibility refinement: the light lens uses `mix-blend-mode: multiply`, while token text stays at `var(--ink)` for both value and placeholder states; the surface no longer washes the copy gray.

## Iteration history

1. Earlier treatment: blurred, small rectangular translucent patches around tokens.
2. Fix: replaced the patch with an elongated rounded lens, removed the blur filter, added a static highlight/rim/shadow stack, and added a dark-mode material mapping.
3. Follow-up: strengthened the low-contrast inset rim and lower shadow after comparing the 390px capture against the supplied reference.
4. Legibility correction: decoupled text color from lens opacity and kept the light lens in multiply blending so black copy remains crisp.
5. Family-color refinement: raised the family tint in passive and active lens surfaces while keeping the neutral state graphite-based.

## Validation

- 390px flow width: 330 / scroll width 330; document scroll width 390.
- 320px flow width: 268 / scroll width 268; document scroll width 320.
- No current-preview console errors.
- `node --check app.js` passed.
- `node --check sw.js` passed.
- `git diff --check` passed.
- Existing contrast check: 23/23 groups passed at ≥4.5:1.
- Cache version and Service Worker precache remain synchronized, including the three natural-entry mark assets.

## Findings

- No actionable P0/P1/P2 visual findings remain for the requested lens refinement.
- P3 follow-up only: if a future design pass wants a single continuous lens behind a whole semantic phrase, that should be designed as a separate phrase-level treatment; the current per-token lens preserves the existing edit affordance and Morph anchors.

## Implementation checklist

- [x] Rounded lens surface matches the supplied material reference.
- [x] Active and passive family-color states remain distinct.
- [x] Handwritten marks remain separate from the lens surface.
- [x] 390px and 320px responsive geometry stays within the viewport.
- [x] Dark-mode override, reduced-motion rules, and cache synchronization remain intact.

final result: passed

---

# Natural-entry text-path and flash QA

- Root cause: the reused stage could carry the previous editor's computed transition state into the next opening frame, while removing `.is-open` on close could briefly restore the amount mirror token.
- Opening now commits a transition-free `.is-preparing` frame after the new text and anchor geometry are installed. A forced style boundary precedes the animated frame, so WebKit cannot merge the source and destination states.
- Closing now holds the stage token at opacity 0 with no transition for the entire shrink/fade sequence. Only the empty glass frame returns to the source field.
- Browser sampling confirms the closing source token remains hidden, the stage token is opacity 0 with a 0s transition, and the source token is restored only after the stage becomes hidden.
- Reopening a different field reports the correct current text and finishes at the new stage center rather than inheriting the previous field path.
- Browser console has 0 warnings/errors; syntax, `git diff --check`, and cache-version synchronization pass.

final result: passed

# 移动端自然语言记账 QA

- 视觉基准：`/Users/Lucas/.codex/generated_images/019fa68d-f370-7060-ba81-383985888ad0/call_dV4J6eCVOtWlhwdM6eaxIgrk.png`（853×1843）。
- 实现截图：`/private/tmp/journa-natural-entry-final-390.png`（390×844）、`/private/tmp/journa-natural-entry-320.png`（320×568）和 `/private/tmp/journa-natural-entry-desktop.png`（1280×900）。
- 同一输入对照：`/private/tmp/journa-natural-entry-comparison.png`；将视觉基准和 390×844 实现归一为同尺寸后并置。
- 样例状态：`今天，旦家付了 ¥268.50 / 用于 餐饮 · 晚餐 / 由 乐家、旦家按人数分摊`。

## Findings 与迭代

- 首轮保留了原网页的付款家庭、金额、类别、日期、备注和分摊控件，只在移动端增加自然语言摘要，并通过高亮短语切换单一编辑器。
- 首轮 P2：自定金额实时求和后，摘要沿用全局可变小数设置，会显示 `¥268.5`。
  - 修复：自然语言金额独立使用两位小数格式；输入 `268.5` 后稳定显示 `¥268.50`，不改变账本列表和统计金额格式。
- 390×844 最终对照中，原参考的三行语义顺序、强调层级和底部主操作保留；实现主动压缩了参考图的大段留白，以容纳现有 Journa 顶部账本状态、固定提交栏和真实分摊控件。
- 320×568 默认状态横向溢出为 0；内容允许正常纵向滚动，固定提交栏不会阻断金额输入。1280×900 下自然语言层隐藏，原桌面完整表单全部保持可见。

## 交互与技术检查

- 六个高亮入口（今天、付款家庭、金额、类别、备注、分摊）均可直接展开对应现有控件；一次只显示一组编辑器。
- 指定家庭模式可点按乐家、祺家、旦家并实时回写摘要；自定金额模式的三组金额可编辑并自动求和。
- 金额输入 `268.5` 后摘要显示 `¥268.50`，底部状态切换为 `旦家 · 餐饮 · 今天 / 记下这笔`；金额框回车会转到备注输入。
- 浏览器控制台为 0 条 error / warning；`git diff --check`、`app.js`、`sw.js` 语法检查通过；23 组对比度检查全部 PASS。
- iPhone Safari/PWA 的软键盘高度、地址栏收缩和触摸手势仍保留为发布前实机检查项。

## Result

final result: passed

---

# 平账卡片设计 QA

- 视觉基准：GitHub Pages 当前版 `/private/tmp/journa-github-settlement-390.png`
- 实现截图：`/private/tmp/settlement-horizontal-390.png`、`/private/tmp/settlement-horizontal-320.png`、`/private/tmp/settlement-horizontal-1280.png`
- 对照证据：`/private/tmp/journa-settlement-comparison.png`、`/private/tmp/journa-settlement-focus-comparison.png`
- 样例状态：`乐家 → 旦家 ¥5,185.99`、`乐家 → 祺家 ¥142.00`
- 视口：1280×720、390×844、320×844

## 最终检查

- 保留 GitHub 版转账关系结构，家庭名改为左右两列的竖排文字，水平箭头居中表达“至”；未改动上方资金流向图的现有简化方向。
- 家庭名和金额均比 GitHub 基准更醒目；家庭名放大到约 20px，金额使用中细字重与低强度辉光管效果，`¥` 缩小并降低不透明度。
- 去掉家庭节点小框、圆角和纵向连接线；箭头放大为背景关系符号并降至 0.16 透明度，卡片通过垂直留白区分多笔转账。
- 320px、390px 和桌面视口均无横向溢出，金额未截断，卡片和节点未重叠；390px 卡片高 100px，320px 卡片高 94px。
- 超长家庭名使用单行省略并保留文章级无障碍描述；超大金额自动进入紧凑字号，避免窄屏越界。
- 减少动态模式下不会播放节点入场动画；正常模式仅对节点做轻微位移和缩放。
- 浏览器控制台：390px、320px、1280px 样例状态下均为 0 条 error / warn。
- 交互检查：设置入口可打开，平账建议可见，当前账本区继续正常显示和滚动。
- 静态检查：`app.js` 语法通过，`git diff --check` 通过，23 组对比度检查全部 PASS。

## 迭代记录

1. 先恢复 GitHub 节点卡构图，并与 GitHub Pages 同视口截图对照。
2. 放大家庭名与金额，缩小箭头，减弱卡片光效和多层阴影。
3. 补充 320px 窄屏规则和长金额紧凑样式，复核无溢出。
4. 删除节点内“付款 / 收款”字样，将上下家庭名重新居中到各自半区。
5. 去掉节点外框与纵向连接线，金额改为大字号中细体，并保留低强度辉光管质感。
6. 家庭名改为 `writing-mode: vertical-rl` 竖排，左右分列；箭头放大并降至 0.42 透明度。
7. 起点上移 6px、终点下移 6px，形成轻微方向性但不破坏卡片对齐。
8. 放大家庭文字与背景箭头，同时扩展窄屏关系区宽度，避免大箭头挤压金额。

## Result

final result: passed

---

# 类别标签末端玻璃模糊 QA

- 源视觉：沿用参考图一的中线起始、单向衰减模糊语言；实现截图 `/private/tmp/journa-category-blur-end-v2.png`，319×734 CSS 视口。
- 状态：记账页、类别横滑已滚到末端，`can-fade-start can-fade-end`，`+` 浮动按钮保持可见。
- 结果：右侧活动渐隐层在 `+` 中心附近承接模糊，向左连续衰减；计算样式为 `backdrop-filter: blur(14px) saturate(1.25) brightness(1.01)`，静止态为 `none`。
- 交互：类别横滑仍可滚动，`+` 控件未被遮罩拦截；未改动选中类别的 radio 状态或新增类别 Morph。
- 检查：资源版本已同步为 `journa-sf-icons-tags-category-blur-v2-20260726`；`git diff --check`、JS 语法检查和对比度检查继续通过。

## Result

final result: passed

---

# 移动端顶部渐进模糊 QA

- 源视觉真值：参考图一 `/var/folders/0d/0l704wf17hd7rdq1gtsk1k640000gp/T/codex-clipboard-75e11b71-d230-464d-a8b8-8ad89a92314c.png`（1260×448 px）；问题现状为图二 `/var/folders/0d/0l704wf17hd7rdq1gtsk1k640000gp/T/codex-clipboard-4a955956-6d7e-4a1c-98ac-4944f684c0d7.png`（622×334 px）。
- 实现截图：`/private/tmp/journa-header-blur-center-622.jpg`（622×334 px，CSS 视口 622×334，DPR 1）和 `/private/tmp/journa-header-blur-center-390.jpg`（390×844 px，DPR 1）。
- 同一输入对照：`/private/tmp/journa-header-blur-comparison.png`；参考图一缩放到 622px 宽，与 622×334 的问题截图和实现截图纵向并置。因三者内容状态不同，本轮只比较玻璃模糊的边界、衰减方向和综合色彩，不做文案与卡片位置的像素拟合。
- 状态：浅色主题、数据面板、首屏展开态；补测滚动中间态、320×568 低矮视口和“数据 / 记账”双向切换。

## Findings 与迭代

- 初始 P1：图二的过渡层透明度和遮罩在中段重新增强，形成一条发白的横带，模糊起点位于切换器下方。
  - 修复：改为单向衰减的背景与遮罩，主玻璃降低饱和度；过渡层扩展到 88px，并把主玻璃终点和过渡起点共同锚定在切换器水平中线。
  - 后验：390×844 首屏 `switchCenter=142 / afterTop=142`；滚动中间态 `118.5 / 118.5`；320×568 低矮布局 `85 / 85`。对照图中不再出现中段白色峰值，模糊从控件后方连续向下消散。
- 缓存回归 P2：首次重载仍读取旧的 48px 过渡层。
  - 修复：同步 `index.html`、`app.js` 与 `sw.js` 到 `journa-glass-depth-header-blur-v3-20260726`。
  - 后验：浏览器计算样式为 `height: 88px`，页面版本与资源版本一致。

## 必检视觉面

- 字体与排版：标题、切换器、账目文字的字体、字号、字重与换行规则未修改；模糊层位于内容后方，不改变文本布局。
- 间距与布局：未改变 header、切换器或内容流几何；390×844 与 320×568 的横向溢出均为 0。
- 颜色与视觉 token：继续消费 `--glass-bg`，饱和度由 180% 降至 145% / 125%，参考图所需的中性柔雾更接近且没有新增固定主题色。
- 图片与资产：未新增或替换可见图片、图标或品牌资产。
- 文案与内容：标题、账本数据、切换器标签和无障碍名称均未修改。

## 交互与技术检查

- “记账”与“数据”标签均可点击，`data-mobile-panel` 和 `aria-selected` 双向更新正确；模糊伪元素保持 `pointer-events: none`。
- 浏览器控制台 0 条 error / warning；390×844 和 320×568 均无横向溢出。
- `git diff --check`、`app.js` / `sw.js` 语法检查通过；23 组对比度检查全部 PASS。
- 真机 iPhone Safari/PWA 的 `backdrop-filter + mask-image` 合成仍应作为发布前实机检查项；桌面 WebKit 模拟不能完全证明原生合成表现。

## Result

final result: passed

---

# 类别尾部渐变遮罩与“+”入口收敛 QA

- 源视觉：用户问题截图 `/var/folders/0d/0l704wf17hd7rdq1gtsk1k640000gp/T/codex-clipboard-5e95b535-88e5-430f-8567-11e48d9d00f6.png`（600×128 px）与 WebKit 矩形合成异常截图 `/var/folders/0d/0l704wf17hd7rdq1gtsk1k640000gp/T/codex-clipboard-a07902b0-1f0d-4010-a726-6d9356164e5f.png`（586×178 px）；均为局部裁切且无明确 density 元数据。
- 实现截图：`/tmp/journa-category-fade-stable-light.png`（起点状态）、`/tmp/journa-category-fade-stable-middle-light.png`（与问题截图接近的中段横滑状态）和横滑末端 `/tmp/journa-mobile-category-end-light.png`。
- 聚焦对照：`/tmp/journa-category-comparison-final-light.png`，将问题截图与最终类别区域统一到 600px 宽后放入同一输入。
- 状态：浅色移动端，类别关闭态；补测新增类别展开/收起、横滑起点和横滑末端。

## Findings

- 初始 P2：矩形轨道模糊与按钮内部模糊叠加，问题截图中“机票”右侧能看到直角边界，圆形强描边让“+”像独立主按钮。
  - 修复：删除按钮内部第二层模糊；类别内容不再延伸到按钮下方；轨道末端改为单一 104px 椭圆径向羽化遮罩；按钮改用类别胶囊同源的玻璃边光和弱化图标色。
  - 后验：最终聚焦对照中未再出现矩形角或文字叠穿，“+”与 chip 高度、表面和右侧内容边界一致。
- 第一轮回归 P2：横滑到最末端后 `can-fade-end` 已移除，但伪元素自身的 `opacity: 1` 仍强制保留遮罩。
  - 修复：删除强制 opacity，由 `can-fade-end` 单独控制显示。
  - 后验：起点 `can-fade-end=true / opacity=1`；末端 `scrollLeft=215.5 / max=216 / can-fade-end=false / opacity=0`，最后类别完整显示。
- WebKit 实机 P1：`backdrop-filter` 与径向 `mask` 被拆成矩形合成层，104px 遮罩区域显示成大块发白玻璃板。
  - 修复：完全移除右端 `backdrop-filter` 和 `mask-image`；改为 72px 径向背景渐隐并加 3px 轻柔化，不再采样按钮或轨道背后的像素。
  - 后验：计算样式为 `backdrop-filter:none / mask-image:none / width:72px`；同滚动状态截图不再出现直角或矩形底，按钮与末端类别之间保持 8px 网格间距。

## 必检视觉面

- 字体与排版：类别文字、emoji、字重、字号和 44px 控件高度保持原实现；“+”图标尺寸与无障碍名称不变。
- 间距与布局：390px 下类别行 330px，轨道 278px，按钮 44px，间距 8px；320px 下页面 `scrollWidth=clientWidth=320px`，无横向溢出。
- 颜色与视觉 token：浅色按钮消费 `--glass-edge` 和主题混色；深色模式提供同等 specificity 的暗色玻璃覆盖，未引入固定浅色表面。
- 图片与资产：没有新增、替换或近似模拟图片资产。
- 文案与内容：类别内容、“新增类别”标签和业务数据未修改。

## 交互与技术检查

- 新增入口展开后外壳由 44×44 平滑扩展为 330×44，输入框自动聚焦且可交互；收起后恢复 44×44，焦点回到入口。
- 类别横滑可到达末端；当前窄屏实测 `scrollLeft=277.5 / max=278`，末端 `can-fade-end=false / opacity=0`。
- 浏览器控制台 0 条 error / warning。
- `git diff --check`、`app.js`、`sw.js` 语法检查通过；23 组对比度检查全部 PASS。
- 暗色规则完成静态级联检查；当前应用内浏览器跟随系统浅色，本轮没有伪造暗色截图。

## Result

final result: passed

---

# 类别标签右侧渐变模糊遮罩迭代 QA

- 源视觉：用户提供的局部截图 `/var/folders/0d/0l704wf17hd7rdq1gtsk1k640000gp/T/codex-clipboard-0d54af58-1856-4db1-b2fb-e564c5ae43d0.png`，原始像素 588×118；这是局部裁切，未携带明确 density 元数据。
- 实现截图：`/private/tmp/journa-category-mask-full-390.png`（390×844，CSS 视口 390×844，1x）、`/private/tmp/journa-category-mask-row-390.png`（362×44 的类别行裁切）、`/private/tmp/journa-category-shadow-selected-390.png`（选中态）和 `/private/tmp/journa-category-gradient-hardcut-fix-390.png`（硬切修复后）。
- 对比输入：`/private/tmp/journa-category-mask-comparison.png`，将源视觉与实现类别行按相同宽度并置，重点检查遮罩起点、渐变连续性和新增按钮形状。
- 状态：移动端 390px、深色主题、类别行关闭态；实现同时复核了新增类别展开态。

## 对照结论

- 初始迭代的问题是模糊层起点过早、透明度像矩形硬切，且“+”入口被处理成无边界的方块感。
- 修复后，遮罩起点右移至标签末端后段，使用透明度渐变叠加 `backdrop-filter: blur(6px)`，并将遮罩自身应用渐变 `mask-image`；标签保持清晰后再连续进入模糊。
- “+”入口恢复为独立 44×44 圆形控件，并置于遮罩上层；展开态边界仍恢复为输入胶囊。
- 回归修复：选中态光晕的实际扩散范围约 28px，将横滑视口上下缓冲从 16px 提升至 28px，并用负外边距抵消布局高度；选中阴影不再被上下裁断。
- 硬切修复：将 `backdrop-filter` 图层的渐变基准收回到标签轨道本身，右端 150px 用相对轨道宽度的渐变 mask 控制模糊显现，避免超宽伪元素的透明段把可见区域整体吞掉。
- 叠层修复：关闭态横滑轨道向 “+” 下方延伸 52px，伪元素改为透明背景，只保留 `backdrop-filter`；按钮背后现在采样的是标签内容的模糊纹理，不再落成黑/白实体底。
- 底缘修复：纵向 mask 的退场延后到 `+` 按钮底边之后，模糊层覆盖到按钮底部再柔和收尾，不在按钮之前提前截断。

## 必检视觉面

- 字体/排版：类别文字、emoji、字重和 44px 控件高度沿用 Journa 现有 token，未新增文字内容。
- 间距/布局：390px 页面横向 `scrollWidth` 仍等于 390px；320px 页面横向 `scrollWidth` 仍等于 320px；类别横滑 `scrollWidth` 大于 `clientWidth`，按钮中心与标签行中心保持对齐，上下各保留 28px 绘制空间。
- 颜色/视觉 token：浅色基准与深色覆盖均保留主题变量；遮罩使用现有 `--cat-fade-color`，无额外硬边框。
- 图片/资产：本次仅调整 CSS 遮罩与控件边界，无新增图片资产。
- 文案/内容：未修改类别文案、加号入口标签或无障碍名称。

## 交互与错误检查

- 390px、320px 窄屏均无新增横向溢出；类别行仍支持横向滚动。
- 点击“新增类别”后，展开态输入胶囊边界和输入交互正常。
- 浏览器控制台 0 条 error；`app.js`、`sw.js` 语法检查和 `git diff --check` 通过。

## Result

final result: passed

---

# 类别新增入口同层 Morph 设计 QA

- 视觉基准：用户提供的 644×266 类别行局部截图 `/var/folders/0d/0l704wf17hd7rdq1gtsk1k640000gp/T/codex-clipboard-384234d5-901d-40cc-8b9b-160b65c1d7c2.png`。
- 实现截图：`/private/tmp/journa-category-morph-closed-390.png`、`/private/tmp/journa-category-morph-open-390.png`、`/private/tmp/journa-category-morph-open-320.png`、`/private/tmp/journa-category-morph-open-1280.png`。
- 对照方式：将用户局部截图与 390×844 展开态整页截图放入同一视觉输入，重点比较类别行边界、白色遮挡、控件层级和展开后的紧凑度。

## 最终检查

- 关闭态和展开态均使用同一个 44px 高舞台；390px 行宽 370px，320px 行宽 308px，桌面行宽约 576px，全程不增加页面高度。
- 旧白色遮挡帘和下方独立表单已删除；类别标签淡出后，左端加号旋转为关闭符号，胶囊向右扩展并承载输入与 44×44 确认键。
- 追加修复：移动端横向出血由 `-20px` 收紧为 `-16px`，展开胶囊左右边界现在与 `.entry-panel` 完全重合，不再露出圆角外；证据截图为 `/private/tmp/category-overflow-fixed-390.png`。
- 展开态在 320px、390px、1280px 均无横向溢出；输入文字、关闭按钮和确认键未拉伸、截断或残影。
- 移动端在原始点击事件中同步聚焦输入框；桌面和移动端使用同一 Morph 状态机。Enter、确认按钮、Escape、空值禁用、重复类别和快速反向开合均通过。
- `aria-expanded`、输入框 `tabIndex`、分类带 `aria-hidden`、确认键 `disabled` / `aria-disabled` 和焦点归属随状态同步。
- 分类横滑继续保留 `touch-action: pan-x pan-y`；减少动态模式由 JS 跳过 WAAPI，并由全局 a11y 样式将透明度过渡压缩为 1ms。
- 浅色与深色规则均使用克制发丝边框和透明主题洗色；选中分类仍是关闭态唯一高强调元素。
- 浏览器最终版本 `journa-safari-header-category-morph-v11-20260722` 下为 0 条 error / warning；真机 iPhone Safari/PWA 仍保留为发布前键盘、横滑和合成层检查门槛。

## Result

final result: passed

---

# 移动端类别新增入口设计 QA

- 视觉基准：用户提供的“餐饮 + 新增按钮”局部截图。
- 实现状态：本地 Journa 浅色主题，`餐饮` 选中，390×844；附加检查 320×568 和 1280×900。
- 对照限制：基准为局部裁切，因此检查集中在组件边界、间距、控件处理和层级，不做整页像素匹配。

## 最终检查

- 修复 P1：新增入口不再占据一块独立浅色列；横滑带延伸到末端，并用柔和遮罩过渡到浮动按钮。
- 修复 P2：虚线草稿感改为实线发丝边框、克制主题色和轻量表面层次。
- 修复 P2：展开表单不再把两个 60px 控件塞入 96px 高度后裁切；输入框与 84px“添加”按钮保持同一行。
- 字体与文案沿用现有 Journa token；未引入新图片资产，类别文案、emoji 和无障碍名称均不变。
- 新增入口在 320px、390px 均保持 44×44；分类带继续使用 `touch-action: pan-x pan-y`。
- `aria-expanded` 开关、分类 radio 选中值和隐藏字段同步均通过；桌面布局无回归，浏览器 0 条 error / warning。
- `app.js`、`sw.js` 语法检查和 `git diff --check` 通过，缓存版本已同步。
- 真机 iPhone Safari/PWA 仍应保留常规发布前触摸与合成检查，桌面浏览器模拟不能完全证明原生手势行为。

## Result

final result: passed

---

# Natural-entry anchored popover design QA

- Source visual truth: `/Users/Lucas/.codex/generated_images/019fa711-357f-7d21-86e2-19f61dcfc299/exec-62550d42-288e-4657-b1a2-8bf81ea199d6.png`
- Implementation screenshot: `/tmp/journa-natural-popover-qa/07-final-category-open.jpg`
- Combined comparison: `/tmp/journa-natural-popover-qa/08-design-comparison.jpg`
- Additional states: `/tmp/journa-natural-popover-qa/03-payer-open.jpg`, `/tmp/journa-natural-popover-qa/04-note-open.jpg`, `/tmp/journa-natural-popover-qa/05-custom-split.jpg`, `/tmp/journa-natural-popover-qa/06-short-custom-split.jpg`
- Browser URL: `http://127.0.0.1:4317/`
- Implementation viewport: 390 × 844 CSS px at device scale 1
- Short-screen viewport: 320 × 568 CSS px at device scale 1
- Source pixels: 1122 × 1402
- Implementation pixels: 390 × 844
- Normalization: the source board's third interaction frame was cropped and contained into 390 × 844 before being placed beside the 390 × 844 implementation capture.
- State: light theme, natural-entry mobile view, category token expanded from its original coordinates, backdrop blur active.

## Full-view comparison evidence

The rendered interaction preserves Journa's existing card, typography, category visuals, and natural-language sentence. The inactive page is visibly blurred while the active token and selector stay sharp. The fixed stage does not change the entry-card height or move the remaining sentence.

## Focused region comparison evidence

The active-token rectangles were measured in the browser after the final border fix. The hidden source token and sharp stage token have identical `x`, `y`, `width`, and `height` values (all deltas are 0 px). The stage reports `backdrop-filter: blur(11px) saturate(0.82) brightness(1.035)`. The focused side-by-side comparison confirms that the selected word remains the visual origin while the material grows outward.

## Required fidelity surfaces

- Fonts and typography: existing Journa font families, optical weights, number font, line height, and token letter spacing are reused; no new font drift.
- Spacing and layout rhythm: the token remains fixed, the editor is removed from document flow, and the 390 × 844 entry card keeps its closed-state height. The stage uses the confirmed compact/expanded hierarchy.
- Colors and visual tokens: existing family/category colors and control surfaces are reused. The focus veil is a light blur rather than a dark modal scrim. Dark-mode surfaces have a dedicated warm-dark override.
- Image quality and asset fidelity: this interaction contains no raster imagery or new icons. Existing category and family icon systems are preserved.
- Copy and content: all existing Journa labels and the natural-language sentence remain unchanged; dialog and close labels were added for assistive technology.

## Interaction and responsive checks

- Closed natural-entry state shows no inline editor.
- Payer and category selectors open from the exact source-token rectangle and close after a choice.
- Amount input opens in place; Enter changes the anchored editor to note and preserves the entered amount.
- Date retains the native date control and closes after change.
- Basic split choices remain compact; custom split expands in the same material.
- At 320 × 568, custom split becomes internally scrollable. Focusing the third family amount scrolls it into view.
- Outside dismissal, Escape dismissal, focus return, dialog focus trapping, reduced motion, and mobile-submit-bar suppression are wired.
- Browser console: no warnings or errors.
- Static verification: `app.js` and `sw.js` syntax passed, `git diff --check` passed, and all 23 contrast combinations passed.

## Findings

No actionable P0, P1, or P2 differences remain.

P3 follow-up: the category rail intentionally preserves the existing horizontal-scroll behavior, so a narrow viewport shows a subset of categories at once. This matches the current product convention and does not block the interaction.

## Comparison history

- Initial capture: the stage's physical border offset the sharp token by 1 px on both axes.
- Fix: replaced the physical border with an inset edge in the stage shadow.
- Post-fix evidence: browser geometry reports 0 px delta for x, y, width, and height.
- No P0/P1/P2 iteration was required.

final result: passed

---

# Natural-entry popover depth and amount-shadow QA

- Scope: visual-material refinement only; token origin, stage geometry, content, and interaction behavior remain unchanged.
- The expanded stage now combines a brighter inner rim, top specular wash, lower-edge shade, near contact shadow, distant lift shadow, and a restrained family-color aura.
- Backdrop material increased from 24px / 145% to 30px / 160% blur and saturation; the page veil remains unchanged so the focused card gains depth without becoming a dark modal.
- The amount editor now has one shadow owner per layer: the stage owns elevation, while `.amount-field` owns the inset glass edge and focus ring.
- Removed the inherited active-state scale from the staged amount label, input, and currency mark. `#amountInput` now reports `transform: none` and `box-shadow: none`, eliminating the clipped/doubled shadow.
- Verified at 390 × 844 and 320 × 568. At 320px the stage remains within 12px side margins, and the amount input remains fully inside the stage.
- Light and dark materials both have dedicated surface, rim, and shadow rules.
- Browser console has 0 warnings/errors; `app.js`, `sw.js`, `git diff --check`, cache-version synchronization, and all 23 contrast combinations pass.

final result: passed

---

# Natural-entry unified field-and-stage QA

- Visual issue reproduced from the user screenshot: the active source token read as a separate tinted rectangle, while the amount editor read as a fully rounded card nested inside a faint outer card.
- The stage now has a clearer family-tinted perimeter, denser lower surface, and stronger near/far elevation shadows, so the complete card remains legible against a blurred white page.
- The active token now uses the same glass gradient, edge highlight, family tint, and soft aura as the stage. Its dashed rectangular underline was replaced by a short, rounded family-color indicator.
- The amount editor is now the lower section of the stage: it spans the stage width, shares the outer bottom corners, and uses only a top divider plus inset tint. It no longer draws a second four-sided border, outer shadow, or independent rounded card.
- `#amountInput` remains shadowless; its active character scale is documented in the later clarification QA. The stage token still reports 0px x/y delta from the hidden source token.
- Verified at 390 × 844 and 320 × 568. At 320px the stage stays within 12px margins and the document has no horizontal overflow.
- Browser console has 0 warnings/errors; syntax, `git diff --check`, cache-version synchronization, and all 23 contrast combinations pass.

final result: passed

---

# Latest QA status — natural-entry lens relay（2026-08-04）

- Full evidence and comparison history are recorded in “Natural-entry lens material and unified relay QA（2026-08-04）” above.
- Source truth: the three supplied screenshots; implementation: `/private/tmp/journa-lens-relay-final-390x844.png` plus the amount, note, category, and close handoff frames in `/private/tmp/`.
- Browser verification passed at 390 × 844 and 320 × 568 with no document overflow and no console warnings/errors.
- Amount, optional-note, category-radius, close-lens continuity, light direction, and upper-right depth findings have no remaining actionable P0/P1/P2 item.
- Physical iPhone Safari/PWA compositing remains a release-device check, not a browser-emulation claim.

final result: passed

---

# Natural-entry stage relay motion QA（2026-08-04）

- Scope: rewrite the mobile natural-entry stage open/close relay only; stored values, editor semantics, first-view lens entrance, and handmark preference remain unchanged.
- Close now uses one 560ms sequence: content exits at 0–120ms, the neutral stage shrinks at 0–320ms, the source family tint fades at 260–420ms, and the summary lens returns at 380–560ms.
- Open reverses the same language: summary lens exits at 0–180ms, stage family tint enters at 140–300ms, and the stage expands at 240–560ms. The stage title stays as one visible glyph and swaps with the source token at the measured handoff.
- The body-level flight clone was removed. Amount and note still enforce a single visible content layer during stage/input handoff.
- Family selection freezes the source tint during close and commits the new family color only at the text handoff, preventing an old-color → new-color flash inside the shrinking card.
- Reduced-motion and immediate-close paths land directly on the final state; the run-id guard still prevents stale timers from hiding a newly reopened stage.
- Validation targets: 390 × 844, 320 × 568, and 360 × 640 in light/dark mode, with intermediate samples at 0, 120, 260, 320, 420, and 560ms; check all six editors, rapid reopen, backdrop close, no horizontal overflow, and zero console errors.
- Cache/version stamp synchronized to `journa-natural-entry-stage-relay-v1-20260804` across `index.html`, `app.js`, and `sw.js`.

final result: pending browser verification

---

# Natural-entry centered token and single-amount QA

- Amount duplication fixed: the source-token mirror fades to opacity 0 after expansion, leaving `#amountInput` as the only visible amount.
- The amount editor now occupies one 72px stage with no reserved header row, no nested border, and no inner shadow. The currency-plus-input group is centered as one visual unit.
- Every non-amount active token still begins at its measured source position, then transitions to the stage center. The long split label ends at an exact 0px center delta.
- Active-token styling no longer uses a tinted capsule or a surrounding shadow. It is transparent text with a short 1px family-color underline.
- The stage edge now reuses the total-amount card language: left/right inset family edges, one soft 1px perimeter, restrained side glow, and one low-elevation shadow.
- Verified at 390 × 844 and 320 × 568. The 320px amount stage stays inside 12px margins and the document has no horizontal overflow.
- Browser console has 0 warnings/errors; syntax, `git diff --check`, cache-version synchronization, and all 23 contrast combinations pass.

final result: passed

---

# Natural-entry amount character-scale clarification QA

- Clarification applied: “下沉效果” referred to the original character scaling, not a recessed input surface.
- Removed the added inset surface shadows, vertical shade, reflected edge, and 1px content translation.
- Restored the existing amount motion language: active `#amountInput` scales to `1.018`, while `.currency-mark` scales to `1.035`.
- The amount remains single, centered, borderless, and free of its own shadow.
- Browser console has 0 warnings/errors; syntax, `git diff --check`, cache-version synchronization, and all 23 contrast combinations pass.

final result: passed

---

# Natural-entry close-tail continuity QA

- First-pass root cause: the stage token and clip-path close transitions ran for 420ms, while JS removed and restored the stage at 280ms.
- Final close model is explicitly staged: content fades immediately, the stage token retraces its opening path while the glass frame shrinks for 360ms to an 18px rounded anchor frame, then the frame fades for 120ms before cleanup.
- Timing is centralized in `MOTION_DELAYS.naturalEntryStageShrink` and `MOTION_DELAYS.naturalEntryStageFade`.
- Reduced-motion and immediate-close paths remain at 0ms.
- The existing run-id guard still prevents stale close callbacks from removing a newly reopened stage.
- Browser sampling during close confirms the stage token remains visible and returns to the source token geometry while content opacity reaches 0; after the 120ms frame fade, the stage is hidden and the source token remains continuously visible.
- Close handoff geometry now matches at both levels: the stage/source boxes share the same bounds, and their text ranges share the same baseline after the closing token adopts the source token's flex centering and transparent 1px border slot.
- The stage token now keeps that flex-centering box for the entire open/close lifecycle, so centering is driven only by the existing `left`/`transform` transitions and no longer loses continuity to a discrete display-mode change.
- The 120ms dissolve now starts at 300ms, overlapping the final 60ms of the 360ms shrink. The source token cross-fades in under `is-stage-handoff`, and cleanup completes at 420ms instead of holding a stationary anchor shell until 480ms.
- The final rounded glass is now a dedicated `.natural-entry-stage-shell` compositor layer. Its 160ms dissolve starts at 280ms and completes before the stage is hidden at 440ms, while token and specular layers fade independently; the cleanup no longer removes a still-painted WebKit backdrop layer.
- Motion curves are now role-specific CSS variables: the stage opens with a quick lift and soft settle, the token uses a restrained overshooting center curve, close uses a slightly elastic return, and the shell dissolve keeps its own softer opacity curve.
- Browser console has 0 warnings/errors; syntax, `git diff --check`, cache-version synchronization, and all 23 contrast combinations pass.

final result: passed

---

# Final QA status — natural-entry lens relay（2026-08-04）

- Full evidence and comparison history are recorded in “Natural-entry lens material and unified relay QA（2026-08-04）”.
- Source truth: the three supplied screenshots. Implementation: `/private/tmp/journa-lens-relay-final-390x844.png` plus amount, note, category, and close handoff frames in `/private/tmp/`.
- Browser verification passed at 390 × 844 and 320 × 568 with no document overflow and no console warnings/errors.
- Amount, optional-note, category-radius, close-lens continuity, light direction, and upper-right depth have no remaining actionable P0/P1/P2 item.
- Physical iPhone Safari/PWA compositing remains a release-device check, not a browser-emulation claim.

final result: passed

---

# Final QA status — note/amount open handoff v14（2026-08-04）

- Note root cause: the active stage painted an outer shell, a delayed family overlay, and an independently rounded/shadowed/clipped input. The input is now transparent, shadowless, radius-free, and unclipped, so the expanding stage remains the only visible surface.
- Empty and filled notes use separate text handoffs. The optional label cross-fades into the placeholder from 120ms; an existing value waits until 220ms, after the moving token reaches the input baseline, avoiding both a blank gap and double text.
- Amount root cause: the stage mirror previously faded at 22% before it could communicate growth. It now remains fully visible while scaling continuously from the sentence geometry to the measured input geometry (1.72 at 390px, 1.61765 at 320px), then cross-fades at that same destination.
- Browser frame sampling passed at 390 × 844 and 320 × 568. Both widths keep `documentElement.scrollWidth === innerWidth`; empty-note, filled-note, and amount opacity handoffs remain continuous; the final console has zero warnings/errors.
- Static validation passed: `git diff --check`, Node syntax checks for `app.js` and `sw.js`, all 23 contrast combinations, and 17 synchronized `journa-natural-entry-handoff-flow-v14-20260804` cache references.
- Evidence: `/private/tmp/journa-note-v14-final.png`, `/private/tmp/journa-amount-v14-final.png`, `/private/tmp/journa-note-v12-320.png`, and `/private/tmp/journa-amount-v12-320.png`.
- Physical iPhone Safari/PWA compositing remains a release-device check; the verified evidence here is the current local browser surface.

final result: passed

---

# Final QA status — amount gray-line and centered note handoff v15（2026-08-04）

- Amount root cause confirmed at 319 × 907: the short stage was a transient scroll container (`clientHeight=78`, `scrollHeight=83`, `scrollTop=4`), which painted the right rail and moved the content up 4px. Amount and note stages now use `overflow:hidden` + `overflow:clip`, hide WebKit scrollbars, and reset `scrollTop`/`scrollLeft` on open, reuse, and cleanup.
- Browser verification passed at 319 × 907, 320 × 568, and 390 × 844. Amount content and field stayed aligned with the stage top; every sampled `scrollTop`/`scrollLeft` remained `0`. The 320px and 390px stages reported `scrollHeight` above their fixed height during reflow but did not become scrollable, and `documentElement.scrollWidth === innerWidth` at each width.
- Filled-note root cause fixed by measuring the visible source label center and the centered input center. The 319px target was `x=-35px`, `y=16px`; the 320px target landed at input center `160px`; the 390px target landed at input center `210px`. The relay token stayed a stable 44px box while scaling from the measured source (`1.36`/`1.535625` in the tested widths). A long note kept the target centered with no overflow.
- Optional notes retain the in-place fade and placeholder handoff; they do not use the filled-note movement route. Settled filled tokens remain at input-center geometry for close/reopen and amount↔note stage reuse. Closing and reopening the shared stage restored the source text without stale tokens or jumps.
- Browser console has 0 warnings/errors. Static validation passed: `git diff --check`, Node syntax checks for `app.js` and `sw.js`, all 23 contrast combinations, and 17 synchronized `journa-natural-entry-handoff-flow-v15-20260804` cache references.
- Reduced-motion selectors and immediate-close paths remain intact; physical iPhone Safari/PWA compositing remains a release-device check, not a browser-emulation claim.

final result: passed
