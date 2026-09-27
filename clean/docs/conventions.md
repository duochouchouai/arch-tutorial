# 架构约定（clean）

> 这些约定并非「建议」，而是**可执行的规则**：每条均对应一项可执行检查，违反时测试失败。

> 本文描述 `solution/day06` 之后的长期纪律；「首次出现」列标注每条约定首次出现的位置。

---

## 1. 模块与公开面

| 约定 | 说明 | 首次出现 |
|---|---|---|
| 每个模块只有 `compose.ts` + `index.ts` 两个出入口 | `index.ts` 是纯 barrel，只发布：组合根、跨模块契约、跨模块形状 | Day 01 |
| 跨模块 import **只能**命中 `modules/<name>/index` | `import { X } from '../users/index'` ✓；`from '../users/infrastructure/...'` ✗ | Day 06（守卫规则 ①） |
| 模块内部件（domain/application/infrastructure 实现）不对外发布 | 需要对外暴露时，提升为端口 + 应用服务 | Day 06 |
| 依赖方向：`presentation → application → domain ← infrastructure` | infrastructure 实现 domain 端口（依赖倒置） | Day 05 |

模块清单（Day 07 终态）：

```
modules/shared/        共享底座：端口（TimeProvider/IdGenerator/EventBus）+ 实现 + 错误 + 信封
modules/users/         账号：users 表 + 行形状 + 仓储 + 公共端口
modules/auth/          认证：注册/登录/会话/忘记密码 + 事件发布
modules/notifications/ 通知：订阅事件（附加题）
```

## 2. Schema 单一真理源（SSOT）

| 约定 | 说明 |
|---|---|
| 一切**形状**用 zod 定义并成对导出 `z.infer` 类型 | 禁止手写 `interface` 重述数据形状 |
| 形状（`schemas/api/`）与业务规则（`validators/`）分离 | 形状只描述类型；`.min()`/`.email()` 等规则写在 `validators/` |
| 校验器输出也是 Schema（`schemas/validator/`） | 返回值为值对象，而非裸字符串 |
| 用例依赖清单也是 Schema（`schemas/deps/`） | 以 `z.custom<Port>()` 标注，依赖契约在类型中显式可见 |
| 跨边界数据（HTTP 入参、DB 行、配置、事件载荷、环境变量）**必须先 parse 再使用** | 禁止以 `as` 断言外部数据 |

## 3. 值对象与实体

| 约定 | 说明 |
|---|---|
| 值对象：`private constructor` + `Object.freeze` + `create()`（抛 `ValidationError`）+ `fromTrusted()` | `fromTrusted()` 仅用于数据源可信的场景 |
| 实体：`#private` 状态 + `readonly getter` + **业务方法**修改状态 | 外部无法直接赋值 |
| 实体不得调用 `Date.now()` | 时间从构造注入的 `TimeProvider` 获取；判据方法接受显式时间参数 |
| 实体提供三个边界转换方法：`toRow()` / `fromData(row, now)` / `toSnapshot()` | 边界翻译显式化 |
| 对外形状是**白名单**（如 `PublicUser`） | 并非在实体上删减字段；测试断言键集合 |

## 4. 判据归属与表归属

| 约定 | 说明 |
|---|---|
| **判据归属**：过期/锁定/匹配等判定属于领域层（实体、领域服务），不在存储实现中 | 存储只负责存、取、删；`SELECT` 中不含业务判断 |
| **表归属**：一张表的 DDL 与全部写 SQL 只出现在**拥有者模块的 infrastructure** | `INSERT INTO users` / `UPDATE users` / `CREATE TABLE users` 仅 `users/infrastructure/`（守卫规则 ③） |
| 列名 → 字段名映射使用 SQL `AS` 别名 | 代码中不手写映射表；列名变化时 `.parse()` 立即报错 |

## 5. 错误体系

