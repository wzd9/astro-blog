---
title: 'Java synchronized：监视器、字节码与同步语义'
description: '系统说明 synchronized 的锁对象、Monitor、字节码表示、可重入性、锁优化，以及它与 JMM happens-before 的关系。'
---

# Java synchronized：监视器、字节码与同步语义

本文从 Java 语言语义、JVM 字节码与运行时、JMM 三个层面说明 `synchronized`。内容覆盖锁对象判定、对象监视器、`wait`/`notify`、可重入性、锁竞争与优化，以及同步操作建立的 happens-before 关系，可用于并发代码分析与知识复习。

## 1. synchronized 的作用

`synchronized` 是 Java 内置同步机制，主要提供：

-   **互斥性**：同一时刻，只有一个线程能持有同一个对象监视器。
-   **可见性**：线程释放锁前的写入，对随后成功获取同一把锁的线程可见。
-   **有序性**：通过锁的同步语义建立 happens-before 关系，约束相关内存操作。

``` java
public class Counter {
    private int count;

    public synchronized void increment() {
        count++;
    }

    public synchronized int getCount() {
        return count;
    }
}
```

多个线程调用同一个 `Counter` 实例的同步方法时，会竞争同一个对象监视器。因此，`count++` 在该临界区内不会被持有同一把锁的其他线程并发执行。

## 2. 三种使用形式与锁对象

### 2.1 实例同步方法

``` java
public synchronized void method() {
    // 临界区
}
```

锁对象是当前实例 `this`。概念上等价于：

``` java
public void method() {
    synchronized (this) {
        // 临界区
    }
}
```

### 2.2 静态同步方法

``` java
public static synchronized void method() {
    // 临界区
}
```
锁对象是当前类对应的 `Class` 对象，概念上等价于：

``` java
public static void method() {
    synchronized (MyClass.class) {
        // 临界区
    }
}
```

### 2.3 同步代码块

``` java
synchronized (lock) {
    // 临界区
}
```
括号中的表达式会在运行时求值，其结果对象就是这段代码的锁。三种写法对应的锁对象如下：

| 同步形式 | 实际锁对象 | 互斥范围 |
| --- | --- | --- |
| 实例同步方法 | 当前实例 `this` | 同一实例上使用该锁的同步代码 |
| 静态同步方法 | 当前类的 `Class` 对象 | 使用同一个 `Class` 锁的同步代码 |
| `synchronized (obj)` | 表达式 `obj` 求值所得的对象 | 使用同一对象作为锁的同步代码 |

判断两段代码是否互斥，只需比较它们运行时使用的锁对象是否为同一个对象；都写了 `synchronized` 并不足以保证互斥。

例如，实例同步方法锁住 `this`，而 `synchronized (lock)` 锁住 `lock`。只有当 `lock == this` 时，这两段代码才竞争同一把锁。

## 3. 底层核心：Monitor（对象监视器）

从 JVM 语义模型看，`synchronized` 依赖对象监视器（Monitor）实现同步。基本过程如下：

1.  线程进入同步区域前，尝试获取对应对象的 Monitor。
2.  获取成功后，该线程成为 Monitor 的所有者（Owner）。
3.  其他线程无法同时持有同一个 Monitor，需要等待或参与后续竞争。
4.  持锁线程退出同步区域时释放 Monitor。
5.  其他竞争线程才有机会获得锁。
| 阶段 | 线程 A | 对象 `obj` 的 Monitor | 线程 B |
| --- | --- | --- | --- |
| 1. 竞争 | 请求加锁 | 尚未被占用 | 请求加锁 |
| 2. 获取 | 获取成功，进入临界区 | Owner 为线程 A | 未获得锁，等待后续竞争 |
| 3. 释放 | 退出临界区并释放锁 | 锁变为可竞争状态 | 等待 |
| 4. 后续竞争 | 已退出同步区 | 接受后续加锁请求 | 尝试获取锁 |

这是帮助理解同步语义的抽象模型。Monitor 的具体数据结构、竞争队列、阻塞和唤醒策略属于 JVM 实现细节，会随 JVM 版本和平台变化。

