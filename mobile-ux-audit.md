# TravelLedger 移动端交互体验审查报告

> 审查对象：`index.html` / `css/*`（含 `responsive.css`、`forms.css`、`buttons.css`、`misc.css`、`variables.css`、`a11y.css`）/ `app.js`
> 审查维度：触摸适配、键盘交互、手势操作、表单键盘类型、加载与过渡、可达性
> 结论总基调：**基础工程相当扎实**（44px 触控规范、viewport 安全区、iOS 滚动重构、键盘避让均已落地）。以下仅列出**仍有优化空间**的环节，并给出可落地的具体方案与优先级。

---

## 一、已做得到位的部分（正面基线，避免重复造轮子）

| 项目 | 证据 | 说明 |
|---|---|---|
| 触控目标普遍 ≥44px | `responsive.css:704`（tab）、`:586`（select）、`:596`（compact）、`:2119`（删除/编辑）、`misc.css:3267`（+按钮）、`buttons.css:614`（stepper 伪元素扩热区）、`responsive.css:609`（chip 图标伪元素扩热区） | 多数控件已达 Apple HIG / WCAG 2.5.5 |
| 输入框 ≥16px 防 iOS 缩放 | `forms.css:64/211/380`、`responsive.css:1452/2302/2479` | 聚焦不触发整页放大 |
| 安全区 + 视口适配 | `variables.css:123-126`、`index.html:6`（viewport-fit=cover + interactive-widget=resizes-content） | 刘海/主页 indicators 已处理 |
| iOS 地址栏动画零重排 | `app.js:6806-6910` | 只在手势首尾两次重排，避免逐帧 reflow 卡顿（关键性能点） |
| 键盘避让 | `app.js:6937-6953` + `responsive.css:2151-2155` | visualViewport 检测键盘→隐藏固定提交栏 |
| 滚动时停装饰动画 | `app.js:6955-6969` + CSS `is-scrolling` | 减少 iOS 合成器每帧重绘 |
| 类别横滑方向锁 | `app.js:2607-2656` | 横向橡皮筋 + 纵向交还页面，跟手 |
| 动效降级 | `a11y.css`（prefers-reduced-motion 全量抑制） | 无障碍友好 |
| 焦点环 | `buttons.css:118`、`forms.css:363`、`responsive.css:808` | keyboard focus 可见 |

---

## 二、发现的问题与优化方案（按优先级）

### 🔴 P0 — 影响核心操作成功率，建议优先修

#### 问题 1：分摊家庭芯片触控高度仅 36px（误触风险）
- **现象**：「指定家庭」分摊模式下，参与家庭选择芯片 `.split-family-chip` 在移动端 `min-height: 36px`（`responsive.css:1722`），低于 44px 推荐值；3 个并排时行距仅 7px（`responsive.css:1717-1719`）。
- **影响**：手指易点错相邻芯片，尤其单手操作。
- **方案（二选一）**：
  - A（推荐，低成本）：改为 `min-height: 44px`，3 列网格天然容纳；同时拉大到与 `.split-mode-button` 一致高度。
  - B（不改视觉）：保留 36px 视觉，加 `::after { inset: -4px }` 扩热区（复用 `.chip-icon-button`/`.member-stepper` 既有模式）。
- **代码位置**：`responsive.css:1721-1728`

#### 问题 2：iOS Safari 下输入框聚焦无显式滚入视区
- **现象**：`interactive-widget=resizes-content` 仅 Chromium 支持，iOS Safari 不支持。当前仅在「提交栏 blocked 态点击」时会对缺失字段 `scrollIntoView`（`app.js:3691-3723`）；用户**直接点按**金额/备注等字段时，完全依赖浏览器默认行为，旧版 iOS 偶发字段被键盘或 sticky 头部遮挡。
- **影响**：中低端 iPhone 上聚焦备注/日期时键盘可能盖住输入区。
- **方案**：在窄屏视口给所有文本输入挂 `focus` 监听，聚焦后 `scrollIntoView({block:'center'})`。CSS 已设 `scroll-margin-block: 12px 96px`（`responsive.css:2145-2148`），可直接复用，不会与 sticky 头部冲突。
  ```js
  if (window.matchMedia('(max-width: 820px)').matches) {
    document.querySelectorAll('#expenseForm input, #expenseForm select').forEach((el) => {
      el.addEventListener('focus', () => {
        // 等 visualViewport 稳定一帧再校正
        requestAnimationFrame(() => el.scrollIntoView({ block: 'center', behavior: 'auto' }));
      }, { passive: true });
    });
  }
  ```
