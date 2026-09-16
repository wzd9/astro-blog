---
title: '服务器搭建'
description: '记录二手 N100 迷你小主机搭建家庭服务器的全过程：硬件选购、Proxmox 虚拟化、整体架构规划与监控方案。'
pubDate: '2026-08-17'
heroImage: '/src/assets/server.jpg'
---

 本文主要记录本地服务器的搭建，记录时间为2026年8月16号。服务器已经搭建完毕。

 作者自己开发的小程序后台应用原本运行在华为云服务器上（华为云服务器白嫖了一年半），前段时间发现华为云服务器到今年十月份就到期了，需要续费或者重新购买一台服务器。作者去华为云官网看了一下，也对比了其他的服务商，价格对于作者来说偏高，于是开始打算自己搭建一台服务器。

## 服务器购买

 由于这段时间资金紧张，作者没有去某东或者某宝上购买，是在闲鱼上购买的二手的 N100 迷你小主机，内存 16 G, 没有硬盘（需内存和硬盘购买前一定要问清楚），硬盘是在闲鱼上买的江波龙 512 G，**购买时注意接口，一定要和你买的机器适配**。如果嫌自己配置太麻烦，可以和自己和买主商量，加钱购置合适的硬盘。（如果你们也想自己搭建本地服务器并且资金紧张的情况，也可以去看看二手的）。

## 服务器搭建

 作者的 N100 迷你小主机配置如下：

| 项目 | 你的配置 / 信息 | 备注 |
| --- | --- | --- |
| 🖥️ 主机 | **Intel N100 迷你主机** | 低功耗小主机 |
| CPU | **Intel N100** | 4 核 4 线程 |
| 系统 | **Debian GNU/Linux 13 (trixie)** | 当前主要运行环境 |
| 网卡 | **Realtek RTL8111/8168/8211/8411** | 已从 r8169 调整为 **r8168-dkms** |
| 网卡驱动 | **r8168** | 已加载到内核 |
| 网络速度 | **1000 Mbps** | 千兆有线网络 |
| BIOS/内核优化 | `pcie_aspm=off` | 用于处理部分 ACPI/PCIe 问题 |

 硬件准备好后，作者没有直接安装 Ubuntn Server，而是先安装了虚拟化平台 Proxmox VE，然后在 Proxmox 下安装了 Ubuntu S server。小程序后台代码以及相应的环境和中间件安装在 Ubuntn Server 中。

 Proxmox VE 和 Unbuntn Server 安装都很简单，可以自行到网络上搜索一下，傻瓜式点击安装即可，需要注意的部分也基本都标注出来了。

## 项目架构图

 作者之前就购买了域名和阿里云服务器，都不贵，域名80元两年，轻量应用服务器 79 一年（2 核 2G），一般都负担的起。

 自己搭建服务器完成后，代码到服务器上跑起来了，那么如何通过手机访问到自己的应用呢？下面就介绍一下作者的个人服务器架构。

![架构图](/images/blog/home-server-setup/home-server-setup-1.png)

 以上就是作者的个人服务器架构，可以分成 **公网服务器、家庭 N100 主机、业务服务、数据服务、监控告警、开发部署** 六大部分。

### 整体架构组件

| 层级 | 组件 | 所在位置 | 主要作用 | 你当前架构中的用途 |
| --- | --- | --- | --- | --- |
| 公网入口 | **阿里云轻量应用服务器** | 阿里云 | 提供公网 IP 和公网计算资源 | 作为整个系统的公网入口 |
| 公网入口 | **域名 [www.wzdboy.cn](http://www.wzdboy.cn/)** | 阿里云 DNS | 将域名解析到公网服务器 | 用户通过域名访问你的服务 |
| 公网入口 | **Nginx** | 阿里云轻量服务器 | Web 服务器、反向代理 | 接收 HTTPS 请求并转发到后端服务 |
| 安全 | **HTTPS / SSL** | 阿里云 Nginx | 加密 HTTP 通信 | 保证公网访问安全 |
| 内网穿透 | **FRPS** | 阿里云轻量服务器 | FRP 服务端 | 接收 N100 上 FRPC 建立的隧道 |
| 内网穿透 | **FRPC** | N100 / Ubuntu | FRP 客户端 | 主动连接阿里云，把内网服务映射出去 |
| 虚拟化 | **Proxmox VE** | N100 | 虚拟机/容器管理 | 管理你的 Ubuntu 虚拟机 |
| 操作系统 | **Ubuntu Server** | N100 的 VM | Linux 服务运行环境 | 承载 Spring Boot、MySQL、Redis 等 |
| 应用 | **Spring Boot** | Ubuntu | 运行业务后端 | 运行你的 `xx` 项目 |
| Java 环境 | **Temurin JDK 21** | Ubuntu | Java 运行环境 | 为 Spring Boot 提供 JVM |
| 数据库 | **MySQL 8.0.43** | Ubuntu | 关系型数据库 | 保存 Spring Boot 的业务数据 |
| 缓存 | **Redis** | Ubuntu | 高性能内存数据库 | 缓存、Session、临时数据等 |
| 服务管理 | **systemd** | Ubuntu | 管理 Linux 服务 | 管理 Spring Boot、FRPC、MySQL、Redis 的启动和重启 |

### 监控和告警体系

| 组件 | 所在位置 | 作用 | 监控/处理对象 |
| --- | --- | --- | --- |
| **Uptime Kuma** | 阿里云轻量服务器 | 服务可用性监控 | Spring Boot、PVE、Ubuntu、MySQL、Redis、FRPC、FRP Tunnel |
| **Spring Boot Actuator** | Ubuntu | 提供应用健康检查接口 | `/xx/actuator/health` |
| **Bark Server** | 阿里云轻量服务器 | 接收监控告警并推送 | 接收 Kuma 的异常/恢复通知 |
| **Bark App** | iPhone | 接收手机推送 | 服务宕机、恢复、异常等 |
| **FRP Tunnel Monitor** | Uptime Kuma | 检查 FRP 隧道 | 判断 N100 ↔ 阿里云的 FRP 是否正常 |
| **PVE Monitor** | Uptime Kuma | 检查 Proxmox | 判断 PVE Web/API 是否正常 |
| **MySQL Monitor** | Uptime Kuma | 检查 MySQL | 判断数据库是否可以正常连接 |
| **Redis Monitor** | Uptime Kuma | 检查 Redis | 判断 Redis 是否正常响应 |

### 开发和自动部署

| 组件 | 作用 | 在你的系统中的作用 |
| --- | --- | --- |
| **IDE** | 编写代码 | 本地开发 Spring Boot 项目 |
| **Git** | 版本控制 | 管理项目代码 |
| **GitHub** | 代码托管 | 保存项目源代码 |
| **GitHub Actions** | CI/CD 自动化 | 代码提交后自动构建 |
| **Maven / Gradle** | Java 项目构建 | 编译 Spring Boot 项目并生成 JAR |
| **SCP / SSH** | 文件传输和远程管理 | 将 JAR 上传到 N100 |
| **systemd** | 服务自动化 | 上传新 JAR 后重启 xx.service |
