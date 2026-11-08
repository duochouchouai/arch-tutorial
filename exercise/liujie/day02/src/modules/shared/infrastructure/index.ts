/**
 * @file shared 基础设施出口 — 时钟 / id / 事件总线 / 错误中间件的端口实现
 * @author liujie
 * 设计理由：统一导出 shared 当前使用的基础设施实现。
 */
export { CryptoIdGenerator } from './crypto-id-generator'
export { errorHandler } from './error-handler'
export { InMemoryEventBus } from './in-memory-event-bus'
export { SystemTimeProvider } from './system-time-provider'
