---
title: 'Java 进阶'
description: 'Java 虚拟机与并发机制的进阶技术文档目录。'
---

# Java 进阶

本目录整理 Java 虚拟机与并发机制相关的原理说明，便于按主题查阅和复习。

- [JVM 内存区域](/docs/java/advanced/jvm-memory/) —— 运行时数据区与各类内存溢出异常
- [Java 内存模型：可见性、happens-before 与内存屏障](/docs/java/advanced/jmm-happens-before/) —— JMM、volatile、HB 推导与安全发布
- [Java synchronized 底层原理](/docs/java/advanced/synchronized/) —— 锁对象、Monitor、字节码与同步语义
- [ReentrantLock 与 Condition：状态变化与队列流转](/docs/java/advanced/reentrant-lock-condition-internals/) —— 重入状态、await/signal 与 AQS 队列转换
- [ThreadPoolExecutor：任务调度、线程回收与拒绝策略](/docs/java/advanced/thread-pool-executor-internals/) —— 任务提交、Worker 生命周期、关闭流程与拒绝策略
