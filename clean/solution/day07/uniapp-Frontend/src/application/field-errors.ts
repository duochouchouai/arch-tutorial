/**
 * @file 字段级错误映射 — 把两种来源归一成「字段名 → 一句话」
 * @author 教程组
 *
 * 两种来源：
 * 1. 前端 zod 校验（safeParse 的 issues）—— 目的是少发无效请求；
 * 2. 后端信封的 fieldErrors（经 ApiError）—— 判据归属仍在后端。
 * 页面只消费映射结果：渲染到对应输入框下面，不关心错误从哪来。
 * 归一在一个文件里，免得每个 useXxx 各写一遍映射（分叉的起点）。
 */
import { ApiError } from '../domain/errors'

/** zod issues → 字段 → 第一条信息（同字段多条只保留第一条；无字段路径的忽略） */
export function fieldErrorsFromIssues(
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const issue of issues) {
    const field = issue.path.map(String).join('.')
    if (field !== '' && result[field] === undefined) {
      result[field] = issue.message
    }
  }
  return result
}

/** 非 ApiError（网络异常等）没有字段信息：返回空映射，由顶层 error 文案兜底 */
export function fieldErrorsFromError(error: unknown): Record<string, string> {
  return error instanceof ApiError ? error.firstErrors() : {}
}
