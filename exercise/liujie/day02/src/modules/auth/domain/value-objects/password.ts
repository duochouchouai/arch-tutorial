/**
 * @file Password 值对象 — 构造即校验
 * @author liujie
 * 这里只校验待设置的密码，不负责加密或存储；登录时可关闭复杂度检查，兼容旧密码。
 */
import { ValidationError } from '../../../shared/index'

export class Password {
  readonly value: string

  private constructor(value: string) {
    this.value = value
    Object.freeze(this)
  }

  toString(): string {
    return this.value
  }

  static fromTrusted(raw: string): Password {
    return new Password(raw)
  }

  static create(raw: string, minLength = 8, maxLength = 64, requireComplexity = true): Password {
    if (typeof raw !== 'string') {
      throw new ValidationError({ password: ['密码格式不正确'] })
    }
    if (raw.length < minLength) {
      throw new ValidationError({ password: [`密码长度不能少于 ${minLength} 位`] })
    }
    if (raw.length > maxLength) {
      throw new ValidationError({ password: [`密码长度不能超过 ${maxLength} 位`] })
    }
    if (requireComplexity && !/[a-zA-Z]/.test(raw)) {
      throw new ValidationError({ password: ['密码必须包含字母'] })
    }
    if (requireComplexity && !/\d/.test(raw)) {
      throw new ValidationError({ password: ['密码必须包含数字'] })
    }
    return new Password(raw)
  }
}
