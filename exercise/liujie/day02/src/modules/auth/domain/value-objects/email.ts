/**
 * @file Email 值对象 — 构造即校验
 * @author liujie
 * create 校验用户输入，fromTrusted 用于恢复可信数据；实例创建后不可修改。
 */
import { ValidationError } from '../../../shared/index'

const MAX_LENGTH = 254

export class Email {
  readonly value: string

  private constructor(value: string) {
    this.value = value
    Object.freeze(this)
  }

  toString(): string {
    return this.value
  }

  static fromTrusted(raw: string): Email {
    return new Email(raw)
  }

  static create(raw: string): Email {
    if (typeof raw !== 'string' || raw.length === 0) {
      throw new ValidationError({ email: ['邮箱不能为空'] })
    }
    if (raw.length > MAX_LENGTH) {
      throw new ValidationError({ email: [`邮箱不能超过 ${MAX_LENGTH} 个字符`] })
    }
    if (raw !== raw.trim()) {
      throw new ValidationError({ email: ['邮箱不能包含首尾空格'] })
    }
    if (raw !== raw.toLowerCase()) {
      throw new ValidationError({ email: ['邮箱必须使用小写字母'] })
    }
    const atIndex = raw.indexOf('@')
    if (atIndex <= 0 || atIndex !== raw.lastIndexOf('@') || atIndex === raw.length - 1) {
      throw new ValidationError({ email: ['邮箱格式不正确'] })
    }
    if (!raw.slice(atIndex + 1).includes('.')) {
      throw new ValidationError({ email: ['邮箱域名格式不正确'] })
    }
    return new Email(raw)
  }
}
