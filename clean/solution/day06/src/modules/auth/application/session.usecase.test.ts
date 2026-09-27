import { describe, expect, it } from 'vitest'
import { FakeTimeProvider, InMemorySessionStore } from '../../../../tests/support/fakes'
import { UnauthorizedError } from '../../shared/index'
import { SESSION_TTL_MS } from '../domain/constants'
import { SessionUseCase } from './session.usecase'

const START = 1_000

function build() {
  const time = new FakeTimeProvider(START)
  const sessionStore = new InMemorySessionStore()
  const useCase = new SessionUseCase({ sessionStore, timeProvider: time })
  return { time, sessionStore, useCase }
}

describe('SessionUseCase', () => {
  it('有效会话：返回 userId', async () => {
    const { sessionStore, useCase } = build()
    await sessionStore.save('token-1', 'user-1', START + SESSION_TTL_MS)

    expect(await useCase.current('token-1')).toEqual({ userId: 'user-1' })
  })

  it('过期会话：401 —— 判据在用例层，假时钟一步跨过 30 天', async () => {
    const { time, sessionStore, useCase } = build()
    await sessionStore.save('token-1', 'user-1', START + SESSION_TTL_MS)

    time.advance(SESSION_TTL_MS)

    await expect(useCase.current('token-1')).rejects.toBeInstanceOf(UnauthorizedError)
  })

  it('未知 token：401（与过期同一响应）', async () => {
    const { useCase } = build()
    await expect(useCase.current('missing')).rejects.toBeInstanceOf(UnauthorizedError)
  })

  it('退出登录幂等：token 不存在也成功', async () => {
    const { sessionStore, useCase } = build()
    await sessionStore.save('token-1', 'user-1', START + SESSION_TTL_MS)

    await useCase.logout('token-1')
    await useCase.logout('token-1')

    expect(await sessionStore.find('token-1')).toBeNull()
  })
})
