# 分享落地欢迎页 · 设计方案（分步滑卡版）

面向「用户从分享链接进入网页」的场景。当前主站仅在带 `#ledger=TOKEN` 时静默加入账本，没有专门的落地欢迎页。

设计取向：**沿用主站既有的 `welcome-view` 分步引导浮层（一屏一概念、横滑翻页）**，把「降低学习成本」放在首位——不再做单页长滚动（信息密度过高、阅读门槛高），而是拆成 5 张滑卡，每张只讲一件事，配合插画 + 一两行文案。第一屏做分享来源感知的英雄页，最后一屏「认个家」+ 终端 CTA「立即查看」。

> 可预览原型：`share-welcome.html`（与本项目同目录，链接主站真实 `variables.css` / `animations.css` / `components/buttons.css` / `misc.css` / `dark.css` / `a11y.css`，令牌/按钮/暗色/减少动效 100% 一致）。左下角「预览来源」开关可切换 默认 / 二维码 / 邮件 / 社交 / 私信 五种文案。

---

## 1. 页面结构（5 屏横滑，一屏一概念）

复用主站 `.welcome-view`（居中卡片 + `.welcome-track` 横滑 + `.welcome-dots` 步骤点 + 下一步/跳过）。每屏聚焦单一信息，认知负担低：

| 屏 | 角色 | 插画（复用主站） | 文案要点 |
|---|---|---|---|
| 1 | **英雄页（分享感知）** | 三圆母题 `.welcome-orbs`（带呼吸漂浮） | 来源徽标 + eyebrow + 主标题 + 副标题，随 `?from=` 变化；明确「打开就能看到每个人记的每一笔」 |
| 2 | **分摊范围（重点）** | `.welcome-split-modes` 三种分摊方式 | **记一笔时先选「这笔钱算在谁头上」**：三家按人头分 / 谁没去就只选参加的 / 请客直接填金额；怎么分你定，平账交给系统 |
| 3 | 平账自动算 | `.welcome-mini-settle` 一行转账 | 「打开统计和平账，谁该给谁多少一眼看清」——告诉读者去哪看 |
| 4 | 三家实时同步 | `.welcome-mini-link` + `.welcome-sync-dots` 脉冲 | 「记一笔，三家同时看见」——实时，免对账 |
| 5 | **认家 + 终端 CTA** | 三家庭选择（预览静态；生产由 `operator-family-choices` 注入） | 选家庭后「立即查看」可用，进入共享账本 |

- **英雄屏主标题**：`三个家庭，一本账`（中文用 `--fw-bold` 700，避免 faux bold 发糊）。
- **终端行动号召**：最后一屏「立即查看」→ 进入账本（生产：隐藏本视图并 reveal 主应用，可选先弹 `operatorModalView` 认家）；右上角「跳过」等同直接进入。
- 底部「下一步 / 完成」按钮 + 步骤圆点，支持点击圆点跳屏、触屏横滑翻页。

**文案原则（亲和力 + 一看就懂）**：统一第二人称「你 / 你们」；每屏要么点明「记一笔时…」（怎么用），要么点明「打开…看」（在哪看）；复杂板块「分摊范围（屏 2）」用「这笔钱算在谁头上」把抽象概念落到具体操作，并配祺家没去聚餐等具体例子，降低理解门槛。

## 2. 动效设计

| 动效 | 实现 | 说明 |
|---|---|---|
| 卡片入场 | `.welcome-dialog` 复用 `confirm-dialog-enter`（spring 缩放淡入） | 整卡进入 |
| 每屏内容渐入 | 当前屏 `.welcome-slide.is-active > *` 交错 `sw-rise`（translateY 11→0，逐元素 55ms 阶梯） | 翻到哪屏，哪屏内容错峰浮起 |
| 圆母题微动 | 复用主站 `welcome-orb-drift`（±漂浮，三圆错相位 infinite） | transform-only，合成器友好 |
| 同步脉冲 | 复用主站 `welcome-sync-pulse`（三点错相位呼吸） | 仅第 4 屏 |
| 翻页 | `.welcome-track` 横向 `scroll-snap` + `scrollTo` 平滑；滚动时 rAF 同步当前屏与圆点 | 触屏原生滑动手感 |
| 滚动暂停装饰 | 复用主站 `body.is-scrolling` 暂停 `.welcome-orb` / `.welcome-sync-dots` 持续动画 | 与主站同源策略，降滚动负载 |
| 减少动效 | `@media (prefers-reduced-motion: no-preference)` 才挂动画；reduce 时全部瞬显零位移 | 无障碍兜底 |
| 终端 CTA 延迟淡入 | 进入第 5 屏后 2 秒，给「立即查看」加 `is-revealed`（opacity 0→1 + translateY 10→0）；期间 `pointer-events:none` 不可点击 | 防止一进末屏就误点跳过「认家」，给用户读文案的缓冲；`prefers-reduced-motion` 时缩短过渡 |

