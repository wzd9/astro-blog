---
title: 'Java 内存模型：可见性、happens-before 与内存屏障'
description: '说明 JMM 的共享变量访问语义、happens-before 规则、volatile、数据竞争、内存屏障及双重检查锁的安全发布。'
---

# Java 内存模型：可见性、happens-before 与内存屏障

本文面向 Java 并发代码的阅读、设计与复习，重点说明线程间共享变量的可见性和有序性保证，以及如何使用 happens-before（HB）关系分析代码。文中主内存、工作内存和屏障类型均为规范或教学层面的抽象，不应直接等同于某一硬件结构或固定机器指令。

## 1. JMM 解决什么问题

Java 内存模型（Java Memory Model，JMM）规定多线程程序如何访问共享变量，以及哪些同步动作可以在线程之间建立可见性和顺序保证。它约束 Java 编译器、JIT 编译器和处理器的优化，使并发程序具有明确的语言层语义。

并发正确性通常要分别考虑：

| 属性 | 要回答的问题 | 常用保障手段 |
| --- | --- | --- |
| 原子性 | 一个操作是否会被并发操作拆开或覆盖？ | 锁、原子类等 |
| 可见性 | 一个线程的写入能否被另一个线程观察到？ | `volatile`、锁、线程启动与等待等 |
| 有序性 | 多个操作之间是否存在不可破坏的顺序约束？ | HB 规则、锁、`volatile` 等 |

这些属性互有关联，但不能互相替代。例如，`volatile` 能提供可见性和特定的有序性语义，却不使 `count++` 成为原子操作。

## 2. 主内存与工作内存的抽象

JMM 以主内存和工作内存描述共享变量：主内存表示线程共享变量的逻辑存储，工作内存表示线程使用这些变量时的本地状态。线程间的读写通过 JMM 规定的同步动作协调。

这是规范模型，不能简单解释成“主内存就是 RAM，工作内存就是 CPU 缓存”。真实 JVM 和处理器的缓存层次、编译优化及内存访问机制更复杂。

### 2.1 普通变量的可见性

```java
public class VisibilityDemo {
    private static boolean running = true;

    public static void main(String[] args) throws InterruptedException {
        Thread worker = new Thread(() -> {
            while (running) {
                // busy loop
            }
            System.out.println("Worker stopped");
        });

        worker.start();
        Thread.sleep(1000);
        running = false;
    }
}
```

`running` 是被多个线程访问的普通变量，且访问之间没有同步关系。主线程写入 `false` 不构成工作线程必然观察到该写入的保证；不能依靠一次运行结果判断程序正确性。应使用 `volatile`、锁或其他明确的线程间协调机制。

在循环中增加 `println` 可能改变调度和执行时序，但不能将普通变量变成有可靠可见性保证的变量。调试输出不是同步方案。

## 3. `volatile` 的语义与边界

```java
private static volatile boolean running = true;
```

线程对 `volatile` 变量的写与后续读具有 JMM 规定的同步语义。若工作线程读到主线程写入的 `false`，循环便能根据该值退出。`volatile` 还可以发布写线程在 volatile 写之前完成的操作，并对相关内存操作施加顺序约束。

主要保证：

1. **可见性**：对 volatile 变量的写，对随后读取该变量并观察到该写的线程可见。
2. **有序性**：volatile 读写参与同步顺序，限制相关操作的重排序。
3. **不保证复合操作原子性**：`count++` 包含读取、计算和写回，多个线程并发执行仍可能丢失更新。

```java
private volatile int count;

void increment() {
    count++; // 不是原子操作
}
```

需要原子递增时，可使用 `AtomicInteger`、锁或其他适合场景的并发工具。

## 4. Happens-before 规则

若操作 A happens-before 操作 B，记为 `A →HB B`。这表示 A 的效果对 B 具有可见性保证，并且执行结果遵循该顺序约束。HB 不等同于墙上时钟上的先后，也不要求所有操作都能比较顺序。

### 4.1 程序顺序

同一线程中，按程序顺序排列的操作具有 HB 关系。编译器和处理器仍可进行不改变允许观察结果的优化，因此这不表示机器指令必须逐条按源码顺序执行。

### 4.2 `volatile` 变量规则

对某个 volatile 变量的写，HB 于后续对同一变量的读（该读观察到相应写入时）。

```java
// 线程 A
int data = 42;
flag = true; // volatile

// 线程 B
if (flag) {  // 读到 true
    System.out.println(data);
}
```

线程 A 的 `data = 42` 程序顺序先于 volatile 写；volatile 写 HB 于线程 B 读到它的 volatile 读；该读又程序顺序先于 `data` 的读取。根据传递性，线程 B 可以看到发布前的 `data = 42`。

### 4.3 监视器锁规则

对同一把锁的解锁，HB 于后续对该锁的加锁。锁保护的数据可通过这条关系在线程间发布。