### 3.1 Owner、Entry Set 与 Wait Set

常见的 Monitor 概念模型包含：

-   **Owner**：当前持有 Monitor 的线程。
-   **Entry Set / 竞争队列**：等待竞争 Monitor 的线程。
-   **Wait Set**：调用 `Object.wait()` 后进入该对象等待集合的线程。

要区分两种情况：

-   线程获取锁失败，属于锁竞争。
-   线程持锁后调用 `wait()`，主动释放该对象监视器并进入等待集合。

普通锁竞争失败不会自动进入 `wait()` 的 Wait Set。

### 3.2 wait() 与 notify()

``` java
synchronized (lock) {
    lock.wait();
}
```

调用 `wait()`的线程必须已经持有该对象的监视器。调用后，它会释放该对象监视器并进入该对象的等待集合。

另一个线程可以在同步区域内调用：

``` java
synchronized (lock) {
    lock.notify();    // 通知一个等待线程
    // lock.notifyAll(); // 通知所有等待线程
}
```

被通知的线程**不会在 notify
调用点立即获得锁**。它需要等待通知线程退出同步区域、释放锁，然后重新竞争锁。成功获得锁后，`wait()`
才能返回。

## 4. 字节码：monitorenter、monitorexit 与 ACC_SYNCHRONIZED

### 4.1 同步代码块
``` java
public void test() {
    synchronized (lock) {
        work();
    }
}
```

同步代码块在字节码层面通常使用：

-   `monitorenter`：尝试进入对象监视器。
-   `monitorexit`：退出对象监视器。

编译器还需要生成异常处理路径，确保同步区域正常结束或抛出异常时都能释放锁。因此在字节码中可能看到多个 `monitorexit`，分别对应正常路径和异常路径。

可以把它概念化为：

``` java
monitorEnter(lock);
try {
    work();
} finally {
    monitorExit(lock);
}
```

这只是解释控制流的伪代码，不是源码层面的直接替换。

### 4.2 同步方法

同步实例方法和同步静态方法通常不会在方法体中看到显式的 `monitorenter` / `monitorexit` 配对，而是在 class 文件的方法访问标志中带有 `ACC_SYNCHRONIZED`。

JVM 根据该标记，在方法调用和返回过程中执行对应的监视器获取与释放语义。

| 同步形式 | 字节码层面的典型表现 |
| --- | --- |
| 同步代码块 | `monitorenter` / `monitorexit` |
| 同步实例方法 | `ACC_SYNCHRONIZED`，锁对象为 `this` |
| 同步静态方法 | `ACC_SYNCHRONIZED`，锁对象为对应 `Class` 对象 |

## 5. synchronized 是可重入锁

可重入指：一个线程已经持有某把锁时，可以再次获取同一把锁，而不会把自己阻塞住。

``` java
public class ReentrantDemo {

    public synchronized void methodA() {
        methodB();
    }

    public synchronized void methodB() {
        System.out.println("methodB");
    }
}
```

执行过程：

1.  线程进入 `methodA()`，获取 `this` 的监视器。
2.  `methodA()` 调用 `methodB()`。
3.  `methodB()` 也需要获取 `this` 的监视器。
4.  当前线程已经持有该监视器，因此可以再次进入。
5.  `methodB()` 返回后，退出一层同步调用。
6.  `methodA()` 结束后，最终释放该线程持有的监视器。

可以把它理解为 Monitor 记录了持有者和可重入层数（或等价状态）。只有匹配的退出操作完成后，锁才真正释放给其他线程竞争。

**可重入只允许同一个持锁线程重复获取同一把锁，不意味着不同线程可以同时进入临界区。**

## 6. 锁优化与锁状态

`synchronized` 的 Java 语义是确定的，但 JVM 可以根据竞争情况和运行环境选择不同实现路径，以减少同步开销。常见讨论包括：

-   无竞争或低竞争时的快速路径；
-   轻量级锁相关实现；
-   竞争加剧时的锁膨胀（Inflation）；
-   自旋、阻塞等降低或处理竞争成本的策略。

