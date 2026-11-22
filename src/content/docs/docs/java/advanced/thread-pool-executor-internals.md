---
title: 'ThreadPoolExecutor：任务调度、线程回收与拒绝策略'
description: '从 ctl 状态、execute 提交路径、Worker 生命周期到关闭与拒绝处理，系统梳理 ThreadPoolExecutor 的核心机制和生产设计要点。'
---

# ThreadPoolExecutor：任务调度、线程回收与拒绝策略

本文以 JDK `ThreadPoolExecutor` 的经典实现为对象，解释任务从提交、排队、执行到线程退出和线程池终止的完整路径，并梳理四种内置拒绝策略的行为与适用边界。实现细节可能随 JDK 版本调整；阅读源码时应以所用版本为准。

## 1. 执行模型概览

线程池由工作线程集合、任务队列、运行状态和拒绝处理器共同组成。`corePoolSize`、`maximumPoolSize` 与队列容量共同决定任务提交时的选择：先创建核心 Worker；核心数量达到上限后优先入队；队列无法接收时才尝试扩展到最大线程数；扩展失败后执行拒绝策略。

```text
提交任务 -> 核心 Worker 未满？ -> 创建 Worker 执行
                         否 -> 尝试入队
                                成功 -> 等待 Worker 消费
                                失败 -> 扩展至 maximumPoolSize
                                           失败 -> 拒绝策略
```

这一顺序很关键：核心线程用满后并不会立即扩容。使用无界队列时，队列通常持续接收任务，因此 `maximumPoolSize` 往往不会发挥作用。

## 2. `ctl`：状态与 Worker 数量

实现使用一个 `AtomicInteger ctl` 同时编码线程池运行状态和 Worker 数量：高 3 位表示 `runState`，低 29 位表示 `workerCount`。`runStateOf`、`workerCountOf` 和 `ctlOf` 分别负责提取或组合这两部分。把二者放在同一原子变量中，可通过 CAS 协调状态变化与 Worker 数量更新。

运行状态如下：

| 状态 | 接收新任务 | 继续处理队列任务 | 含义 |
| --- | --- | --- | --- |
| `RUNNING` | 是 | 是 | 正常运行 |
| `SHUTDOWN` | 否 | 是 | 有序关闭 |
| `STOP` | 否 | 否 | 尝试立即停止 |
| `TIDYING` | 否 | 否 | Worker 已清空，执行终止钩子 |
| `TERMINATED` | 否 | 否 | 完全终止 |

主要转换路径为 `RUNNING -> SHUTDOWN -> TIDYING -> TERMINATED`。调用 `shutdownNow()` 可使尚未终止的线程池进入 `STOP`，再走向 `TIDYING` 和 `TERMINATED`。

## 3. `execute()` 的任务提交路径

提交任务时，`execute()` 按以下步骤处理：

1. Worker 数量小于 `corePoolSize` 时，尝试创建核心上限内的 Worker，并让它直接执行当前任务。
2. 否则，在 `RUNNING` 状态下尝试将任务放入队列。
3. 入队成功后重新检查线程池状态。若线程池已不再运行，则尝试从队列移除刚提交的任务；移除成功时调用拒绝处理器。若仍在运行但 Worker 数为 0，则尝试创建一个没有 `firstTask` 的 Worker 来消费队列。
4. 入队失败时，尝试创建不超过 `maximumPoolSize` 的 Worker 执行当前任务。
5. 创建失败时，调用拒绝处理器。

例如 `corePoolSize=2`、`maximumPoolSize=4`、队列容量为 2，且前序任务尚未完成：

| 提交次序 | 处理方式 |
| --- | --- |
| T1、T2 | 创建两个核心 Worker，直接执行 |
| T3、T4 | 核心 Worker 已满，进入队列 |
| T5、T6 | 队列已满，扩展 Worker 并直接执行 |
| T7 | 队列和线程数上限均满，触发拒绝策略 |

