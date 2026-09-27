# exercise — 成员练习区

本目录用于动手练习：按照 `clean/GUIDE-day01..07.md` 手打清洁架构，成果写入各自的目录。

> 唯一的原则：**先独立完成**。遇到困难时，先查阅 GUIDE 当天的「验收点」与「违规 → 症状」表；
> 确实无法继续时，再打开 `clean/solution/dayNN/` 对照——对照后请合上参考答案，自行重新输入一遍，**请不要复制粘贴**。

## 目录规范

```
exercise/
└── <你的名字>/              # 小写拼音/英文，如 zhangsan、wang-xiaoming；与分支名保持一致
    ├── day01/               # 跟随 GUIDE-day01 手打的成果（独立可运行的项目）
    ├── day02/
    ├── ...
    └── NOTES.md             # 可选：经验、疑问、思考
```

- 每人一个目录，**互不重叠**；
- 每天的成果应为**独立项目**：具备自己的 `package.json` / `tsconfig.json` / `vitest.config.ts`，能够执行 `npm install && npm run gate`（工程配置与 `clean/solution/dayNN` 保持一致）；
- 工程脚手架文件（`package.json`、`tsconfig.json`、`eslint.config.mjs`、`.prettierrc`、`vitest.config.ts`、`.env.example`）：**Day 01 的按 GUIDE 自行输入**（这是第一天的考查内容）；Day 02 起可直接沿用前一天的配置。但 `src/` 与 `tests/` 中的代码必须自行输入；
- `legacy/` 与 `clean/` 属于教程与参考答案：请勿在其中存放个人练习，也不要直接改动其中的文件。如有修正或改进建议，请参见根目录 README 的「协作规范」一节。

## 提交规范

- 分支：从 `develop` 切出 `exercise/<你的名字>`，仅推送自己的分支，不要直接推送 `develop`；
- 提交信息：`dayNN: <简短说明>`，推荐使用英文（例：`day05: ports + usecases wired, e2e still red on session`）；**测试未通过时也可以提交**——记录失败的位置与原因，比虚假的通过记录更有价值；
- 提交前确认：不包含 `.env`、`*.db`、`node_modules`（根目录 `.gitignore` 已统一处理，也请大家自行核对）。

## 每一天的验收（自检清单）

1. `npm run gate` 四项全部通过：`prettier --check` + `tsc --noEmit` + `eslint` + `vitest`；
2. 测试数量与 GUIDE 当天的「验收点」一致（例：Day 05 为 20 文件 / 80 测试）；
3. Day 06 起另含 `tests/architecture.test.ts`：除了保持通过外，也可以尝试**验证其失败路径**，比如刻意编写一处违规的跨模块 import，确认守卫确实会失败；
4. 本机配置写入各自的 `.env`（参照 `.env.example`），仓库中仅保留 `.env.example`。

## 常见困难点

| 症状 | 建议查阅 |
|---|---|
| 类型报错大量出现 | 对照 GUIDE 当天的「手打目标」逐项检查；12 条 strict 全开，请勿关闭 |
| 测试数量与验收点不一致 | GUIDE「验收点」给出的期望数字，逐日核对 |
| 架构守卫失败 | `clean/docs/conventions.md` 第 1–4 节，以及 `clean/docs/dependency-graph.md` 的 import 矩阵 |
| 不确定某个文件应放在何处 | 先依据两条原则判断：「判据在领域层、表归拥有者模块」；再查阅 `docs/dependency-graph.md` |
| 运行测试时内存不足 | 各 solution 的 vitest 已限制并发（minWorkers 1 / maxWorkers 2）；仍然不足时使用 `NODE_OPTIONS=--max-old-space-size=768 npm test` |
