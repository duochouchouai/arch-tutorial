/**
 * @file 服务入口 — 组合根（Composition Root）
 * @author liujie
 * 设计理由：让依赖装配集中在唯一入口，模块和测试都复用一致的创建过程。
 */
import express from 'express'
import { loadConfig, loadEnvFile } from './config/index'
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
