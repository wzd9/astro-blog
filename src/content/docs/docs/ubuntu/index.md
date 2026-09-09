---
title: Ubuntu
description: Ubuntu 服务器初始化配置与常用软件安装
---

# Ubuntu

这里记录 Ubuntu（主要为 Ubuntu Server 22.04 / 24.04 LTS）的初始化配置和常用软件安装步骤。

## 内容规划

- **系统初始化**：更新源、创建用户、配置 SSH、时区设置
- **软件安装**：JDK、Nginx、MySQL、Redis、Docker
- **防火墙配置**：ufw 常用规则
- **常见问题**：apt 源更换、服务开机自启

## 初始化速查

```bash
# 更新软件包
sudo apt update && sudo apt upgrade -y

# 设置时区为中国
sudo timedatectl set-timezone Asia/Shanghai

# 安装常用工具
sudo apt install -y curl wget vim git unzip

# 查看防火墙状态
sudo ufw status
```

## 安装 JDK

```bash
# 安装 OpenJDK 17
sudo apt install -y openjdk-17-jdk

# 验证
java -version
```
