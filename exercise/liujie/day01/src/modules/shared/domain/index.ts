/**
 * @file shared 领域层出口 — 领域事件基类与端口
 * @author liujie
 * 设计理由：统一导出 shared 的领域类型，减少对内部路径的依赖。
 */
export { DomainEvent } from './domain-event'
export * from './ports/index'
