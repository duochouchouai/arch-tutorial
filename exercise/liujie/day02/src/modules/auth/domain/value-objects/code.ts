/**
 * @file Code 值对象 — 构造即校验
 * @author liujie
 * 设计理由：把输入规则集中在值对象入口，避免非法值进入领域模型。
 */
import { ValidationError } from '../../../shared/index'

const CODE_PATTERN = /^\d{6}$/

export class Code {
  readonly value: string

  private constructor(value: string) {
    this.value = value
    Object.freeze(this)
  }

  toString(): string {
    return this.value
  }

  static fromTrusted(raw: string): Code {
    return new Code(raw)
  }

  static create(raw: string): Code {
    if (typeof raw !== 'string' || !CODE_PATTERN.test(raw)) {
      throw new ValidationError({ code: ['验证码格式不正确，必须为 6 位数字'] })
    }
    return new Code(raw)
  }
}
