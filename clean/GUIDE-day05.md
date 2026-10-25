# GUIDE-day05 — 端口、依赖倒置、用例与基础设施接线

预计时间：**180 分钟**（概念 30 + 手打 115 + 验收 35）

> 建议完成手打后再对照 `solution/day05/`。本日改动量最大：30+ 个文件。
> 建议按以下顺序进行：端口、用例、基础设施、表现层、compose、main、测试。
>
> **本日涉及的 TS 语法**：`interface` 端口、`Promise<T>`、`z.custom<Port>()`、`readonly #deps`、`instanceof` 收窄。不熟悉时可先阅读 `00-开始之前.md` 第 3 节。

---

## 概念

### 1. legacy 用例中的 SQL 与 bcrypt

```ts
// legacy application/login-user.ts（缩写）
const row = await db.get('SELECT * FROM users WHERE username = ?', [username])  // ✗ SQL
const ok = await bcrypt.compare(password, row.password_hash)                    // ✗ 算法
if (ok) { row.failed_attempts = 0; await db.run('UPDATE users ...') }           // ✗ 表结构
```
由此产生三个后果：更换数据库需要修改用例；测试用例必须启动数据库；bcrypt 使单元测试明显变慢。

### 2. 端口与依赖倒置

用例**自行声明**所需能力（端口），由基础设施提供实现：

| 端口（`domain/ports/`） | 用途 | 实现（`infrastructure/`） |
|---|---|---|
| `UserAccountRepositoryPort` | 账号持久化 | `SqliteUserAccountRepository` |
| `PasswordHasherPort` | 哈希/校验 | `BcryptPasswordHasher` |
| `CodeStorePort` | 验证码存取（按 purpose+target） | `SqliteCodeStore` |
| `SessionStorePort` | 会话存取 | `SqliteSessionStore` |
| `MailSenderPort` | 发送邮件 | `ConsoleMailSender` |
| `CodeGeneratorPort` | 生成 6 位验证码 | `CryptoCodeGenerator` |
| `UserRegisteredPublisherPort` | 发布注册事件 | `UserRegisteredPublisher` |

所有端口方法均返回 `Promise`，即使 `node:sqlite` 是同步 API。端口签名按「更换 PostgreSQL 或远程服务」的场景设计，替换实现时无需修改签名。

### 3. 用例：负责编排，不负责实现

```ts
export class LoginUseCase {
  readonly #deps: AuthLoginDeps          // deps 的形状也是 Schema（domain/schemas/deps/）
  constructor(deps: AuthLoginDeps) { this.#deps = deps }

  async execute(input: ValidatedLogin): Promise<LoginResult> {
    const row = await this.#deps.userAccountRepository.findByUsername(input.username)
    if (row === null) throw new InvalidCredentialsError()      // 防枚举：与密码错误同一个错误
    const user = UserEntity.fromData(row, this.#deps.timeProvider)
    if (user.isLockedAt(now)) throw new AccountLockedError()
    if (!(await hash.verify(input.password, user.passwordHash))) {
      user.recordFailedLogin(); await repo.update(user.toRow()); throw new InvalidCredentialsError()
    }
    user.recordLogin(); await repo.update(user.toRow())
    const token = idGenerator.generate()
    await sessionStore.save(token, user.id, now + SESSION_TTL_MS)
    return { token, user: user.toSnapshot() }
  }
}
```

用例仅负责四件事：读取数据、判断分支、调用实体业务方法与写回。用例中不包含 SQL、bcrypt 或 Express。

### 4. 依赖契约也是 Schema（`domain/schemas/deps/auth-deps.ts`）

```ts
export const AuthBaseDepsSchema = z.object({
  userAccountRepository: z.custom<UserAccountRepositoryPort>(),
  timeProvider: z.custom<TimeProvider>(),
  idGenerator: z.custom<IdGenerator>(),
})
export type AuthBaseDeps = z.infer<typeof AuthBaseDepsSchema>
```
收益：该文件直接列出登录用例所需的能力，无需阅读实现。

### 5. 领域服务：判据不位于存储层

`code-verification.service.ts`：

```ts
export function assertCodeValid(stored: StoredCode | null, input: Code, now: number): void {
  if (stored === null) throw new InvalidCodeError()        // 不存在
  if (stored.expiresAt <= now) throw new InvalidCodeError() // 过期
  if (stored.code !== input.value) throw new InvalidCodeError() // 不匹配
}
```
三种失败合并为同一个错误（防止探测）；存储（`SqliteCodeStore`）仅负责存取与删除，判据归属明确。

### 6. 事务边界与代码生成的随机源

- 会话 token 与验证码均通过 `IdGenerator` / `CodeGenerator` 端口生成（密码学随机源）；legacy 使用 `Math.random()`，结果可预测；
- 本阶段不包含跨表事务（注册过程涉及写 users、消费验证码与发布事件）。教程为控制范围省略了事务与 outbox；生产系统通常使用 outbox（同事务写表并由后台重放）保证事件不丢失。

---

## 手打目标（按依赖顺序）

### 1. `domain/ports/`（7 个）+ `domain/errors/auth.errors.ts`

