import { after } from "next/server";

// 收尾任务绑定 Next 请求生命周期；无请求上下文时退回 fire-and-forget。
// 必须把任务 promise 返回给 after()：回调返回 undefined 时 Next 认为任务已结束，
// 请求响应后实例冻结会中断仍在进行的写入。
export function runAfter(task: () => Promise<unknown>): void {
  const run = () => task().catch((e) => console.error("后台任务失败：", e));
  try {
    after(run);
  } catch {
    void run();
  }
}
