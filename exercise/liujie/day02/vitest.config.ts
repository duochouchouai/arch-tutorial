/**
 * @file vitest 配置 — 限制并发 worker 上限，避免低配机器 / CI 内存耗尽
 * @author liujie
 * 设计理由：明确该文件的边界职责，避免相关规则分散到调用方。
 */
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    minWorkers: 1,
    maxWorkers: 2,
  },
})
