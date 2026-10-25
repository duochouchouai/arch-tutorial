# exercise — 成员练习区

本目录用于动手练习：按照 `clean/GUIDE-day01..07.md` 手打清洁架构，成果写入各自的目录。

> 原则：先独立完成。遇到困难时，先查阅 GUIDE 当天的「验收点」与「违规 → 症状」表；
> 仍无法继续时，再对照 `clean/solution/dayNN/`。对照后应关闭参考答案，自行重新输入，不得复制粘贴。

## 目录规范

```
exercise/
└── <你的名字>/              # 小写拼音/英文，如 zhangsan、wang-xiaoming；与分支名保持一致
    ├── day01/               # 按 GUIDE-day01 实现的成果（独立可运行的项目）
    ├── day02/
    ├── ...
    └── NOTES.md             # 可选：经验、疑问与思考
```

- 每名成员使用一个目录，互不重叠；
- 每天的成果应为独立项目：包含独立的 `package.json` / `tsconfig.json` / `vitest.config.ts`，可执行 `npm install && npm run gate`（工程配置与 `clean/solution/dayNN` 保持一致）；
- 工程脚手架文件（`package.json`、`tsconfig.json`、`eslint.config.mjs`、`.prettierrc`、`vitest.config.ts`、`.env.example`）：Day 01 按 GUIDE 自行编写（属当天考查内容）；Day 02 起可沿用前一天的配置。其中 `.prettierrc` 的选项必须与仓库根目录的 `.prettierrc` 一致，提交钩子会按根配置统一格式化。`src/` 与 `tests/` 中的代码必须自行编写；
- `legacy/` 与 `clean/` 属于教程与参考答案：请勿存放个人练习或直接改动其中的文件。如需修正或提出改进建议，参见根目录 README 的「协作规范」一节。

## 提交规范

- 从 `develop` 创建 `exercise/<你的名字>` 分支，仅推送该分支，不得直接推送 `develop`；
- 提交信息使用 `dayNN: <简短说明>`，推荐英文（例：`day05: ports + usecases wired, e2e still red on session`）。测试未通过时也可以提交，但应记录失败位置与原因；
- 提交前确认不包含 `.env`、`*.db` 与 `node_modules`；根目录 `.gitignore` 已统一处理，仍请自行核对。

## 代码格式（Prettier）

仓库根目录提供统一的 Prettier 配置与提交钩子，用于保证各成员提交的练习代码格式一致。

### 首次准备

在仓库根目录执行一次：

```bash
npm install
```

该命令安装 Prettier、lint-staged 与 simple-git-hooks，并通过 `prepare` 脚本写入 `.git/hooks/pre-commit`。未执行该步骤时，提交钩子不会生效。

### 提交时

`git commit` 会触发 pre-commit 钩子，按以下顺序执行：

1. 检查 `exercise/` 下各项目的 `.prettierrc` 是否与根配置一致；不一致时输出差异并中止提交；
2. 对暂存区中 `exercise/` 下的文件执行 Prettier，自动格式化后重新加入暂存区；
3. 若格式化失败，提交会被中止，终端会输出具体文件。

钩子只处理 `exercise/` 下的文件，不会改动 `clean/`、`legacy/` 与根目录文档。

### 配置

根目录 `.prettierrc` 为唯一标准：

| 选项            | 值      | 作用                   |
| --------------- | ------- | ---------------------- |
| `semi`          | `false` | 不输出行尾分号         |
| `singleQuote`   | `true`  | 使用单引号             |
| `printWidth`    | `120`   | 单行最大宽度           |
| `trailingComma` | `all`   | 多行结构中保留尾随逗号 |

根目录 `.prettierignore` 排除 `node_modules`、`dist`、`coverage`、`package-lock.json`、`*.db` 与 `.env`。各成员项目中的 `.prettierrc` 仅用于本地 `npm run gate`，其内容必须与根配置相同。

### 手动执行

```bash
npm run format        # 格式化 exercise/ 下的全部支持文件
npm run format:check  # 仅检查，不写入文件
```

提交钩子只负责代码格式；`npm run gate` 仍负责 `prettier --check`、`tsc --noEmit`、`eslint` 与 `vitest` 四项检查，提交前应在当天项目中执行。

> 如需临时跳过钩子，可使用 `git commit --no-verify`。该选项仅用于钩子自身故障等特殊情况，正常提交不应跳过。

## 每一天的验收（自检清单）

1. `npm run gate` 四项全部通过：`prettier --check` + `tsc --noEmit` + `eslint` + `vitest`；
2. 测试数量与 GUIDE 当天的「验收点」一致（各天的期望数字以 GUIDE 为准，总览见 `clean/README.md` 的「学习路径」表）；
3. Day 06 起另含 `tests/architecture.test.ts`：除保持通过外，可验证其失败路径，例如编写一处违规的跨模块 import，确认守卫会失败；
4. 本机配置写入各自的 `.env`（参照 `.env.example`），仓库中仅保留 `.env.example`。

## 常见困难点

| 症状                   | 建议查阅                                                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 出现大量类型错误       | 对照 GUIDE 当天的「手打目标」逐项检查；12 项 strict 选项全部启用，请勿关闭                                                       |
| 测试数量与验收点不一致 | 按 GUIDE「验收点」给出的期望数字逐日核对                                                                                         |
| 架构守卫失败           | `clean/docs/conventions.md` 第 1–4 节，以及 `clean/docs/dependency-graph.md` 的 import 矩阵                                      |
| 不确定文件位置         | 依据「判据在领域层、表归拥有者模块」判断，并查阅 `docs/dependency-graph.md`                                                      |
| 运行测试时内存不足     | 各 solution 的 vitest 已限制并发（minWorkers 1 / maxWorkers 2）；仍然不足时使用 `NODE_OPTIONS=--max-old-space-size=768 npm test` |