## 3. 响应式与触摸体验

- **天然移动优先**：横滑卡片本身即移动交互范式；`≤520px` 时来源预览开关贴底铺开，`env(safe-area-*)` 适配刘海/灵动岛。
- **触摸优化**：复用主站 `buttons.css` 的 `-webkit-tap-highlight-color: transparent; touch-action: manipulation`（去点按灰块、去双击缩放）；步骤点/圆母题点击热区充足；`:active` 按压缩放反馈由主站按钮样式提供。
- **矮屏兜底**：`.welcome-dialog` 在超高时 `overflow-y: auto` + `overscroll-behavior: contain`，不被裁切底部按钮（不破坏横向滑卡）。
- **不依赖 hover**：所有关键信息在触屏下均有清晰态。

## 4. 品牌一致性

- **配色**：全部走 `variables.css` 令牌。主题色 `--brand-primary` / `--brand-primary-strong`；三家庭色（`#a9ceb5` / `#b9c9e6` / `#efc2bf`）用于圆母题、同步点、认家 chip。
- **字体**：正文 `--font-body`；金额/数字 `--font-number`（SF Mono 等宽 `tabular-nums`，如平账 `¥86.50`）。
- **字重红线**（与主站一致）：含中文用 `--fw-bold`(700) / `--fw-cjk-black`(700)；`--fw-heavy`(800) 仅留给纯拉丁/符号（如 `→`）。避免中文 faux bold 发糊。
- **玻璃材质**：卡片/圆点沿用 `.welcome-dialog` 的半透明渐变 + `var(--glass-edge)` + `var(--shadow-chip)`，与主站「高模糊低不透明」毛玻璃一致。
- **暗色**：直接链 `dark.css`（`prefers-color-scheme` 自动）。引导浮层在明暗下均保持浅色表面（与主站 onboarding 浮层一致），文字翻亮、圆母题实色半透明清晰可见。
- **主题色跟随**：`data-theme="clay"`（主站默认）；生产接入读取 `localStorage['travel-ledger-theme']` 同步。

## 5. 加载性能

- **零额外首屏请求**：原型链接主站既有 CSS（已随主站缓存），插画全为内联 SVG / CSS 图形，无图片请求；新增 `<style>` / `<script>` 极小。
- **仅渲染当前屏**：横滑卡片天然一次只显示一屏，非当前屏不在视口内、无绘制压力（无需 `content-visibility`）。
- **装饰动画零布局成本**：圆/同步点仅 `transform`，且滚动时暂停（`body.is-scrolling`）。
- **生产接入零成本**：视图 `hidden` 默认不渲染；仅当检测到分享链接（`#ledger=TOKEN`）时才显示，**普通直接访问用户完全不付出代价**。
- **接入时务必同步版本戳**（红线）：`index.html` 的 CSS `?v=`、新 JS 钩子的 `?v=`、`sw.js` 的 `APP_VERSION`、`PRECACHE_URLS` 里新条目带 `?v=${APP_VERSION}`——缺一即旧缓存生效、看不到新样式。

## 6. 分享上下文感知

**检测优先级**（`app.js` 接入时复用同一逻辑）：

1. URL 查询 `?from=`（分享链接生成时附加，如 `index.html?from=qr#ledger=TOKEN`）；
2. hash 内 `&from=`（兼容 `#ledger=TOKEN&from=qr`）；
3. `document.referrer` 域名启发式（微博/微信/QQ→social；mail/outlook/163→email；wa.me、t.me、open.weixin.qq.com→message）；
4. 兜底 `default`。

