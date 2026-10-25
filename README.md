# 屎山代码演进教程 🏔️💩 → 🏗️✨

![Node.js ≥ 22.5](https://img.shields.io/badge/Node.js-%E2%89%A5%2022.5-339933?logo=nodedotjs&logoColor=white&style=flat-square)
![TypeScript strict](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white&style=flat-square)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-blueviolet?style=flat-square)](exercise/README.md)

本仓库为内部培训教程，用于对比「vibe coding 形成的遗留系统」与「多模块清洁架构」的差异。

同一登录业务包含两套实现：

- **legacy**：JavaScript 遗留实现。从 52 行的注册/登录功能开始，逐步引入重复的 OAuth 代码、AppSecret 硬编码等问题；
- **clean**：TypeScript 清洁架构实现。前 6 天按主题跟随 GUIDE 手打，第 7 天完成综合项目；各项纪律均配有可执行检查。

## 目录结构

```
├── legacy/                       ← 遗留实现演进（vibe coding，反例）
│   └── day01..06/                每个 day 可独立运行（node day*.js）
│
├── clean/                        ← 清洁架构手打教程
│   ├── 00-开始之前.md            预备知识 + 术语表 + TypeScript 与 uni-app 速览（先读）
│   ├── GUIDE-day01..07.md        教程正文：概念 → 手打目标 → 验收点 → 违规 → 症状
│   ├── solution/day01..06/       每日参考答案（独立项目：npm install && npm run gate）
│   ├── solution/day07/
│   │   ├── backend/              综合项目参考答案（后端）
│   │   └── uniapp-Frontend/      综合项目参考答案（uni-app 前端）
│   ├── docs/conventions.md       架构约定（每条对应可执行检查）
│   └── docs/dependency-graph.md  依赖图 / import 规则矩阵 / 数据流
│
└── exercise/                     ← 成员练习区（每人一个目录，规则见 exercise/README.md）
```

## 使用方式

### 1. 运行 legacy 反例

```bash
cd legacy/day06 && npm install && npm start
# 向 POST /login 连续提交 5 次错误密码，观察锁定机制如何由 setTimeout 与双状态实现
```

### 2. 跟随 GUIDE 实现清洁架构（clean）

```bash
cd clean
npm run install:all      # 安装全部 solution 目录的依赖（每个目录均为独立项目）
cat 00-开始之前.md        # 预备知识、术语表、TypeScript 与 uni-app 速览（先读）
cat GUIDE-day01.md       # 从第一天开始，按 GUIDE 编写代码
```

练习时应先独立实现，遇到困难时再对照 `solution/dayNN/` 中的参考答案。架构守卫测试失败时会指出违反约定的位置。

### 3. 运行单个或全部门禁

```bash
cd clean/solution/day06
npm install && npm run gate     # prettier + tsc + eslint + vitest

cd clean
npm run gate:all                # 依次执行全部 8 个 solution 目录的门禁
```

### 4. 成员练习（exercise/）

每名成员使用独立目录 `exercise/<姓名>/`，从 `develop` 创建 `exercise/<姓名>` 分支，按 `exercise/README.md` 的规范逐日提交。

### 5. 代码格式（Prettier）

根目录提供统一的 Prettier 配置与提交钩子：

```bash
npm install            # 首次执行：安装依赖并写入 pre-commit 钩子
npm run format         # 格式化 exercise/ 下的文件
npm run format:check   # 仅检查格式
```

提交时钩子仅处理 `exercise/` 下的暂存文件，不会改动 `clean/` 与 `legacy/`；配置说明与成员项目 `.prettierrc` 的要求见 `exercise/README.md` 的「代码格式（Prettier）」一节。

## 7 天内容概览

| 天数 | legacy 遗留实现 | clean 清洁架构 |
|------|---------|-------------|
| Day 01 | 明文密码、SQL 拼接、无输入校验 | 目录骨架 + 组合根 + shared 端口/实现 + 12 项 strict |
| Day 02 | 邮箱校验仅使用 if/else | 值对象（构造即校验）+ AppError 体系 + 响应信封 |
| Day 03 | 忘记密码（`Math.random()`、无过期） | 领域实体（`#private` + 业务方法 + 注入时钟） |
| Day 04 | 记住我（token 永不过期） | Schema SSOT + 形状/规则分离 + 值对象化校验输出 |
| Day 05 | 账户锁定（`setTimeout` + 双状态） | 端口 + 依赖倒置 + 7 个端口 / 4 个用例 / SQLite 实现 |
| Day 06 | 微信 + QQ（代码复制、AppSecret 硬编码） | 提取 `users` 模块 + 公共端口 + 架构守卫测试 |
| Day 07 | — | 递进式锁定 / PostgreSQL 仓储 / 忘记密码重置 / notifications 订阅 + uniapp 前端 |

各天的测试规模（文件数 / 用例数）统一维护在 `clean/README.md` 的「学习路径」表中，避免多处数字不一致。
legacy 中每个问题与 clean 对应纪律的对照，写在每天的 GUIDE 中（含「违规 → 症状」表）。

## 技术栈

| | legacy | clean |
|--|----|----|
| 语言 | JavaScript | TypeScript（12 项 strict 选项全部启用） |
| 数据库 | better-sqlite3 | `node:sqlite`（Node.js ≥ 22.5 内置；22.5–22.12 需 `--experimental-sqlite`，22.13 起无需该参数）；Day 07 可切换至 PostgreSQL |
| 框架 | Express | Express |
| 密码 | 明文 | bcryptjs（轮数可配置） |
| 校验 | 手写 if/else | Zod（Schema 为形状的唯一来源） |
| 测试 | 无 | vitest + supertest e2e + 架构守卫 |
| 前端 | 无 | uni-app（Day 07：注册、登录、忘记密码、重置；`uni.request` 仅出现在 infrastructure） |
| 门禁 | 手动 | `npm run gate:all`：8 个 solution 目录分别执行 `npm run gate`（含架构守卫测试） |

## 架构原则（clean）

- **依赖倒置**：`domain` 定义端口，`infrastructure` 提供实现，用例仅依赖端口；
- **单向依赖**：`presentation → application → domain ← infrastructure`；
- **模块门面**：跨模块 import 仅允许引用对方的 `index.ts`（由架构守卫强制）；
- **SSOT**：形状只定义一次（zod + `z.infer`），规则位于 `validators/`；
- **判据归属 / 表归属**：判断逻辑位于领域层，表的读写仅属于拥有者模块；
- **约定可执行**：每条纪律都有对应的测试或检查；仅写入文档的规则无法保证被执行。

## 协作规范

| 目录 | 定位 | 改动方式 |
|---|---|---|
| `legacy/` | 反面教材（遗留实现的演进结果） | 原则上不改动；如有建议，请先讨论，由维护者统一修改 |
| `clean/` | 教程正文与参考答案（GUIDE + solution） | 同上 |
| `exercise/` | 成员练习（详细规范见 `exercise/README.md`） | 各自维护独立目录，提交至 `exercise/<姓名>` 分支 |

- **`legacy/` 与 `clean/` 面向全体学员，请勿直接改动或推送**：如发现错误或有改进建议，请通过 Issue、PR 或直接联系维护者提出，经确认后由维护者统一修改；
- 练习按 `exercise/README.md` 的规范提交至个人分支（`exercise/<姓名>`），不得直接推送 `develop`；`develop` 由维护者合并；
- 提交信息建议：练习使用 `dayNN: <简述>`；其他改动参照仓库现有风格（`fix:` / `feat:` / `docs:` / `refactor:`）。
