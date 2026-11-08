/**
 * @file id 生成端口
 * @author liujie
 * 通过端口生成 id，测试可以替换成固定值；实际实现使用密码学随机数。
 */
export interface IdGenerator {
  generate(): string
}
