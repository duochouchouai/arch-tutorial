# GUIDE-day04 — Schema 单一真理源与「定义 / 校验」分离

预计时间：**110 分钟**（概念 25 + 手打 60 + 验收 25）

> 建议完成手打后再对照 `solution/day04/`。
>
> **本日涉及的 TS 语法**：`z.infer`、`z.custom<T>()`、泛型函数、`unknown` 入参。不熟悉时可先阅读 `00-开始之前.md` 第 3 节。

---

## 概念

### 1. 同一形状在 legacy 中出现三次

| 位置 | legacy 的写法 |
|------|-----------|
| 路由校验 | `auth-schema.ts` 中的 zod schema（带 `.min()`、`.email()` 等规则） |
| 用例入参 | `login-user.ts` 中的 `interface LoginInput` 手写类型 |
| 表现层 | controller 中再次以 `if (!username) ...` 补充校验 |

三处定义不一致时，类型系统不会报错，通常只会在运行时暴露。

### 2. 定义与校验分离

**定义（形状）**：描述字段、类型与可空性，位于 `domain/schemas/api/*.ts`，仅描述形状：
```ts
export const RegisterSchema = z.object({
  username: z.string(), password: z.string(), email: z.string(),
  phone: z.string().optional(), code: z.string(),
})
export type Register = z.infer<typeof RegisterSchema>
```
形状定义中仅使用 `z.string()`，不添加 `.min(3)`、`.email()` 或正则等规则。

**校验（规则）**：处理格式、强度、去重与可达性，位于 `domain/validators/*.validator.ts`：
```ts
export class RegisterValidator {
  validate(input: unknown): ValidatedRegister {
    const data = parseOrThrow(RegisterSchema, input)      // ① 形状
    const username = data.username.trim()
    if (!USERNAME_PATTERN.test(username)) {               // ② 业务规则
      throw new ValidationError({ username: ['用户名需为 3-20 位字母、数字或下划线'] })
    }
    return {                                              // ③ 值对象（Day 02 的复用）
      username, password: Password.create(data.password),
      email: Email.create(data.email),
      phone: data.phone === undefined ? undefined : Phone.create(data.phone),
      code: Code.create(data.code),
    }
  }
}
```

分为两层的理由如下：
- **形状是跨端契约**（前端需要镜像），业务规则是服务端判据（前端仅用于提前提示）；
- 形状相对稳定，规则经常变化，分离后规则改动仅涉及 validator 文件；
- 输入校验与业务规则对错误字段的要求不同：形状错误归属于 `_` 字段，规则错误归属于具体字段；
- **演进顺序**：先修改形状（新增字段），再启用或回滚规则；两者分离后才能独立发布。

### 3. 校验输出也要是 Schema

`ValidatedRegister` 不定义为 interface，而定义在 `schemas/validator/validated-register.ts`：

```ts
export const ValidatedRegisterSchema = z.object({
  username: z.string(),
  password: z.custom<Password>(),      // 值对象用 z.custom<T>() 标注
  email: z.custom<Email>(),
  phone: z.custom<Phone>().optional(),
  code: z.custom<Code>(),
})
export type ValidatedRegister = z.infer<typeof ValidatedRegisterSchema>
```

**收益**：校验器返回值对象，用例参数不再可能是普通字符串，校验状态由类型系统表达。

### 4. `parseOrThrow`：Zod 错误到 `ValidationError` 的唯一转换点

```ts
// schemas 的 issues 聚合成字段级错误：{ email: ['邮箱格式不正确'], ... }
throw new ValidationError(fieldErrors)
```
此后所有入口校验均通过该函数；以手写 if/else 收集错误字符串属于 legacy 的遗留做法。

---

## 手打目标

### 1. `domain/schemas/api/`（仅形状，不含规则）

- `send-code.ts`：`SendCodeSchema { email: z.string() }` + `SendCodeResultSchema { email }`；
- `register.ts`：`RegisterSchema`（username/password/email/phone?/code）+ `RegisterResultSchema { user: PublicUserSchema }`；
- `login.ts`：`LoginSchema { username, password }` + `LoginResultSchema { token, user: PublicUserSchema }`；
- `index.ts` 汇总。

### 2. `domain/schemas/validator/`

`ValidatedSendCode` / `ValidatedRegister` / `ValidatedLogin` 三份 Schema 与对应类型。

### 3. `domain/validators/`

- `schema-parser.ts`：`parseOrThrow<T>(schema, input)`；
- `send-code.validator.ts`：仅调用 `Email.create`；
- `register.validator.ts`：`USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/` + 四个值对象；
- `login.validator.ts`：**有意宽松**：仅校验非空，不校验强度。

> 编写前需明确登录不校验密码强度的原因：登录密码用于**核对**，而非**设定**。
> 若登录也要求包含字母与数字，早期注册的弱密码用户将无法登录，且错误信息会暴露密码规则。

### 4. 校验器测试（各一个文件）

断言内容：非法输入抛出 `ValidationError`，且 `fieldErrors` 的键为字段名；合法输入返回值对象（`instanceof Email`）。首尾空格、大写字母等不符合规则的输入应抛出 `ValidationError`。

---

## 验收点

```bash
cd solution/day04 && npm install && npm run gate
```

| 检查 | 期望 |
|------|------|
| `npm test` | **13 个文件 / 54 个测试**全部通过 |
| 形状纯净性自查 | `grep -n "min(\|max(\|email()\|regex" src/modules/auth/domain/schemas/api/` 无结果 |
| 类型自查 | 全项目 `grep -rn "interface .*Input" src/modules/auth` 无手写入参 interface |
| 登录校验宽松 | `login.validator.test.ts` 包含「弱密码也能通过登录校验」的用例 |

---

## 违规 → 症状

| 违规 | 症状 |
|------|------|
| 规则写回 `api/*.ts`（`z.string().min(3)`） | 前端镜像的 Schema 与后端不一致，导致前端通过校验而后端拒绝，且无统一判据 |
| 用例入参手写 interface | 新增字段时只修改一处，`tsc` 不报错，运行时将 `${undefined}` 写入日志 |
| 每个入口自行编写 if/else 收集错误 | 错误响应形状不一致（`fieldErrors` 可能为数组、对象或字符串） |
| 校验器直接抛出 `new Error('参数错误')` | 前端无法获得字段级错误，`errorHandler` 返回 500（应为 400） |
| 校验器中查询数据库（如「用户名是否已存在」） | 校验与业务逻辑混杂，校验器难以单独测试且对调用顺序敏感；重复性检查应由用例编排（Day 05） |

