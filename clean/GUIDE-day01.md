# GUIDE-day01 — 目录骨架与组合根

预计时间：**90 分钟**（读概念 20 分钟 + 手打 55 分钟 + 验收 15 分钟）

> 每天的验收标准为：能够独立编写出与参考实现同构的代码。
> 参考答案位于 `solution/dayNN/`；建议完成手打后再进行对照。
>
> **本日涉及的 TS 语法**：类型注解与推断、`interface` / `type`、`readonly`、`abstract class`、`Promise<void>`、`import type`。不熟悉可先阅读 `00-开始之前.md` 第 3 节。

---

## 概念：目录骨架与组合根

legacy 的目录结构如下：

```
legacy/src/
├── application/      # 用例（但里面有 SQL）
├── domain/           # 实体（但 import 了 bcrypt）
├── infrastructure/   # 仓储
├── presentation/     # 路由（但里面有业务判断）
└── index.ts          # 端口、装配与启动均集中在该文件
```

主要问题在于三条边界没有物理隔离：

1. 任意文件都可以 import 其他文件，依赖方向缺乏强制约束；
2. 装配逻辑分散在路由文件与 `index.ts` 中，替换实现需要检索全仓库；
3. 缺少守卫测试，无法区分强制约束与口头约定。

clean 的第一天不实现业务，只建立两项基础：多模块目录结构与唯一组合根。

```
clean/solution/day01/src/
├── config/index.ts          # 环境变量 → Config（唯一校验点）
├── main.ts                  # 组合根：装配全部依赖并挂载 HTTP
└── modules/
    ├── shared/              # 共享底座（端口 + 基础设施实现）
    │   ├── domain/
    │   │   ├── domain-event.ts
    │   │   └── ports/       # TimeProvider / IdGenerator / EventBus
    │   ├── infrastructure/  # SystemTimeProvider / CryptoIdGenerator / InMemoryEventBus
    │   └── index.ts         # 模块公开接口（barrel）
    └── auth/                # 业务模块骨架
        ├── compose.ts       # createAuthModule() → { createRouter() }
        └── index.ts
```

两条纪律从第一天起生效：

- **模块之间仅可通过对方的 `index.ts` 访问**。`modules/auth` 不得 `import '../shared/infrastructure/xxx'`；
- **只有 `main.ts` 负责选择具体实现**。模块不得直接 `new` 其他模块的基础设施，依赖通过构造函数注入（Day 05 实现）。

`TimeProvider` 作为端口的原因在于：涉及「30 分钟后解锁」的测试不应真实等待 30 分钟。Day 03 起，`FakeTimeProvider.advance()` 可直接推进时间，前提是实体不调用 `Date.now()`。

---

## 手打目标

> 每个文件均需包含 `@file` 与 `@author` 文件头，并说明实现理由，而非仅描述功能。

### 0. 工程配置

