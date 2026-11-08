/**
 * @file shared 端口出口 — 事件总线 / id 生成 / 时间源
 * @author liujie
 * 设计理由：把端口类型集中导出，调用方只需依赖接口。
 */
export type { EventBus, EventHandler } from './event-bus.port'
export type { IdGenerator } from './id-generator.port'
export type { TimeProvider } from './time-provider.port'
