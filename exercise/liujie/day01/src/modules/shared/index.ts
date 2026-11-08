/**
 * @file shared 模块公开入口 — 纯 barrel
 * @author liujie
 * 集中导出 shared 对外需要的类型和实现，其他模块不必引用内部路径。
 */
export { DomainEvent } from './domain/index'
export type { EventBus, EventHandler, IdGenerator, TimeProvider } from './domain/ports/index'
export { CryptoIdGenerator, InMemoryEventBus, SystemTimeProvider } from './infrastructure/index'
