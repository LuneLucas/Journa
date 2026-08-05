# 网页动画系统综合评估报告

> 评估对象：`/Users/Lucas/Documents/app`（TravelLedger / Journa 网页端）
> 评估维度：动画类型与实现方式、性能表现、用户体验（流畅度 / 可访问性 / 减弱动效）、浏览器兼容性、代码可维护性
> 评估日期：2026-08-04
> 代码基线：`app.js` (v journa-natural-entry-stage-relay-v1-20260804)、`css/`（14 文件）、`animations.css` 73 个 `@keyframes`

---

## 0. 结论摘要（速读）

整体评价：**一套工程素养很高的自定义动画系统**，没有引入任何第三方动画库（仅 Supabase JS 为外部依赖），通过"CSS 声明式 + WAAPI + View Transitions"三层分工，把大部分高成本动画压在合成线程，并具备较完整的 `prefers-reduced-motion` 处理与滚动期降载机制。

但存在 **1 个明确的可访问性缺陷**（减弱动效未覆盖 View Transitions 伪元素）、**1 个结构性性能风险**（毛玻璃栏的非均匀缩放 FLIP），以及若干可维护性债务（关键帧膨胀、三套并行系统、重复物理求解）。

| 维度 | 评级 | 一句话 |
|------|------|--------|
| 实现方式 | ★★★★★ | 三层架构清晰，弹簧物理"烘焙"进关键帧的思路很专业 |
| 性能 | ★★★★☆ | 合成器友好，但玻璃栏非均匀缩放 + 滚动期布局测量是隐患 |
| 可访问性 | ★★★☆☆ | 减动支持面很广，却漏掉了 View Transitions（P0 缺陷） |
| 兼容性 | ★★★★★ | VT 有 CSS 兜底，color-mix/backdrop-filter 有 @supports 降级 |
| 可维护性 | ★★★☆☆ | token 化与注释到位，但单文件关键帧膨胀、三系统并行认知负担重 |

---

## 1. 动画类型与实现方式

系统采用**三层分工**，而非单一手段，这是它最大的设计亮点：

### 1.1 CSS 声明式（主力）
- **`@keyframes`**：`animations.css` 73 个、`responsive.css` 43 个、`dark.css` 6 个、`misc.css` 2 个，合计 **120+ 关键帧**。覆盖同步呼吸灯、结算揭幕仪式、面板进出、文字滑变、金额刷新、星尘粒子等。
- **`transition`**：`misc.css` 60 处、`responsive.css` 73 处、`components/*` 散落，用于 hover / focus / 状态切换等"瞬时"补间。
- 大量动画以 **`opacity` + `transform`** 为主属性（合成器友好），`filter: blur/brightness` 与 `box-shadow` 次之（较贵但多用于低频一次性效果）。

### 1.2 Web Animations API（JS 协调的 FLIP）
- `app.js` 中 `element.animate(...)` 用于需要**跨元素几何联动**的场景：
  - 底部提交栏 pill↔circle 形变（`animateBarFlip`，手动 FLIP + 弹簧烘焙，见 §1.4）
  - 自然语言记账舞台的"飞回原位"交接（`closeNaturalEntryStage` 的 `flight`/`handoff`）
  - 金额输入宽度变化的文字 FLIP（`measureAmountInputWidth` → `track.animate`）
  - 落账星尘粒子爆裂（`spawnButtonParticles`）
- 这些动画均带 `fill: "forwards"` 并在 `onfinish`/`oncancel` 中清理临时 DOM 节点（如 `bar-morph-glow`、`bar-family-tint-membrane` 在动画结束后 `remove()`），**无游离节点泄漏**。

### 1.3 View Transitions API（跨文档状态切换）
- 用于**财务数据刷新 / 新增删除账单 / 切换账本**三种"整页状态变化"：
  - `document.startViewTransition(performUpdate)` 包裹 `render()`（app.js:1962）
  - 命名组：`#totalAmount`、`#paidByFamily`、`#categorySummaryBlock`、`#settlementList`、`expense-new`、`expense-removing`
  - 伪元素动画（`::view-transition-old/new`）复用 `element-enter`/`element-exit`/`text-slide-in/out`/`ledger-collapse` 等关键帧
- **特性检测 + 兜底**：不支持 VT 的浏览器（主要是 Firefox）走 `performUpdate()` 直接更新 + CSS 类（`is-entering`、`app-content-refresh`、`is-soft-refresh`）兜底（app.js:1964、4434、4652、6330）。

