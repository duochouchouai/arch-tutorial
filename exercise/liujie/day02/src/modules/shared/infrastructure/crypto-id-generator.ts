/**
 * @file 密码学随机 id 生成器 — 基础设施实现
 * @author liujie
 * 设计理由：在基础设施层提供 IdGenerator 的密码学随机实现。
 */
import { randomBytes } from 'node:crypto'
import type { IdGenerator } from '../domain/ports/index'

export class CryptoIdGenerator implements IdGenerator {
  readonly #bytes: number

  constructor(bytes = 16) {
    this.#bytes = bytes
  }

  generate(): string {
    return randomBytes(this.#bytes).toString('hex')
  }
}