不要把锁状态理解成固定不变的四阶段流程。一些资料使用“无锁、偏向锁、轻量级锁、重量级锁”进行教学，但具体对象头布局和锁策略与 JDK 版本、JVM 实现有关：

-   偏向锁在较新的 JDK 中已被弃用，并在后续版本中移除。
-   轻量级锁的实现也随 HotSpot 版本演进。
-   不能假定每次加锁都严格按"无锁 → 偏向锁 → 轻量级锁 → 重量级锁"升级。
-   某个版本的 Mark Word 位布局不是所有 JVM 的通用规范。

学习时应先掌握稳定的同步语义，再研究特定 JVM 版本的对象头和锁优化。

### 6.1 锁膨胀的直观理解

当快速路径无法高效处理竞争时，JVM 可能将对象锁膨胀为更完整的 Monitor 竞争机制。竞争线程可能被阻塞，持锁线程释放锁后，等待线程再参与竞争。

但“发生竞争就一定立即阻塞”并不准确。是否自旋、何时阻塞、如何唤醒，取决于 JVM 实现和运行环境。

## 7. synchronized 与 JMM：happens-before

JMM 的监视器锁规则：

> 对一个锁的解锁（unlock），happens-before
> 于后续对同一个锁的加锁（lock）。

示例：

``` java
class SharedData {
    private int value = 0;
    private final Object lock = new Object();

    public void write() {
        synchronized (lock) {
            value = 42;
        }
    }

    public int read() {
        synchronized (lock) {
            return value;
        }
    }
}
```

假设线程 A 执行 `write()` 并释放 `lock`，随后线程 B 成功获取同一个 `lock` 并执行 `read()`：

| 顺序 | 线程 A | happens-before 边 | 线程 B |
| --- | --- | --- | --- |
| 1 | 写入 `value = 42` |  |  |
| 2 | 退出同步块，执行 `unlock(lock)` | 解锁先行于后续对同一把锁的加锁 |  |
| 3 |  | `unlock(lock) →HB lock(lock)` | 获取 `lock`，进入同步块 |
| 4 |  |  | 读取 `value`，可以观察到 `42` |

线程 B 可以看到线程 A 在释放锁之前完成的写入。

### 7.1 必须是同一把锁

下面的代码不能仅凭监视器锁规则建立 HB：

``` java
// 线程 A
synchronized (lockA) {
    value = 42;
}

// 线程 B
synchronized (lockB) {
    System.out.println(value);
}
```

如果 `lockA` 和 `lockB` 不是同一个对象，就不能推导出 A 的解锁 happens-before B 的加锁。

**"都使用 synchronized"不够，必须确认锁对象相同。**

## 8. synchronized 与 volatile 对比

| 对比项 | `synchronized` | `volatile` |
| --- | --- | --- |
| 互斥 | 支持 | 不支持 |
| 可见性 | 支持；通过同一锁的解锁与后续加锁建立关系 | 支持；针对 volatile 变量的读写 |
| 有序性 | 通过锁同步语义建立约束 | 对 volatile 读写提供特定排序保证 |
| 复合操作原子性 | 可将临界区内的复合操作作为整体保护 | 不保证，例如 `count++` |
| 竞争行为 | 可能经过快速路径、自旋或阻塞 | 读写本身不获取互斥锁 |
| 典型场景 | 保护多个操作组成的临界区 | 状态标志、安全发布等 |

``` java
volatile int count = 0;

void increment() {
    count++; // 读、加、写，不是一个原子整体
}
```

如果多个线程需要安全执行 `count++`，可以使用：

``` java
synchronized (this) {
    count++;
}
```

也可以根据场景使用 `AtomicInteger` 等并发工具。

## 9. 常见理解误区

| 常见说法 | 正确理解 |
| --- | --- |
| 实例同步方法锁住整个类 | 实例方法锁 `this`；静态方法锁对应的 `Class` 对象 |
| 两个方法都加了 `synchronized` 就一定互斥 | 只有运行时使用同一个锁对象才互斥 |
| `notify()` 后，被通知线程立即获得锁 | 通知线程释放锁后，被通知线程还要重新竞争 |
| 锁竞争失败的线程进入 Wait Set | Wait Set 由持锁线程调用 `Object.wait()` 进入；普通竞争是另一种状态 |
| `synchronized` 只保证互斥，不保证可见性 | 同一把锁的解锁 happens-before 后续加锁 |
| `synchronized` 一定是重量级锁，性能很差 | JVM 有多种实现优化路径；性能判断应基于测量 |