```java
// 线程 A
synchronized (lock) {
    data = 42;
}

// 线程 B
synchronized (lock) {
    System.out.println(data);
}
```

必须是同一个锁对象；使用不同锁不能建立这条锁规则。

### 4.4 线程启动与终止

- 对线程调用 `start()` 之前的操作，HB 于该线程中的所有操作。
- 线程中的所有操作，HB 于其他线程成功检测到该线程终止之后的操作；例如 `join()` 正常返回后。

```java
int[] result = new int[1];
Thread t = new Thread(() -> result[0] = 42);
t.start();
t.join();
System.out.println(result[0]); // 可见线程 t 的写入
```

### 4.5 传递性

若 `A →HB B` 且 `B →HB C`，则 `A →HB C`。分析跨线程可见性时，通常需要将程序顺序边和同步边连接起来，再使用传递性推导。

## 5. HB 推导示例：volatile 写前后的操作

```java
// 线程 T1
a = 1;
flag = true; // volatile
a = 2;

// 线程 T2
if (flag) {  // 假设读到 T1 写入的 true
    int x = a;
}
```

线程 T1 的顺序为 `a = 1 → flag 写 → a = 2`；线程 T2 的顺序为 `flag 读 → 读 a`。若 T2 读到该 volatile 写，则有从 `a = 1` 经 volatile 写、volatile 读到 `读 a` 的 HB 路径。因此 `a = 1` 被发布。

`a = 2` 位于 volatile 写之后，不能通过这条发布路径推出它 HB 于 T2 的 `读 a`。由于 `a` 的并发访问存在数据竞争，不能据此断言 T2 必须读到某个指定值。正确做法是让共享状态本身受到同步保护，而不是依赖未同步普通变量的观察结果。

### 推导步骤

1. 分别列出每个线程内的程序顺序。
2. 找出实际发生的同步动作，如 volatile 读写、同一锁的解锁与加锁、`start()`、`join()`。
3. 只按适用规则建立跨线程 HB 边。
4. 使用传递性连接路径。
5. 检查目标写入是否存在到目标读取的 HB 路径；没有路径就不能声称该读取获得了可见性保证。
6. 检查是否存在数据竞争，并避免依赖其结果。

## 6. 内存屏障

内存屏障（memory barrier/fence）是编译器和处理器实现内存访问顺序约束的机制之一。JMM 定义语言层面的语义，JVM 根据目标平台通过编译约束、硬件指令或其他机制实现这些语义。

常见教学模型中的屏障名称如下：

| 屏障 | 概念上的约束 |
| --- | --- |
| LoadLoad | 屏障前的读先于屏障后的读 |
| StoreStore | 屏障前的写先于屏障后的写 |
| LoadStore | 屏障前的读先于屏障后的写 |
| StoreLoad | 屏障前的写先于屏障后的读 |

具体 JVM 和 CPU 不一定逐条插入这四种固定指令。实现会随架构和编译优化而异。屏障也不等于锁：屏障本身不提供互斥，也不自动使复合操作原子化。

## 7. 双重检查锁与安全发布

双重检查锁（DCL）常用于延迟初始化单例。实例引用应声明为 `volatile`：

```java
public final class Singleton {
    private static volatile Singleton instance;

    public static Singleton getInstance() {
        if (instance == null) {
            synchronized (Singleton.class) {
                if (instance == null) {
                    instance = new Singleton();
                }
            }
        }
        return instance;
    }
}
```

对象构造和引用发布必须满足正确的顺序。若缺少必要的排序保证，其他线程可能在对象状态完成初始化之前观察到非空引用。volatile 引用提供此处需要的可见性和有序性语义，避免不安全发布。

实际项目中也可考虑静态内部类初始化等实现方式。选择方案时，应结合初始化时机、异常处理及依赖注入需求。

## 8. 常见概念对照

| 概念 | 提供的语义 | 不代表 |
| --- | --- | --- |
| JMM | 多线程内存访问规则 | 一块物理内存 |
| 可见性 | 对写入的观察保证 | 操作原子性 |
| 有序性 | 操作间的顺序约束 | 机器指令必须按源码逐条执行 |
| happens-before | 可见性与顺序保证的推导关系 | 简单的现实时间先后 |
| `volatile` | 可见性和特定顺序保证 | `count++` 原子化 |
| `synchronized` | 互斥及同一锁上的 HB 关系 | 不同锁之间自动同步 |
| 内存屏障 | 实现层的内存访问约束机制 | 互斥锁 |


## 9. 术语速查

| 术语 | 含义 |
| --- | --- |
| JMM | Java Memory Model，Java 内存模型 |
| HB | happens-before，先行发生关系 |
| visibility | 可见性，一个线程对写入的观察保证 |
| reordering | 重排序，编译器或处理器对操作顺序的调整 |
| memory barrier / fence | 内存屏障，用于实现内存顺序约束的机制 |
| data race | 数据竞争，对同一变量的并发访问中至少一个为写且缺少适当同步 |
