---
title: Linux
description: Linux 服务器常用命令、配置与运维经验
---

# Linux

这里记录 Linux 服务器相关的配置和运维经验，主要面向日常开发和自用服务器场景。

## 内容规划

- **基础命令**：文件操作、文本处理（grep/sed/awk）、权限管理
- **SSH**：免密登录、安全配置、密钥管理
- **systemd**：服务管理、开机自启、日志查看
- **网络配置**：防火墙（firewalld/ufw）、端口查看、网络排查
- **磁盘与存储**：磁盘挂载、空间排查、LVM
- **用户与权限**：用户组、sudo、文件权限

## 常用速查

```bash
# 查看系统版本
cat /etc/os-release

# 查看端口占用
ss -tlnp

# 查看磁盘使用
df -h

# 查看内存
free -h

# 服务管理（systemd）
systemctl status nginx
systemctl restart nginx
journalctl -u nginx -f   # 实时查看服务日志
```