### 1.4 自写弹簧物理（"烘焙"进关键帧）
- `springSamples({stiffness, damping, mass})`（app.js:1969）解析求解欠阻尼弹簧的位移曲线，按 `duration/8` 采样 **24–96 帧**，`values` 数组喂给 WAAPI，`easing: "linear"`。
- **关键设计**：弹簧物理只在交互瞬间在主线程算一次（几十次浮点运算），实际播放由 WAAPI 在合成线程插值——既得到弹簧的弹性手感，又几乎不占主线程。落尾还用三次 Hermite 插值把速度平滑归零（`landingStateAt`）。
- 定义了多组弹簧常量：`SPRING_BAR_COLLAPSE/EXPAND`、`SPRING_CATEGORY_ADD_OPEN/CLOSE`。

### 1.5 滚动驱动 / rAF 节流
- 全局 `is-scrolling`（app.js:9180）滚动时挂类、停 180ms 后摘除，CSS 借此 `animation-play-state: paused` 暂停同步呼吸灯、欢迎页漂浮等**无限装饰动画**，降低滚动期合成器负载。
- `header` 熔化进度、`natural-entry-stage` 定位、桌面指针吸附均经 `requestAnimationFrame` 节流，且多数 `passive: true`。

---

## 2. 性能表现

### 2.1 优点（已做对的事）
- **FLIP 优先**：底部栏、金额文字、舞台交接都不在动画里改 `width/height/top/left`，而是测首末 `getBoundingClientRect` 后用 `transform` 补位——避免每帧 layout。
- **弹簧烘焙**：见 §1.4，主线程零持续负担。
- **滚动降载**：`is-scrolling` 暂停装饰无限动画（animations.css:1300）。
- **`content-visibility`** 挂在 `.ledger-item` 行级（按项目记忆，已审计禁止挂组级，避免裁阴影）。
- **`will-change` 管理较克制**：大多限定在动画态选择器内（如 `.is-mobile-panel-switching-out`），并在收尾处 `will-change: auto` 复位（responsive.css:4207），未观察到长期驻留导致的图层内存膨胀。

### 2.2 问题与风险
- **【P1】毛玻璃栏的非均匀缩放 FLIP**：`animateBarFlip` 对带 `backdrop-filter` 的玻璃栏施加 `scale(scaleX, scaleY)` 非均匀缩放（app.js:2202）。`backdrop-filter` 在被 transform 缩放时，部分浏览器（尤其低端 iOS）需逐帧重新栅格化 backdrop 采样，且非均匀缩放会放大模糊采样瑕疵。项目已用独立的 `fixed` 层 `bar-morph-glow` / `bar-family-tint-membrane` 把光晕与着色剥离以避免被 shear，但**栏本体仍在缩放**。建议：对 morph 主体改用"均匀 scale + clip-path 收口"或"仅 translate + 用 border-radius 变化近似"，或对该层显式 `will-change: transform` 并实测低端机帧率。
- **【P1】滚动期持续布局测量**：`positionNaturalEntryStage`（app.js:2453）在 `scroll`/`resize`/`visualViewport` 上经 rAF 调度，**只要自然语言舞台处于打开状态且用户滚动，每帧都跑多个 `getBoundingClientRect()` + `getComputedStyle()`**（量大：anchor、stage、token、amount/note 轨道各一次）。这会强制 style/layout 重算。虽已 rAF 节流，但在"边打字边滚"的长列表场景仍可能掉帧。建议在舞台打开期间对锚点做**冻结快照**（已在 `freezeNaturalEntryAnchor` 中有雏形），或仅在编辑切换/视口尺寸真正变化时才重测。
- **【P2】`applyHeaderProgress` 的 `getComputedStyle` 热路径**：移动端 header 熔化在每次滚动帧调用 `getComputedStyle(title).transform`（app.js:8804 一带），强制样式刷新。可缓存上次 transform 字符串、无变化时跳过写回。
- **【P2】`max-height` 动画**：`ledger-collapse`（animations.css:770）以 `max-height: 280px → 0` 驱动。该关键帧被 `::view-transition-old(expense-removing)` 复用——因发生在 VT 快照（栅格化图像）上，比实时 DOM 轻，但 `max-height` 本身不是合成器属性，仍会触发快照盒的重绘/裁剪。建议改用 `transform: scaleY()` + `transform-origin` 或项目已有的 `smoothContainerResize`（FLIP 高度）思路。
- **【P2】`springSamples` 重复求解**：`getBarMorphDuration`（app.js:2025）与 `animateBarFlip`（app.js:2184）各解一次同一弹簧（最多 96 次迭代，成本极低，但属冗余）。可缓存结果。
- **【P3】`getCssDurationMs` / `getComputedStyle(...).getPropertyValue("--settle")`** 在动画函数内多次调用（app.js:5749、7680），每次强制样式刷新；可预读或传参。

