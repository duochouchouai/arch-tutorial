/**
 * @file shared 错误出口 — AppError 基类与各语义化错误（含字段级错误）
 * @author liujie
 * 设计理由：统一导出错误类型，方便其他模块复用。
 */
export { AppError } from './app-error'
export type { AppErrorOptions, FieldErrors } from './app-error'
export { ConflictError } from './conflict-error'
export { NotFoundError } from './not-found-error'
export { UnauthorizedError } from './unauthorized-error'
export { ValidationError } from './validation-error'