## 4. Worker 与任务执行

`Worker` 是线程池的内部工作单元，保存实际执行任务的线程，并循环获取和执行任务。它继承 AQS，以一个简单的独占锁标记任务执行状态：

| `state` | 含义 |
| ---: | --- |
| `-1` | Worker 刚创建，尚未完成启动初始化；用于抑制过早中断 |
| `0` | 未持有 Worker 锁，通常为空闲 |
| `1` | 正在执行任务，持有 Worker 锁 |

`runWorker()` 启动后先解锁 Worker，使其进入可中断的空闲状态；执行每个用户任务前加锁，任务结束后解锁。该锁不是业务数据锁，而是线程池识别 Worker 执行状态和空闲状态的内部机制。

`runWorker()` 先执行可能存在的 `firstTask`，之后循环调用 `getTask()` 获取任务并执行。若 `getTask()` 返回 `null`，循环正常结束；若用户任务抛出未捕获异常，Worker 会异常退出。

## 5. 获取任务与 Worker 回收

`getTask()` 根据线程池状态、队列内容和超时配置决定等待、获取任务或退出：

- 状态至少为 `SHUTDOWN` 且队列为空时，Worker 可以退出。
- 状态至少为 `STOP` 时，不再继续处理队列任务，Worker 可以退出。
- `SHUTDOWN` 且队列非空时，Worker 继续取出并处理队列任务。
- 默认情况下，核心数量范围内的 Worker 使用 `workQueue.take()` 等待；超过核心数量的 Worker 使用带 `keepAliveTime` 的 `poll()` 等待，并可在超时后退出。
- `allowCoreThreadTimeOut(true)` 允许核心 Worker 也超时退出，此时 `keepAliveTime` 必须大于 0。

退出判断还会保护最后一个 Worker：当当前 Worker 是最后一个且队列仍有任务时，它不能退出，否则会留下无人消费的任务。`getTask()` 的正常退出路径会先减少 Worker 数量。

`processWorkerExit()` 负责清理退出的 Worker：异常退出时补做 Worker 数量递减；从 `workers` 集合移除 Worker；累计完成任务数；尝试终止线程池；若线程池仍运行且 Worker 数低于最低需求，则补充 Worker。核心线程超时关闭时最低数量可为 0，但队列仍有任务时会至少补充一个 Worker。`addWorker(null, false)` 在此处表示补足消费能力，并非提交业务任务。

正常退出和异常退出的计数路径不同：正常退出已由 `getTask()` 减数，异常退出则由 `processWorkerExit()` 补减，避免重复扣减。

## 6. 关闭、中断与终止

### `shutdown()`

将线程池转入 `SHUTDOWN`：拒绝新任务，继续处理队列中已有任务，并调用 `interruptIdleWorkers()` 尝试中断空闲 Worker。该方法通过 Worker 锁的 `tryLock()` 识别空闲线程；正在执行任务的 Worker 通常持锁，因此不会经由这条路径被中断。`shutdown()` 不等待线程池终止。

### `shutdownNow()`

将线程池推进到 `STOP`，尝试中断已启动的 Worker，并返回队列中尚未开始执行的任务。Worker 状态为 `-1` 时尚未完成启动，`interruptIfStarted()` 不会中断它；状态非负时会尝试调用线程的 `interrupt()`。

中断是协作式请求，不会强制结束线程。任务代码若不检查或响应中断，仍可能继续运行。返回的队列任务也需要调用方决定如何处理。

### `awaitTermination()` 与 `tryTerminate()`

`awaitTermination()` 只等待线程池进入 `TERMINATED`，不发起关闭也不负责中断任务。超时前终止则返回 `true`，超时仍未终止则返回 `false`。

