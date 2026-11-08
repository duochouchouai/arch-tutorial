/**
 * @file 进程内事件总线端口
 * @author liujie
 * 发布方与订阅方互不感知：模块 A 只认识「事件」和「总线」，
 * 不知道有哪些订阅方、数量多少 —— 新增订阅方零改动 A 的代码。
 */
import type { DomainEvent } from '../domain-event'

export type EventHandler = (event: DomainEvent) => Promise<void> | void

export interface EventBus {
  subscribe(eventName: string, handler: EventHandler): void

  publish(event: DomainEvent): Promise<void>
}
