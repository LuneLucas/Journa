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
