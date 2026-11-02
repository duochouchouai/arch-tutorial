# GUIDE-day03 — 领域实体：行为与字段的归属

预计时间：**120 分钟**（概念 25 + 手打 70 + 验收 25）

> 建议完成手打后再对照 `solution/day03/`。
>
> **本日涉及的 TS 语法**：`#private` 字段、getter、静态工厂、`readonly`、`z.infer`。不熟悉时可先阅读 `00-开始之前.md` 第 3 节。

---

## 概念

### 1. 仅含字段的实体

legacy 的 `domain/user.ts`：

```ts
export interface User {                 // legacy：全部字段公开
  id: number
  username: string
  failedAttempts: number
  lockedUntil: string | null
}
```
在 legacy 中，锁定规则以直接修改字段的形式分散在用例中：

```ts
// 摘自 legacy 的 application/login-user.ts
user.failedAttempts += 1
if (user.failedAttempts >= 5) {
  user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString()
}
await repo.save(user)
```

由此产生三个问题：锁定规则可被任意文件绕过；`Date.now()` 的出现位置无法在测试中控制；规则变更需要在全仓库检索。

### 2. 实体：数据与行为的统一

```ts
export class UserEntity {
  readonly id: string
  readonly username: string
  readonly #now: TimeProvider          // 通过构造函数注入时间
  #failedAttempts: number
  #lockedUntil: number | null
  // ...

  recordFailedLogin(): void { /* 锁定规则由实体维护，外部不可绕过 */ }
  recordLogin(): void { /* 登录成功后清零失败计数 */ }
  isLockedAt(time: number): boolean { /* 判据：传入的时刻 */ }
  toRow(): UserRow { /* 实体到表行的转换（跨模块与持久化桥） */ }
  toSnapshot(): PublicUser { /* 实体到对外形状的转换（白名单） */ }
}
```

四条约束：

1. **`#private` 状态**：外部仅可通过 `getter` 读取、通过业务方法修改；`user.failedAttempts = 0` 在类型层面不可用；
2. **禁止 `Date.now()`**：时间统一从注入的 `TimeProvider` 获取；所有过期与锁定判据均接受显式时间参数（`isLockedAt(time)`）；
3. **构造时完成校验**：`private constructor` 配合两个静态工厂 `fromData(row, now)`（从数据库行恢复）与 `createEmailUser(input, now)`（创建新账号）；
4. **桥接方法显式化**：`toRow()`、`fromData()` 与 `toSnapshot()` 分别处理三个方向的边界转换，避免以 `JSON.parse` 等方式隐式转换。

### 3. 行形状由 Schema 定义（SSOT）

账号的存储结构由 `UserRowSchema`（zod）唯一定义，类型通过 `z.infer` 推导：

```ts
export const UserRowSchema = z.object({
  id: z.string(), username: z.string(), email: z.string(),
  phone: z.string().nullable(), passwordHash: z.string(),
  failedAttempts: z.number().int(), lockedUntil: z.number().int().nullable(),
  lastLoginAt: z.number().int().nullable(),
  createdAt: z.number().int(), updatedAt: z.number().int(),
})
export type UserRow = z.infer<typeof UserRowSchema>
```

约束：全项目不得再手写 `interface` 或 `type` 重复定义该形状。
（`lockCount` 在 Day 07 加入。届时修改 Schema 一处，所有使用位置都会立即产生类型错误，体现 Schema 作为唯一来源的作用。）

### 4. 对外形状是白名单

`PublicUser`（`{ id, username, email, phone }`）仅包含允许出现在响应中的字段。
该形状是独立定义的契约，并非从实体中删减字段；`passwordHash` 与 `failedAttempts` 不会出现在响应中。

---

## 手打目标

### 1. `src/modules/auth/domain/constants.ts`

```ts
export const MAX_FAILED_ATTEMPTS = 5
export const LOCK_DURATION_MS = 30 * 60 * 1000
```
（Day 07 将改为递进式阶梯；当前先保证业务常量只有一个来源。）

### 2. `src/modules/auth/domain/schemas/user.ts` + `api/user.ts`

`UserRowSchema`（行形状，含 `passwordHash` 等内部字段）+ `PublicUserSchema`（对外形状）；
`schemas/index.ts` 是 barrel。

### 3. `src/modules/auth/domain/entities/user.entity.ts`

按上述四条约束实现。实现时的关键判断如下：

- **`failedAttempts` 的重置时机**：`recordLogin()` 中清零；`recordFailedLogin()` 中累加，达到 5 时写入 `lockedUntil`；
- **采用 `isLockedAt(time)`，不提供 `isLocked()`**：判据使用调用方传入的时刻（用例以同一个 `now` 判断全部状态），避免构造与判断阶段取到不同时间；
- **`toRow()` 不得遗漏字段**：实现后应立即补充往返测试，断言 `fromData(toRow())` 与 `toRow()` 深比较相等。

### 4. `tests/support/fakes.ts`（测试替身）

```ts
export class FakeTimeProvider implements TimeProvider {
  #nowMs: number
  constructor(startMs = 1_700_000_000_000) { this.#nowMs = startMs }
  now() { return this.#nowMs }
  advance(ms: number) { this.#nowMs += ms }   // 推进时间
}
```

### 5. 实体测试（`user.entity.test.ts`）

必要测试：
1. `createEmailUser` 初始状态 + 时间戳来自注入时钟；
2. `recordLogin` 清零 + `lastLoginAt`；
3. 第 5 次失败 → `lockedUntil = now + LOCK_DURATION_MS`；
4. `isLockedAt` 边界：`lockedUntil - 1` 为 true、`lockedUntil` 为 false；
5. `fromData` / `toRow` 往返不丢字段；
6. `toSnapshot` 的键只有 `['email','id','phone','username']`（**断言键集合**，防止新增字段导致信息泄露）。

---

## 验收点

```bash
cd solution/day03 && npm install && npm run gate
```

| 检查 | 期望 |
|------|------|
| `npm test` | **10 个文件 / 43 个测试**全部通过 |
| 时间控制 | 锁定用例中不使用 `sleep`，仅使用 `time.advance(...)` |
| `grep -rn "Date.now()" src/modules/auth` | 无结果（auth 模块完全使用注入时钟） |
| 不可变自查 | 尝试 `user.failedAttempts = 0` 应编译失败 |

---

## 违规 → 症状

| 违规 | 症状 |
|------|------|
| 实体字段为 `public`（未使用 `#`） | 用例中直接赋值 `user.lockedUntil = ...`，锁定规则从实体泄漏到用例，两处规则逐渐不一致 |
| 实体中出现 `Date.now()` | 测试需要使用 `await sleep(50)`；CI 偶发失败；跨时区或夏令时出错 |
| 手写 `interface UserRow` 与 Schema 并存 | Day 07 新增 `lockCount` 时只修改一处，另一处出现不一致，直到运行时才暴露 |
| `toSnapshot()` 返回 `this`（直接返回实体） | 响应中出现 `passwordHash`；测试若仅断言个别字段则无法发现，因此需断言键集合 |
| 用 `as` 将数据库行断言为 `UserRow` | 列名错误或数据库升级后字段缺失都不会报错，直到运行时出现 `undefined` |

