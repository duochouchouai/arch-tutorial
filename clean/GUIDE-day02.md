# GUIDE-day02 — 值对象与共享错误体系

预计时间：**120 分钟**（概念 25 + 手打 70 + 验收 25）

> 建议完成手打后再对照 `solution/day02/`。
>
> **本日涉及的 TS 语法**：`class`（`private constructor`、`static`、`extends`）、`readonly`、可选属性 `?`、`new.target`。不熟悉时可先阅读 `00-开始之前.md` 第 3 节。

---

## 概念

### 1. 邮箱应作为值对象

legacy 的注册校验如下（`presentation/auth-schema.ts` 中的 zod schema 与 `auth-controller.ts` 中的 if/else）：

```ts
// legacy：形状、格式与强度混杂；错误信息通过字符串拼接生成
if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
  errors.push('邮箱格式不正确')
}
```

由此产生三个后果：邮箱这一概念在系统中不存在，仅以 `string` 表示；
`Email` 的规则（小写、长度、仅允许一个 @）分散在多处；
`Email` 被赋值为 `'  '` 时没有任何机制阻止。

**值对象（Value Object）**使「合法邮箱」成为类型系统中的独立类型：

```ts
const email = Email.create('alice@example.com')   // 非法输入抛出 ValidationError
email.value                                        // 'alice@example.com'
```

同日引入的值对象还包括 `Phone`（`/^1[3-9]\d{9}$/`）、`Password`（8-64 位、含字母和数字）与 `Code`（6 位数字）。

### 2. 值对象的两条约束

```ts
export class Email {
  readonly value: string
  private constructor(value: string) { this.value = value; Object.freeze(this) }
  static create(raw: string): Email { /* 校验 → ValidationError 或 fromTrusted */ }
  static fromTrusted(value: string): Email { return new Email(value) }  // 仅用于可信数据源
  toString(): string { return this.value }
}
```

- `private constructor`：禁止绕过校验构造实例；
- `Object.freeze(this)`：已构造的值不可变，符合值对象的定义；
- `fromTrusted` 仅用于数据源可信的场景（数据库行、已校验的输入）。

### 3. 错误属于领域概念

```ts
export class AppError extends Error {
  readonly code: string          // 稳定错误码：前端依据错误码分支，不依赖文案
  readonly statusCode: number    // 建议状态码（由表现层采用，非强制）
  readonly fieldErrors?: FieldErrors   // 字段级错误：{ email: ['邮箱格式不正确'] }
}
```

- 错误类包括：`ValidationError`(400) / `UnauthorizedError`(401) / `ConflictError`(409) / `NotFoundError`(404)；
- **预期外错误不应包装**：程序缺陷由 `errorHandler` 统一返回 500；将未知错误包装为 `AppError` 会把程序缺陷误报为用户输入错误；
- `errorHandler` 是**唯一**将错误转换为 HTTP 响应的位置（位于 `shared/infrastructure/error-handler.ts`）。

### 4. 响应信封：前后端的共同契约

```ts
成功：{ success: true,  data: ... }
失败：{ success: false, message: '...', fieldErrors?: { field: ['...'] } }
```
`fail()` 始终包含 `fieldErrors` 键（值为 `undefined`），JSON 序列化时自动省略，前端只需处理一种响应形状。

---

## 手打目标

### 1. `src/modules/shared/domain/errors/`

- `app-error.ts`：`FieldErrors` 类型、`AppErrorOptions`、`AppError`（包含 `this.name = new.target.name`）；
- `validation-error.ts`：`constructor(fieldErrors: FieldErrors, message = '输入校验未通过')`；
- `conflict-error.ts` / `not-found-error.ts` / `unauthorized-error.ts`：各自默认文案与状态码；
- `index.ts`：barrel。

### 2. `src/modules/shared/schemas/envelope.ts`

`EnvelopeSchema`（zod union）+ `ok<T>(data)` + `fail(message, fieldErrors?)`。

### 3. `src/modules/shared/infrastructure/error-handler.ts`

```ts
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json(fail(err.message, err.fieldErrors))
    return
  }
  console.error('[unexpected error]', err)      // 完整错误信息写入日志
  res.status(500).json(fail('服务器内部错误'))   // 响应仅返回通用文案
}
```
（`_next` 不能省略：Express 通过参数个数识别错误中间件。）

### 4. `src/modules/auth/domain/value-objects/`（四个值对象）

| 值对象 | 规则 |
|--------|------|
| `Email` | 非空、长度 ≤254、无首尾空白、全部小写、`@` 恰好一个且不在首尾、域名含点；**不自动 trim 或转小写**，非法输入直接抛出 |
| `Phone` | `/^1[3-9]\d{9}$/` |
| `Password` | 8-64 位、至少一个字母与一个数字（`create` 接受可选参数 `{ minLength, maxLength, requireComplexity }`；登录场景使用宽松配置，Day 04 将使用该参数） |
| `Code` | `/^\d{6}$/` |

每个值对象对应一个 `xxx.test.ts`（覆盖空串、超长、非法字符与合法值构造）。

### 5. 共享测试

- `src/modules/shared/infrastructure/error-handler.test.ts`：AppError → 400 + fieldErrors；`ConflictError` → 409；未知错误 → 500 且**不含**内部信息（如 SQL 片段）。

### 6. `src/main.ts` 接入 `errorHandler`

```ts
app.use('/auth', auth.createRouter())
app.use(errorHandler)     // 必须在所有路由之后
```

---

## 验收点

```bash
cd solution/day02 && npm install && npm run gate
```

| 检查 | 期望 |
|------|------|
| `npm test` | **9 个文件 / 37 个测试**全部通过 |
| `Email.create('abc')` | 抛 `ValidationError`，`fieldErrors` 指向 `email` |
| `errorHandler` 测试 | 未知错误的响应体**不含** `SQLITE` / 堆栈 |
| 纪律自查 | `grep -rn "statusCode = 400" src/modules/auth` 应无结果（状态码仅在 shared 错误类中声明） |

---

## 违规 → 症状

| 违规 | 症状 |
|------|------|
| 用 `type Email = string` 代替值对象 | 每个入口都需要重新校验邮箱；`'  '` 仍可写入数据库 |
| 值对象 `public constructor` | 可通过 `new Email('乱写')` 绕过校验，规则失效 |
| 在 controller 中 `res.status(400).json(...)` 手写错误 | 错误响应形状不一致（部分响应包含 `fieldErrors`，部分不包含），前端无法可靠解析 |
| 将未知错误包装成 `AppError('服务器错误', 500)` | 程序缺陷被误报为业务错误，日志缺少堆栈，排查困难 |
| 将错误文案作为契约（前端 `if (message === '密码错误')`） | 修改文案即导致前端失效；应依据 `code` 或 `statusCode` 判断 |

