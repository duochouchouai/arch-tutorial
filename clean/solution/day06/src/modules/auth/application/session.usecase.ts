/**
 * @file 会话用例 — 校验当前会话 / 退出登录
 * @author 教程组
 *
 * 判据归属：「会话是否过期」在这里判定，时钟从端口注入 ——
 * 存储实现（SQLite / Redis / …）只把行取出来，不掺业务判断。
 * 于是「30 天过期」是可以用假时钟单测的编排，而不是藏在 SQL 里的隐式行为。
 */
import { UnauthorizedError } from '../../shared/index'
import type { AuthSessionDeps } from '../domain/schemas/deps/index'

export class SessionUseCase {
  readonly #deps: AuthSessionDeps

  constructor(deps: AuthSessionDeps) {
    this.#deps = deps
  }

  async current(token: string): Promise<{ userId: string }> {
    const session = await this.#deps.sessionStore.find(token)
    // 「不存在」与「已过期」对调用方是同一件事：未认证
    if (session === null || session.expiresAt <= this.#deps.timeProvider.now()) {
      throw new UnauthorizedError()
    }
    return { userId: session.userId }
  }

  /** 退出登录幂等：token 不存在也返回成功 */
  async logout(token: string): Promise<void> {
    await this.#deps.sessionStore.remove(token)
  }
}
