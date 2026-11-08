/**
 * @file 未认证错误
 * @author liujie
 * 设计理由：用稳定的领域错误语义表达失败，避免业务错误依赖 HTTP 细节。
 */
import { AppError } from './app-error'

export class UnauthorizedError extends AppError {
  constructor(message = '未登录或会话已失效') {
    super(message, { code: 'UNAUTHORIZED', statusCode: 401 })
  }
}
