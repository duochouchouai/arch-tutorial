/**
 * @file 服务入口 — 组合根（Composition Root）
 * @author liujie
 * 依赖在这里装配，createApp 也供 e2e 测试复用，避免测试和启动走不同流程。
 * 目前只从配置读取端口；后续增加配置时仍在这里传入模块。
 */
import express from 'express'
import { loadConfig, loadEnvFile } from './config/index'
import { errorHandler } from './modules/shared/index'
import { createAuthModule } from './modules/auth/index'

export interface AppBundle {
  app: express.Express
}

export function createApp(): AppBundle {
  const auth = createAuthModule()

  const app = express()
  app.use(express.json())

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' })
  })
  app.use('/auth', auth.createRouter())
  app.use(errorHandler)
  return { app }
}

if (require.main === module) {
  loadEnvFile()
  const config = loadConfig()
  const { app } = createApp()
  app.listen(config.port, () => {
    console.log(`[clean] 服务已启动：http://localhost:${config.port}`)
  })
}
