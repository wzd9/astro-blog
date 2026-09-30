---
title: Java 并发包（JUC）
description: AQS、锁、同步器与线程协作工具的学习与实践指南
---

> 适用范围：Java 8 及以上。示例以 JDK 17 的 API 习惯编写；核心机制同样适用于 JDK 8。
>
> 阅读目标：能够解释常用 JUC 工具解决的问题、正确使用其 API，并在需要时沿着 AQS 主流程阅读源码。本文讨论的是单个 JVM 内的并发控制；多实例部署时还需要额外的分布式协调方案。

---

## 目录

- [1. 并发问题与工具边界](#1-并发问题与工具边界)
- [2. 学习路线与知识地图](#2-学习路线与知识地图)
- [3. AQS：同步器的公共骨架](#3-aqs同步器的公共骨架)
- [4. 独占锁：ReentrantLock 与 Condition](#4-独占锁reentrantlock-与-condition)
- [5. 共享同步器：Semaphore 与 CountDownLatch](#5-共享同步器semaphore-与-countdownlatch)
- [6. 阶段协作：CyclicBarrier](#6-阶段协作cyclicbarrier)
- [7. 读写同步：ReentrantReadWriteLock 与 StampedLock](#7-读写同步reentrantreadwritelock-与-stampedlock)
- [8. LockSupport：阻塞与唤醒原语](#8-locksupport阻塞与唤醒原语)
- [9. 组件选择与工程实践](#9-组件选择与工程实践)
- [10. 源码阅读路径](#10-源码阅读路径)
- [11. 练习建议](#11-练习建议)

---

## 1. 并发问题与工具边界

​	并发工具不是为了“让代码多线程化”，而是为共享资源、任务协作和资源容量建立明确的访问规则。选择工具前，先判断问题属于哪一类。

| 问题 | 常用工具 | 关键语义 |
|---|---|---|
| 同一时刻只能修改一份本地状态 | `ReentrantLock` | 互斥、可重入 |
| 同时使用外部资源的任务不能超过上限 | `Semaphore` | 并发数上限 |
| 等一组任务完成后再继续 | `CountDownLatch` | 一次性倒计时 |
| 一组线程在每个阶段相互等候 | `CyclicBarrier` | 可复用屏障 |
| 读多写少的共享数据 | `ReentrantReadWriteLock`、`StampedLock` | 读写协调 |
| 等待特定业务条件成立 | `Condition` | 条件队列 |
| 自定义同步器或框架基础设施 | `AbstractQueuedSynchronizer`、`LockSupport` | 排队、阻塞、唤醒 |

### 1.1 三个经常混淆的概念

- **互斥**：同一时刻只能有一个执行单元进入临界区，例如修改内存中的订单聚合对象。
- **并发度控制**：限制“正在执行”的任务数，例如最多同时调用 20 个外部接口请求。
- **限流**：限制单位时间内通过的请求数，例如每秒最多 100 次。`Semaphore` 只能控制并发度，不能替代令牌桶、漏桶等 QPS 限流算法。

### 1.2 单 JVM 与分布式环境

​	`ReentrantLock`、`Semaphore`、`CountDownLatch` 等对象只存在于当前进程内存中。服务部署为多个实例时，每台机器创建的锁彼此独立：

```text
负载均衡
   ├── 实例 A：本地锁 A
   ├── 实例 B：本地锁 B
   └── 实例 C：本地锁 C
```

​	它们能够解决实例内部的线程竞争，不能保证跨实例互斥、全局限流或全局幂等。后者通常要结合数据库约束、Redis、消息队列或具备租约和故障处理能力的分布式协调组件设计；具体方案取决于一致性要求和失败模型。

---

## 2. 学习路线与知识地图

​	建议按“问题 → API → 运行过程 → 源码”的顺序学习，而不是从 AQS 源码开始背方法名。

![架构图](/images/docs/collections-concurrency/collections-concurrency.png)

每学习一个组件，至少回答以下问题：

1. 它保护的资源或协调的线程分别是什么？
2. 谁负责获取，谁负责释放或通知？异常路径是否也会释放？
3. 是否可重入、可复用、可中断、可超时？
4. 状态保存在哪里；等待线程进入了哪个队列？
5. 在多实例部署下，这个约束是否仍然成立？

---

## 3. AQS：同步器的公共骨架

​	`AbstractQueuedSynchronizer`（AQS）是一个用于构建锁和同步器的框架，不是可直接实例化的业务锁。`ReentrantLock`、`Semaphore`、`CountDownLatch` 和 `ReentrantReadWriteLock` 都在其基础上实现各自的获取、释放规则。

### 3.1 AQS 提供什么

AQS 负责通用部分：

- 一个 `volatile int state` 状态字段及其 CAS 更新能力；
- 获取失败线程的 FIFO 同步队列；
- 独占与共享两套获取、释放流程；
- 基于 `LockSupport` 的挂起与唤醒；
- 面向 `Condition` 的条件等待支持。

子类只需定义“状态代表什么”以及“何时允许获取”。

| 同步器 | `state` 的含义 |
|---|---|
| `ReentrantLock` | 当前持有线程的重入次数 |
| `Semaphore` | 剩余许可数 |
| `CountDownLatch` | 尚未完成的任务数 |
| `ReentrantReadWriteLock` | 高 16 位为读锁计数，低 16 位为写锁重入次数 |

### 3.2 获取与释放的骨架

​	以独占获取为例，整体流程如下：

```text
调用 lock / acquire
       │
       ├── tryAcquire 成功：立即返回
       │
       └── 失败：封装为等待节点，加入同步队列
                         │
                         └── 在合适时机 park，等待前驱释放资源后被 unpark
                                                       │
                                                       └── 再次调用 tryAcquire
```

`tryAcquire`、`tryRelease`、`tryAcquireShared`、`tryReleaseShared` 是由具体同步器实现的模板方法。AQS 不假定 `state` 的业务含义，因此不会替子类决定资源是否可用。

### 3.3 CAS 与可见性

CAS（Compare-And-Set）会在“当前值仍等于预期值”时原子更新状态。它避免了获取路径上为更新一个状态额外加互斥锁的需要，但 CAS 失败只表示发生了竞争，调用方通常需要重新读取状态并重试。

`state` 是 `volatile` 字段；锁的获取和释放还建立了必要的内存可见性关系。不要把这种机制简单理解为“CAS 永远无锁且更快”：高竞争下反复重试同样会消耗 CPU，而排队和挂起是 AQS 控制竞争的重要部分。

### 3.4 独占与共享

- **独占模式**：成功后仅一个线程持有资源，例如 `ReentrantLock` 的写入临界区。
- **共享模式**：多个线程可以同时成功；同步器依据状态决定还可允许多少个线程通过，例如 `Semaphore` 的许可和读锁。

共享模式的释放可能触发后续多个等待者继续尝试获取，这称为共享传播。它不表示所有等待线程都会无条件同时运行，能否继续通过仍由同步器的状态判断。

### 3.5 同步队列与条件队列

需要区分两类队列：

| 队列 | 用途 | 典型进入方式 |
|---|---|---|
| AQS 同步队列 | 等待锁或同步资源 | 获取失败后入队 |
| Condition 条件队列 | 等待某个业务条件 | 持锁线程调用 `await()` |

调用 `signal()` 时，节点会从条件队列转移到同步队列；它仍需重新竞争锁后，`await()` 才能返回。

---

## 4. 独占锁：ReentrantLock 与 Condition

### 4.1 ReentrantLock 的适用场景

​	`ReentrantLock` 是可重入的显式互斥锁。与 `synchronized` 相比，它提供可中断获取、定时尝试、公平策略和多个 `Condition` 等能力。若只需要简单、结构化的对象监视器同步，`synchronized` 往往更直接；需要这些额外控制能力时再选择 `ReentrantLock`。

```java
private final ReentrantLock lock = new ReentrantLock();
private int balance;

public void add(int amount) {
    lock.lock();
    try {
        balance += amount;
    } finally {
        lock.unlock();
    }
}
```

`unlock()` 必须放在 `finally` 中。遗漏释放会使后续线程长期等待；只有成功获取锁的线程才能释放该锁。

### 4.2 可重入与公平性

​	同一线程重复获取 `ReentrantLock` 时，内部重入计数递增；必须以相同次数调用 `unlock()`，计数归零后锁才真正释放。

```java
ReentrantLock fairLock = new ReentrantLock(true);
ReentrantLock nonfairLock = new ReentrantLock(false); // 默认策略
```

- 非公平锁会在合适时机直接尝试获取，通常吞吐量更高；它不保证等待顺序。
- 公平锁倾向于让先等待的线程先获得锁，能降低长期饥饿的概率，但也不能承诺严格的调度顺序，吞吐量通常较低。

除非业务确实要求等待顺序或需要避免个别线程长期得不到机会，优先使用默认的非公平锁，并通过压测验证。

### 4.3 `tryLock` 与可中断获取

​	当不能无限期等待锁时，使用超时或可中断版本：

```java
if (lock.tryLock(200, TimeUnit.MILLISECONDS)) {
    try {
        // 临界区
    } finally {
        lock.unlock();
    }
} else {
    // 降级、排队或返回繁忙状态
}
```

`lockInterruptibly()` 在等待锁时响应中断。捕获 `InterruptedException` 后，如当前方法不能继续传播异常，应恢复中断标记：`Thread.currentThread().interrupt()`；不要悄悄吞掉中断。

### 4.4 Condition：条件等待而非“睡眠”

​	一个锁可以创建多个 `Condition`，适合将不同等待条件分开管理。下面是有界队列中“非空”和“未满”两个条件的简化示例：

```java
final ReentrantLock lock = new ReentrantLock();
final Condition notEmpty = lock.newCondition();
final Condition notFull = lock.newCondition();

void put(Deque<String> queue, String value, int capacity) throws InterruptedException {
    lock.lockInterruptibly();
    try {
        while (queue.size() == capacity) {
            notFull.await();
        }
        queue.addLast(value);
        notEmpty.signal();
    } finally {
        lock.unlock();
    }
}
```

使用规则：

- 调用 `await()`、`signal()` 或 `signalAll()` 前必须持有对应的锁，否则抛出 `IllegalMonitorStateException`。
- 必须用 `while` 检查条件，而不是 `if`。线程可能出现虚假唤醒，也可能在被通知后再次竞争锁时条件已被其他线程改变。
- `await()` 会原子地释放当前锁并进入条件队列；返回前会重新获得该锁。
- 优先通知一个明确可继续执行的线程；无法判断或条件变化会让多个等待者受益时使用 `signalAll()`，并关注惊群效应。

---

## 5. 共享同步器：Semaphore 与 CountDownLatch

### 5.1 Semaphore：限制在途任务数

​	`Semaphore` 维护可用许可数。获取许可后才能进入受限区域，释放后其他等待者才有机会继续。

```java
private final Semaphore upstreamPermits = new Semaphore(20);

public Response callUpstream(Request request) throws InterruptedException {
    if (!upstreamPermits.tryAcquire(100, TimeUnit.MILLISECONDS)) {
        throw new RejectedExecutionException("上游服务繁忙");
    }
    try {
        return upstreamClient.call(request);
    } finally {
        upstreamPermits.release();
    }
}
```

工程上应注意：

- 许可应覆盖真正占用稀缺资源的时间段，例如外部调用的在途时间；不要过早 `release()`。
- 只要获取成功，就必须在 `finally` 中释放。`release()` 不校验调用线程是否曾获取许可，错误的重复释放会使许可数虚增。
- `Semaphore(20)` 约束的是最多 20 个在途调用，不约束每秒请求数。若上游还有速率限制，应叠加限流、超时、熔断和退避重试。
- 可以创建公平信号量，但高吞吐服务默认的非公平策略通常更合适；以实测为准。

### 5.2 CountDownLatch：一次性的完成信号

​	`CountDownLatch` 使一个或多个等待者在计数归零前阻塞。适合并行初始化、扇出任务汇总和测试中的起跑线协调。

```java
CountDownLatch latch = new CountDownLatch(3);
ExecutorService pool = Executors.newFixedThreadPool(3);

for (Runnable task : tasks) {
    pool.execute(() -> {
        try {
            task.run();
        } finally {
            latch.countDown();
        }
    });
}

if (!latch.await(3, TimeUnit.SECONDS)) {
    throw new TimeoutException("初始化任务未在规定时间内完成");
}
```

​	`countDown()` 递减到零后会释放等待者，之后继续调用不会使计数变为负数。它不能重置；若需要多轮阶段同步，应考虑 `CyclicBarrier` 或 `Phaser`。任务失败时是否仍然 `countDown()` 是业务决策，但一般应在 `finally` 中计数，并通过 `Future`、结果对象或错误收集机制把失败显式传递给汇总方，避免永久等待或把失败误当成功。

---

## 6. 阶段协作：CyclicBarrier

​	`CyclicBarrier` 让固定数量的参与线程在同一个阶段会合。最后一个到达的线程可以执行一个可选的屏障动作，随后所有线程进入下一阶段。

```java
CyclicBarrier barrier = new CyclicBarrier(3, () -> mergePartialResults());

// 每个工作线程完成本阶段后调用
barrier.await();
```

它与 `CountDownLatch` 的区别不在于“谁更高级”，而在于协作模型：

| 维度 | CountDownLatch | CyclicBarrier |
|---|---|---|
| 等待关系 | 等待一组事件完成 | 参与者相互等待 |
| 是否可复用 | 否 | 是，可进入下一轮 |
| 典型场景 | 初始化、任务汇总 | 分阶段计算、并行迭代 |
| 失败影响 | 等待可能超时 | 任一参与者中断、超时或异常会打破屏障 |

屏障被打破后，等待者会收到 `BrokenBarrierException`；应统一处理取消、重试或失败退出，而不是让部分线程继续使用上一轮的中间状态。

---

## 7. 读写同步：ReentrantReadWriteLock 与 StampedLock

### 7.1 ReentrantReadWriteLock

​	读写锁允许多个读操作并行，但写操作与所有读、写操作互斥。

| 当前持有 | 新读锁 | 新写锁 |
|---|---:|---:|
| 无锁 | 可以 | 可以 |
| 读锁 | 可以 | 不可以 |
| 写锁 | 不可以（其他线程） | 不可以（其他线程） |

适合读取明显多于写入、且临界区足够小的场景，例如本地只读配置快照、路由表或缓存索引。它不是性能开关：读写比例不高、临界区内有 I/O、或写入频繁时，维护读锁计数的开销可能不如普通锁。

```java
private final ReentrantReadWriteLock rw = new ReentrantReadWriteLock();
private final Map<String, String> routes = new HashMap<>();

public String routeOf(String key) {
    rw.readLock().lock();
    try {
        return routes.get(key);
    } finally {
        rw.readLock().unlock();
    }
}

public void refresh(Map<String, String> latest) {
    rw.writeLock().lock();
    try {
        routes.clear();
        routes.putAll(latest);
    } finally {
        rw.writeLock().unlock();
    }
}
```

​	内部 AQS `state` 的高 16 位记录共享读锁数量，低 16 位记录独占写锁的重入次数。读锁和写锁都可重入；写锁持有者可以再获取读锁，实现**锁降级**。不要在持有读锁时尝试获取写锁进行**锁升级**：多个读线程同时这样做可能互相等待，造成死锁。需要写入时，通常应释放读锁后重新竞争写锁，并重新校验数据。

### 7.2 StampedLock

​	`StampedLock` 提供写锁、悲观读锁和乐观读三种模式。乐观读不阻塞写线程，也不真正持有读锁；读取后必须校验时间戳。

```java
long stamp = lock.tryOptimisticRead();
int x = point.x;
int y = point.y;
if (!lock.validate(stamp)) {
    stamp = lock.readLock();
    try {
        x = point.x;
        y = point.y;
    } finally {
        lock.unlockRead(stamp);
    }
}
```

`StampedLock` 的使用边界很严格：

- 它**不可重入**，不要在已持有某种锁时再次获取同一种锁；
- 乐观读期间得到的是可能不一致的快照，校验失败必须按悲观读路径重新读取；
- 没有 `Condition` 支持；
- 使用 stamp 解锁，必须保证 stamp 与锁模式匹配；
- 只有经过性能分析，且读取很短、写入稀少并能安全重试时，乐观读才值得使用。

若只是保护普通共享状态，优先使用更容易审查的 `ReentrantReadWriteLock` 或不可变快照/原子引用方案。

---

## 8. LockSupport：阻塞与唤醒原语

​	`LockSupport` 提供 `park()` 和 `unpark(Thread)`，是 AQS 进行线程挂起和唤醒的底层工具之一。

```java
LockSupport.unpark(worker); // 可先于 park 调用
LockSupport.park();
```

​	每个线程可理解为拥有至多一个许可：`unpark` 会提供许可；后续一次 `park` 消耗许可并立即返回。多个连续的 `unpark` 不会累积多个许可。`park` 还可能因中断或虚假返回而结束，因此上层代码必须围绕状态条件循环判断，不能把一次返回直接等同于“条件已满足”。

​	业务代码通常不应直接以 `park/unpark` 实现锁；优先使用成熟的 JUC 组件。需要直接使用时，必须自行解决状态发布、丢失通知、取消、超时与中断处理。

---

## 9. 组件选择与工程实践

### 9.1 选择清单

```text
需要保护同一份 JVM 内可变状态？        ReentrantLock / synchronized
需要限制同时在途的资源使用？          Semaphore
需要等一批任务结束？                  CountDownLatch 或 CompletableFuture 组合
需要多线程在每轮会合？                CyclicBarrier（复杂阶段可考虑 Phaser）
读远多于写，且数据可由读写锁保护？      ReentrantReadWriteLock
读极多、写极少，且可接受重试？          StampedLock 乐观读
等待明确业务条件？                    Condition
跨 JVM 的全局互斥、限流或幂等？        分布式方案，不是本地 JUC 锁
```

### 9.2 常见故障与防线

| 风险 | 常见原因 | 防线 |
|---|---|---|
| 死锁 | 锁顺序不一致、读锁升级、在锁内调用未知代码 | 固定锁顺序；缩小临界区；使用超时诊断 |
| 锁泄漏 | 异常路径漏掉 `unlock` / `release` | `try/finally`；代码审查；监控等待时长 |
| 吞吐下降 | 临界区执行 I/O、锁粒度过粗、错误使用公平锁 | 锁内只做内存操作；拆分状态；压测 |
| 线程池耗尽 | 任务持锁等待远程 I/O 或无限等待 | 设置超时；隔离线程池；缩短持锁时间 |
| 条件等待失效 | `if` 替代 `while`、错误的通知对象 | 条件谓词由同一把锁保护；循环检查 |
| 多实例重复处理 | 把本地锁当作全局锁 | 设计幂等和分布式协调 |

### 9.3可观测性与排障

​	出现卡顿时，先确认线程是在等待锁、等待 I/O，还是线程池队列堆积。线程转储中可关注 `BLOCKED`、`WAITING`、`TIMED_WAITING` 状态，以及 `java.util.concurrent.locks` 相关栈帧。对关键锁可结合 `ReentrantLock` 的队列长度和持有状态查询能力做辅助观测，但这些方法得到的是瞬时估计，不应作为业务正确性判断依据。

---

## 10. 源码阅读路径

源码的目标是理解控制流和不变量，不是逐行记忆。建议先用断点观察两个线程竞争，再进入下列方法。

### 10.1 AQS 主线

1. 独占：`acquire` → `tryAcquire` → 入同步队列 → `park` → `release` → `tryRelease` → 唤醒后继节点。
2. 共享：`acquireShared` → `tryAcquireShared` → 入队等待 → `releaseShared` → `tryReleaseShared` → 共享传播。
3. 条件：`await` → 加入条件队列并完全释放锁 → `signal` 转移节点 → 同步队列重新获取锁。

不同 JDK 版本的内部节点类型和字段命名会变化，阅读时应抓住上述状态转换，而不是依赖某一版本的私有字段布局。

### 10.2 从具体类回到 AQS

| 类 | 先看什么 | 再回看 AQS 的什么 |
|---|---|---|
| `ReentrantLock` | `NonfairSync.lock`、`tryAcquire`、`tryRelease` | `acquire`、`release` |
| `Semaphore` | `nonfairTryAcquireShared`、`tryReleaseShared` | `acquireShared`、`releaseShared` |
| `CountDownLatch` | `await`、`countDown` | 共享获取与释放 |
| `ReentrantReadWriteLock` | `tryAcquire`、`tryAcquireShared`、计数拆分 | 独占与共享协同 |
| `ConditionObject` | `await`、`signal` | 条件队列与同步队列的转移 |

阅读时持续追问：当前状态是什么？失败线程在哪里等待？哪个操作改变了条件？唤醒后是否还必须重新竞争？这些问题比方法清单更能帮助理解实现。

---

## 结语

​	掌握 JUC 的标志不是能列举所有类，而是能把并发问题拆为资源所有权、状态变化、等待条件和失败边界：先明确需要保护什么，再选择最小且语义匹配的工具；先保证正确性和可观测性，再讨论吞吐优化。AQS 则提供了理解这些同步器的共同入口：状态、队列、阻塞、唤醒，以及独占和共享两种资源获取模型。