## 10. 分析 synchronized 代码的固定步骤

看到一段含 `synchronized` 的代码，按以下顺序分析：

1.  **找锁对象**：实例方法是 `this`，静态方法是 `Class` 对象，代码块看括号中的对象。
2.  **判断锁是否相同**：比较运行时对象身份，而不是变量名或关键字。
3.  **找临界区**：确定哪些代码在获得锁后执行。
4.  **判断线程竞争**：哪些线程可能同时请求同一个 Monitor？
5.  **分析可重入**：是否由持锁线程再次进入同一把锁？
6.  **分析释放路径**：正常返回和异常退出时是否都能释放锁？
7.  **推导 HB**：是否存在同一把锁的 unlock → 后续 lock？
8.  **区分规范与实现**：Java 同步语义是规范；字节码和锁优化属于 JVM 实现层。

## 11. 自测题

### 题目 1：两个实例是否互斥？

``` java
class Demo {
    public synchronized void print() {
        System.out.println("hello");
    }
}

Demo a = new Demo();
Demo b = new Demo();

// 线程 A 调用 a.print()
// 线程 B 调用 b.print()
```

**参考答案：** 不互斥。`a` 和 `b` 是不同实例，实例同步方法分别锁住各自的
`this`。

### 题目 2：实例同步方法与 synchronized(this) 是否互斥？

``` java
class Demo {
    public synchronized void methodA() {}

    public void methodB() {
        synchronized (this) {}
    }
}
```

**参考答案：** 同一个实例上会互斥，因为两处使用的是同一个 `this`
对象监视器。

### 题目 3：静态同步方法与实例同步方法是否互斥？

``` java
class Demo {
    public synchronized void instanceMethod() {}
    public static synchronized void staticMethod() {}
}
```

**参考答案：** 不会仅凭这两个 synchronized
建立互斥。一个锁实例对象，一个锁 `Demo.class`。

### 题目 4：notify 后，被通知线程能否马上执行？

**参考答案：**
不能保证。被通知线程需要等当前持锁线程释放锁，再重新竞争；获得锁后
`wait()` 才能返回。

### 题目 5：为什么 synchronized 能保证可见性？

**参考答案：** 同一监视器的 unlock happens-before 后续
lock。释放锁前的写入通过这条 HB 关系对后续获取同一把锁的线程可见。

## 12. 知识结构图

| 分析层次 | 核心内容 |
| --- | --- |
| 使用形式 | 实例同步方法锁 `this`；静态同步方法锁 `Class` 对象；同步代码块锁指定对象 |
| JVM 语义 | Monitor、Owner、竞争线程；调用 `wait()` 的线程进入 Wait Set |
| 字节码 | 同步代码块使用 `monitorenter` / `monitorexit`；同步方法带 `ACC_SYNCHRONIZED` |
| 锁特性 | 互斥、可重入，以及与竞争相关的实现优化 |
| JMM | 同一把锁的 `unlock` happens-before 后续 `lock`，提供可见性和有序性保证 |

## 13. 最终总结

理解 `synchronized` 时，可以分成三个层次：

1.  **Java 语言层**：提供互斥同步语义，支持实例同步方法、静态同步方法和同步代码块。
2.  **JVM 字节码与运行时层**：同步代码块对应 `monitorenter` / `monitorexit`，同步方法使用 `ACC_SYNCHRONIZED`；运行时通过对象监视器实现同步语义。
3.  **JMM 层**：同一把锁的解锁 happens-before 后续加锁，因此 `synchronized` 同时提供互斥、可见性和有序性保证。

**一句话记忆：`synchronized` 的核心不是某一种固定的锁实现，而是基于对象监视器提供互斥和同步语义；JVM 可以优化实现，但不能破坏 Java 规定的同步行为。**
