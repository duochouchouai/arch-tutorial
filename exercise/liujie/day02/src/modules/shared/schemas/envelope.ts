/**
 * @file HTTP 响应信封 — 前后端共同的响应形状
 * @author liujie
 * 统一成功和失败响应的结构，前端可以用同一套逻辑处理接口结果。
 */
import { z } from 'zod'
import type { FieldErrors } from '../domain/errors/index'

export const EnvelopeSchema = z.union([
  z.object({ success: z.literal(true), data: z.unknown() }),
  z.object({
    success: z.literal(false),
    message: z.string(),
    fieldErrors: z.record(z.array(z.string())).optional(),
  }),
])
export type Envelope = z.infer<typeof EnvelopeSchema>

export function ok<T>(data: T): { success: true; data: T } {
  return { success: true, data }
}

export function fail(
  message: string,
  fieldErrors?: FieldErrors | undefined,
): {
  success: false
  message: string
  fieldErrors: FieldErrors | undefined
} {
  return { success: false, message, fieldErrors }
}
