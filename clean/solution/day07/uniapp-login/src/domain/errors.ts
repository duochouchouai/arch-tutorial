/**
 * @file API 错误 — 后端错误在客户端的形状
 * @author 教程组
 *
 * 后端信封里的 { message, fieldErrors } 在前端映射成这个类：
 * - message：给用户看的一句话；
 * - statusCode：需要按状态分支时用（401 回登录页、423 提示锁定中）；
 * - fieldErrors：字段级错误，页面渲染到对应输入框下面。
 * 页面只认 ApiError，不认「HTTP 细节」。
 */
export class ApiError extends Error {
  readonly statusCode: number
  readonly fieldErrors: Readonly<Record<string, readonly string[]>> | undefined

  constructor(message: string, statusCode: number, fieldErrors?: Readonly<Record<string, readonly string[]>>) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.fieldErrors = fieldErrors
  }

  /** 字段 → 第一条错误信息（页面逐字段渲染用；useXxx 把它放进响应式 ref） */
  firstErrors(): Record<string, string> {
    const result: Record<string, string> = {}
    for (const [field, messages] of Object.entries(this.fieldErrors ?? {})) {
      const first = messages[0]
      if (first !== undefined) {
        result[field] = first
      }
    }
    return result
  }
}