---

## 3. 用户体验

### 3.1 流畅度（好）
- 弹簧常量 ζ≈0.58–0.59，单段可见回弹，手感"活"但不飘；运动时长 token 化（`--motion` 534ms、`--motion-fast` 401ms、`--motion-slow` 713ms）。
- 结算揭幕仪式用 `animation-delay` 编排 300–1410ms 的时序链（节点点亮→光带贯通→卡片落定），叙事性强。
- 滚动期自动暂停装饰动画，避免"滚动卡顿 + 动画抢算力"叠加。

### 3.2 可访问性（有硬伤）
- **【P0 · 明确缺陷】`prefers-reduced-motion` 未覆盖 View Transitions**。
  - `a11y.css` 用 `@media (prefers-reduced-motion: reduce)` + 通配符 `*, *::before, *::after { animation-duration: 1ms !important; ... }`（a11y.css:26-33）。
  - **但 CSS 通配符 `*` 不匹配 `::view-transition-old()/new()` 伪元素**，故这些 VT 伪元素的动画**不会被 1ms 折叠**。
  - 同时 JS 在调用 `document.startViewTransition` 前**未检查 `prefersReducedMotion()`**（app.js:1962、4435、4652 均只判断 `document.startViewTransition && animateFinancialChanges && !mobilePanelFlow`）。
  - **后果**：开启"减弱动态效果"的用户，在每次财务刷新/增删账单时，仍会看到总额数字的 `text-slide-in/out`（带 blur 位移）、新增卡片的 `element-enter` 等完整过渡——与减动偏好相悖。
  - **修复**：① 在三个 VT 分支前置 `&& !prefersReducedMotion()`；② 或在 `a11y.css` 显式追加 `::view-transition-old(*), ::view-transition-new(*) { animation: none !important; }`。
- 其余减动处理到位：自然录入舞台的 `transition` 被强制 0.01ms、若干必要动画 `animation: none`、装饰光带 `flow-sheen` 隐藏、`transform: none` 复位等（a11y.css 全文）。
- 另有 `prefers-reduced-transparency` 降级（按项目记忆已把 `--blur-*` 全部置 `none`）。

### 3.3 减弱动效偏好（支持广，但 VT 缺口同上）
- JS 侧 `prefersReducedMotion()` 守卫已覆盖粒子（`spawnButtonParticles` 直接 return）、金额文字 FLIP、滑块 springBack、指针吸附等交互性动画——这部分是**显式、正确**的。
- 缺口集中在"声明式 VT 分支"未显式守卫（见 §3.2 P0）。

---

## 4. 浏览器兼容性

| 技术 | 支持情况 | 项目应对 |
|------|----------|----------|
| WAAPI (`element.animate`, `fill`) | 全现代浏览器 | 直接用，无降级 |
| View Transitions API | Chrome/Edge 109+，Safari 18+；**Firefox 仍不支持（截至 2026 多数版本）** | `document.startViewTransition` 特性检测 + CSS 类兜底（is-entering / app-content-refresh / is-soft-refresh）✅ |
| `color-mix()`（大量用于 glow 颜色） | Chrome 111+ / Safari 16.2+ / Firefox 113+ | 旧浏览器仅颜色回退（不崩），无显式 `@supports` 分支 |
| `backdrop-filter` | 需 `-webkit-` 前缀（Safari） | 已同时写 `-webkit-backdrop-filter` 与标准属性 ✅（misc.css / responsive.css / toast.css） |
| 独立 `translate`/`rotate` 属性（`welcome-orb-drift`） | Chrome 104+ / Safari 14.1+ / Firefox 72+ | 门槛低，安全 |
| `linear()` 缓动（`--spring-glide`） | Chrome 113+ / Safari 17.2+ | 仅在 token 定义，旧浏览器回退到同名字段前的声明 |
| `@supports not backdrop-filter` 降级 | — | 已有（按项目记忆：毛玻璃降级块同步置 `--blur-*` 为 none）✅ |

**结论**：兼容性处理整体成熟，VT 与 backdrop-filter 两处最关键风险都有兜底。剩余风险是 `color-mix` 旧浏览器颜色回退（视觉降级非故障）与 `linear()` 缓动回退（已留备用声明）。

---

## 5. 代码可维护性