- **代码位置**：可放在 `app.js` 的输入初始化区（参考 `scheduleCategoryInputViewportSettle` 同类逻辑）

#### 问题 3：金额输入框缺少纠错/自动大写关闭
- **现象**：`index.html:129` 的金额 `<input>` 仅设了 `autocomplete="off"`，未设 `autocorrect="off" autocapitalize="none" spellcheck="false"`。
- **影响**：iOS 在聚焦时弹出「快速输入」预测条，对纯数字金额毫无意义且侵占纵向空间；中文键盘下 autocapitalize 影响小，但 spellcheck 可能误标。
- **方案**：
  ```html
  <input id="amountInput" name="amount" type="text" inputmode="decimal"
         autocomplete="off" autocorrect="off" autocapitalize="none"
         spellcheck="false" enterkeyhint="next" placeholder="0.00" />
  ```
- **代码位置**：`index.html:129`

---

### 🟠 P1 — 明显提升移动端手感，建议本迭代做

#### 问题 4：账单列表无滑动手势（滑动删除/编辑）
- **现象**：删除/编辑账单需**点按整行展开**再点按钮（`responsive.css:2011` 展开态、`app.js` 展开逻辑）。全代码仅 `app.js:2607` 一处 `touchstart`（类别横滑），列表项无任何 swipe 手势。
- **影响**：移动用户习惯「左滑删除」，当前路径多一步且展开态占用更多纵向空间；展开提示 `ledger-expand-cue` 静息透明度仅 0.52（`responsive.css:2757`），可发现性弱。
- **方案（渐进增强，保留现有点按）**：
  - 在 `.ledger-item` 上实现方向锁的左滑手势：左滑露出「编辑 / 删除」操作层（参照类别横滑的方向锁 + `preventDefault` 模式 `app.js:2618-2646`）。
  - 操作层按钮沿用现有 `.ledger-edit-button`/`.delete-button`（已 44px，`responsive.css:2119`）。
  - 保留点按展开作为兜底；滑动手势仅作增强，不影响无障碍/键盘路径。
- **代码位置**：`app.js` 新增列表项手势（模式复用 `app.js:2607`）；`css/lists.css` / `responsive.css` 增加 `.ledger-item.is-swiping` 样式。

#### 问题 5：数据页无「下拉刷新」
- **现象**：云同步仅在 `focus`/页面可见/`online` 事件触发（`app.js:6247-6252`）。数据面板（`mobile-panel-data`）没有任何下拉手势。
- **影响**：用户拉取他人新账单时缺乏明确、即时的手动刷新入口（尤其弱网后）。
- **方案**：在数据页列表顶部实现下拉刷新——监听 `touchstart/move/end`，纵向下拉超过阈值且 `scrollTop===0` 时触发 `pullCloudLedger({announce:true})`（`app.js:4899` 已有该调用），配合现有 `.metric.primary strong.is-soft-refresh` 动画（`app.js:3217`）。需确保只在列表置顶时拦截，避免与页面纵向滚动冲突。
- **代码位置**：`app.js`（新增手势，复用 `is-soft-refresh` 视觉）、`responsive.css`

#### 问题 6：设置/账本管理抽屉无「边缘右滑返回」
- **现象**：两个抽屉仅能通过背景点击、关闭按钮、Esc 关闭（`index.html:240/247`、对应 JS）。
- **影响**：iOS 用户强预期「从左侧边缘右滑关闭弹层」，缺失会降低熟悉度。
- **方案**：在 `.settings-view`/`.ledger-management-view` 上监听左边缘（clientX < 24px）起手的右滑，拖动时 `translateX` 跟手，松手按位移阈值决定关闭或回弹（复用底栏 FLIP 的弹簧参数）。与现有关闭路径并存。
- **代码位置**：`app.js` + `responsive.css`

#### 问题 7：多处辅助文字字号 < 12px（可达性）
- **现象**：`amount-auto-badge` 0.62rem≈10px（`responsive.css:1386`）、`ledger-sync-badge` 0.64rem≈10px（`:2084`）、`category-pill` 0.7rem≈11px（`:2078`）、`metric span` 0.72rem≈11.5px（`:543`）、`settlement-entry-sub` 0.72rem（`:2349`）。
- **影响**：户外/老花用户难辨；虽非 WCAG 硬性下限，但属移动端可达性短板。
- **方案**：将关键状态文字下限提到 12px（≈0.75rem）：徽章类 `0.62→0.72rem`、同步标 `0.64→0.72rem`、金额自动汇总提示 `0.62→0.7rem`。纯装饰文案可保留小字号。
- **代码位置**：上述各 `responsive.css` 行

