/**
 * @file vitest 配置 — 限制并发 worker 上限，避免低配机器 / CI 内存耗尽
 * @author 教程组
 */
import { defineConfig } from 'vitest/config'

// 测试量不大：显式限制并发 worker（min/max 成对写，避免 pool 参数冲突），
// 避免在低配机器 / CI 上耗尽内存
export default defineConfig({
  test: {
    minWorkers: 1,
    maxWorkers: 2,
  },
})