### 5.1 优点
- **运动变量 token 化**：`--motion` / `--settle` / `--spring` / `--snap` / `--motion-fast` / `--soft-transition-blur` 集中在 `variables.css`，改一处即全局生效。
- **注释充分**：弹簧物理、FLIP  handoff、VT 与 CSS 兜底互斥逻辑均有中文注释解释"为什么"，降低接手门槛。
- **分层职责清晰**：声明式（CSS）/ 协调式（WAAPI）/ 跨文档（VT）各有适用面，且 VT 与 CSS 兜底用注释明确"二选一、不叠加"。
- **清理机制完善**：WAAPI 临时节点在 `onfinish`/`oncancel`/`setTimeout` 三重兜底下移除，无游离节点。

### 5.2 问题
- **【P2】`animations.css` 单文件膨胀**：1300+ 行、73 个关键帧且持续增长；其中大量"过冲/光晕"类高度相似（`family-lamp-overshoot` / `family-halo-overshoot` / `category-halo-ignite` / `category-halo-lamp-settle` / `choice-select-pop` / `category-choice-select-pop` 等），可用 CSS 自定义属性参数化或合并为少量模板。
- **【P2】三套并行系统认知负担**：新人需同时理解 CSS keyframes、WAAPI FLIP、VT 三套心智模型；缺少一份"何时用哪套"的架构文档。
- **【P2】CSS↔JS 命名耦合**：关键帧名以字符串在 JS 中引用（如 `is-closing`、`is-relay-settled`、`is-flip-morphing`），重命名无编译器保护，易遗漏。
- **【P3】无动画行为测试**：弹簧求解、FLIP 落点、VT 兜底均无单测/快照测试，重构时只能靠肉眼。
- **【P3】`springSamples` 冗余求解**（见 §2.2）。

---

## 6. 问题与优化方向（优先级清单）

| 优先级 | 问题 | 优化方向 |
|--------|------|----------|
| **P0** | 减弱动效未覆盖 View Transitions（可访问性缺陷） | VT 三分支前置 `!prefersReducedMotion()`；或 a11y.css 显式 `::view-transition-old(*)/new(*) { animation: none !important }` |
| **P1** | 玻璃栏非均匀缩放 FLIP 在低端 iOS 可能掉帧/瑕疵 | 评估"均匀 scale + clip-path 收口"或 border-radius 近似；对该层 `will-change: transform` 并实测帧率 |
| **P1** | 自然语言舞台打开时滚动每帧多次 `getBoundingClientRect`/`getComputedStyle` | 锚点冻结快照；仅在编辑器切换/视口尺寸变化重测，而非每次 scroll |
| **P2** | 结算删除用 `max-height` 动画（非合成器属性） | 改 `transform: scaleY()` 或复用 `smoothContainerResize` 的 FLIP 高度 |
| **P2** | `animations.css` 关键帧膨胀 + 大量相似过冲/光晕帧 | 用 CSS 变量参数化、合并为模板关键帧 |
| **P2** | 三套动画系统无架构文档 | 补一份"CSS / WAAPI / VT 选型指南" |
| **P2** | CSS↔JS 关键帧/类名字符串耦合 | 提取动画名常量或约定命名表 |
| **P2** | `header` 熔化 `getComputedStyle` 热路径 | 缓存上次 transform，无变化跳过写回 |
| **P2** | `springSamples` 重复求解 | 结果缓存 |
| **P3** | 缺动画行为测试 | 为弹簧求解、FLIP 落点、VT 兜底补单测/快照 |
| **P3** | `color-mix` / `linear()` 旧浏览器仅隐式回退 | 可选 `@supports` 显式分支，确保配色不突兀 |

---

## 7. 总体评分与建议

- **工程水平**：高。零第三方动画库、弹簧烘焙、FLIP、VT 兜底、滚动降载，这套组合在独立 Web App 里属上乘。
- **最该立刻修的**：P0 的 View Transitions 减动缺口——它直接违背"减弱动态效果"的用户系统级设置，且修复成本极低（一行守卫或一个伪元素规则）。
- **最该关注的性能点**：P1 的玻璃栏非均匀缩放与舞台滚动期布局测量，建议在真实低端 iOS 设备上用 Performance 面板实测，确认是否触发现场掉帧。
- **长期健康度**：关键帧去重 + 补架构文档 + 引入动画名常量，能显著降低后续迭代的回归风险。

> 注：本报告基于静态代码审查与架构推断，未运行真机性能采样。P1 性能项建议以真机 Profile 验证后再排期。