#### 问题 8：字段标签对比度被透明混色稀释
- **现象**：付款人/类别/日期/备注的 `legend`/标签使用 `color-mix(in srgb, var(--muted) 86%, transparent)`（`responsive.css:1378` 等），86% 透明度把文字推向背景，实测对比度由正文 ~5.7:1 降到约 4.2:1，临界 AA。
- **影响**：浅色背景下标签偏灰，弱光环境不易读。
- **方案**：将 `86%` 提到 `100%`（用 `--muted` 实色），或至少 `92%`；深色模式同步复核（dark.css 同类混色需一并检查，避免叠加后对比度不足）。
- **代码位置**：`responsive.css:1372-1381`、对应 dark.css 区段

---

### 🟡 P2 — 打磨项，可排期后续

| # | 问题 | 证据 | 优化方案 |
|---|---|---|---|
| 9 | 输入框冗余 `min-height` 过渡（713ms） | `forms.css:75` `transition: min-height var(--motion-slow)` | 输入框 min-height 在移动端恒定，移除该过渡或改为 `0ms`，避免聚焦时潜在布局动画 |
| 10 | 首屏/云拉取无骨架屏 | 仅 `sync-status` 文案 + `is-soft-refresh` 装饰动画（`app.js:3217`） | 初始云拉取期间给列表/统计加低饱和骨架占位，提升「正在加载」感知 |
| 11 | 无长按手势 | 全代码无 `long-press`/`contextmenu` 处理 | 可加：长按账单项快速删除确认、长按类别进删除——作为点按/滑动之外的第三通道（注意与滚动方向锁共存） |
| 12 | 备注「完成」键不提交表单 | `index.html:174` `enterkeyhint="done"` | 备注为末字段，可监听其 `Enter`/「go」直接提交（单手闭环）；或保持现状（因大号提交栏已足够） |
| 13 | 无触感反馈（Vibration API） | 无 `navigator.vibrate` | 关键操作（提交成功、删除确认）可 `navigator.vibrate?.(8)` 轻震，增强操作反馈（需 `try` 包裹，iOS 不支持则静默） |
| 14 | 自定义 `select` 下拉（`ledger-controls`） | `responsive.css:368-386`（`appearance:none` + CSS 箭头） | 移动端可考虑改回原生 `appearance:auto` 选择器，键盘/读屏更友好（视觉代价：失去主题化箭头） |

---

## 三、优先级总排序（实施建议）

| 优先级 | 问题 | 类型 | 改动量 | 收益 |
|---|---|---|---|---|
| **P0-1** | 分摊芯片 36px→44px | 触摸适配 | 极小（1 行 CSS） | 高（消除误触） |
| **P0-2** | iOS 聚焦显式滚入视区 | 键盘交互 | 小（JS+复用现有 scroll-margin） | 高（防遮挡） |
| **P0-3** | 金额输入关纠错/大写 | 表单键盘 | 极小（HTML 属性） | 中（释放纵向空间） |
| **P1-4** | 列表滑动删除/编辑 | 手势 | 中（JS 手势+样式） | 高（符合习惯） |
| **P1-5** | 数据页下拉刷新 | 手势 | 中 | 中高（即时同步） |
| **P1-6** | 抽屉边缘右滑返回 | 手势 | 中 | 中（熟悉度） |
| **P1-7** | 辅助文字 ≥12px | 可达性 | 小（多行 CSS） | 中（可读性） |
| **P1-8** | 标签对比度修复 | 可达性 | 小（改混色比例） | 中（弱光可读） |
| **P2** | 9–14 打磨项 | 综合 | 视项 | 低–中 |

**建议落地顺序**：先 P0 三件（半天内可全做完、风险极低），再 P1-7/P1-8（纯样式、零逻辑风险），随后 P1-4/P1-5/P1-6 手势增强（需手势方向锁与现有滚动逻辑共存测试），最后排 P2。

---

## 四、需要你确认的方向

1. **手势增强**（P1-4/5/6）是否要做？现有「点按展开」「背景关闭」逻辑已经能完成同样功能，滑动手势属于体验升级而非缺陷修复。
2. **字段标签对比度**（P1-8）若提到实色，视觉上会比现在「更重」一点，是否接受？
3. 是否要我**直接动手实现 P0 三项**（最低风险、最高收益），其余出方案待你拍板？

> 注：本报告为纯静态代码审查，未在真机（iPhone / Android）上实测；P0-2、P1-4/5/6 的建议均需在真机回归手势与键盘行为。
