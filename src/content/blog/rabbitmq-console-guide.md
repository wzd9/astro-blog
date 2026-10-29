---
title: 'RabbitMQ 控制台操作指南'
description: 'RabbitMQ Management 控制台各页面字段详解：Overview、Connections、Channels、Exchanges、Queues 与 Admin 用户角色。'
pubDate: '2026-10-29'
tags: ['RabbitMQ', '消息队列', '中间件']
heroImage: '/src/assets/泰山日出.jpg'
---

RabbitMQ 自带的 Management 控制台是日常排查消息问题的第一入口。这篇把控制台各页面的字段含义整理一遍，顺便记录交换机、队列的创建操作。

## 1、Overview 概述

### 1.1、Totals 总计

![Totals](/images/blog/rabbitmq-console-guide/Totals.png)

| 字段                 | 含义                                            |
| -------------------- | ----------------------------------------------- |
| Ready                | 待消费的消息总数                                |
| Unacked              | 待应答的消息总数                                |
| Total                | 总数 Ready + Unacked                            |
| Publish              | producer pub 消息的速率                         |
| Publisher confirm    | broker 确认 pub 消息的速率                      |
| Deliver (manual ack) | consumer 手动确认的速率                         |
| Deliver (auto ack)   | consumer 自动确认的速率                         |
| Consumer ack         | consumer 正在确认的速率                         |
| Redelivered          | 正在传递 'redelivered' 标志集的消息的速率       |
| Get (manual ack)     | 响应 basic.get 而发送要求确认的消息的传输速率   |
| Get (auto ack)       | 响应 basic.get 而发送不需要确认的消息的传输速率 |
| Return               | 将 basic.return 发送给 producer 的速率          |
| Disk read            | queue 从磁盘读取消息的速率                      |
| Disk write           | queue 将消息写入磁盘的速率                      |
| Connections          | client 的 tcp 连接的总数                        |
| Channels             | 通道总数                                        |
| Exchanges            | 交换机总数                                      |
| Queues               | 队列总数                                        |
| Consumers            | 消费者的总数                                    |

### 1.2、Nodes 节点

![nodes](/images/blog/rabbitmq-console-guide/nodes.png)

启动一个 broker 都会产生一个 node。

| 字段               | 含义                                                                               |
| ------------------ | ---------------------------------------------------------------------------------- |
| Name               | broker 名称                                                                        |
| File descriptors   | broker 打开的文件描述符数量和限制                                                  |
| Socket descriptors | broker 管理的网络套接字数量和限制。当限制被耗尽时，RabbitMQ 将停止接收新的网络连接 |
| Erlang processes   | Erlang 启动的进程数                                                                |
| Memory             | 当前 broker 占用的内存                                                             |
| Disk space         | 当前 broker 占用的硬盘                                                             |
| Uptime             | 当前 broker 持续运行时长                                                           |
| Info               | 未知                                                                               |
| Reset stats        | 未知                                                                               |

## 2、Connections：当前所有客户端活动的连接，包括生产者和消费者

![connections](/images/blog/rabbitmq-console-guide/connections.png)

| 字段         | 含义                                    |
| ------------ | --------------------------------------- |
| Virtual host | 所属的虚拟主机                          |
| Name         | 名称                                    |
| User name    | 使用的用户名                            |
| State        | 当前的状态，running：运行中；idle：空闲 |
| SSL/TLS      | 是否使用 ssl 进行连接                   |
| Protocol     | 使用的协议                              |
| Channels     | 创建的 channel 的总数                   |
| From client  | 每秒发出的数据包                        |
| To client    | 每秒接收到的数据包                      |

## 3、Channels：当前连接所有创建的通道

![channels](/images/blog/rabbitmq-console-guide/channels.png)

| 字段         | 含义                                                                         |
| ------------ | ---------------------------------------------------------------------------- |
| Channel      | 名称                                                                         |
| Virtual host | 所属的虚拟主机                                                               |
| User name    | 使用的用户名                                                                 |
| Mode         | 渠道保证模式。可以是以下之一，或者不是：C：confirm；T：transactional（事务） |
| State        | 当前的状态，running：运行中；idle：空闲                                      |
| Unconfirmed  | 待 confirm 的消息总数                                                        |
| Prefetch     | 设置的 prefetch 的个数                                                       |
| Unacked      | 待 ack 的消息总数                                                            |
| Publish      | producer pub 消息的速率                                                      |
| Confirm      | producer confirm 消息的速率                                                  |
| Deliver/get  | consumer 获取消息的速率                                                      |
| Ack          | consumer ack 消息的速率                                                      |

