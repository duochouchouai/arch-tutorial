/**
 * @file auth 错误出口 — 锁定 / 验证码 / 冲突 / 凭据等语义化错误
 * @author 教程组
 */
export {
  AccountLockedError,
  EmailTakenError,
  InvalidCodeError,
  InvalidCredentialsError,
  UsernameTakenError,
} from './auth.errors'
