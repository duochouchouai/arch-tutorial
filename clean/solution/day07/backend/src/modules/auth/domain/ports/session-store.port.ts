/**
 * @file 会话存储端口
 * @author 教程组
 *
 * 不透明 token + 服务端会话表（教程简化：不做 JWT —— 会话可随时吊销，
 * 且「token 里该放什么」这类决策不占用本教程课时）。
 *
 * 判据归属：存储只负责存、取、删 —— find 连已过期的行也原样返回，
 * 「这个会话还能不能用」由用例拿注入的时钟判定（见 SessionUseCase）。
 * 存储里一旦混入业务判断，换实现（SQLite → Redis）就得复刻一遍。
 */
import type { StoredSession } from '../schemas/index'

export interface SessionStorePort {
  save(token: string, userId: string, expiresAt: number): Promise<void>
  /** 取回会话记录；是否过期由调用方判定，本方法不做任何过滤 */
  find(token: string): Promise<StoredSession | null>
  remove(token: string): Promise<void>
  /** 吊销某用户的全部会话（Day 07 重置密码用：改了密码，旧 token 必须立刻失效） */
  removeAllForUser(userId: string): Promise<void>
}
