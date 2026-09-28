/**
 * @file Code 值对象测试 — 6 位数字形状
 * @author 教程组
 */
import { describe, expect, it } from 'vitest'
import { ValidationError } from '../../../shared/index'
import { Code } from './code'

describe('Code', () => {
  it('6 位数字构造成功', () => {
    expect(Code.create('123456').value).toBe('123456')
  })

  it.each(['12345', '1234567', 'abcdef', '12345a', ''])('非 6 位数字抛 ValidationError：%s', (raw) => {
    expect(() => Code.create(raw)).toThrow(ValidationError)
  })
})
