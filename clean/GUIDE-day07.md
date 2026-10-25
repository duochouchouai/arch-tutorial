# GUIDE-day07 — 综合项目（要求驱动）

预计时间：**全天**（建议分配：后端 3 个任务 4 小时、前端 2 小时、自查 1 小时）

> 本日不提供逐步跟随的步骤。读者需根据四份**需求**，在 Day 06 的代码基线上独立实现。
> 参考答案位于 `solution/day07/`；建议每完成一个任务后再对照对应答案。
> 验收标准为：**每个任务的门禁全部通过，且架构守卫不新增违规**。
>
> **本日涉及的 TypeScript 语法**：不引入新语法，综合运用前六天的内容；遇到不熟悉的写法可查阅 `00-开始之前.md`。
> 未使用过 uni-app 的读者，可先阅读 `00-开始之前.md` 第 7 节。

---

## 起点

```bash
cp -r solution/day06/* your-day07/     # 以 Day 06 终态为基线（已含 23 个文件、90 个测试，门禁通过）
cd your-day07 && npm install && npm run gate    # 先确认基线门禁通过
```

Day 06 已具备的能力：注册（验证码）、登录（连续失败 5 次后锁定 30 分钟）、会话、退出、users 模块、事件总线与架构守卫。

---

## 任务 1 — 递进式锁定（必做）

**需求**

1. 首次触发锁定（连续失败 5 次）锁定 **5 分钟**；
2. 此后每次再次触发锁定，时长递增一档：**15 → 30 → 60 分钟**，以 60 分钟为上限；
3. 登录**成功**时，失败计数与锁定档位一起清零；
4. 触发锁定时失败计数归零（解锁后需重新累计 5 次失败方可进入下一档）；
5. `lock_count` 必须持久化（重启后档位保持不变）。

**涉及改动的文件**（提示，非步骤）

- 行形状（users 模块的 `UserRowSchema`）、DDL 与仓储的 `INSERT/UPDATE`；
- 实体：新增状态与档位计算（注意：**判据位于实体，时间从 `TimeProvider` 获取**）；
- 常量：将时长阶梯实现为可测试的纯函数（`lockDurationFor(lockCount)`）；
- 测试：实体级（四档与封顶）、用例级（两轮升级）、e2e（通过白盒方式将 `locked_until` 调整为过去时间，再触发第二轮）。

**验收点**

- `lockDurationFor` 的单元测试覆盖 1/2/3/4/5 档；
- e2e：第二轮被锁时，`locked_until - now` 位于 14 至 16 分钟之间；
- 登录成功后 `failed_attempts = 0` 且 `lock_count = 0`。

**违规 → 症状**

| 违规 | 症状 |
|---|---|
| 档位计算位于用例中（未放在实体） | 用例测试需要 mock 大量状态；登录与修改密码两处用例实现不一致 |
| 时长写死在 SQL 或常量表以外的 if/else 分支 | 新增一档需修改多处；测试若复制常量，会与实现同时出错 |
| 触发锁定时不重置 `failed_attempts` | 解锁后一次失败立即再次锁定，档位直接升至上限，行为与需求不符 |

---

## 任务 2 — 将 users 表迁移到 PostgreSQL（必做）

**需求**

1. 仅修改基础设施与配置：`domain`、`application`、`presentation` **不得改动**；
2. 通过环境变量 `DATABASE_URL` 切换：有值时使用 PostgreSQL，无值时使用 SQLite（默认，无需额外配置即可运行）；
3. 集成测试仅在提供 `DATABASE_URL` 时运行（CI 与本地默认跳过）；
4. 连接串属于**本机配置**：写入 `.env`（参照 `.env.example`），不得提交；应用与 `vitest.config.ts` 均会加载该文件，因此 `npm start` 与 `npm test` 均可读取；
5. 需注意 PostgreSQL 方言：占位符为 `$1..$n`，别名必须**加引号**（未加引号的别名会被转换为小写）。

**验收点**

- `git diff --stat` 里 `domain/` 与 `application/` 无文件改动；
- 同一套仓储断言（insert / find / update 往返）在两种实现下都成立；
- `.env` 中设置 `DATABASE_URL=postgres://…` 后，集成测试由跳过变为通过。

**违规 → 症状**

| 违规 | 症状 |
|---|---|
| 在用例中判断使用哪个数据库 | 业务层依赖部署细节；测试需要覆盖两条分支 |
| 端口签名采用同步形式（为 SQLite 妥协） | PostgreSQL 为异步接口，需要返工端口并修改全仓库签名 |
| 别名未加引号（`AS passwordHash`） | PostgreSQL 返回全小写 `passwordhash`，`Schema.parse` 立即报错；边界校验器会在此处拦截 |
| 仅修改 SQLite 的 DDL 注释即视为完成迁移 | 两套 schema 不一致，可能导致生产事故 |

---

## 任务 3 — 忘记密码 / 重置密码（必做）

**需求**

1. `POST /auth/forgot-password { email }`：向已注册邮箱发送 6 位重置码（5 分钟内有效）；
2. **防枚举**：未注册邮箱也返回相同的成功响应（但不发送验证码）；
3. 重置码与注册码**按用途隔离**（同一邮箱的注册码不能用于重置密码）；
4. `POST /auth/reset-password { email, code, password }`：验证验证码、消费验证码、修改密码；
5. 新密码使用**同一套**强度规则（重置入口不得成为弱密码入口）；
6. 修改密码成功后，**该用户的全部旧会话立即失效**；
7. 修改密码同时解除锁定（被锁定的用户完成修改后应能立即登录）。

