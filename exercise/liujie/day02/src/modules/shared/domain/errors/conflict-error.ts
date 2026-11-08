/**
 * @file 冲突错误 — 资源已存在 / 状态冲突
 * @author liujie
 * 设计理由：用稳定的领域错误语义表达失败，避免业务错误依赖 HTTP 细节。
 */
import { AppError, type FieldErrors } from './app-error'

export class ConflictError extends AppError {
  constructor(message = '资源冲突', fieldErrors?: FieldErrors | undefined) {
    super(message, { code: 'CONFLICT', statusCode: 409, fieldErrors })
  }
}
