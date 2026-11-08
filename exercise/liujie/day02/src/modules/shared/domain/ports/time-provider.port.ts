/**
 * @file 时间源端口 — 领域与用例唯一允许的「现在」来源
 * @author liujie
 * 把时间作为依赖传入，测试就能控制当前时间，不需要等待真实时间流逝。
 */
export interface TimeProvider {
  now(): number
}
