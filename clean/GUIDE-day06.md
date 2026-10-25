# GUIDE-day06 — 多模块协作与架构守卫

预计时间：**150 分钟**（概念 30 + 手打 90 + 验收 30）

> 建议完成手打后再对照 `solution/day06/`（本教程的终态基线，Day 07 由它派生）。
>
> **本日涉及的 TS 语法**：`import type`、barrel（`index.ts` 汇总导出）、`interface`。不熟悉时可先阅读 `00-开始之前.md` 第 3 节。

---

## 概念

### 1. 将 users 提取为独立模块

Day 05 结束时，auth 模块中包含三项不属于「认证」的内容：

```
auth/domain/schemas/user.ts                     ← users 表的行形状
auth/domain/ports/user-account-repository.port.ts
auth/infrastructure/sqlite-user-account-repository.ts   ← users 表 DDL + SQL
```

「账号」属于**另一个领域**，后续会出现修改昵称、更换头像、会员等级等与登录无关的用例。
更实际的问题在于：同一张表被两个领域读写时，DDL 与 SQL 会各自维护，逐渐不一致。

### 2. 模块边界的划分

```
modules/users/
├── domain/
│   ├── ports/
│   │   ├── user-account-repository.port.ts   # 模块**内部**持久化契约
│   │   └── user-account.public.port.ts       # 模块**对外**契约（供 auth 消费）
│   └── schemas/user.ts                       # 行形状（SSOT）
├── application/user-account.public.service.ts # 公共契约的实现，转发到仓储
├── infrastructure/sqlite-user-account-repository.ts # 表 DDL + SQL 唯一落点
├── compose.ts                                 # createUsersModule({ db }) → { account }
└── index.ts                                   # 仅导出：组合根 + 公共端口 + 行形状
```

三项要点：

1. **公共端口与内部端口分离**：内部端口可自由增删方法；公共端口是契约，修改需遵循「先新增、后废弃」的流程；
2. **薄转发层**：`UserAccountPublicService` 仅负责转发，但它是契约持有者；仓储实现可替换而消费者不受影响，后续的审计、缓存与事务也有唯一位置；
3. **表归属**：`INSERT INTO users`、`UPDATE users` 与 `CREATE TABLE users` 在全项目中仅允许出现在 `users/infrastructure/`。

### 3. 跨模块的三条约束

```ts
// 唯一允许的跨模块写法：引用对方的 index.ts
import { createUsersModule, type UserAccountPublicPort } from '../users/index'
import type { TimeProvider } from '../shared/index'

// 一律禁止
import { SqliteUserAccountRepository } from '../users/infrastructure/sqlite-user-account-repository'
```

组合根负责接入其他模块的实现：

```ts
// main.ts：装配顺序与依赖顺序一致
const users = createUsersModule({ db })
const auth = createAuthModule({ db, userAccount: users.account, timeProvider, idGenerator, eventBus, bcryptRounds })
```

### 4. 架构守卫：使约束可执行

`tests/architecture.test.ts` 通过三条规则将口头约定转化为 CI 检查：

| 规则 | 检查方式 |
|---|---|
| ① 跨模块 import 必须指向对方 `index.ts` | 扫描源码中的所有 `modules/<x>/...` 相对 import，解析后的路径必须为 `modules/<x>/index.ts` |
| ② `domain/` 不得 import 基础设施与 npm 包 | `domain/**` 的 import 仅允许相对路径与白名单（`domain/schemas/`、`domain/validators/`、`domain/events/` 允许 `zod`） |
| ③ `INSERT INTO users`、`UPDATE users`、`CREATE TABLE users` 仅允许位于 `users/infrastructure/` | 全文正则扫描 |

> 守卫测试自身也需要完整性检查（例如断言扫描到的文件数大于 30），否则正则错误或目录为空时仍会通过。

工程实践中，这类守卫通常由 ESLint 的 `no-restricted-imports` 与自定义脚本共同实现；关键在于将规则接入 CI，而非仅写入文档。

