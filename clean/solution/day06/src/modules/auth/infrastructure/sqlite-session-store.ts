/**
 * @file 会话存储 — SQLite 实现（auth_sessions 表拥有者）
 * @author 教程组
 *
 * 本实现里没有任何业务判断与时钟调用：过期行照样返回，
 * 「能不能用」的判定在 SessionUseCase（判据归属，见端口注释）。
 */
import type { DatabaseSync } from 'node:sqlite'
import type { SessionStorePort } from '../domain/ports/index'
import { StoredSessionSchema, type StoredSession } from '../domain/schemas/index'

export class SqliteSessionStore implements SessionStorePort {
  readonly #db: DatabaseSync

  constructor(db: DatabaseSync) {
    this.#db = db
    this.#db.exec(`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      )
    `)
  }

  async save(token: string, userId: string, expiresAt: number): Promise<void> {
    this.#db
      .prepare(`INSERT INTO auth_sessions (token, user_id, expires_at) VALUES (?, ?, ?)`)
      .run(token, userId, expiresAt)
  }

  async find(token: string): Promise<StoredSession | null> {
    const row = this.#db
      .prepare(`SELECT user_id AS userId, expires_at AS expiresAt FROM auth_sessions WHERE token = ?`)
      .get(token)
    return row === undefined ? null : StoredSessionSchema.parse(row)
  }

  async remove(token: string): Promise<void> {
    this.#db.prepare(`DELETE FROM auth_sessions WHERE token = ?`).run(token)
  }
}
