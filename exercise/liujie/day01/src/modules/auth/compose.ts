/**
 * @file auth 模块组合根 — 骨架
 * @author liujie
 * main.ts 只通过这个函数使用 auth；后续增加依赖时也在这里装配。
 */
import { Router } from 'express'

export interface AuthModule {
  createRouter: () => Router
}

export function createAuthModule(): AuthModule {
  return { createRouter: () => Router() }
}