### 5. 事件：模块间的低耦合协作

auth 发布 `UserRegisteredEvent`（Day 07 的 notifications 模块订阅该事件）；
订阅方**仅 import auth 的公共接口**以获取事件类型，auth 不需要了解订阅方。

---

## 手打目标

### 1. 新建 `modules/users/`（从 auth 迁移 3 个文件）

- 迁移 `schemas/user.ts` 到 `users/domain/schemas/user.ts`（更新文件头注释，说明表归属与形状约束）；
- 拆分端口：内部 `UserAccountRepositoryPort`（可自由演进）与公共 `UserAccountPublicPort`（契约）；
- 迁移仓储实现；**`users/index.ts` 仅发布**：`createUsersModule` / `UsersModule` / `UserAccountPublicPort` / `UserRowSchema` / `UserRow`。

### 2. `users/application/user-account.public.service.ts`

四个方法分别转发到仓储端口。文件头需说明该转发层的作用（见概念第 2 节）。

### 3. auth 模块调整

- `auth/index.ts` 不再对外发布用户形状相关内容；
- 依赖契约：`userAccountRepository: z.custom<UserAccountRepositoryPort>()` 改为 `userAccount: z.custom<UserAccountPublicPort>()`；
- 实体 `import type { UserRow } from '../../../users/index'`（**仍通过公共接口**）；
- compose 接收 `userAccount`（由 main 传入），不再自行 `new` 仓储；
- `main.ts` 按依赖顺序装配（users 在前）。

### 4. `tests/architecture.test.ts`

实现三条规则时需注意：
- 使用 `fs.readdirSync(..., { recursive: true })` 或自行编写递归逻辑收集 `.ts` 文件；
- import 解析仅处理相对路径（`./`、`../`），npm 包按名称判定；
- 每条规则添加反例说明注释；失败信息是该测试的重要输出。

### 5. 全量测试与守卫自测

修改完成后运行 `npm test`：既有 86 个测试应全部继续通过（**纯重构**，行为不变）。
随后故意引入一次违规（例如在 `auth/domain/` 中 import `zod` 之外的 npm 包，或在其他位置写入 `INSERT INTO users`），确认守卫测试会失败。

---

## 验收点

```bash
cd solution/day06 && npm install && npm run gate
```

| 检查 | 期望 |
|------|------|
| `npm test` | **23 个文件 / 90 个测试**全部通过（含守卫） |
| 守卫自测 | 临时加入违规代码时守卫测试失败；删除后恢复通过 |
| 跨模块 import | `grep -rn "modules/users/" src/modules/auth` 的结果全部以 `modules/users/index` 结尾 |
| 表归属 | `grep -rnE "(INTO\|UPDATE\|FROM\|TABLE) users" src` 只命中 `users/infrastructure/` |
| 依赖方向 | `grep -rn "modules/auth" src/modules/users` 无结果（users 不依赖 auth） |

---

## 违规 → 症状

| 违规 | 症状 |
|------|------|
| auth 直接 `import` users 的仓储实现 | users 修改 SQL 或更换数据库时，auth 随之编译失败，契约失效；守卫规则 ① 失败 |
| 在 auth 中为 users 表编写 SQL（如注册时同时 `UPDATE users`） | DDL 出现在两处、列名定义不一致；users 模块新增字段时 auth 不会同步；守卫规则 ③ 失败 |
| `domain/` 中 import 第三方库（如 `lodash`、`bcryptjs`） | 领域层不可移植（更换运行时即失败），单元测试需要安装全部依赖；守卫规则 ② 失败 |
| 公共端口同时包含内部方法与对外方法（合并为一个大端口） | 消费者可访问的接口超出实际需要，破坏性改动概率上升，窄接口约束失效 |
| 守卫测试没有完整性检查（文件数下限） | 守卫静默失效：路径修改后扫描到 0 个文件，测试仍会通过 |

