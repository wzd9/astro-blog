---
title: 'centos8 防火墙相关指令'
description: 'CentOS 8 firewalld 常用命令备忘：查看状态、开放端口、添加与删除规则。'
---

### 查看防火墙某个端口是否开放

```shell
firewall-cmd --query-port=6379/tcp
```

### 开放防火墙端口

```shell
firewall-cmd --zone=public --add-port=6379/tcp --permanent
```

### 关闭端口

```shell
firewall-cmd --zone=public --remove-port=6379/tcp --permanent
```

### 重新载入配置，让开放或关闭的端口配置生效

```shell
firewall-cmd --reload
```

### 查看防火墙状态

```shell
systemctl status firewalld
```

### 关闭防火墙

```shell
systemctl stop firewalld
```

### 打开防火墙

```shell
systemctl start firewalld
```

### 重启防火墙

```shell
systemctl restart firewalld
```

### 开放一段端口

```shell
firewall-cmd --zone=public --add-port=40000-45000/tcp --permanent
```

### 查看开放的端口列表

```shell
firewall-cmd --zone=public --list-ports
```