> 二维码场景通常无 referrer，建议生成二维码链接时显式带 `?from=qr`。`?inviter=名字` 可在 message/email 来源把 eyebrow 变为「{名字} 邀请你」。

**文案与视觉映射**（原型左下角可逐一预览；视觉主体始终是圆母题，仅文案与徽标差异，控制维护成本）：

| `from` | 徽标 | eyebrow | 主标题 | 副标题要点 |
|---|---|---|---|---|
| `default` | 共享账本 | 欢迎加入 | 三个家庭，一本账 | 这是你们三家的共享旅行账本。打开就能看到每个人记的每一笔，也能随手记一笔 |
| `qr` | 扫码加入 | 扫码加入 | 账本，就在你手边 | 扫一下就进来了。这是家人共享的旅行账本，谁花了多少，打开全看得见 |
| `email` | 邮件邀请 | 来自一封邀请邮件 | 家人喊你一起记账啦 | 点开链接就能加入。之后你记的每一笔，都会实时同步给其他两家 |
| `social` | 社交分享 | 来自社交分享 | 朋友分享了一个共享账本 | 三家同行，账单一目了然。点进来认个家，旅程花销从此清清楚楚 |
| `message` | 私信邀请 | {inviter} 邀请你 | 来一起算清这趟旅行 | 先选好你来自哪个家庭，之后每笔记账都带上你的名字 |

徽标前图标随来源切换（link / qr / mail / share / chat 内联 SVG）。

---

## 集成方案（接入主站，非破坏性、可回退）

本方案本身就是主站 `welcome-view` 的同款结构，接入成本最低：

1. **新建 `css/share-welcome.css`**：把 `share-welcome.html` 的 `<style>`（去掉演示来源开关块）原样移入，类名保留 `sw-` 前缀避免冲突。
2. **`index.html`**：`<head>` 增 `<link rel="stylesheet" href="./css/share-welcome.css?v=<版本戳>">`；把英雄屏（第 1 屏）的分享感知标记并入既有 `#welcomeView` 的第一张 `.welcome-slide`（加 `sw-source-badge` + `id`），并把内联 `<script>` 抽出为 `js/share-welcome.js`（同版本戳引用）。若希望分享欢迎与首次使用欢迎区分，也可复制一份 `#welcomeView` 改 `id="shareWelcomeView"`。
3. **`app.js`**：
   - 启动时若 `getLedgerTokenFromLocation()` 命中，调用 `showShareWelcome()`：用 `detectSource()` + `applySource()` 填充第一屏来源文案、`bindSourceSwitch()` 绑定；CTA（进入→隐藏视图 reveal 主应用，可选先弹 `operatorModalView` 认家；指南→`openWelcomeButton.click()`；跳过→同进入）；监听滚动暂停（与现有 `is-scrolling` 合并）。
   - 最后一屏「立即查看」在进入前唤起认家（复用既有 `operator-family-choices` 注入逻辑）。
   - 生成分享链接处（`copyShareLink`/`getShareUrl`）追加 `?from=<来源>`（二维码默认 `qr`）。
4. **版本戳三处同步**（红线）：`index.html` 新 CSS/JS 的 `?v=`；`sw.js` 的 `APP_VERSION`；`sw.js` `PRECACHE_URLS` 追加 `./css/share-welcome.css?v=${APP_VERSION}` 与 `./js/share-welcome.js?v=${APP_VERSION}`。
5. **回退**：视图默认 `hidden`，接入失败不影响现有分享加入流程。

## 待确认 / 决策点

- **进入后是否强制「认个家」**：建议开启——最后一屏选家庭后「立即查看」即进入，并在生产端复用 `operatorModalView` 强化署名。
- **来源参数落地方式**：`?from=` 改动最小、最可靠；referrer 已能覆盖绝大多数社交/邮件/消息；二维码需显式 `?from=qr`。
- **是否要埋点**：建议记录各来源进入率与「立即查看」转化率，迭代文案（可与现有 `analytics` 体系对接，如需我再加）。
