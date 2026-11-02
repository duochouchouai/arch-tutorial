# clean — 清洁架构手打教程

本目录以同一登录业务为对象，展示从 legacy 的遗留实现到多模块清洁架构的演进过程。课程共 7 天，每天一个主题：前 6 天跟随 GUIDE 手打，第 7 天为综合项目。

```
clean/
├── 00-开始之前.md         预备知识 + 术语表 + TypeScript 与 uni-app 速览（先读）
├── GUIDE-day01..07.md     教程正文（概念 → 手打目标 → 验收点 → 违规 → 症状）
├── solution/day01..06/    每日参考答案（独立项目：npm install && npm run gate）
├── solution/day07/
│   ├── backend/           Day 07 参考答案（后端）
│   └── uniapp-Frontend/    Day 07 参考答案（uni-app 前端）
└── docs/
    ├── conventions.md     架构约定（每条对应可执行检查）
    └── dependency-graph.md 依赖图 / import 规则矩阵 / 数据流
```

## 环境要求

- **Node.js ≥ 22.5**
- npm ≥ 10
- PostgreSQL（可选）
- HBuilderX（可选，仅 Day 07 前端页面运行需要；命令行门禁不依赖）

## 快速开始

每个 solution 目录均为独立项目，包含各自的 `package.json` 与 `package-lock.json`：

```bash
cd solution/day06
npm install
cp .env.example .env   # 本机配置写入 .env（不提交到仓库）；使用默认值即可运行
npm run gate           # prettier --check + tsc --noEmit + eslint + vitest
npm start              # http://localhost:3000（/health 健康检查 + /auth 路由）
```

> 配置约定：在新环境中统一执行 `cp .env.example .env`；数据库路径、连接串等本机配置仅写入 `.env`，不得提交到仓库。`.env.example` 是仓库中的配置清单，新增环境变量时需同步更新。

运行全部门禁：

```bash
cd clean
npm run install:all   # 安装依赖：逐个 solution 执行 npm ci（缺少 package-lock.json 时改用 npm install）
npm run gate:all      # 逐个 solution 执行 gate（只读检查：prettier --check + tsc --noEmit + eslint + vitest）
```

## 学习路径

开始前请阅读 `00-开始之前.md`，其中包含术语表、TypeScript 最小语法集合、12 项 strict 选项的说明，以及 Day 07 前端使用的 uni-app 入门（第 7 节）。

| Day | 主题 | 内容 | 测试规模 |
|----|------|----------------|----------|
| 01 | 目录骨架与组合根 | 模块形状 + shared 端口/实现 + `main.ts` + `/health` + 12 项 strict | 4 文件 / 8 |
| 02 | 值对象与错误体系 | `Email/Phone/Password/Code` + `AppError` 家族 + 响应信封 | 9 / 37 |
| 03 | 领域实体 | `UserEntity`（`#private` + 业务方法 + 三桥）+ `FakeTimeProvider` | 10 / 43 |
| 04 | Schema SSOT 与定义/校验分离 | 形状 Schema + 校验器 + 值对象化输出 | 13 / 54 |
| 05 | 端口 / 依赖倒置 / 用例 | 7 个端口 + 4 个用例 + SQLite 实现 + 控制器装配 | 21 / 85 |
| 06 | 多模块协作与架构守卫 | 提取 `users` 模块（公共端口 + 薄服务）+ 3 条架构守卫测试 | 23 / 90 |
| 07 | 综合项目（要求驱动） | 递进锁定 / PG 仓储 / 忘记密码重置 / notifications + uniapp | 后端 109+ / 前端 15 |

学习方式为：先独立实现，再对照参考答案。每天的 GUIDE 包含「验收点」与「违规 → 症状」表：「验收点」给出期望的文件数、测试数与 grep 自查项；「违规 → 症状」表说明常见违规的后果，以及测试如何暴露这些问题。

## 核心纪律（摘要）

- 模块之间仅可通过对方的 `index.ts` 访问；`domain/` 不得依赖 npm 包与基础设施。
- 同一形状只定义一次（zod Schema + `z.infer`），校验规则位于 `validators/`。
- 判断逻辑归属于领域层（实体或领域服务），存储层仅负责读写；一张表只能由一个模块写入。
- 时间、ID 与随机码统一由端口注入；错误先在领域层定义，再由表现层转换为 HTTP 响应。
- 约定必须可执行：由 `tests/architecture.test.ts` 与 `npm run gate` 持续校验。

详见 `docs/conventions.md`，依赖规则详见 `docs/dependency-graph.md`。

## API 一览（Day 06 基线）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/health` | 健康检查 |
| POST | `/auth/send-code` | 发送注册验证码（输出至控制台） |
| POST | `/auth/register` | 注册（需验证码） |
| POST | `/auth/login` | 登录（5 次失败后锁定；Day 07 起按 5/15/30/60 分钟递进） |
| GET | `/auth/session` | 当前会话（`Authorization: Bearer <token>`） |
| DELETE | `/auth/session` | 退出（吊销 token） |
| POST | `/auth/forgot-password` | 发送重置码（Day 07；防枚举） |
| POST | `/auth/reset-password` | 重置密码（Day 07；旧会话全部失效） |

响应信封：`{ success: true, data }` / `{ success: false, message, fieldErrors? }`。
