/**
 * @file 健康探针 e2e — 用 createApp 真实装配（不另写一套）
 * @author liujie
 * 测试理由：验证 createApp 装配后的健康检查响应。
 */
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/main'

describe('GET /health', () => {
  it('返回 200 + { status: "ok" }', async () => {
    const { app } = createApp()
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})
