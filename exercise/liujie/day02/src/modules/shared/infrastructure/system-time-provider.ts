/**
 * @file 系统时间源 — 基础设施实现
 * @author liujie
 * 设计理由：把系统时间访问限制在基础设施实现中。
 */
import type { TimeProvider } from '../domain/ports/index'

export class SystemTimeProvider implements TimeProvider {
  now(): number {
    return Date.now()
  }
}