`tryTerminate()` 在以下条件满足时推动线程池终止：线程池不能仍处于 `RUNNING`；不能已处于 `TIDYING` 或 `TERMINATED`；`SHUTDOWN` 时队列必须为空；Worker 数必须为 0。若仍有 Worker，它会尝试中断一个空闲 Worker 并返回。Worker 被唤醒并退出时会再次触发终止检查，逐步清空剩余 Worker。Worker 数归零后，状态经 CAS 转为 `TIDYING`，调用 `terminated()` 钩子，再转为 `TERMINATED` 并唤醒等待者。

| 方法 | 主要职责 | 等待终止 |
| --- | --- | --- |
| `shutdown()` | 拒绝新任务，处理完队列任务 | 否 |
| `shutdownNow()` | 尝试停止 Worker，返回未开始任务 | 否 |
| `awaitTermination()` | 等待终止状态 | 是 |

## 7. 拒绝策略

当任务无法被线程池接收时，`RejectedExecutionHandler` 决定如何处理。内置策略如下：

| 策略 | 行为 | 主要影响 |
| --- | --- | --- |
| `AbortPolicy` | 抛出 `RejectedExecutionException` | 调用方明确感知失败，通常是默认策略 |
| `CallerRunsPolicy` | 线程池未关闭时由提交线程运行任务；已关闭时不执行 | 形成反压，但可能把耗时带入请求线程 |
| `DiscardPolicy` | 静默丢弃当前任务 | 可能无声丢失任务 |
| `DiscardOldestPolicy` | 线程池未关闭时移除队列头部，再重试提交当前任务 | 旧任务可能丢失，重试也可能再次触发拒绝 |

队列头部不一定对应业务时间上最早的任务。只有新任务能够完整替代旧任务时，才应考虑 `DiscardOldestPolicy`。`CallerRunsPolicy` 也要结合提交线程判断：若提交线程承载 HTTP 请求，执行异步任务可能增加响应耗时。

## 8. 按业务语义选择策略

- **订单、支付等关键任务**：优先让提交失败明确可见，通常使用 `AbortPolicy`，并在业务侧设计持久化、重试、幂等和告警。拒绝异常只表示线程池没有接收任务，不代表业务操作最终成功或失败。
- **低价值统计或采样任务**：只有在业务明确允许丢失且有监控时，才考虑 `DiscardPolicy`。审计、结算数据不能简单丢弃。
- **可被新任务覆盖的刷新任务**：确认旧任务确实可替代后，再考虑 `DiscardOldestPolicy`。不同商品各自的刷新任务不能仅因名称相似而视为可替代。
- **可反压的非核心任务**：评估 `CallerRunsPolicy`，并确认提交线程适合承担任务执行时间和资源开销。

拒绝策略解决的是过载时如何处置，不会自动提供可靠投递、业务重试或数据补偿能力。

## 9. 生产配置与观测

线程池参数应根据业务延迟目标、任务耗时、资源上限和队列语义共同设计。生产环境至少应观测：活跃线程数、当前 Worker 数、队列长度、任务执行耗时、拒绝次数、任务异常数和关闭耗时。关键任务应让拒绝可见并结合可靠性机制；允许丢弃的任务要定义丢失边界并统计丢弃量；使用调用者执行时要验证调用链影响。

## 10. 理解要点

1. 核心 Worker 满后先入队，队列满后才尝试扩展到最大线程数。
2. `maximumPoolSize` 是否生效取决于队列是否还能接收任务。
3. Worker 数量与队列任务数量是两个不同维度；执行完一个任务不等于 Worker 退出。
4. `addWorker(firstTask, core)` 中的 `core` 选择本次创建时的数量上限，不表示 Worker 永久具有核心或非核心身份。
5. `shutdown()` 有序关闭；`shutdownNow()` 通过中断请求尝试立即停止，但不保证用户任务立刻结束。
6. `awaitTermination()` 只等待，不负责关闭线程池。
7. 正常 Worker 退出由 `getTask()` 减数，异常退出由 `processWorkerExit()` 补减。
8. 拒绝策略必须与任务可丢失性、可替代性、调用链和业务补偿能力一起设计。
