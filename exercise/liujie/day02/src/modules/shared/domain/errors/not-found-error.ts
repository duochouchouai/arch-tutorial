/**
 * @file 未找到错误
 * @author liujie
 * 设计理由：用稳定的领域错误语义表达失败，避免业务错误依赖 HTTP 细节。
 */
import { AppError } from './app-error'

export class NotFoundError extends AppError {
  constructor(message = '资源不存在') {
    super(message, { code: 'NOT_FOUND', statusCode: 404 })
  }
}
