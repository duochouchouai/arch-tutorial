# clean — 清洁架构手打教程

`clean/` 使用 TypeScript 重写同一套登录系统（注册、登录、会话、忘记密码与重置），
演示多模块清洁架构的完整落地过程。课程按天组织：前六天围绕一个主题手工编写代码，第七天完成综合项目。

`legacy/` 目录以 JavaScript 保留该业务的渐进演进结果，作为反例供对照阅读。

## 目录结构

```
clean/
├── 00-开始之前.md          读者假设、术语表与 TypeScript 速览（建议先读）
├── GUIDE-day01..07.md      每日教程：概念 → 手打目标 → 验收点 → 违规 → 症状
├── solution/day01..06/     每日参考答案（独立项目：npm install && npm run gate）
├── solution/day07/
│   ├── backend/            Day 07 参考答案（后端）
│   └── uniapp-Frontend/    Day 07 参考答案（uni-app 前端）
└── docs/
    ├── conventions.md      架构约定（每条对应一项可执行检查）
    └── dependency-graph.md 依赖图 / import 规则矩阵 / 数据流
```

## 环境要求

- **Node.js ≥ 22.5**。项目使用内置的 `node:sqlite`：Node 22.5–22.12 需添加 `--experimental-sqlite`，22.13 及以上无需该标志。仓库根目录的 `.nvmrc` 指定 Node 24。
- npm ≥ 10。
- 可选：PostgreSQL。仅 `solution/day07/backend` 的集成测试需要；提供 `DATABASE_URL` 时运行。

## 快速开始（运行参考答案）

每个 solution 目录都是独立项目，拥有各自的 `package.json` 与 `package-lock.json`。

```bash
cd solution/day06
npm install
cp .env.example .env   # 本机配置写入 .env（不提交）；默认值即可运行
npm run gate           # prettier --check + tsc --noEmit + eslint + vitest
npm start              # http://localhost:3000（/health 健康检查与 /auth 路由）
```

配置约定：新环境一律从 `.env.example` 复制 `.env`；数据库路径、连接串等本机配置只写入 `.env`，不提交到仓库。`.env.example` 是仓库中唯一的配置清单，新增环境变量时需同步更新。

一次性运行所有项目的门禁：

```bash
cd clean
npm run install:all   # 首次执行：逐个 solution 安装依赖
npm run gate:all      # 逐个 solution 执行 gate（只读检查）
```

## 学习路径

初次使用时，建议先阅读 `00-开始之前.md`，其中包含读者假设、术语表、TypeScript 速览，以及 12 条 strict 选项的逐条说明。

| Day | 主题 | 主要内容 | 测试规模 |
|----|------|----------|----------|
| 01 | 目录骨架与组合根 | 模块形状 + shared 端口与实现 + `main.ts` + `/health` + 12 条 strict | 4 / 8 |
| 02 | 值对象与错误体系 | `Email` / `Phone` / `Password` / `Code` + `AppError` 家族 + 响应信封 | 9 / 37 |
| 03 | 领域实体 | `UserEntity`（`#private` + 业务方法 + 三桥）+ `FakeTimeProvider` | 10 / 43 |
| 04 | Schema SSOT 与定义/校验分离 | 形状 Schema + 校验器 + 值对象化输出 | 13 / 54 |
| 05 | 端口、依赖倒置与用例 | 7 个端口 + 4 个用例 + SQLite 实现 + 控制器装配 | 21 / 85 |
| 06 | 多模块协作与架构守卫 | 抽出 `users` 模块（公共端口 + 薄服务）+ 3 条守卫规则 | 23 / 90 |
| 07 | 综合项目（要求驱动） | 递进锁定 / PG 仓储 / 忘记密码重置 / notifications + uniapp | 后端 109+ / 前端 15 |

学习方式：**先自己手打代码，再对照参考答案**。每天的 GUIDE 都包含「验收点」（期望的文件与测试数量、grep 自查项）和「违规 → 症状」表（说明违规导致的问题，以及测试如何发现）。

## 贯穿全教程的纪律（摘要）

- 模块之间只通过对方的 `index.ts` 交互；`domain/` 不依赖 npm 包与基础设施。
- 每个形状只定义一次（zod Schema + `z.infer`），校验规则位于 `validators/`。
- 判断逻辑属于领域层，存储层只负责读写；一张表只能由一个模块写入。
- 时间、ID 与随机码统一通过端口注入；错误先在领域层定义，再由表现层翻译为 HTTP 响应。
- 约定必须可执行：由 `tests/architecture.test.ts` 与 `npm run gate` 持续校验。

细节见 `docs/conventions.md`，依赖规则见 `docs/dependency-graph.md`。

## API 一览（截至 Day 07）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/health` | 健康检查 |
| POST | `/auth/send-code` | 发送注册验证码（输出至控制台） |
| POST | `/auth/register` | 注册（需验证码） |
| POST | `/auth/login` | 登录（连续 5 次失败后锁定；Day 07 起为递进锁定：5/15/30/60 分钟） |
| GET | `/auth/session` | 查询当前会话（`Authorization: Bearer <token>`） |
| DELETE | `/auth/session` | 退出登录（吊销 token） |
| POST | `/auth/forgot-password` | 发送重置验证码（Day 07；防枚举） |
| POST | `/auth/reset-password` | 重置密码（Day 07；旧会话全部失效） |

所有接口使用统一响应信封：

```ts
成功：{ success: true, data }
失败：{ success: false, message, fieldErrors? }
```
