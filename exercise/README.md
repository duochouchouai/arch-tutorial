# exercise — 成员练习区

这里是动手练习的地方：按照 `clean/GUIDE-day01..07.md` 手打清洁架构，成果写进自己的目录。

> 唯一的规矩：**先自己写**。遇到困难，先看 GUIDE 当天的「验收点」和「违规 → 症状」表；
> 确实写不出来时，再打开 `clean/solution/dayNN/` 对照——对照完请合上参考答案，自己重新敲一遍，**请不要复制粘贴**。

## 目录规范

```
exercise/
└── <你的名字>/              # 小写拼音/英文，如 zhangsan、wang-xiaoming；与分支名保持一致
    ├── day01/               # 跟 GUIDE-day01 手打的成果（独立可运行的项目）
    ├── day02/
    ├── ...
    └── NOTES.md             # 可选：经验、疑问、思考
```

- 每人一个目录，**互不重叠**；
- 每天的成果是一个**独立项目**：有自己的 `package.json` / `tsconfig.json` / `vitest.config.ts`，能 `npm install && npm run gate`（工程配置与 `clean/solution/dayNN` 同构）；
- 工程脚手架文件（`package.json`、`tsconfig.json`、`eslint.config.mjs`、`.prettierrc`、`vitest.config.ts`、`.env.example`）：**Day 01 的跟着 GUIDE 自己敲**（那是第一天的考点）；Day 02 起可以直接抄前一天的。但 `src/` 和 `tests/` 里的每一行代码必须自己打；
- 不要改动 `legacy/`、`clean/` 里的任何文件——那是教程与参考答案，不是练习的草稿区。

## 提交规范

- 分支：从 `develop` 切出 `exercise/<你的名字>`，只推自己的分支，不要直接推 `develop`；
- 提交信息：`dayNN: <一句话>`，推荐英文（例：`day05: ports + usecases wired, e2e still red on session`）；
- 每天至少提交一次；**测试没通过也可以提交**——失败在哪里、为什么失败，比一份假的「全绿」更有信息量；
- 提交前确认：不包含 `.env`、`*.db`、`node_modules`（根目录 `.gitignore` 已经管住，自己再核对一遍）。

## 每一天的验收（自检清单）

1. `npm run gate` 四件套全绿：`prettier --check` + `tsc --noEmit` + `eslint` + `vitest`；
2. 测试数量对得上 GUIDE 当天的「验收点」（例：Day 05 是 20 文件 / 80 测试）；
3. Day 06 起还有 `tests/architecture.test.ts`：不光要是绿的，还要**亲手让它红一次**——故意写一处违规的跨模块 import，确认守卫真会失败；
4. 本机配置写在你的 `.env` 里（照 `.env.example` 抄），仓库里只留 `.env.example`。

## 常见困难点

| 症状 | 先看哪 |
|---|---|
| 满屏类型报错 | 逐一对照 GUIDE 当天的「手打目标」；12 条 strict 全开，不要关 |
| 测试数量对不上验收点 | GUIDE「验收点」给出的期望数字，逐日核对 |
| 架构守卫红了 | `clean/docs/conventions.md` 第 1–4 节 + `clean/docs/dependency-graph.md` 的 import 矩阵 |
| 不知道某个东西该放哪 | 先套两条原则：「判据在领域层、表归拥有者模块」，再翻 `docs/dependency-graph.md` |
| 跑测试内存不够 | 各 solution 的 vitest 已限制并发（minWorkers 1 / maxWorkers 2）；仍然不够时用 `NODE_OPTIONS=--max-old-space-size=768 npm test` |
