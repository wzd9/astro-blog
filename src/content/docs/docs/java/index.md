---
title: Java 简介
description: Java 技术体系概览、JDK 版本选择与学习路线
---

# Java 简介

Java 是一门面向对象的编程语言，以"一次编写，到处运行"著称。Java 程序运行在 JVM（Java 虚拟机）上，拥有成熟的生态、丰富的框架和庞大的开发者社区，是后端开发的主流语言之一。

## 技术体系

Java 的技术生态大致分为几个层次：

- **Java SE（Standard Edition）**：Java 基础平台，包含 JDK、JRE 和核心类库（集合、IO、并发、网络等），是一切的基础。
- **Jakarta EE（原 Java EE）**：企业级开发规范，包含 Servlet、JPA、JMS 等标准。
- **Spring 生态**：事实上的企业级开发框架，包括 Spring Framework、Spring Boot、Spring Cloud 等，日常开发绝大多数基于这一层。

## JDK 版本选择

JDK 从 Java 9 开始改为每 6 个月发布一个版本，其中每 3 年发布一个 LTS（长期支持）版本：

| 版本 | 类型 | 说明 |
| --- | --- | --- |
| JDK 8 | LTS | 存量项目最多，Lambda、Stream、新时间 API |
| JDK 17 | LTS | 目前新项目的主流选择，密封类、模式匹配预览 |
| JDK 21 | LTS | 虚拟线程（协程）正式可用，推荐长期跟进 |

新项目建议直接使用 **JDK 17 或 21**；维护老项目时以项目现状为准，升级前注意评估第三方依赖兼容性。

主流 JDK 发行版可选 Oracle JDK、OpenJDK、Eclipse Temurin（Adoptium）、Amazon Corretto 等，推荐使用 **Temurin** 或 **Corretto**，免费且维护积极。

## 学习路线建议

1. **Java 基础**：语法、面向对象、集合框架、异常、泛型、IO
2. **进阶特性**：Lambda、Stream API、Optional、新时间 API
3. **并发编程**：线程、线程池、`java.util.concurrent`、锁机制
4. **开发工具**：Maven/Gradle 依赖管理、Git、IDEA 调试
5. **框架**：Spring Boot → Spring MVC → MyBatis/JPA
6. **数据存储**：MySQL、Redis
7. **微服务与运维**：Spring Cloud、Docker、消息队列

## 本栏目内容

- [Java 基础](/docs/java/basics/) —— 语法要点、集合框架、异常与泛型
- [Spring Boot](/docs/java/spring-boot/) —— 快速上手、核心配置与常用注解
- [Maven](/docs/java/maven/) —— 依赖管理、常用命令与镜像配置
