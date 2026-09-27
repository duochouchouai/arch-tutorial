/**
 * @file 注册事件发布端口
 * @author 教程组
 *
 * 注册用例不直接摸 EventBus：它只声明「要发一个注册事件」。
 * 怎么发、发给谁、失败怎么办，都在实现（application/user-registered.publisher.ts）里收口。
 */
export interface UserRegisteredPublisherPort {
  /** 发布注册事件；失败只记日志，**不向上抛出**（副作用失败不影响注册主流程） */
  publish(userId: string): Promise<void>
}
