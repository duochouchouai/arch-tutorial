/**
 * @file 字段级错误映射测试 — 两种来源（zod issues / ApiError）归一后的形状
 * @author 教程组
 */
import { describe, expect, it } from 'vitest'
import { fieldErrorsFromError, fieldErrorsFromIssues } from '../src/application/field-errors'
import { ApiError } from '../src/domain/errors'

describe('fieldErrorsFromIssues', () => {
  it('zod issues → 字段 → 第一条信息（同字段只留第一条）', () => {
    const issues = [
      { path: ['password'], message: '密码至少 8 位' },
      { path: ['password'], message: '密码需包含数字' },
      { path: ['email'], message: '邮箱格式不正确' },
    ]

    expect(fieldErrorsFromIssues(issues)).toEqual({
      password: '密码至少 8 位',
      email: '邮箱格式不正确',
    })
  })

  it('忽略无字段路径的 issue（整体错误交给顶层文案）', () => {
    expect(fieldErrorsFromIssues([{ path: [], message: '整体不合法' }])).toEqual({})
  })
})

describe('fieldErrorsFromError', () => {
  it('ApiError → 后端 fieldErrors 的「字段 → 第一条」映射', () => {
    const error = new ApiError('输入校验未通过', 400, { code: ['验证码错误或已过期'], username: ['用户名已被占用'] })

    expect(fieldErrorsFromError(error)).toEqual({ code: '验证码错误或已过期', username: '用户名已被占用' })
  })

  it('非 ApiError → 空映射（网络异常没有字段信息，由顶层文案兜底）', () => {
    expect(fieldErrorsFromError(new Error('network'))).toEqual({})
  })
})
