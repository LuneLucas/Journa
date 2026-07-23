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
