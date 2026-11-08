/**
 * @file 内存事件总线 — 基础设施实现
 * @author liujie
 * 等所有订阅者处理完再返回；单个订阅者失败不会中断其他订阅者。
 */
import type { DomainEvent } from '../domain/index'
import type { EventBus, EventHandler } from '../domain/ports/index'

export class InMemoryEventBus implements EventBus {
  readonly #handlers: Map<string, EventHandler[]> = new Map()

  subscribe(eventName: string, handler: EventHandler): void {
    const handlers = this.#handlers.get(eventName)
    if (handlers) {
      handlers.push(handler)
      return
    }
    this.#handlers.set(eventName, [handler])
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.#handlers.get(event.constructor.name) ?? []
    await Promise.allSettled(handlers.map((handler) => Promise.resolve().then(() => handler(event))))
  }
}
