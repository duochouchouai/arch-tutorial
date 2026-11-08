/**
 * @file Phone 值对象 — 构造即校验
 * @author liujie
 * 手机号规则集中在这里，其他代码直接使用 Phone，不再重复校验。
 */
import { ValidationError } from '../../../shared/index'

const PHONE_PATTERN = /^1[3-9]\d{9}$/

export class Phone {
  readonly value: string

  private constructor(value: string) {
    this.value = value
    Object.freeze(this)
  }

  toString(): string {
    return this.value
  }

  static fromTrusted(raw: string): Phone {
    return new Phone(raw)
  }

  static create(raw: string): Phone {
    if (typeof raw !== 'string' || !PHONE_PATTERN.test(raw)) {
      throw new ValidationError({ phone: ['手机号格式不正确'] })
    }
    return new Phone(raw)
  }
}
