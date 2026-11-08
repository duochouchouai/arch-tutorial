/**
 * @file 领域事件基类
 * @author liujie
 * 事件由具体事件类标识，发生时间由创建方传入，便于测试时控制时间。
 */
export abstract class DomainEvent {
  readonly occurredAt: number

  constructor(occurredAt: number) {
    this.occurredAt = occurredAt
  }
}
