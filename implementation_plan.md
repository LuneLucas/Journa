# 解决多用户并发编辑的云同步问题

当前云同步存在典型的**并发写入冲突（Lost Updates）**和**离线覆盖（Offline Overwrites）**问题：
1. **互相覆盖**：两人同时编辑同一笔账单，后保存的会完全覆盖前者的修改。
2. **删除幽灵**：如果本地删除账单时断网或同步失败，账单仅在本地被移除，下次拉取云端又会“复活”。
3. **离线覆盖删除**：A 删除了账单，B 处于离线状态且有对该账单的未同步编辑。B 连网后推送编辑，会导致该账单在云端被重新创建。
4. **设置冲突**：多人同时修改账本设置（如分类、家庭成员），最后保存的会直接覆盖。

## Proposed Changes

为了彻底且优雅地解决这些问题，建议采用基于时间戳的 **Last-Write-Wins (LWW, 最后写入胜出)** 策略，并引入**软删除（Soft Deletion）**机制。这种机制非常适合轻量级离线优先应用。

### 数据库层 (supabase-schema.sql)

修改表结构和同步逻辑：
1. **软删除机制**：在 `travel_expenses` 表新增 `is_deleted boolean default false` 字段。删除操作不再 `delete` 数据，而是标记 `is_deleted = true`。
2. **引入客户端时间戳**：修改 `save_travel_expense` 和 `update_travel_ledger_settings`，接收客户端的 `updated_at`。
3. **LWW 并发控制**：在更新数据时增加条件 `where updated_at < excluded.updated_at`。只有当客户端提交的数据比服务器上的数据更新时，才允许覆盖。服务器总是以数据自身的最新时间戳为准。

#### [MODIFY] supabase-schema.sql
- 修改表 `travel_expenses`，增加 `is_deleted`。
- 修改 `save_travel_expense` 函数，支持传入 `p_is_deleted` 和 `p_updated_at`，并在 upsert 时应用 LWW 规则。如果因为时间戳旧而没有更新，应静默忽略或返回特定状态。
- 修改 `update_travel_ledger_settings` 函数，支持传入 `p_updated_at` 并应用 LWW 规则。
- （为了向后兼容，可以保留旧函数签名并映射到新逻辑，或者提供默认值）。

### 前端层 (app.js)

1. **状态结构升级**：
   - 为 ledger 设置增加 `state.updatedAt`。
   - 为 expense 增加 `expense.updatedAt` 和 `expense.isDeleted`。
2. **彻底统一“编辑”与“删除”**：
   - 本地删除账单不再调用 `deleteCloudExpense`（该 API 可废弃）。
   - 删除变成修改 `isDeleted = true` 并更新 `updatedAt`，然后走和正常编辑一样的 `syncCloudExpense` 流程。
   - `renderLedger` 和统计函数需要过滤掉 `isDeleted === true` 的账单。
3. **拉取合并逻辑 (Pull Merge)**：
   - 重写 `pullCloudLedger` 中的合并逻辑。不再简单地“保留本地 pending”，而是进行**逐条比对 `updatedAt`**。
   - 如果云端的 `updatedAt` > 本地的 `updatedAt`，则采用云端数据（即使本地是 pending 状态，也说明云端有其他人的更新操作）。
   - 如果本地的 `updatedAt` > 云端的 `updatedAt`，则保留本地数据。
4. **触发保存的时间戳更新**：
   - 任何新增、修改账单时，赋予 `updatedAt = new Date().toISOString()`。
   - 任何修改账本设置（名称、家庭、分类）时，赋予 `state.updatedAt = new Date().toISOString()`。

## Verification Plan

### Manual Verification
1. **模拟并发编辑**：开两个浏览器窗口，同时修改同一条账单的不同字段。先后保存，验证后保存的如果时间较新能否成功覆盖，如果人为制造旧时间戳是否会被云端拒绝。
2. **模拟断网删除**：在断网环境下删除账单，然后连网。观察账单是否能正确同步删除状态到云端，而不是像以前那样在下拉时复活。
3. **撤销删除**：验证删除后点击撤销（即恢复 `isDeleted = false` 并更新时间戳）是否能正确同步。

## User Review Required

> [!IMPORTANT]
> 这次改动将涉及到数据库的 Schema 更新。在更新 SQL 后，需要重新在 Supabase 控制台执行一遍 SQL 文件（新的字段和修改后的函数会兼容叠加）。
> 另外，基于 `updatedAt` 的 Last-Write-Wins 策略要求不同用户的设备时间基本同步。对于普通用户的手机来说，系统时间通常都是自动网络校准的，这在绝大多数场景下不会产生问题。