## 4、Exchanges 交换机

![exchange](/images/blog/rabbitmq-console-guide/exchange.png)

| 字段             | 含义                                                                                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Virtual host     | 所属的虚拟主机                                                                                                                                       |
| Name             | 名称                                                                                                                                                 |
| Type             | exchange type                                                                                                                                        |
| Features         | 功能。可以是以下之一，或者不是：D：持久化；T：Internal，存在该功能表示这个 exchange 不可以被 client 用来推送消息，仅用来进行 exchange 和 exchange 之间的绑定，否则可以推送也可以绑定 |
| Message rate in  | 消息进入的速率                                                                                                                                       |
| Message rate out | 消息出去的速率                                                                                                                                       |

### 4.1、Add a new exchange

![add exchange](/images/blog/rabbitmq-console-guide/add-exchange.png)

| 字段         | 含义                                                              |
| ------------ | ----------------------------------------------------------------- |
| Virtual host | 所属的虚拟主机                                                    |
| Name         | 交换机名字                                                        |
| Type         | 交换机类型选择，默认 direct 直连模式，fanout 路由模式，topic 模式 |
| Durability   | 是否需要持久化，true 为持久化                                     |
| Auto Delete  | 当最后一个绑定到 Exchange 上的队列删除后，自动删除该 Exchange     |
| Internal     | 当前 Exchange 是否用于 RabbitMQ 内部使用，默认为 false            |
| Arguments    | 扩展参数，用于扩展 AMQP 协议，定制化使用                          |

### 4.2、交换机类型

```text
Direct exchange (amq.direct)：直连交换机
Fanout exchange (amq.fanout)：扇形交换机（广播）
Headers exchange (amq.match)：头交换机
Topic exchange (amq.topic)：主题交换机
```

## 5、Queues 队列

![queue](/images/blog/rabbitmq-console-guide/queue.png)

| 字段        | 含义                                       |
| ----------- | ------------------------------------------ |
| Virtual host | 所属的虚拟主机                            |
| Name        | 名称                                       |
| Features    | 功能。可以是以下之一，或者不是：D：持久化  |
| State       | 当前的状态，running：运行中；idle：空闲    |
| Ready       | 待消费的消息总数                           |
| Unacked     | 待应答的消息总数                           |
| Total       | 总数 Ready + Unacked                       |
| Incoming    | 消息进入的速率                             |
| Deliver/get | 消息获取的速率                             |
| Ack         | 消息应答的速率                             |

### 5.1、创建队列 Queue

![add queue](/images/blog/rabbitmq-console-guide/add-queue.png)

| 字段        | 含义                                                                 |
| ----------- | -------------------------------------------------------------------- |
| Type        | 此 queue 的类型，默认为 classic 主队列，也可以设置为 quorum 从队列   |
| Name        | 此 queue 的名称                                                      |
| Durability  | queue 中的消息是否要持久化到硬盘                                     |
| Auto delete | 如果此 queue 没有绑定到任何一个 exchange，是否自动删除此 queue       |
| Arguments   | 设置一些其它参数                                                     |

## 6、Admin

![admin](/images/blog/rabbitmq-console-guide/admin.png)

| 字段                     | 含义                   |
| ------------------------ | ---------------------- |
| Name                     | 名称                   |
| Tags                     | 角色标签，只能选取一个 |
| Can access virtual hosts | 允许进入的 vhost       |
| Has password             | 设置了密码             |

角色标签：

| 角色          | 说明                                                                                   |
| ------------- | -------------------------------------------------------------------------------------- |
| administrator | 超级管理员。可登陆管理控制台；可查看所有的信息，并且可以对用户、策略（policy）进行操作 |
| monitoring    | 监控者。可登陆管理控制台；同时可以查看 RabbitMQ 节点的相关信息                         |
| policymaker   | 策略制定者。可登陆管理控制台；同时可以对 policy 进行管理                               |
| management    | 普通管理者。仅可登陆管理控制台，无法看到节点信息，也无法对策略进行管理                 |
| none          | 其他。无法登录控制台，通常就是普通的生产者和消费者                                     |