| 文件 | 要点 |
|------|------|
| `package.json` | scripts：`test`=vitest run、`typecheck`=tsc --noEmit、`lint`=eslint src tests、`format:check`=prettier --check、`gate`=依次执行上述四项检查；`type: commonjs`（ts-node 运行 main） |
| `tsconfig.json` | 12 条 strict：`strict`、`noUnusedLocals`、`noUnusedParameters`、`noImplicitReturns`、`noImplicitOverride`、`noFallthroughCasesInSwitch`、`allowUnreachableCode:false`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`、`noPropertyAccessFromIndexSignature`、`isolatedModules`、`forceConsistentCasingInFileNames` |
| `eslint.config.mjs` | typescript-eslint recommended + `no-explicit-any: error` + `ban-ts-comment: error` + `max-params: ['error', 4]` + `no-unused-vars` 允许 `^_` 前缀 |
| `.prettierrc` | `{ semi:false, singleQuote:true, printWidth:120, trailingComma:"all" }` |
| `vitest.config.ts` | `minWorkers: 1, maxWorkers: 2`（教程环境内存有限；生产项目按 CI 配置） |

> 12 条 strict 各自的作用及常见 TS 报错的对应关系，见 `00-开始之前.md` 第 4、5 节。

### 1. `src/config/index.ts`

zod 校验环境变量，导出 `ConfigSchema` / `Config` / `loadConfig(env = process.env)`：

- `port`（`z.coerce.number()`，默认 3000）、`dbPath`（默认 `app.db`）、`bcryptRounds`（4-15，默认 10）、`nodeEnv`；
- 非法值在启动时立即抛出错误（fail fast），不会延迟到请求处理阶段；
- 同时导出 `loadEnvFile()`：启动时若工作目录存在 `.env` 则加载。本机配置写入 `.env` 且不提交；仓库仅提交 `.env.example` 模板，新环境执行 `cp .env.example .env` 即可运行。

### 2. `src/modules/shared/domain/ports/`

```ts
// time-provider.port.ts — 时间的唯一来源；实体中不得出现 Date.now()
export interface TimeProvider {
  /** 当前时间（Unix 毫秒） */
  now(): number
}
```
再写 `id-generator.port.ts`（`generate(): string`）和 `event-bus.port.ts`：

```ts
export type EventHandler = (event: DomainEvent) => void | Promise<void>
export interface EventBus {
  subscribe(eventName: string, handler: EventHandler): void
  publish(event: DomainEvent): Promise<void>
}
```

### 3. `src/modules/shared/domain/domain-event.ts`

```ts
export abstract class DomainEvent {
  readonly occurredAt: number
  constructor(occurredAt: number) { this.occurredAt = occurredAt }
}
```

### 4. `src/modules/shared/infrastructure/`

- `system-time-provider.ts`：`now() => Date.now()`（全项目中允许出现 `Date.now()` 的位置之一）
- `crypto-id-generator.ts`：`randomBytes(16).toString('hex')`（对比 legacy 的 `Math.random()`）
- `in-memory-event-bus.ts`：按 `event.constructor.name` 路由；关键实现细节：

```ts
async publish(event: DomainEvent): Promise<void> {
  const handlers = this.#handlers.get(event.constructor.name) ?? []
  // 先包装为 Promise 再传入 allSettled：订阅方同步抛出的错误也会被捕获
  await Promise.allSettled(handlers.map((handler) => Promise.resolve().then(() => handler(event))))
}
```
> 建议编写一个「订阅者同步抛错」的测试，观察 `allSettled` 无法捕获同步异常的现象，并理解外层 `Promise.resolve().then(...)` 包装的作用。

### 5. `src/modules/auth/compose.ts`（骨架）+ `index.ts`

```ts
export interface AuthModule { createRouter: () => Router }
export function createAuthModule(): AuthModule {
  // 骨架阶段无端点，/auth 下均返回 404；Day 05 接入真实路由。
  return { createRouter: () => Router() }
}
```
`index.ts` 仅转发 `createAuthModule` 与 `AuthModule` 类型。模块的公开接口在第一天即确定。

### 6. `src/main.ts`（组合根）

```ts
export function createApp(): AppBundle {
  const auth = createAuthModule()          // ① 模块装配
  const app = express()                    // ② HTTP 装配
  app.use(express.json())
  app.get('/health', (_req, res) => { res.status(200).json({ status: 'ok' }) })
  app.use('/auth', auth.createRouter())
  return { app }
}
if (require.main === module) { /* 仅直接运行时监听端口 */ }
```
要点：`createApp` 单独导出，供 e2e 测试复用，确保测试与运行使用同一套装配；`require.main === module` 保证被测试导入时不监听端口。

### 7. 测试（4 个文件）

- `src/config/index.test.ts`：默认值 / 非法值抛错 / 环境变量覆盖；
- `src/modules/shared/infrastructure/in-memory-event-bus.test.ts`：类名路由、订阅者抛错隔离、无订阅者不报错；
- `src/modules/shared/infrastructure/crypto-id-generator.test.ts`：16 字节 hex、不重复；
- `tests/health.e2e.test.ts`：supertest 调用真实的 `createApp()`，断言 200 与 `{ status: 'ok' }`。

---

## 验收点

```bash
cd solution/day01
npm install
npm run gate          # prettier + tsc + eslint + vitest
npm start             # 在另一终端执行：curl localhost:3000/health → {"status":"ok"}
```

| 检查 | 期望 |
|------|------|
| `npm test` | **4 个文件 / 8 个测试**全部通过 |
| `npm run typecheck` | 0 error（12 条 strict 全部启用） |
| `npm run lint` | 0 error（含 `no-explicit-any`） |
| 目录结构 | `src/modules/{shared,auth}`，两个 `index.ts` 都是纯 barrel |
| 纪律自查 | `grep -rn "Date.now()" src` 仅命中 `system-time-provider.ts` |

---

## 违规 → 症状

| 违规 | 症状（发现方式） |
|------|--------------------|
| 模块内部件被外部 import（如 `auth` 直接 import `users/infrastructure/sqlite-user-account-repository`） | Day 06 的架构守卫测试失败，提示：`跨模块只允许命中 users/index` |
| `main.ts` 包含业务判断 | `createApp` 持续增长，测试与生产的装配出现分歧，容易产生缺陷 |
| 实体中出现 `Date.now()` | Day 03 的「锁定到期」测试只能使用 `sleep`，CI 上偶发失败（时间竞态） |
| 缺少 `index.ts` barrel，全项目以相对路径互相 import | 移动一个文件需要修改 20 处 import，模块边界无法维护 |
| `any` 逃逸（`as any`、`@ts-ignore`） | eslint 报错；类型系统失效，重构缺乏保障 |

