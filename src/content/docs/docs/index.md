---
title: 技术文档
description: 我的技术文档首页，涵盖 Java、数据库、中间件与运维监控四大方向
---

# 欢迎

这里是我的技术文档，主要整理日常开发和运维中沉淀下来的手册、教程与备忘资料，方便自己查阅，也希望能帮到有需要的人。

## 文档分类

### ☕ Java

Java 后端开发相关的概念、框架与构建工具：

- [Java 简介](/docs/java/) —— 技术体系、JDK 版本选择与学习路线
- [Java 基础](/docs/java/basics/) —— 集合框架、异常、泛型、新特性
- [Spring Boot](/docs/java/spring-boot/) —— 快速上手、常用注解与配置
- [Maven](/docs/java/maven/) —— 依赖管理、常用命令与镜像配置
- [Maven 私服（Nexus）](/docs/java/maven-nexus/) —— Nexus 私服安装、配置与依赖上传
- [JVM 内存区域](/docs/java/jvm-memory/) —— 运行时数据区与各类内存溢出异常
- [SpringBoot 可扩展接口](/docs/java/springboot-extensions/) —— 各扩展点使用场景与调用顺序

### 🗄️ 数据库

- [Redis 入门](/docs/database/redis-basics/) —— 数据类型、常用命令与持久化
- [MySQL EXPLAIN 解析](/docs/database/mysql-explain/) —— 执行计划分析与索引优化
- [MySQL8 用户权限](/docs/database/mysql8-privileges/) —— 创建用户、授权与远程访问
- [CentOS8 安装 MySQL](/docs/database/centos8-mysql/) —— rpm-bundle 方式安装 MySQL 8

### 📦 中间件

- [Docker 入门](/docs/middleware/docker-tutorial/) —— 核心概念与常用命令
- [Docker 安装 MySQL](/docs/middleware/docker-mysql/)
- [Docker 启动 Redis](/docs/middleware/docker-redis/)
- [Docker 安装 Nginx](/docs/middleware/docker-nginx/)
- [Docker 安装 Nacos](/docs/middleware/docker-nacos/)
- [Docker 安装 ZooKeeper](/docs/middleware/docker-zookeeper/)
- [Nacos 集群部署](/docs/middleware/nacos-cluster/) —— MySQL 持久化 + Nginx 反代
- [ZooKeeper 集群搭建](/docs/middleware/zookeeper-cluster/)
- [Nginx 入门](/docs/middleware/nginx-basics/) —— 安装配置、反向代理与负载均衡
- [Seata Server 搭建](/docs/middleware/seata-server/) —— 基于 Nacos + MySQL 的分布式事务服务端

### 🖥️ 运维与监控

- [Linux](/docs/linux/) —— 常用命令、systemd、网络与磁盘
- [Ubuntu](/docs/ubuntu/) —— 服务器初始化与软件安装
- [FRP 内网穿透](/docs/ops/frp/) —— 服务端与客户端配置，内网服务公网暴露
- [Uptime Kuma 安装](/docs/ops/uptime-kuma/) —— 服务可用性监控中心部署
- [Bark Server 安装](/docs/ops/bark-server/) —— iPhone 消息推送服务部署
- [CentOS8 防火墙指令](/docs/ops/firewall/) —— firewalld 常用命令备忘
- [Hexo 命令](/docs/ops/hexo-commands/) —— Hexo 博客常用命令备忘

后续计划补充：Java 并发编程、MyBatis、Spring Cloud、Proxmox 虚拟化等内容。

## 关于博客

除了结构化的文档，日常的问题排查和实践记录会发布在[博客](/blog/)中，两者互补：文档追求体系完整，博客记录具体问题。
