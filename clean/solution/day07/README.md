# Day 07 参考答案 — 综合项目（要求驱动）

需求见 `../../GUIDE-day07.md`。本目录为参考实现：在 Day 06 终态基线上完成后端 4 个任务与 uniapp 前端。

```
day07/
├── backend/          后端参考答案（= day06 + 4 个任务）
└── uniapp-Frontend/  前端参考答案（登录/注册/忘记密码/重置 + 会话）
```

## 运行

```bash
# 后端
cd backend && npm install
cp .env.example .env                           # 本机配置写入 .env（不提交到仓库）；使用默认值即可运行
npm run gate                                   # 27 文件通过 + 1 文件跳过（PG 集成）/ 109 测试通过 + 3 跳过
npm start                                      # http://localhost:3000

# 可选：PostgreSQL 集成测试。在 .env 中取消 DATABASE_URL 注释并填写本机连接串后执行
npm test                                       # 未设置 DATABASE_URL 时整个文件自动跳过

# 前端（.vue 页面使用 HBuilderX 打开；门禁仅覆盖 TS 层）
cd uniapp-Frontend && npm install && npm run gate  # 3 文件 / 15 测试
```

## 任务 → 代码映射

| 任务 | 实现位置 | 关键文件 |
|---|---|---|
| **1. 递进式锁定**（5/15/30/60 分钟封顶） | 常量（阶梯纯函数）→ 实体（档位与判据）→ 行形状 + 仓储（`lock_count` 持久化） | `auth/domain/constants.ts`、`auth/domain/entities/user.entity.ts`、`users/domain/schemas/user.ts`、`users/infrastructure/sqlite-user-account-repository.ts` |
| **2. PostgreSQL 仓储**（只改基础设施） | users 增加 PostgreSQL 实现；组合根按 `DATABASE_URL` 选择实现 | `users/infrastructure/postgres-user-account-repository.ts`、`users/compose.ts`、`src/config/index.ts`、`src/main.ts` |
| **3. 忘记密码 / 重置密码**（防枚举 + 用途隔离 + 吊销旧会话） | 新增两个用例、校验器与路由；会话端口增加 `removeAllForUser` | `auth/application/{forgot,reset}-password.usecase.ts`、`auth/domain/validators/*.ts`、`auth/presentation/auth.routes.ts`、`auth/domain/ports/session-store.port.ts` |
| **4. notifications 订阅**（附加题） | 新增模块；事件载荷扩展（包含 `username`/`email`） | `notifications/**`、`auth/domain/events/user-registered.event.ts`、`auth/application/user-registered.publisher.ts` |
| **前端 uniapp** | 页面；`uni.request` 唯一出口；前端 Schema | `uniapp-Frontend/src/infrastructure/auth-api.ts`、`src/domain/schemas.ts`、`src/application/use*.ts`、`pages/**` |

## 与 Day 06 的差异（`diff -r` 概览）

- **domain/entities**：`recordFailedLogin()` 引入档位（`lockCount`）、`recordLogin()` 清零档位、新增 `changePassword()`；
- **domain/constants**：`LOCK_DURATION_MS` 常量 → `lockDurationFor(lockCount)` 纯函数（可测）；
- **users/infrastructure**：新增 `postgres-user-account-repository.ts`（`$1..$n`、别名加引号、`#ready` 惰性建表）；
- **auth/application**：`forgot-password` / `reset-password` 用例；注册事件发布接收 `PublicUser`（载荷包含所需数据）；
- **auth/presentation**：新增两个端点；
- **modules/notifications**：`createNotificationsModule({ eventBus })` 在装配时订阅；
- **测试**：实体档位、两轮升级 e2e、忘记/重置 e2e（防枚举、一次性、用途隔离、旧会话失效）、PG 集成（可跳过）、notifications 单测与装配集成。

## 已知简化（与生产实现的差异）

- 表结构用 `CREATE TABLE IF NOT EXISTS`（生产系统用迁移链）；
- 事件使用内存总线（生产系统使用 outbox 与 worker 以保证不丢失）；
- PG 切换仅覆盖 **users 表**；auth 自身的 `auth_codes` / `auth_sessions` 仍使用 SQLite（教程范围限制）；
- 前端不实现路由参数传递（`onLoad(query)`）与组件样式抽取，页面保持单一职责。