| 约定 | 说明 |
|---|---|
| 错误首先是**领域概念**：`AppError { code, statusCode, fieldErrors }` | `statusCode` 仅为建议值，由表现层决定是否采纳 |
| 共享错误放 `shared/domain/errors/`；模块专属错误放模块 `domain/errors/` | 如 `AccountLockedError`(423) |
| 预期外错误**不做包装** | 由 `errorHandler` 统一转换为 500：日志记录完整上下文，响应只返回通用信息 |
| 防枚举：可被探测的差异必须消除 | 「账号不存在」与「密码错误」同响应；「未注册邮箱」与「已注册邮箱」同响应 |
| 字段级错误统一为 `fieldErrors: { field: string[] }` | 供前端逐字段渲染 |

## 6. 端口与用例

| 约定 | 说明 |
|---|---|
| 端口方法一律返回 `Promise` | 即使当前实现是同步 API，也为替换为异步实现预留形状 |
| 用例只做编排：读取数据 → 判定分支 → 调用实体 → 持久化 → 触发副作用 | 不写 SQL、不涉及散列算法、不感知 HTTP |
| 副作用（事件、邮件）失败**不得影响主流程** | 发布器内部 try/catch 并记录日志 |
| 事件路由按 `constructor.name`；订阅方从对方 **index** 获取事件类型 | 事件载荷需覆盖订阅方所需的数据 |
| 时间、id、随机码全部从端口获取 | 禁止 `Date.now()` / `Math.random()`（随机码使用密码学随机端口） |

## 7. 表现层

| 约定 | 说明 |
|---|---|
| controller 只做四步：获取输入 → 调用校验器 → 调用用例 → 封装响应信封 | 不含业务判断 |
| 路由文件只有「路径 → controller」映射 | 无逻辑 |
| 响应信封唯一：`{ success: true, data }` / `{ success: false, message, fieldErrors? }` | 前后端共用同一份形状（前端 `domain/schemas.ts`） |

## 8. 测试与门禁

| 约定 | 说明 |
|---|---|
| 每层各自可测：值对象/实体（纯逻辑）、用例（替身端口）、仓储（`:memory:`）、e2e（完整装配） | e2e 使用 `createApp()`：**测试装配与运行装配一致** |
| 替身（fake）放 `tests/support/fakes.ts`，测试只依赖端口 | 断言最终状态，而非以 `vi.fn` 断言调用次数 |
| 架构约定写进 `tests/architecture.test.ts`（3 条规则 + sanity check） | 约定必须可执行：违反时测试失败，否则等同于没有约定 |
| 门禁包含四项检查：`prettier --check` + `tsc --noEmit` + `eslint` + `vitest` | `npm run gate`；`npm run gate:all` 依次运行全部 8 个目录（含架构守卫） |
| `tsc` 12 条 strict 全开；`no-explicit-any` / `ban-ts-comment` 为 error | 类型系统是设计工具，而非形式装饰 |

## 9. 文件与命名

| 约定 | 说明 |
|---|---|
| 每个 `.ts` 文件包含 `@file`（说明设计意图）+ `@author` 文件头 | 教程统一 `@author 教程组` |
| 命名：端口 `XxxPort`、实现 `TcshXxx`/`SqliteXxx`、用例 `XxxUseCase`、校验器 `XxxValidator`、Schema `XxxSchema` | 见各 solution |
| 业务数字（次数、时长、TTL）只在 `domain/constants.ts` 出现一次 | 测试引用同一常量/纯函数 |

## 10. 配置与环境变量

| 约定 | 说明 | 首次出现 |
|---|---|---|
| 配置只从环境变量进入进程，`config/index.ts` 是唯一校验点（zod；配置非法时进程启动失败） | 代码中不存在第二处 `process.env` 读取 | Day 01 |
| 本机配置写 `.env`，**永不提交**；仓库只提交 `.env.example` 模板 | 每人 `cp .env.example .env` 后按需修改；数据库路径、连接串等配置不进入版本库 | Day 01 |
| `.env` 仅是本地开发的便利：`loadEnvFile()` 在 `require.main` 中加载，已设置的环境变量优先 | 单元测试仍显式传入 `config`；需要真实外部资源的集成测试在 `vitest.config.ts` 中一并加载（Day 07）；生产环境由平台注入 | Day 01 |
| 新增环境变量时必须同步更新 `.env.example`（含注释说明语义与默认值） | `.env.example` 是仓库中唯一的「配置清单」，默认值保证零配置可运行 | Day 05（`DB_PATH`） |
