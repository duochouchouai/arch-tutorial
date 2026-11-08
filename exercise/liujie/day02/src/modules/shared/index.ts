/**
 * @file shared 模块公开入口 — 纯 barrel
 * @author liujie
 * 集中导出 shared 的公开类型和实现，避免其他模块依赖内部文件路径。
 */
export { DomainEvent } from './domain/index'
export * from './domain/errors/index'
export type { EventBus, EventHandler, IdGenerator, TimeProvider } from './domain/ports/index'
export { CryptoIdGenerator, InMemoryEventBus, SystemTimeProvider, errorHandler } from './infrastructure/index'
export { EnvelopeSchema, fail, ok } from './schemas/index'
export type { Envelope } from './schemas/index'