```ts
export class InvalidCredentialsError extends UnauthorizedError {   // 401
  constructor() { super('用户名或密码错误') }
}
export class AccountLockedError extends AppError {                 // 423
  constructor() { super('账号已锁定，请稍后再试', { code: 'ACCOUNT_LOCKED', statusCode: 423 }) }
}
// UsernameTakenError / EmailTakenError（ConflictError, 409）、InvalidCodeError（ValidationError, 400）
```
模块内部件与模块专属错误放在模块自身的 `domain/` 中；共享错误（Validation、Conflict 等）保留在 shared。

### 2. `domain/schemas/`

`code-record.ts`（`{ code, expiresAt }`）、`session-record.ts`（`{ userId, expiresAt }`）、`deps/auth-deps.ts`（4 个用例契约）。

### 3. `domain/events/user-registered.event.ts` + `application/user-registered.publisher.ts`

事件定义为 `UserRegisteredEvent extends DomainEvent`，payload 由 Schema 定义；
发布器是端口实现，**发布失败时仅记录日志，不抛出异常**，避免副作用影响注册主流程。

### 4. `application/` 四个用例

- `send-code.usecase.ts`：`CODE_PURPOSE_REGISTER = 'register'`；生成验证码、存储（TTL 5 分钟）并发送邮件；
- `register.usecase.ts`：**先验证码**（否则注册接口可用于探测邮箱是否已注册），随后消费验证码、查重、哈希、创建实体、写入数据库并发布事件；
- `login.usecase.ts`：见上文；
- `session.usecase.ts`：`current(token)`（会话过期判据位于该层，时钟通过注入提供）与 `logout(token)`。

### 5. `infrastructure/`

`bcrypt-password-hasher`（轮数通过注入提供）、`sqlite-code-store`（表主键为 `(purpose, target)`）、
`sqlite-session-store`（存取与删除；过期判定位于用例）、`console-mail-sender`（输出验证码）、`crypto-code-generator`（使用 `randomInt` 补齐 6 位）、
`sqlite-user-account-repository`（**users 表 DDL 与 INSERT/UPDATE 的唯一位置**）。

### 6. `presentation/`

`auth.controller.ts`（获取输入、调用校验器与用例、生成响应信封；`#extractToken` 解析 `Authorization: Bearer`）、
`auth.routes.ts`（仅做路由映射：`POST /send-code|/register|/login`、`GET|DELETE /session`）。

### 7. `compose.ts`（实际装配）与 `main.ts`

```ts
export function createAuthModule(deps: AuthModuleDeps): AuthModule {
  const userAccountRepository = new SqliteUserAccountRepository(deps.db)
  const passwordHasher = new BcryptPasswordHasher(deps.bcryptRounds)
  /* … 端口实现 → 用例（注入端口）→ 校验器 → 控制器 → 路由 … */
}
```
`main.ts` 开始接收 `config`（`dbPath` / `bcryptRounds`），并调用 `openDatabase(config.dbPath)`。
`DB_PATH` 等本机配置写入各自的 `.env`（执行 `cp .env.example .env`），且不得提交。数据库文件因环境而异，仓库仅保留 `.env.example` 作为配置清单。

### 8. 测试

- 用例测试（5 个）：使用 `tests/support/fakes.ts` 中的测试替身（`InMemoryUserAccountStore` / `FakePasswordHasher` / `FakeMailSender` / `InMemoryCodeStore` 等）；
- 仓储测试：使用 `:memory:` 数据库验证往返；
- `tests/auth.e2e.test.ts`：使用真实实现覆盖完整链路（send-code、register、login、session、logout）与失败场景矩阵（400/401/409/423）。

---

## 验收点

```bash
cd solution/day05 && npm install && npm run gate
```

| 检查 | 期望 |
|------|------|
| `npm test` | **21 个文件 / 85 个测试**全部通过 |
| 冒烟测试 | 执行 `npm start` 后，使用 `curl -X POST localhost:3000/auth/send-code -H 'Content-Type: application/json' -d '{"email":"a@b.com"}'` 请求；控制台输出验证码，使用该验证码完成 register 与 login 并获取 token |
| 分层自查 | `grep -rn "bcrypt" src/modules/auth/{domain,application}` 无结果 |
| SQL 自查 | `grep -rn "SELECT\|INSERT" src/modules/auth/{domain,application,presentation}` 无结果 |
| 用例测试速度 | 全部低于 100ms（不使用真实 bcrypt 与真实数据库） |

---

## 违规 → 症状

| 违规 | 症状 |
|------|------|
| 用例中 `import bcrypt` | 单元测试明显变慢（10 倍以上）；更换算法需要修改用例 |
| 用例中编写 SQL | 更换 PostgreSQL 从「新增一个文件」变为「全仓库修改」；表结构改动影响业务层 |
| 端口方法返回同步值（`UserRow \| null`） | 更换为异步实现（PostgreSQL 或远程服务）时需要修改全部签名，造成契约级返工 |
| 判据（过期或不匹配）写在 `SqliteCodeStore` 中 | 测试替身与真实存储行为不一致，用例测试通过但 e2e 失败 |
| 使用 `Math.random()` 生成验证码或 token | 结果可预测，6 位数字验证码可在分钟级范围内被暴力破解 |
| 用例直接使用 `new Date()` 判断过期 | 测试无法控制时间；CI 在不同时段运行结果不同 |
| 事件发布失败时向注册用例抛出异常 | 出现「注册成功但用户收到 500」；副作用影响主流程 |

