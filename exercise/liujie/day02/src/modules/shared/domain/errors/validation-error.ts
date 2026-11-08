/**
 * @file 校验错误 — 输入不合法
 * @author liujie
 * 保留字段名和错误文案，接口层可以把错误对应到具体输入项。
 */
import { AppError, type FieldErrors } from './app-error'

export class ValidationError extends AppError {
  constructor(fieldErrors: FieldErrors, message = '输入校验未通过') {
    super(message, { code: 'VALIDATION_ERROR', statusCode: 400, fieldErrors })
  }
}
