/**
 * @file 启动配置 — 环境变量的唯一校验点
 * @author liujie
 * 环境变量先在启动时校验，这样错误配置不会等到处理请求时才暴露。
 */
import { existsSync } from 'node:fs'
import { z } from 'zod'

export const ConfigSchema = z.object({
  port: z.coerce.number().int().min(0).max(65535).default(3000),
  dbPath: z.string().default('app.db'),

  bcryptRounds: z.coerce.number().int().min(4).max(15).default(10),
  nodeEnv: z.enum(['development', 'test', 'production']).default('development'),
})
export type Config = z.infer<typeof ConfigSchema>

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return ConfigSchema.parse({
    port: env['PORT'],
    dbPath: env['DB_PATH'],
    bcryptRounds: env['BCRYPT_ROUNDS'],
    nodeEnv: env['NODE_ENV'],
  })
}

export function loadEnvFile(path = '.env'): void {
  if (!existsSync(path)) return
  process.loadEnvFile(path)
}