**验收点**

- e2e：修改密码后，旧密码登录返回 401、旧 token 返回 401、新密码登录返回 200；
- e2e：未注册邮箱与已注册邮箱的响应体逐字节相同；
- e2e：同一验证码第二次提交失败；注册用途的验证码不能用于重置密码；
- 单元测试：`removeAllForUser` 仅清除该用户的会话（其他用户的会话不受影响）。

**违规 → 症状**

| 违规 | 症状 |
|---|---|
| 未注册邮箱返回「该邮箱未注册」 | 该端点成为账号探测接口，违反登录接口的防枚举约束 |
| 验证码不按 purpose 隔离 | 攻击者可通过注册接口获取验证码并重置他人密码 |
| 验证验证码后不消费（或先修改密码后消费） | 同一验证码可重放；修改密码失败后验证码仍然有效，超出预期有效期 |
| 修改密码后未清理会话 | 攻击者可使用旧 token 继续访问，密码修改失效 |
| 重置校验放宽（仅检查长度） | 形成弱密码入口，审计判定不合格 |

---

## 任务 4 — notifications 模块订阅注册事件（附加题）

**需求**

1. 新模块 `modules/notifications/` 订阅 `UserRegisteredEvent`，发送欢迎邮件；
2. **auth 模块不需任何改动**（若必须修改 auth，说明 Day 06 的事件契约设计不完整，应先修正契约）；
3. 事件载荷应包含订阅方所需的数据（订阅方不得回查 users 模块）：将载荷从 `{ userId, registeredAt }` 扩展为包含 `username` 与 `email`；
4. notifications 使用**自身的**邮件端口（窄接口原则：不共享 auth 的端口类型）；
5. 装配时完成订阅（调用 `createNotificationsModule({ eventBus })` 时即订阅）；
6. 处理器失败时仅记录日志，不向发布方抛出异常。

**验收点**

- 集成测试：使用真实的 `InMemoryEventBus` 与真实实现（spy `console.log`），发布事件后输出欢迎邮件；
- `grep -rn "modules/auth" src/modules/notifications` 仅命中 `../auth/index`；
- 事件载荷变更后，注册用例的测试断言新字段（`username` / `email`）。

**违规 → 症状**

| 违规 | 症状 |
|---|---|
| notifications 直接 import auth 的内部路径以获取事件类 | auth 重构内部结构时 notifications 编译失败；守卫规则 ① 失败 |
| 载荷仅包含 `userId`，订阅方查询 users 模块 | 订阅方依赖两个模块，耦合增加；事件重放时将读取当前数据，无法还原事件发生时的数据 |
| 订阅方异常向上传播 | 邮件服务不可用时注册接口返回 500 |
| 复用 auth 的 `MailSenderPort` 类型 | 修改 auth 的邮件端口会影响 notifications；跨模块共享类型会形成隐式耦合 |

---

## 前端任务 — uniapp 登录、注册与忘记密码（必做）

**需求**

1. 页面：登录、注册、忘记密码、重置密码、首页（会话状态与退出）；
2. 注册为**两步**：先发送验证码，再提交注册；
3. `uni.request` **仅允许出现在 `src/infrastructure/`**（由代码审查与自查保证，前端项目可增加 ESLint 规则）；
4. 响应信封与错误映射：`{ success, data }` / `{ success:false, message, fieldErrors }` → `ApiError(statusCode, fieldErrors)`；
5. 响应数据必须**先经 Schema 解析后再使用**（跨端契约的客户端一侧）；
6. 会话：token 存储于本地，进入首页时通过 `GET /auth/session` 验证；退出时调用 `DELETE /auth/session` 并清除本地状态。

**验收点**

```bash
cd solution/day07/uniapp-Frontend && npm install && npm run gate
```
- 3 个测试文件 / 15 个测试全部通过（Schema 校验、字段级错误映射与 API 层信封映射，使用模拟的 `uni` 对象）；
- `grep -rn "uni.request" pages src/application src/domain` 无结果；
- 失败信封 → `ApiError`：`statusCode` / `fieldErrors` 可断言。

**违规 → 症状**

| 违规 | 症状 |
|---|---|
| 页面中直接调用 `uni.request` | 更换网络层（如 axios 或统一重试）需修改多个页面，错误处理难以统一 |
| 页面直接 `JSON.parse` 后端响应 | 契约变更时静默失败，`undefined` 被渲染为空白而不产生错误 |
| 前后端各自实现信封解析 | 契约不一致的常见来源；应由双方共享同一 Schema（本教程前后端各持一份同形 Schema 并各自测试） |
| token 仅存储于本地而不验证 | 服务端已吊销的会话在本地仍显示为已登录 |

---

## 交付清单（自查）

| 项 | 命令 | 期望 |
|---|---|---|
| 后端门禁 | `cd solution/day07/backend && npm run gate` | 27 个文件通过、1 个跳过（PostgreSQL 集成）；109 个测试通过、3 个跳过 |
| 前端门禁 | `cd solution/day07/uniapp-Frontend && npm run gate` | 3 个文件 / 15 个测试通过 |
| 架构守卫 | 后端 `npm test` 中的 `architecture.test.ts` | 3 条规则全部通过，无新增豁免 |
| 切换数据库验证 | 在 `.env` 中设置 `DATABASE_URL=postgres://…` 后执行 `npm test`（可选） | 集成测试由跳过变为通过 |
| 冒烟测试 | 执行 `npm start` 并依次完成注册、登录、忘记密码、重置密码、新密码登录 | 全流程成功 |

